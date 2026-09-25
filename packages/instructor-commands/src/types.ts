export type ControlledUnitStatus =
  | 'registered'
  | 'ready'
  | 'active'
  | 'disconnected'
  | 'muted'
  | 'withdrawn'
  | 'completed';

export interface InstructorControlState {
  readonly eventSessionId: string;
  readonly eventStatus: 'draft' | 'lobby' | 'active' | 'paused' | 'closed';
  readonly closeConfirmationPhrase: string;
  readonly activeModifiers: Readonly<
    Record<string, Readonly<Record<string, unknown>>>
  >;
  readonly unitStatuses: Readonly<Record<string, ControlledUnitStatus>>;
  readonly unitStatusesBeforeMute: Readonly<
    Record<string, ControlledUnitStatus>
  >;
  readonly missionOverrides: Readonly<
    Record<string, 'available' | 'completed' | 'blocked'>
  >;
  readonly scoreAdjustments: readonly ScoreAdjustment[];
  readonly version: number;
  readonly updatedAt: string;
}

export interface ScoreAdjustment {
  readonly commandId: string;
  readonly unitId: string;
  readonly missionId?: string;
  readonly points: number;
  readonly reasonCode: string;
  readonly explanation: string;
}

interface CommandEnvelope {
  readonly schemaVersion: '1.0';
  readonly commandId: string;
  readonly eventSessionId: string;
  readonly expectedVersion: number;
  readonly requestedAt: string;
  readonly reason?: string;
}

export type InstructorCommand =
  | (CommandEnvelope & {
      readonly commandType:
        'incident-modifier.activate' | 'incident-modifier.deactivate';
      readonly target: { readonly modifierId: string };
      readonly payload: {
        readonly parameters: Readonly<Record<string, unknown>>;
      };
    })
  | (CommandEnvelope & {
      readonly commandType: 'mission.override';
      readonly target: { readonly unitId: string; readonly missionId: string };
      readonly payload: {
        readonly outcome: 'available' | 'completed' | 'blocked';
      };
    })
  | (CommandEnvelope & {
      readonly commandType: 'score.adjust';
      readonly target: { readonly unitId: string; readonly missionId?: string };
      readonly payload: {
        readonly points: number;
        readonly reasonCode: string;
        readonly explanation: string;
      };
    })
  | (CommandEnvelope & {
      readonly commandType: 'unit.mute' | 'unit.unmute';
      readonly target: { readonly unitId: string };
      readonly payload: Record<string, never>;
    })
  | (CommandEnvelope & {
      readonly commandType: 'event-session.close';
      readonly target: Record<string, never>;
      readonly payload: { readonly confirmationPhrase: string };
    });

export interface InstructorCommandContext {
  readonly actorId: string;
  readonly correlationId: string;
  readonly idempotencyKey: string;
}

export interface InstructorCommandAudit {
  readonly auditId: string;
  readonly commandId: string;
  readonly commandType: InstructorCommand['commandType'];
  readonly eventSessionId: string;
  readonly actorId: string;
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly requestFingerprint: string;
  readonly status: 'accepted' | 'rejected';
  readonly errorCode?: InstructorCommandErrorCode;
  readonly reason?: string;
  readonly previousVersion: number;
  readonly resultingVersion: number;
  readonly recordedAt: string;
}

export type InstructorCommandErrorCode =
  | 'command-invalid'
  | 'command-idempotency-conflict'
  | 'command-stale-version'
  | 'command-reason-required'
  | 'command-confirmation-invalid'
  | 'command-state-invalid'
  | 'command-target-not-found';

export interface InstructorCommandResult {
  readonly audit: InstructorCommandAudit;
  readonly state: InstructorControlState;
}
