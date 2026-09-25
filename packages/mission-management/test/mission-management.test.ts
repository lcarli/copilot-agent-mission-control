import type { MissionDefinition } from '@mission-control/campaign-contracts';
import { describe, expect, it } from 'vitest';

import {
  InMemoryMissionRepository,
  MissionLifecycleService,
} from '../src/index.js';

const mission = (
  id: string,
  prerequisiteMissions: readonly string[] = [],
): MissionDefinition => ({
  availableTools: [],
  campaignId: 'operation-lighthouse',
  campaignVersion: '1.0.0',
  contentKeys: {},
  dashboardEffects: [],
  hints: [],
  id,
  instructorModifiers: [],
  kind: 'mission',
  objectives: {
    advanced: [],
    core: [],
  },
  prerequisiteMissions,
  requiredEventTypes: [],
  schemaVersion: '1.0',
  scoring: {
    dimensionWeights: {},
    hintBonusAdjustments: {},
    maximumPoints: 100,
  },
  submissionSchema: 'schemas/submission.json',
  validator: {
    id: `${id}-validator`,
    timeoutMs: 30_000,
    version: '1.0.0',
  },
  version: '1.0.0',
});

const createService = () => {
  const repository = new InMemoryMissionRepository();
  const service = new MissionLifecycleService({
    now: () => new Date('2026-09-25T12:00:00.000Z'),
    repository,
  });
  return { repository, service };
};

describe('mission lifecycle', () => {
  it('initializes and opens missions with optimistic versions', async () => {
    const { service } = createService();
    const [initialized] = await service.initializeMissions({
      eventSessionId: 'event-1',
      missions: [mission('grid')],
    });

    expect(initialized?.status).toBe('locked');
    const opened = await service.openMission('event-1', 'grid', 1);
    expect(opened).toMatchObject({
      openedAt: '2026-09-25T12:00:00.000Z',
      status: 'open',
      version: 2,
    });
    await expect(
      service.pauseMission('event-1', 'grid', 1),
    ).rejects.toMatchObject({
      code: 'mission-version-conflict',
    });
  });

  it('pauses, resumes, and closes an open mission', async () => {
    const { service } = createService();
    await service.initializeMissions({
      eventSessionId: 'event-1',
      missions: [mission('grid')],
    });
    const opened = await service.openMission('event-1', 'grid', 1);
    const paused = await service.pauseMission(
      'event-1',
      'grid',
      opened.version,
    );
    const resumed = await service.resumeMission(
      'event-1',
      'grid',
      paused.version,
    );
    const closed = await service.closeMission(
      'event-1',
      'grid',
      resumed.version,
    );

    expect(paused.status).toBe('paused');
    expect(resumed.status).toBe('open');
    expect(closed).toMatchObject({
      closedAt: '2026-09-25T12:00:00.000Z',
      status: 'closed',
    });
  });

  it('rejects invalid lifecycle transitions', async () => {
    const { service } = createService();
    await service.initializeMissions({
      eventSessionId: 'event-1',
      missions: [mission('grid')],
    });

    await expect(
      service.pauseMission('event-1', 'grid', 1),
    ).rejects.toMatchObject({
      code: 'mission-state-invalid',
    });
  });

  it('starts an open mission for a unit once', async () => {
    const { service } = createService();
    await service.initializeMissions({
      eventSessionId: 'event-1',
      missions: [mission('grid')],
    });
    await service.openMission('event-1', 'grid', 1);

    const started = await service.startMission('event-1', 'unit-1', 'grid');
    expect(started).toMatchObject({
      missionId: 'grid',
      status: 'active',
      unitId: 'unit-1',
      version: 1,
    });
    await expect(
      service.startMission('event-1', 'unit-1', 'grid'),
    ).rejects.toMatchObject({
      code: 'mission-already-started',
    });
  });

  it('enforces mission prerequisites per unit', async () => {
    const { service } = createService();
    await service.initializeMissions({
      eventSessionId: 'event-1',
      missions: [mission('grid'), mission('transit', ['grid'])],
    });
    await service.openMission('event-1', 'grid', 1);
    await service.openMission('event-1', 'transit', 1);

    await expect(
      service.startMission('event-1', 'unit-1', 'transit'),
    ).rejects.toMatchObject({
      code: 'mission-prerequisite-incomplete',
    });
    const grid = await service.startMission('event-1', 'unit-1', 'grid');
    await service.completeMission('event-1', 'unit-1', 'grid', grid.version);

    await expect(
      service.startMission('event-1', 'unit-1', 'transit'),
    ).resolves.toMatchObject({
      status: 'active',
    });
  });

  it('prevents starts while a mission is paused or closed', async () => {
    const { service } = createService();
    await service.initializeMissions({
      eventSessionId: 'event-1',
      missions: [mission('grid')],
    });
    const opened = await service.openMission('event-1', 'grid', 1);
    const paused = await service.pauseMission(
      'event-1',
      'grid',
      opened.version,
    );

    await expect(
      service.startMission('event-1', 'unit-1', 'grid'),
    ).rejects.toMatchObject({
      code: 'mission-not-available',
    });
    await service.closeMission('event-1', 'grid', paused.version);
    await expect(
      service.startMission('event-1', 'unit-1', 'grid'),
    ).rejects.toMatchObject({
      code: 'mission-not-available',
    });
  });
});
