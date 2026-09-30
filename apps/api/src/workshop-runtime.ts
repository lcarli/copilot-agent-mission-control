import type {
  InstructorAction,
  InstructorActor,
  UnitTokenService,
} from '@mission-control/auth';
import type {
  DecisionRecoveryProjection,
  RecoveryDecisionFeedback,
} from '@mission-control/campaign-operation-lighthouse';
import type {
  MissionSubmissionFeedback,
  SimulatorInvocation,
  SimulatorObservation,
} from '@mission-control/event-contracts';
import type { EventUnitRepository } from '@mission-control/event-management';
import type { HintUsageRepository } from '@mission-control/hint-system';
import type { MissionRepository } from '@mission-control/mission-management';
import type { ScoreLedgerRepository } from '@mission-control/scoring';
import type {
  ResolvedValidationContext,
  ValidationResultRepository,
  ValidatorOutput,
} from '@mission-control/validation-worker';

import type { HealthProbe } from './health.js';

export interface SimulatorScope {
  readonly eventSessionId: string;
  readonly unitId: string;
  readonly missionId: string;
}

export interface WorkshopAuditEntry {
  readonly eventSessionId: string;
  readonly commandId: string;
  readonly commandType: string;
  readonly actorId: string;
  readonly correlationId: string;
  readonly status: 'accepted' | 'rejected';
  readonly recordedAt: string;
}

export interface WorkshopState {
  saveSubmission(context: ResolvedValidationContext): Promise<void>;
  getSubmission(
    eventSessionId: string,
    submissionId: string,
  ): Promise<ResolvedValidationContext | undefined>;
  saveFeedback(
    eventSessionId: string,
    feedback: MissionSubmissionFeedback,
  ): Promise<void>;
  getFeedback(
    eventSessionId: string,
    submissionId: string,
  ): Promise<MissionSubmissionFeedback | undefined>;
  invokeSimulator(
    scope: SimulatorScope,
    invocation: SimulatorInvocation,
    observationId: string,
    observedAt: string,
  ): Promise<SimulatorObservation>;
  observations(scope: SimulatorScope): Promise<readonly SimulatorObservation[]>;
  recordRecovery(
    context: ResolvedValidationContext,
    outcome: ValidatorOutput['outcome'],
  ): Promise<RecoveryDecisionFeedback>;
  projectRecovery(
    eventSessionId: string,
    eligibleUnitIds: readonly string[],
  ): Promise<DecisionRecoveryProjection>;
  appendAudit(entry: WorkshopAuditEntry): Promise<void>;
  listAudit(eventSessionId: string): Promise<readonly WorkshopAuditEntry[]>;
}

export interface WorkshopRequests {
  serialize<T>(resource: string, operation: () => Promise<T>): Promise<T>;
  mutate(
    resource: string,
    scope: readonly string[],
    key: string | string[] | undefined,
    body: unknown,
    operation: () => Promise<unknown>,
  ): Promise<unknown>;
}

export type WorkshopProfile =
  | {
      readonly mode: 'local-rehearsal';
      readonly persistence: 'memory';
      readonly transport: 'http-polling';
      readonly source: 'local-event';
      readonly closeConfirmationPhrase: 'CLOSE LOCAL EVENT';
    }
  | {
      readonly mode: 'hosted';
      readonly persistence: 'cosmos';
      readonly transport: 'signalr';
      readonly source: 'hosted-event';
      readonly closeConfirmationPhrase: 'CLOSE EVENT';
    };

export interface WorkshopRuntime {
  readonly profile: WorkshopProfile;
  readonly eventRepository: EventUnitRepository;
  readonly missionRepository: MissionRepository;
  readonly scoreRepository: ScoreLedgerRepository;
  readonly validationRepository: ValidationResultRepository;
  readonly hintRepository: HintUsageRepository;
  readonly unitTokens: UnitTokenService;
  readonly requests: WorkshopRequests;
  readonly state: WorkshopState;
  readonly readinessProbes: readonly HealthProbe[];
  readonly eventProbes: readonly HealthProbe[];
  authorizeInstructor(
    authorization: string | undefined,
    action: InstructorAction,
    eventSessionId?: string,
  ): Promise<InstructorActor>;
  close(): Promise<void>;
}
