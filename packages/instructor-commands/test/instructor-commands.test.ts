import { describe, expect, it } from 'vitest';

import {
  InMemoryInstructorCommandRepository,
  InstructorCommandError,
  InstructorCommandService,
  type InstructorCommand,
  type InstructorCommandContext,
  type InstructorControlState,
} from '../src/index.js';

const state = (
  overrides: Partial<InstructorControlState> = {},
): InstructorControlState => ({
  activeModifiers: {},
  closeConfirmationPhrase: 'close event-1',
  eventSessionId: 'event-1',
  eventStatus: 'active',
  missionOverrides: {},
  scoreAdjustments: [],
  unitStatuses: {
    'unit-1': 'active',
  },
  unitStatusesBeforeMute: {},
  updatedAt: '2026-09-25T14:00:00Z',
  version: 1,
  ...overrides,
});

const context = (
  overrides: Partial<InstructorCommandContext> = {},
): InstructorCommandContext => ({
  actorId: 'instructor-1',
  correlationId: 'correlation-1',
  idempotencyKey: 'command-request-1',
  ...overrides,
});

const base = {
  commandId: 'command-1',
  eventSessionId: 'event-1',
  expectedVersion: 1,
  reason: 'Operational decision',
  requestedAt: '2026-09-25T14:01:00Z',
  schemaVersion: '1.0',
} as const;

const createService = (initial = state()) => {
  const repository = new InMemoryInstructorCommandRepository([initial]);
  return {
    repository,
    service: new InstructorCommandService({
      clock: () => new Date('2026-09-25T14:01:01Z'),
      repository,
    }),
  };
};

describe('instructor commands', () => {
  it('activates and deactivates versioned incident modifiers', async () => {
    const { service } = createService();
    const activated = await service.execute(
      {
        ...base,
        commandType: 'incident-modifier.activate',
        payload: { parameters: { severity: 2 } },
        target: { modifierId: 'incident-surge' },
      },
      context(),
    );
    expect(activated.state.activeModifiers).toEqual({
      'incident-surge': { severity: 2 },
    });

    const deactivated = await service.execute(
      {
        ...base,
        commandId: 'command-2',
        commandType: 'incident-modifier.deactivate',
        expectedVersion: 2,
        payload: { parameters: {} },
        target: { modifierId: 'incident-surge' },
      },
      context({ idempotencyKey: 'command-request-2' }),
    );
    expect(deactivated.state.activeModifiers).toEqual({});
  });

  it('records mission overrides and signed score corrections', async () => {
    const { service } = createService();
    const override = await service.execute(
      {
        ...base,
        commandType: 'mission.override',
        payload: { outcome: 'completed' },
        target: { missionId: 'ground-truth', unitId: 'unit-1' },
      },
      context(),
    );
    expect(override.state.missionOverrides).toEqual({
      'unit-1:ground-truth': 'completed',
    });

    const adjusted = await service.execute(
      {
        ...base,
        commandId: 'command-2',
        commandType: 'score.adjust',
        expectedVersion: 2,
        payload: {
          explanation: 'Correct validator defect',
          points: -25,
          reasonCode: 'validator-defect',
        },
        target: { missionId: 'ground-truth', unitId: 'unit-1' },
      },
      context({ idempotencyKey: 'command-request-2' }),
    );
    expect(adjusted.state.scoreAdjustments).toEqual([
      expect.objectContaining({ points: -25, reasonCode: 'validator-defect' }),
    ]);
  });

  it('mutes and restores a unit while preserving its previous status', async () => {
    const { service } = createService(
      state({ unitStatuses: { 'unit-1': 'disconnected' } }),
    );
    const muted = await service.execute(
      {
        ...base,
        commandType: 'unit.mute',
        payload: {},
        target: { unitId: 'unit-1' },
      },
      context(),
    );
    expect(muted.state.unitStatuses['unit-1']).toBe('muted');

    const unmuted = await service.execute(
      {
        ...base,
        commandId: 'command-2',
        commandType: 'unit.unmute',
        expectedVersion: 2,
        payload: {},
        target: { unitId: 'unit-1' },
      },
      context({ idempotencyKey: 'command-request-2' }),
    );
    expect(unmuted.state.unitStatuses['unit-1']).toBe('disconnected');
  });

  it('requires exact confirmation and a reason before closing an event', async () => {
    const { service } = createService();
    await expect(
      service.execute(
        {
          ...base,
          commandType: 'event-session.close',
          payload: { confirmationPhrase: 'wrong' },
          target: {},
        },
        context(),
      ),
    ).rejects.toMatchObject({ code: 'command-confirmation-invalid' });

    const { service: closeService } = createService();
    const closed = await closeService.execute(
      {
        ...base,
        commandType: 'event-session.close',
        payload: { confirmationPhrase: 'close event-1' },
        target: {},
      },
      context(),
    );
    expect(closed.state.eventStatus).toBe('closed');
  });

  it('rejects stale commands and audits the rejection for replay', async () => {
    const { service } = createService();
    const stale = {
      ...base,
      commandType: 'unit.mute',
      expectedVersion: 99,
      payload: {},
      target: { unitId: 'unit-1' },
    } satisfies InstructorCommand;

    await expect(service.execute(stale, context())).rejects.toMatchObject({
      code: 'command-stale-version',
    });
    await expect(service.execute(stale, context())).rejects.toMatchObject({
      code: 'command-stale-version',
    });
  });

  it('replays accepted commands and rejects idempotency key body changes', async () => {
    const { service } = createService();
    const command = {
      ...base,
      commandType: 'unit.mute',
      payload: {},
      target: { unitId: 'unit-1' },
    } satisfies InstructorCommand;
    const first = await service.execute(command, context());
    const replay = await service.execute(command, context());
    expect(replay.audit).toEqual(first.audit);

    await expect(
      service.execute(
        { ...command, commandId: 'different-command' },
        context(),
      ),
    ).rejects.toBeInstanceOf(InstructorCommandError);
  });

  it('requires reasons for high-impact commands', async () => {
    const { service } = createService();
    await expect(
      service.execute(
        {
          ...base,
          commandType: 'score.adjust',
          payload: {
            explanation: 'Correction',
            points: 10,
            reasonCode: 'manual-correction',
          },
          reason: ' ',
          target: { unitId: 'unit-1' },
        },
        context(),
      ),
    ).rejects.toMatchObject({ code: 'command-reason-required' });
  });

  it('rejects invalid targets and duplicate modifier transitions', async () => {
    const { service } = createService();
    await expect(
      service.execute(
        {
          ...base,
          commandType: 'unit.mute',
          payload: {},
          target: { unitId: 'missing-unit' },
        },
        context(),
      ),
    ).rejects.toMatchObject({ code: 'command-target-not-found' });

    const { service: modifierService } = createService();
    const activate = {
      ...base,
      commandType: 'incident-modifier.activate',
      payload: { parameters: {} },
      target: { modifierId: 'incident-surge' },
    } satisfies InstructorCommand;
    await modifierService.execute(activate, context());
    await expect(
      modifierService.execute(
        { ...activate, commandId: 'command-2', expectedVersion: 2 },
        context({ idempotencyKey: 'command-request-2' }),
      ),
    ).rejects.toMatchObject({ code: 'command-state-invalid' });
  });
});
