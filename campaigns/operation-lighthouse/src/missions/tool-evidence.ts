import {
  isSimulatorObservation,
  type SimulatorObservation,
} from '@mission-control/event-contracts';
import type { ResolvedValidationContext } from '@mission-control/validation-worker';

import { isRecord, isStringArray } from './shared.js';

const sameInvocation = (
  left: SimulatorObservation,
  right: SimulatorObservation,
) =>
  left.tool === right.tool &&
  left.operation === right.operation &&
  Object.keys(left.arguments).length === Object.keys(right.arguments).length &&
  Object.entries(left.arguments).every(
    ([key, value]) => right.arguments[key] === value,
  );

export const observedToolEvidence = (context: ResolvedValidationContext) => {
  const observations = context.observedEvidence.filter(
    (item): item is SimulatorObservation =>
      isSimulatorObservation(item) &&
      item.eventSessionId === context.eventSessionId &&
      item.unitId === context.unitId &&
      item.missionId === context.missionId,
  );
  const trace = Array.isArray(context.submission.toolTrace)
    ? context.submission.toolTrace
    : [];
  const matched = trace.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const observation = observations.find(
      ({ evidenceId }) => evidenceId === entry.evidenceId,
    );
    return observation !== undefined &&
      observation.tool === entry.tool &&
      entry.status === (observation.result.ok ? 'success' : 'failed')
      ? [observation]
      : [];
  });
  const traceValid =
    trace.length > 0 &&
    matched.length === trace.length &&
    new Set(matched.map(({ evidenceId }) => evidenceId)).size === trace.length;
  const successful = matched.filter(({ result }) => result.ok);
  const successfulIds = new Set(successful.map(({ evidenceId }) => evidenceId));
  const grounded = (ids: unknown, minimum = 1): ids is readonly string[] =>
    isStringArray(ids) &&
    ids.length >= minimum &&
    new Set(ids).size === ids.length &&
    ids.every((id) => successfulIds.has(id));
  const recoveredFailure = matched.some(
    (failure) =>
      !failure.result.ok &&
      failure.result.error.retryable &&
      matched.some(
        (success) =>
          success.result.ok &&
          success.sequence > failure.sequence &&
          sameInvocation(failure, success),
      ) &&
      observations.filter((item) => sameInvocation(failure, item)).length <= 3,
  );
  return {
    observations,
    successful,
    traceValid,
    grounded,
    recoveredFailure,
    boundedRetries: observations.every(
      (failure) =>
        failure.result.ok ||
        !failure.result.error.retryable ||
        observations.filter((item) => sameInvocation(failure, item)).length <=
          3,
    ),
  };
};
