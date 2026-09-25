import { describe, expect, it, vi } from 'vitest';

import {
  HintService,
  InMemoryHintUsageRepository,
  type HintAccessContext,
  type HintPolicy,
  type RequestHintInput,
} from '../src/index.js';

const input = (
  overrides: Partial<RequestHintInput> = {},
): RequestHintInput => ({
  eventSessionId: 'event-1',
  idempotencyKey: 'hint-request-1',
  missionId: 'ground-truth',
  unitId: 'unit-1',
  ...overrides,
});

const context = (
  overrides: Partial<HintAccessContext> = {},
): HintAccessContext => ({
  eventSessionId: 'event-1',
  eventStatus: 'open',
  missionId: 'ground-truth',
  missionRunStatus: 'active',
  missionVersion: '1.0.0',
  unitId: 'unit-1',
  unitStatus: 'active',
  ...overrides,
});

const policy = (overrides: Partial<HintPolicy> = {}): HintPolicy => ({
  bonusAdjustments: {
    level1: 0,
    level2: -25,
    level3: -50,
  },
  hints: [
    { contentKey: 'missions.ground-truth.hints.level1', level: 1 },
    { contentKey: 'missions.ground-truth.hints.level2', level: 2 },
    { contentKey: 'missions.ground-truth.hints.level3', level: 3 },
  ],
  missionId: 'ground-truth',
  missionVersion: '1.0.0',
  ...overrides,
});

const createService = (
  options: {
    access?: HintAccessContext;
    hintPolicy?: HintPolicy;
    repository?: InMemoryHintUsageRepository;
  } = {},
) => {
  const repository = options.repository ?? new InMemoryHintUsageRepository();
  return {
    repository,
    service: new HintService({
      clock: () => new Date('2026-09-25T14:00:00Z'),
      contextResolver: {
        resolve: vi.fn(() => Promise.resolve(options.access ?? context())),
      },
      policyResolver: {
        resolve: vi.fn(() => Promise.resolve(options.hintPolicy ?? policy())),
      },
      repository,
    }),
  };
};

describe('hint system', () => {
  it('delivers the next progressive localized hint', async () => {
    const { service } = createService();

    const first = await service.requestNext(input());
    const second = await service.requestNext(
      input({ idempotencyKey: 'hint-request-2' }),
    );

    expect(first).toMatchObject({
      bonusAdjustmentPoints: 0,
      contentKey: 'missions.ground-truth.hints.level1',
      level: 1,
      missionVersion: '1.0.0',
    });
    expect(second).toMatchObject({
      bonusAdjustmentPoints: -25,
      level: 2,
    });
  });

  it('replays an idempotent request without advancing the hint level', async () => {
    const repository = new InMemoryHintUsageRepository();
    const { service } = createService({ repository });

    const first = await service.requestNext(input());
    const replayService = createService({
      access: context({ eventStatus: 'paused' }),
      repository,
    }).service;
    const replay = await replayService.requestNext(input());
    const next = await service.requestNext(
      input({ idempotencyKey: 'hint-request-2' }),
    );

    expect(replay).toEqual(first);
    expect(next.level).toBe(2);
  });

  it('stops after all three progressive levels are delivered', async () => {
    const { service } = createService();
    await service.requestNext(input());
    await service.requestNext(input({ idempotencyKey: 'hint-request-2' }));
    await service.requestNext(input({ idempotencyKey: 'hint-request-3' }));

    await expect(
      service.requestNext(input({ idempotencyKey: 'hint-request-4' })),
    ).rejects.toMatchObject({ code: 'hint-levels-exhausted' });
  });

  it('rejects muted, withdrawn, and completed units', async () => {
    for (const unitStatus of ['muted', 'withdrawn', 'completed'] as const) {
      const { service } = createService({ access: context({ unitStatus }) });
      await expect(service.requestNext(input())).rejects.toMatchObject({
        code: 'hint-unit-not-eligible',
      });
    }
  });

  it('rejects requests while the event or mission run is inactive', async () => {
    const paused = createService({
      access: context({ eventStatus: 'paused' }),
    }).service;
    await expect(paused.requestNext(input())).rejects.toMatchObject({
      code: 'hint-event-not-open',
    });

    const unavailable = createService({
      access: context({ missionRunStatus: 'available' }),
    }).service;
    await expect(unavailable.requestNext(input())).rejects.toMatchObject({
      code: 'hint-mission-not-active',
    });
  });

  it('records versioned bonus adjustments without changing mission state', async () => {
    const { service } = createService();
    await service.requestNext(input());
    await service.requestNext(input({ idempotencyKey: 'hint-request-2' }));
    await service.requestNext(input({ idempotencyKey: 'hint-request-3' }));

    const usage = await service.listUsage('event-1', 'unit-1', 'ground-truth');
    expect(
      usage.map(({ bonusAdjustmentPoints }) => bonusAdjustmentPoints),
    ).toEqual([0, -25, -50]);
    expect(
      usage.every(({ missionVersion }) => missionVersion === '1.0.0'),
    ).toBe(true);
  });

  it('serializes concurrent requests into distinct progressive levels', async () => {
    const { service } = createService();
    const [first, second] = await Promise.all([
      service.requestNext(input()),
      service.requestNext(input({ idempotencyKey: 'hint-request-2' })),
    ]);

    expect([first.level, second.level].toSorted()).toEqual([1, 2]);
  });

  it('rejects incomplete or score-increasing hint policies', async () => {
    const incomplete = createService({
      hintPolicy: policy({
        hints: [{ contentKey: 'hint.one', level: 1 }],
      }),
    }).service;
    await expect(incomplete.requestNext(input())).rejects.toMatchObject({
      code: 'hint-policy-invalid',
    });

    const increasing = createService({
      hintPolicy: policy({
        bonusAdjustments: {
          level1: 1,
          level2: -25,
          level3: -50,
        },
      }),
    }).service;
    await expect(increasing.requestNext(input())).rejects.toMatchObject({
      code: 'hint-policy-invalid',
    });
  });
});
