import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

import {
  InMemoryResultExportRepository,
  ResultExportService,
  type ResultExportSource,
} from '../src/index.js';

const source = (): ResultExportSource => ({
  event: {
    campaignId: 'operation-lighthouse',
    campaignVersion: '1.0.0',
    closedAt: '2026-09-25T16:00:00Z',
    createdAt: '2026-09-25T12:00:00Z',
    eventSessionId: 'event-1',
    scoringPolicyVersion: '1.0.0',
    snapshotAt: '2026-09-25T16:01:00Z',
    startedAt: '2026-09-25T13:00:00Z',
    status: 'closed',
  },
  missions: [
    {
      attemptCount: 2,
      completedAt: '2026-09-25T14:00:00Z',
      highestHintLevel: 2,
      latestValidationOutcome: 'passed',
      missionId: 'ground-truth',
      missionVersion: '1.0.0',
      startedAt: '2026-09-25T13:30:00Z',
      status: 'completed',
      unitId: 'unit-1',
    },
  ],
  recognitions: [
    {
      awardedAt: '2026-09-25T16:00:00Z',
      categoryId: 'best-evidence-use',
      titleKey: 'recognition.bestEvidenceUse',
      unitId: 'unit-1',
    },
  ],
  scoreAdjustments: [
    {
      createdAt: '2026-09-25T14:01:00Z',
      explanation: 'Correct validator defect',
      missionId: 'ground-truth',
      points: 25,
      reasonCode: 'validator-defect',
      unitId: 'unit-1',
    },
  ],
  scores: [
    {
      adjustmentPoints: 25,
      basePoints: 700,
      bonusPoints: 50,
      efficiency: 50,
      evidenceAndGrounding: 150,
      explainability: 100,
      rank: 1,
      reliability: 120,
      requiredOutcome: 400,
      totalPoints: 775,
      unitId: 'unit-1',
    },
  ],
  units: [
    {
      createdAt: '2026-09-25T12:10:00Z',
      displayName: 'Harbor Team',
      locale: 'pt-BR',
      status: 'completed',
      unitId: 'unit-1',
    },
  ],
});

const createService = (exportSource: ResultExportSource = source()) => {
  const load = vi.fn(() => Promise.resolve(exportSource));
  return {
    load,
    service: new ResultExportService({
      clock: () => new Date('2026-09-25T16:02:00Z'),
      repository: new InMemoryResultExportRepository(),
      sourceResolver: { load },
    }),
  };
};

describe('result export', () => {
  it('exports versioned event, unit, mission, score, and recognition summaries', async () => {
    const { service } = createService();
    const artifact = await service.create({
      eventSessionId: 'event-1',
      idempotencyKey: 'export-1',
    });
    const document = JSON.parse(artifact.content) as Record<string, unknown>;

    expect(document).toMatchObject({
      schemaVersion: '1.0',
      event: { eventSessionId: 'event-1', status: 'closed' },
      units: [{ unitId: 'unit-1' }],
      missions: [{ missionId: 'ground-truth' }],
      scores: [{ rank: 1, totalPoints: 775 }],
      recognitions: [{ categoryId: 'best-evidence-use' }],
    });
  });

  it('includes audited score-adjustment reasons', async () => {
    const artifact = await createService().service.create({
      eventSessionId: 'event-1',
      idempotencyKey: 'export-1',
    });
    expect(JSON.parse(artifact.content)).toMatchObject({
      scoreAdjustments: [
        {
          explanation: 'Correct validator defect',
          reasonCode: 'validator-defect',
        },
      ],
    });
  });

  it('uses an allowlist that excludes extra sensitive source properties', async () => {
    const unsafeSource = source() as ResultExportSource & {
      token: string;
      prompt: string;
    };
    unsafeSource.token = 'secret-token';
    unsafeSource.prompt = 'participant prompt';
    const artifact = await createService(unsafeSource).service.create({
      eventSessionId: 'event-1',
      idempotencyKey: 'export-1',
    });
    expect(artifact.content).not.toContain('secret-token');
    expect(artifact.content).not.toContain('participant prompt');
  });

  it('produces a checksum matching the exact exported bytes', async () => {
    const artifact = await createService().service.create({
      eventSessionId: 'event-1',
      idempotencyKey: 'export-1',
    });
    expect(artifact.sha256).toBe(
      createHash('sha256').update(artifact.content, 'utf8').digest('hex'),
    );
  });

  it('replays an idempotent export without reloading a changed snapshot', async () => {
    const { load, service } = createService();
    const input = {
      eventSessionId: 'event-1',
      idempotencyKey: 'export-1',
    };
    const first = await service.create(input);
    const replay = await service.create(input);
    expect(replay).toEqual(first);
    expect(load).toHaveBeenCalledOnce();
  });

  it('sorts collections for stable downstream processing', async () => {
    const reversed = source();
    const artifact = await createService({
      ...reversed,
      units: [
        {
          createdAt: '2026-09-25T12:11:00Z',
          displayName: 'Second Team',
          locale: 'en',
          status: 'active',
          unitId: 'unit-2',
        },
        ...reversed.units,
      ],
    }).service.create({
      eventSessionId: 'event-1',
      idempotencyKey: 'export-1',
    });
    const document = JSON.parse(artifact.content) as {
      units: { unitId: string }[];
    };
    expect(document.units.map(({ unitId }) => unitId)).toEqual([
      'unit-1',
      'unit-2',
    ]);
  });

  it('rejects cross-event and orphaned-unit source projections', async () => {
    await expect(
      createService({
        ...source(),
        event: { ...source().event, eventSessionId: 'event-2' },
      }).service.create({
        eventSessionId: 'event-1',
        idempotencyKey: 'export-1',
      }),
    ).rejects.toMatchObject({ code: 'result-export-source-invalid' });

    await expect(
      createService({
        ...source(),
        recognitions: [
          {
            awardedAt: '2026-09-25T16:00:00Z',
            categoryId: 'best-evidence-use',
            titleKey: 'recognition.bestEvidenceUse',
            unitId: 'missing-unit',
          },
        ],
      }).service.create({
        eventSessionId: 'event-1',
        idempotencyKey: 'export-2',
      }),
    ).rejects.toMatchObject({ code: 'result-export-source-invalid' });
  });
});
