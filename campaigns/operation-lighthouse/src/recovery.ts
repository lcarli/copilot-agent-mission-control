import type {
  ResolvedValidationContext,
  ValidatorOutput,
} from '@mission-control/validation-worker';

import { isRecord, isStringArray } from './missions/shared.js';
import { cloneFrozen } from './simulators/shared.js';
import { districtIds, portAzureWorld, type DistrictId } from './world.js';

export const lighthouseRecoveryPolicy = cloneFrozen({
  version: '1.0.0',
  missionWeights: {
    'signal-in-the-storm': 10,
    'ground-truth': 10,
    'connected-city': 20,
    'specialist-network': 10,
    'restore-the-lighthouse': 50,
  },
  finaleThreshold: 80,
} as const);

export const campaignFinaleRecoveryThreshold =
  lighthouseRecoveryPolicy.finaleThreshold;

type RecoveryMissionId = keyof typeof lighthouseRecoveryPolicy.missionWeights;

export interface RecoveryDecision {
  readonly eventSessionId: string;
  readonly unitId: string;
  readonly missionId: RecoveryMissionId;
  readonly submissionId: string;
  readonly districtIds: readonly DistrictId[];
}

export interface RecoveryDecisionFeedback {
  readonly policyVersion: string;
  readonly status: 'applied' | 'unchanged' | 'not-applied' | 'unattributed';
  readonly districtIds: readonly DistrictId[];
}

interface DecisionRecoveryDistrict {
  readonly districtId: DistrictId;
  readonly baselinePercent: number;
  readonly recoveryPercent: number;
  readonly contributionCount: number;
  readonly status: 'critical' | 'stabilizing' | 'recovered';
}

export interface DecisionRecoveryProjection {
  readonly source: 'scenario-baseline' | 'validated-decisions';
  readonly policyVersion: string;
  readonly baselinePercent: number;
  readonly eligibleUnitCount: number;
  readonly contributionCount: number;
  readonly collectiveRecoveryPercent: number;
  readonly districts: readonly DecisionRecoveryDistrict[];
  readonly finaleThreshold: number;
  readonly finaleUnlocked: boolean;
}

const isRecoveryMissionId = (value: string): value is RecoveryMissionId =>
  Object.hasOwn(lighthouseRecoveryPolicy.missionWeights, value);

const attributedDistricts = (
  missionId: RecoveryMissionId,
  submission: Readonly<Record<string, unknown>>,
): readonly DistrictId[] => {
  const targets = new Set<DistrictId>();
  switch (missionId) {
    case 'signal-in-the-storm': {
      const services = submission.affectedServices;
      if (!isStringArray(services))
        throw new Error(
          'A validated incident must identify affected services.',
        );
      for (const service of portAzureWorld.services) {
        if (services.includes(service.serviceId))
          targets.add(service.districtId);
      }
      break;
    }
    case 'ground-truth':
    case 'specialist-network':
      return districtIds;
    case 'connected-city': {
      const recommendation = submission.recommendation;
      if (!isRecord(recommendation) || !isStringArray(recommendation.routeIds))
        throw new Error(
          'A validated evacuation decision must identify routes.',
        );
      const shelter = portAzureWorld.shelters.find(
        ({ shelterId }) => shelterId === recommendation.shelterId,
      );
      if (shelter === undefined)
        throw new Error(
          'A validated evacuation decision must identify a shelter.',
        );
      targets.add(shelter.districtId);
      for (const routeId of recommendation.routeIds) {
        const route = portAzureWorld.routes.find(
          (candidate) => candidate.routeId === routeId,
        );
        if (route === undefined)
          throw new Error(
            'A validated evacuation decision has an unknown route.',
          );
        targets.add(route.fromDistrictId);
        targets.add(route.toDistrictId);
      }
      break;
    }
    case 'restore-the-lighthouse': {
      if (!Array.isArray(submission.resourceAllocations))
        throw new Error('A validated response plan must identify allocations.');
      const allocations: readonly unknown[] = submission.resourceAllocations;
      for (const allocation of allocations) {
        const district = isRecord(allocation)
          ? districtIds.find((id) => id === allocation.destinationDistrictId)
          : undefined;
        if (district === undefined)
          throw new Error(
            'A validated allocation must identify a city district.',
          );
        targets.add(district);
      }
      break;
    }
  }
  return districtIds.filter((id) => targets.has(id));
};

export class LighthouseRecovery {
  readonly #decisions = new Map<string, RecoveryDecision>();

  constructor(decisions: readonly RecoveryDecision[] = []) {
    for (const decision of decisions) {
      this.#decisions.set(
        JSON.stringify([
          decision.eventSessionId,
          decision.unitId,
          decision.missionId,
        ]),
        cloneFrozen(decision),
      );
    }
  }

  decisions(): readonly RecoveryDecision[] {
    return cloneFrozen([...this.#decisions.values()]);
  }

  recordValidation(
    context: ResolvedValidationContext,
    outcome: ValidatorOutput['outcome'],
  ): RecoveryDecisionFeedback {
    const policyVersion = lighthouseRecoveryPolicy.version;
    if (outcome !== 'passed')
      return cloneFrozen({
        policyVersion,
        status: 'not-applied',
        districtIds: [],
      });
    if (!isRecoveryMissionId(context.missionId))
      throw new Error('Recovery requires a supported Lighthouse mission.');
    const targets = attributedDistricts(context.missionId, context.submission);
    if (targets.length === 0)
      return cloneFrozen({
        policyVersion,
        status: 'unattributed',
        districtIds: [],
      });
    const key = JSON.stringify([
      context.eventSessionId,
      context.unitId,
      context.missionId,
    ]);
    const previous = this.#decisions.get(key);
    this.#decisions.set(
      key,
      cloneFrozen({
        eventSessionId: context.eventSessionId,
        unitId: context.unitId,
        missionId: context.missionId,
        submissionId: context.submissionId,
        districtIds: targets,
      }),
    );
    return cloneFrozen({
      policyVersion,
      status:
        previous?.districtIds.join('|') === targets.join('|')
          ? 'unchanged'
          : 'applied',
      districtIds: targets,
    });
  }

  project(
    eventSessionId: string,
    eligibleUnitIds: readonly string[],
  ): DecisionRecoveryProjection {
    const units = new Set(eligibleUnitIds);
    const decisions = [...this.#decisions.values()].filter(
      (decision) =>
        decision.eventSessionId === eventSessionId &&
        units.has(decision.unitId),
    );
    const districts = portAzureWorld.recovery.districts.map(
      (baseline): DecisionRecoveryDistrict => {
        const contributions = decisions.filter((decision) =>
          decision.districtIds.includes(baseline.districtId),
        );
        const weight = contributions.reduce(
          (sum, decision) =>
            sum + lighthouseRecoveryPolicy.missionWeights[decision.missionId],
          0,
        );
        const recoveryPercent =
          baseline.recoveryPercent +
          (units.size === 0
            ? 0
            : Math.floor(
                ((100 - baseline.recoveryPercent) * weight) /
                  (100 * units.size),
              ));
        return {
          districtId: baseline.districtId,
          baselinePercent: baseline.recoveryPercent,
          recoveryPercent,
          contributionCount: contributions.length,
          status:
            recoveryPercent === 100
              ? 'recovered'
              : baseline.status === 'critical' && recoveryPercent < 50
                ? 'critical'
                : 'stabilizing',
        };
      },
    );
    const collectiveRecoveryPercent = Math.floor(
      districts.reduce((sum, district) => sum + district.recoveryPercent, 0) /
        districts.length,
    );
    return cloneFrozen({
      source:
        decisions.length === 0 ? 'scenario-baseline' : 'validated-decisions',
      policyVersion: lighthouseRecoveryPolicy.version,
      baselinePercent: portAzureWorld.recovery.overallPercent,
      eligibleUnitCount: units.size,
      contributionCount: decisions.length,
      collectiveRecoveryPercent,
      districts,
      finaleThreshold: campaignFinaleRecoveryThreshold,
      finaleUnlocked:
        units.size > 0 &&
        collectiveRecoveryPercent >= campaignFinaleRecoveryThreshold,
    });
  }
}
