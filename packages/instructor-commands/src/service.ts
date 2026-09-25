import { createHash } from 'node:crypto';
import { v7 as uuidV7 } from 'uuid';

import { InstructorCommandError } from './errors.js';
import type { InstructorCommandRepository } from './repository.js';
import type {
  InstructorCommand,
  InstructorCommandAudit,
  InstructorCommandContext,
  InstructorCommandErrorCode,
  InstructorCommandResult,
  InstructorControlState,
} from './types.js';

export interface InstructorCommandServiceOptions {
  readonly clock?: () => Date;
  readonly repository: InstructorCommandRepository;
}

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
};

const fingerprint = (command: InstructorCommand): string =>
  createHash('sha256')
    .update(JSON.stringify(canonicalize(command)), 'utf8')
    .digest('hex');

const missionOverrideKey = (unitId: string, missionId: string): string =>
  `${unitId}:${missionId}`;

export class InstructorCommandService {
  readonly #clock: () => Date;
  readonly #repository: InstructorCommandRepository;

  public constructor(options: InstructorCommandServiceOptions) {
    this.#clock = options.clock ?? (() => new Date());
    this.#repository = options.repository;
  }

  public async execute(
    command: InstructorCommand,
    context: InstructorCommandContext,
  ): Promise<InstructorCommandResult> {
    const requestFingerprint = fingerprint(command);
    const replay = await this.#repository.findAudit(
      command.eventSessionId,
      context.idempotencyKey,
    );
    if (replay !== undefined) {
      if (replay.requestFingerprint !== requestFingerprint) {
        throw new InstructorCommandError('command-idempotency-conflict');
      }
      const replayState = await this.#requiredState(command.eventSessionId);
      if (replay.status === 'rejected') {
        throw new InstructorCommandError(
          replay.errorCode ?? 'command-state-invalid',
        );
      }
      return { audit: replay, state: replayState };
    }

    const state = await this.#requiredState(command.eventSessionId);
    try {
      this.#validateEnvelope(command, context, state);
      const next = this.#apply(command, state);
      await this.#repository.updateState(next, state.version);
      const audit = this.#audit(
        command,
        context,
        requestFingerprint,
        'accepted',
        state.version,
        next.version,
      );
      await this.#repository.appendAudit(audit);
      return { audit, state: next };
    } catch (error: unknown) {
      const commandError =
        error instanceof InstructorCommandError
          ? error
          : new InstructorCommandError('command-state-invalid');
      const audit = this.#audit(
        command,
        context,
        requestFingerprint,
        'rejected',
        state.version,
        state.version,
        commandError.code,
      );
      await this.#repository.appendAudit(audit);
      throw commandError;
    }
  }

  #apply(
    command: InstructorCommand,
    state: InstructorControlState,
  ): InstructorControlState {
    const nextVersion = state.version + 1;
    const common = {
      ...state,
      updatedAt: this.#clock().toISOString(),
      version: nextVersion,
    };
    switch (command.commandType) {
      case 'incident-modifier.activate': {
        const modifierId = command.target.modifierId;
        if (state.activeModifiers[modifierId] !== undefined) {
          throw new InstructorCommandError('command-state-invalid');
        }
        this.#validateParameters(command.payload.parameters);
        return {
          ...common,
          activeModifiers: {
            ...state.activeModifiers,
            [modifierId]: structuredClone(command.payload.parameters),
          },
        };
      }
      case 'incident-modifier.deactivate': {
        const modifierId = command.target.modifierId;
        if (state.activeModifiers[modifierId] === undefined) {
          throw new InstructorCommandError('command-state-invalid');
        }
        const activeModifiers = Object.fromEntries(
          Object.entries(state.activeModifiers).filter(
            ([activeModifierId]) => activeModifierId !== modifierId,
          ),
        );
        return { ...common, activeModifiers };
      }
      case 'mission.override':
        this.#requiredUnit(state, command.target.unitId);
        return {
          ...common,
          missionOverrides: {
            ...state.missionOverrides,
            [missionOverrideKey(
              command.target.unitId,
              command.target.missionId,
            )]: command.payload.outcome,
          },
        };
      case 'score.adjust':
        this.#requiredUnit(state, command.target.unitId);
        if (
          !Number.isInteger(command.payload.points) ||
          command.payload.points === 0 ||
          command.payload.reasonCode.trim().length === 0 ||
          command.payload.explanation.trim().length === 0
        ) {
          throw new InstructorCommandError('command-invalid');
        }
        return {
          ...common,
          scoreAdjustments: [
            ...state.scoreAdjustments,
            {
              commandId: command.commandId,
              explanation: command.payload.explanation,
              ...(command.target.missionId === undefined
                ? {}
                : { missionId: command.target.missionId }),
              points: command.payload.points,
              reasonCode: command.payload.reasonCode,
              unitId: command.target.unitId,
            },
          ],
        };
      case 'unit.mute': {
        const currentStatus = this.#requiredUnit(state, command.target.unitId);
        if (
          currentStatus === 'muted' ||
          currentStatus === 'withdrawn' ||
          currentStatus === 'completed'
        ) {
          throw new InstructorCommandError('command-state-invalid');
        }
        return {
          ...common,
          unitStatuses: {
            ...state.unitStatuses,
            [command.target.unitId]: 'muted',
          },
          unitStatusesBeforeMute: {
            ...state.unitStatusesBeforeMute,
            [command.target.unitId]: currentStatus,
          },
        };
      }
      case 'unit.unmute': {
        if (this.#requiredUnit(state, command.target.unitId) !== 'muted') {
          throw new InstructorCommandError('command-state-invalid');
        }
        const restored =
          state.unitStatusesBeforeMute[command.target.unitId] ?? 'active';
        const unitStatusesBeforeMute = Object.fromEntries(
          Object.entries(state.unitStatusesBeforeMute).filter(
            ([unitId]) => unitId !== command.target.unitId,
          ),
        );
        return {
          ...common,
          unitStatuses: {
            ...state.unitStatuses,
            [command.target.unitId]: restored,
          },
          unitStatusesBeforeMute,
        };
      }
      case 'event-session.close':
        if (
          state.eventStatus !== 'lobby' &&
          state.eventStatus !== 'active' &&
          state.eventStatus !== 'paused'
        ) {
          throw new InstructorCommandError('command-state-invalid');
        }
        if (
          command.payload.confirmationPhrase !== state.closeConfirmationPhrase
        ) {
          throw new InstructorCommandError('command-confirmation-invalid');
        }
        return { ...common, eventStatus: 'closed' };
    }
  }

  #validateEnvelope(
    command: InstructorCommand,
    context: InstructorCommandContext,
    state: InstructorControlState,
  ): void {
    if (
      command.eventSessionId !== state.eventSessionId ||
      !Number.isInteger(command.expectedVersion) ||
      command.expectedVersion < 1 ||
      command.commandId.trim().length === 0 ||
      context.actorId.trim().length === 0 ||
      context.correlationId.trim().length === 0 ||
      context.idempotencyKey.trim().length === 0 ||
      !Number.isFinite(new Date(command.requestedAt).getTime())
    ) {
      throw new InstructorCommandError('command-invalid');
    }
    if (command.expectedVersion !== state.version) {
      throw new InstructorCommandError('command-stale-version');
    }
    if (state.eventStatus === 'closed') {
      throw new InstructorCommandError('command-state-invalid');
    }
    if (
      [
        'event-session.close',
        'mission.override',
        'score.adjust',
        'unit.mute',
        'unit.unmute',
      ].includes(command.commandType) &&
      (command.reason === undefined || command.reason.trim().length === 0)
    ) {
      throw new InstructorCommandError('command-reason-required');
    }
  }

  #validateParameters(parameters: Readonly<Record<string, unknown>>): void {
    const serialized = JSON.stringify(parameters);
    if (serialized.length > 8192) {
      throw new InstructorCommandError('command-invalid');
    }
  }

  #requiredUnit(
    state: InstructorControlState,
    unitId: string,
  ): InstructorControlState['unitStatuses'][string] {
    const status = state.unitStatuses[unitId];
    if (status === undefined) {
      throw new InstructorCommandError('command-target-not-found');
    }
    return status;
  }

  async #requiredState(
    eventSessionId: string,
  ): Promise<InstructorControlState> {
    const state = await this.#repository.getState(eventSessionId);
    if (state === undefined) {
      throw new InstructorCommandError('command-target-not-found');
    }
    return state;
  }

  #audit(
    command: InstructorCommand,
    context: InstructorCommandContext,
    requestFingerprint: string,
    status: 'accepted' | 'rejected',
    previousVersion: number,
    resultingVersion: number,
    errorCode?: InstructorCommandErrorCode,
  ): InstructorCommandAudit {
    return {
      actorId: context.actorId,
      auditId: uuidV7(),
      commandId: command.commandId,
      commandType: command.commandType,
      correlationId: context.correlationId,
      eventSessionId: command.eventSessionId,
      ...(errorCode === undefined ? {} : { errorCode }),
      idempotencyKey: context.idempotencyKey,
      previousVersion,
      ...(command.reason === undefined ? {} : { reason: command.reason }),
      recordedAt: this.#clock().toISOString(),
      requestFingerprint,
      resultingVersion,
      status,
    };
  }
}
