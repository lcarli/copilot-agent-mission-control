import {
  LighthouseRecovery,
  LighthouseSimulatorSession,
} from '@mission-control/campaign-operation-lighthouse';
import type {
  MissionSubmissionFeedback,
  SimulatorInvocation,
} from '@mission-control/event-contracts';
import type {
  ResolvedValidationContext,
  ValidatorOutput,
} from '@mission-control/validation-worker';

import type {
  SimulatorScope,
  WorkshopAuditEntry,
  WorkshopState,
} from './workshop-runtime.js';

const scopeKey = (scope: SimulatorScope) =>
  JSON.stringify([scope.eventSessionId, scope.unitId, scope.missionId]);
const submissionKey = (eventSessionId: string, submissionId: string) =>
  JSON.stringify([eventSessionId, submissionId]);

export class MemoryWorkshopState implements WorkshopState {
  readonly #submissions = new Map<string, ResolvedValidationContext>();
  readonly #feedback = new Map<string, MissionSubmissionFeedback>();
  readonly #simulators = new Map<string, LighthouseSimulatorSession>();
  readonly #recovery = new LighthouseRecovery();
  readonly #audit: WorkshopAuditEntry[] = [];

  saveSubmission(context: ResolvedValidationContext): Promise<void> {
    this.#submissions.set(
      submissionKey(context.eventSessionId, context.submissionId),
      structuredClone(context),
    );
    return Promise.resolve();
  }

  getSubmission(eventSessionId: string, submissionId: string) {
    return Promise.resolve(
      structuredClone(
        this.#submissions.get(submissionKey(eventSessionId, submissionId)),
      ),
    );
  }

  saveFeedback(eventSessionId: string, feedback: MissionSubmissionFeedback) {
    this.#feedback.set(
      submissionKey(eventSessionId, feedback.submissionId),
      structuredClone(feedback),
    );
    return Promise.resolve();
  }

  getFeedback(eventSessionId: string, submissionId: string) {
    return Promise.resolve(
      structuredClone(
        this.#feedback.get(submissionKey(eventSessionId, submissionId)),
      ),
    );
  }

  invokeSimulator(
    scope: SimulatorScope,
    invocation: SimulatorInvocation,
    observationId: string,
    observedAt: string,
  ) {
    const key = scopeKey(scope);
    let session = this.#simulators.get(key);
    if (session === undefined) {
      session = new LighthouseSimulatorSession(scope);
      this.#simulators.set(key, session);
    }
    return Promise.resolve(
      session.invoke(invocation, observationId, observedAt),
    );
  }

  observations(scope: SimulatorScope) {
    return Promise.resolve(
      this.#simulators.get(scopeKey(scope))?.observations() ?? [],
    );
  }

  recordRecovery(
    context: ResolvedValidationContext,
    outcome: ValidatorOutput['outcome'],
  ) {
    return Promise.resolve(this.#recovery.recordValidation(context, outcome));
  }

  projectRecovery(eventSessionId: string, eligibleUnitIds: readonly string[]) {
    return Promise.resolve(
      this.#recovery.project(eventSessionId, eligibleUnitIds),
    );
  }

  appendAudit(entry: WorkshopAuditEntry) {
    this.#audit.push(structuredClone(entry));
    return Promise.resolve();
  }

  listAudit(eventSessionId: string) {
    return Promise.resolve(
      this.#audit
        .filter((entry) => entry.eventSessionId === eventSessionId)
        .map((entry) => structuredClone(entry)),
    );
  }
}
