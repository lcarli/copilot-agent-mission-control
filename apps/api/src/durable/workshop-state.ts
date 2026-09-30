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
} from '../workshop-runtime.js';
import type { DurableWorkshopStore } from './store.js';
import { stateProblem } from './values.js';

export class DurableWorkshopState implements WorkshopState {
  constructor(private readonly store: DurableWorkshopStore) {}

  saveSubmission(context: ResolvedValidationContext) {
    this.store.put(
      'submission',
      [context.submissionId],
      context,
      context.eventSessionId,
    );
    return Promise.resolve();
  }

  getSubmission(eventSessionId: string, submissionId: string) {
    return this.store.get('submission', [submissionId], eventSessionId);
  }

  saveFeedback(eventSessionId: string, feedback: MissionSubmissionFeedback) {
    this.store.put(
      'feedback',
      [feedback.submissionId],
      feedback,
      eventSessionId,
    );
    return Promise.resolve();
  }

  getFeedback(eventSessionId: string, submissionId: string) {
    return this.store.get('feedback', [submissionId], eventSessionId);
  }

  async invokeSimulator(
    scope: SimulatorScope,
    input: SimulatorInvocation,
    evidenceId: string,
    recordedAt: string,
  ) {
    const observations = await this.observations(scope);
    if (observations.length >= 1000)
      throw stateProblem('state-simulator-capacity-reached');
    const simulator = LighthouseSimulatorSession.restore(scope, observations);
    const observation = simulator.invoke(input, evidenceId, recordedAt);
    this.store.put(
      'observation',
      [evidenceId],
      observation,
      scope.eventSessionId,
    );
    return observation;
  }

  async observations(scope: SimulatorScope) {
    return (
      await this.store.query('observation', scope.eventSessionId, [
        { field: 'unitId', value: scope.unitId },
        { field: 'missionId', value: scope.missionId },
      ])
    ).toSorted((left, right) => left.sequence - right.sequence);
  }

  async recordRecovery(
    context: ResolvedValidationContext,
    outcome: ValidatorOutput['outcome'],
  ) {
    const key = [context.unitId, context.missionId];
    const previous = await this.store.get(
      'recovery',
      key,
      context.eventSessionId,
    );
    const model = new LighthouseRecovery(
      previous === undefined ? [] : [previous],
    );
    const feedback = model.recordValidation(context, outcome);
    if (feedback.status === 'applied' || feedback.status === 'unchanged') {
      const decision = model.decisions()[0];
      if (decision === undefined)
        throw stateProblem('state-recovery-invalid', 500);
      this.store.put('recovery', key, decision, context.eventSessionId);
    }
    return feedback;
  }

  async projectRecovery(
    eventSessionId: string,
    eligibleUnitIds: readonly string[],
  ) {
    const decisions = await this.store.query('recovery', eventSessionId);
    return new LighthouseRecovery(decisions).project(
      eventSessionId,
      eligibleUnitIds,
    );
  }

  appendAudit(entry: WorkshopAuditEntry) {
    this.store.put(
      'audit',
      [entry.commandId, entry.correlationId],
      entry,
      entry.eventSessionId,
    );
    return Promise.resolve();
  }

  listAudit(eventSessionId: string) {
    return this.store.query('audit', eventSessionId);
  }
}
