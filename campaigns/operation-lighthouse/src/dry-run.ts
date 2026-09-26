import { campaignNarrative, type NarrativeBeatId } from './narrative.js';
import {
  activateIncidentModifier,
  deactivateIncidentModifier,
  incidentModifierIds,
  initialCampaignScenarioState,
  type CampaignScenarioState,
  type IncidentModifierId,
} from './modifiers.js';
import { connectedCityValidator } from './missions/mission-3.js';
import { groundTruthValidator } from './missions/mission-2.js';
import { restoreTheLighthouseValidator } from './missions/mission-5.js';
import { signalInTheStormValidator } from './missions/mission-1.js';
import { specialistNetworkValidator } from './missions/mission-4.js';
import { GridSimulator } from './simulators/grid.js';
import { IncidentIntakeSimulator } from './simulators/incidents.js';
import { ResourceInventorySimulator } from './simulators/resources.js';
import { cloneFrozen, type SimulatorResult } from './simulators/shared.js';
import { ShelterSimulator } from './simulators/shelter.js';
import { TransportSimulator } from './simulators/transport.js';
import { WeatherSimulator } from './simulators/weather.js';
import { portAzureWorld } from './world.js';

export const campaignFinaleRecoveryThreshold = 80;

export interface CampaignDryRunMissionResult {
  readonly missionId: string;
  readonly outcome: string;
  readonly checksRun: number;
}

export interface CampaignDryRunReport {
  readonly narrativeBeatIds: readonly NarrativeBeatId[];
  readonly missionResults: readonly CampaignDryRunMissionResult[];
  readonly simulatorEvidence: {
    readonly incidentReportCount: number;
    readonly contradictionCount: number;
    readonly weatherForecastId: string;
    readonly weatherRetryCount: number;
    readonly restoredGridSectorId: string;
    readonly shelterId: string;
    readonly originalRouteIds: readonly string[];
    readonly replannedRouteIds: readonly string[];
    readonly allocationIds: readonly string[];
  };
  readonly modifierIdsActivatedAndReversed: readonly IncidentModifierId[];
  readonly finalScenarioState: CampaignScenarioState;
  readonly initialRecoveryPercent: number;
  readonly finalRecoveryPercent: number;
  readonly finaleThreshold: number;
  readonly finaleUnlocked: boolean;
}

const requireResult = <T>(result: SimulatorResult<T>, operation: string): T => {
  if (!result.ok) {
    throw new Error(`${operation} failed: ${result.error.message}`);
  }
  return result.value;
};

const validationRequest = (
  sequence: number,
  missionId: string,
  validatorId: string,
  validatorVersion: string,
) =>
  ({
    schemaVersion: '1.0',
    validationRequestId: `dry-run-validation-${String(sequence)}`,
    submissionId: `dry-run-submission-${String(sequence)}`,
    eventSessionId: 'dry-run-event',
    unitId: 'dry-run-unit',
    missionId,
    missionVersion: '1.0.0',
    validatorId,
    validatorVersion,
    scoringPolicyVersion: '1.0.0',
    scenarioSeed: 'operation-lighthouse-dry-run',
    requestedAt: `2026-09-25T${String(7 + sequence).padStart(2, '0')}:00:00Z`,
    deadlineAt: `2026-09-25T${String(7 + sequence).padStart(2, '0')}:00:05Z`,
  }) as const;

const missionContext = (
  sequence: number,
  missionId: string,
  submission: Readonly<Record<string, unknown>>,
  observedEvidence: readonly Readonly<Record<string, unknown>>[] = [],
) => ({
  submissionId: `dry-run-submission-${String(sequence)}`,
  eventSessionId: 'dry-run-event',
  unitId: 'dry-run-unit',
  missionId,
  missionVersion: '1.0.0',
  submission,
  observedEvidence,
});

const runMissionValidations = async (): Promise<
  readonly CampaignDryRunMissionResult[]
> => {
  const abortSignal = new AbortController().signal;
  const mission1 = await signalInTheStormValidator.validate(
    missionContext(1, 'signal-in-the-storm', {
      category: 'flooding',
      severity: 'high',
      location: 'Harbor Pier 4',
      affectedServices: ['water-pumping'],
      missingInformation: ['current-hazard'],
      severityExplanation: 'Water is entering occupied homes.',
      duplicateOf: 'incident-002',
    }),
    validationRequest(
      1,
      'signal-in-the-storm',
      signalInTheStormValidator.id,
      signalInTheStormValidator.version,
    ),
    abortSignal,
  );
  const mission2 = await groundTruthValidator.validate(
    missionContext(
      2,
      'ground-truth',
      {
        facts: ['incident-004 reports a closure'],
        assumptions: [],
        unknowns: ['current flood depth'],
        evidenceIds: ['incident-004', 'bulletin-03'],
        recommendation: {
          supported: false,
          summary: 'Verify before dispatch.',
        },
        nextInformationStep: 'Query Transit Control.',
        contradictionResolution:
          'The operator report outranks an unverified driver report.',
        confidence: 0.82,
        untrustedInstructionDetected: true,
      },
      [{ evidenceId: 'incident-004' }],
    ),
    validationRequest(
      2,
      'ground-truth',
      groundTruthValidator.id,
      groundTruthValidator.version,
    ),
    abortSignal,
  );
  const mission3 = await connectedCityValidator.validate(
    missionContext(3, 'connected-city', {
      toolTrace: [
        { tool: 'weather', status: 'success', evidenceId: 'forecast-1000' },
        {
          tool: 'shelter',
          status: 'success',
          evidenceId: 'north-hills-school',
        },
        {
          tool: 'transport',
          status: 'failed',
          retryable: true,
          retries: 1,
        },
        { tool: 'transport', status: 'success', evidenceId: 'journey-1' },
      ],
      recommendation: {
        shelterId: 'north-hills-school',
        routeIds: ['harbor-old-town', 'old-town-north-hills'],
        evidenceIds: ['forecast-1000', 'north-hills-school', 'journey-1'],
        alternatives: ['east-bank-arena'],
      },
    }),
    validationRequest(
      3,
      'connected-city',
      connectedCityValidator.id,
      connectedCityValidator.version,
    ),
    abortSignal,
  );
  const mission4 = await specialistNetworkValidator.validate(
    missionContext(4, 'specialist-network', {
      specialists: [
        {
          roleId: 'weather-specialist',
          responsibility: 'Assess weather hazards.',
          inputFields: ['districtId'],
          outputFields: ['forecastEvidence'],
          latencyMs: 40,
          toolsUsed: ['weather'],
        },
        {
          roleId: 'logistics-specialist',
          responsibility: 'Assess shelters and routes.',
          inputFields: ['originDistrictId'],
          outputFields: ['evacuationOption'],
          latencyMs: 55,
          toolsUsed: ['shelter', 'transport'],
        },
        {
          roleId: 'reviewer',
          responsibility: 'Verify evidence and approve decisions.',
          inputFields: ['candidateDecision'],
          outputFields: ['approval'],
          latencyMs: 25,
          toolsUsed: [],
        },
      ],
      handoffs: [
        {
          sourceRole: 'reviewer',
          targetRole: 'weather-specialist',
          evidenceIds: ['incident-004'],
          payload: { request: 'Assess hazard.' },
        },
        {
          sourceRole: 'weather-specialist',
          targetRole: 'logistics-specialist',
          evidenceIds: ['forecast-1000'],
          payload: { hazard: 'storm-surge-warning' },
        },
        {
          sourceRole: 'logistics-specialist',
          targetRole: 'reviewer',
          evidenceIds: ['forecast-1000', 'journey-1'],
          payload: { recommendation: 'north-hills-school' },
        },
      ],
      review: {
        proposerRoleId: 'logistics-specialist',
        reviewerRoleId: 'reviewer',
        approved: true,
      },
      concurrentAnalyses: [
        { roleId: 'weather-specialist' },
        { roleId: 'logistics-specialist' },
      ],
      disagreements: [
        {
          detected: true,
          resolved: false,
          humanEscalationRequired: true,
        },
      ],
    }),
    validationRequest(
      4,
      'specialist-network',
      specialistNetworkValidator.id,
      specialistNetworkValidator.version,
    ),
    abortSignal,
  );
  const mission5 = await restoreTheLighthouseValidator.validate(
    missionContext(5, 'restore-the-lighthouse', {
      incidentAssessment: {
        hazards: ['grid-failure', 'communications-loss', 'storm-surge'],
      },
      evidenceIds: [
        'forecast-1000',
        'harbor-loop-health',
        'shelter-state',
        'journey-1',
        'inventory-1',
      ],
      toolTrace: [
        { tool: 'weather', status: 'success' },
        { tool: 'grid', status: 'success' },
        { tool: 'shelter', status: 'success' },
        { tool: 'transport', status: 'success' },
        { tool: 'resources', status: 'success' },
      ],
      prioritizedActions: [
        {
          priority: 1,
          actionId: 'restore-radio',
          impact: 'high',
          rationale: 'Restore emergency coordination.',
          evidenceIds: ['harbor-loop-health', 'inventory-1'],
        },
        {
          priority: 2,
          actionId: 'evacuate-harbor',
          impact: 'high',
          rationale: 'Move residents ahead of the surge.',
          evidenceIds: ['forecast-1000', 'journey-1'],
        },
      ],
      resourceAllocations: [
        {
          resourceId: 'portable-generators',
          quantity: 2,
          destinationDistrictId: 'old-town',
          purpose: 'Restore public safety radio.',
        },
        {
          resourceId: 'evacuation-buses',
          quantity: 3,
          destinationDistrictId: 'harbor',
          purpose: 'Evacuate residents.',
        },
      ],
      specialistHandoffs: [
        {
          sourceRole: 'weather-specialist',
          targetRole: 'logistics-specialist',
          evidenceIds: ['forecast-1000'],
        },
        {
          sourceRole: 'logistics-specialist',
          targetRole: 'reviewer',
          evidenceIds: ['journey-1', 'inventory-1'],
        },
      ],
      finalReview: {
        reviewerRoleId: 'reviewer',
        planVersion: '2',
        approved: true,
      },
      audit: {
        decisionId: 'decision-001',
        createdAt: '2026-09-25T12:00:00Z',
        evidenceIds: ['forecast-1000', 'inventory-1'],
      },
      incidentModifierId: 'storm-surge-escalation',
      incidentModifierApplied: true,
      replan: {
        failedTool: 'transport',
        changedActionIds: ['evacuate-harbor'],
      },
      rejectedAlternatives: [
        {
          alternativeId: 'harbor-east-bank',
          reason: 'Route is closed.',
        },
      ],
      humanApprovals: [
        {
          actionId: 'restore-radio',
          approverRole: 'mission-commander',
          approved: true,
        },
        {
          actionId: 'evacuate-harbor',
          approverRole: 'mission-commander',
          approved: true,
        },
      ],
      totalToolCalls: 9,
    }),
    validationRequest(
      5,
      'restore-the-lighthouse',
      restoreTheLighthouseValidator.id,
      restoreTheLighthouseValidator.version,
    ),
    abortSignal,
  );

  return [
    {
      missionId: 'signal-in-the-storm',
      outcome: mission1.outcome,
      checksRun: mission1.checksRun,
    },
    {
      missionId: 'ground-truth',
      outcome: mission2.outcome,
      checksRun: mission2.checksRun,
    },
    {
      missionId: 'connected-city',
      outcome: mission3.outcome,
      checksRun: mission3.checksRun,
    },
    {
      missionId: 'specialist-network',
      outcome: mission4.outcome,
      checksRun: mission4.checksRun,
    },
    {
      missionId: 'restore-the-lighthouse',
      outcome: mission5.outcome,
      checksRun: mission5.checksRun,
    },
  ];
};

const cycleIncidentModifiers = (): {
  readonly finalState: CampaignScenarioState;
  readonly modifierIds: readonly IncidentModifierId[];
} => {
  const parameters: Readonly<
    Record<IncidentModifierId, Readonly<Record<string, unknown>>>
  > = {
    'storm-surge-escalation': {},
    'grid-sector-failure': { gridSectorId: 'east-loop' },
    'route-emergency-closure': { routeId: 'civic-center-east-bank' },
    'shelter-capacity-pressure': {
      shelterId: 'north-hills-school',
      reduction: 40,
    },
    'simulator-tool-outage': { toolId: 'transport' },
  };
  let state = initialCampaignScenarioState();
  for (const modifierId of incidentModifierIds) {
    state = requireResult(
      activateIncidentModifier(state, modifierId, parameters[modifierId]),
      `Activate ${modifierId}`,
    );
    state = requireResult(
      deactivateIncidentModifier(state, modifierId),
      `Deactivate ${modifierId}`,
    );
  }
  return { finalState: state, modifierIds: incidentModifierIds };
};

export const runCampaignDryRun = async (): Promise<CampaignDryRunReport> => {
  const incidentSimulator = new IncidentIntakeSimulator();
  const initialReports = requireResult(
    incidentSimulator.getReports(),
    'Read incident reports',
  );
  requireResult(incidentSimulator.advance(), 'Advance incident intake');
  const contradictions = requireResult(
    incidentSimulator.getContradictions('incident-004'),
    'Read incident contradictions',
  );

  const weatherSimulator = new WeatherSimulator();
  requireResult(weatherSimulator.advance(), 'Advance weather scenario');
  const failedForecast = weatherSimulator.getForecast();
  if (failedForecast.ok || !failedForecast.error.retryable) {
    throw new Error('Expected a retryable weather forecast failure.');
  }
  const forecast = requireResult(
    weatherSimulator.getForecast(),
    'Retry weather forecast',
  );

  const gridSimulator = new GridSimulator();
  requireResult(
    gridSimulator.triggerOutage('upland-loop', 'equipment-failure'),
    'Trigger grid outage',
  );
  const restoredGrid = requireResult(
    gridSimulator.restoreSector({
      gridSectorId: 'upland-loop',
      crewCount: 2,
      generatorUnits: 1,
    }),
    'Restore grid sector',
  );

  const shelterSimulator = new ShelterSimulator();
  const shelter = requireResult(
    shelterSimulator.admit({
      shelterId: 'north-hills-school',
      people: 12,
      accessiblePlaces: 2,
      pets: 1,
    }),
    'Admit shelter residents',
  );

  const transportSimulator = new TransportSimulator();
  const originalJourney = requireResult(
    transportSimulator.planJourney('harbor', 'east-bank', 'emergency'),
    'Plan original journey',
  );
  requireResult(
    transportSimulator.updateRoute({
      routeId: 'civic-center-east-bank',
      status: 'closed',
      delayMinutes: 0,
      allowedModes: [],
      restrictionReason: 'incident-modifier',
    }),
    'Close route',
  );
  const replannedJourney = requireResult(
    transportSimulator.planJourney('harbor', 'east-bank', 'emergency'),
    'Replan journey',
  );

  const resourceSimulator = new ResourceInventorySimulator();
  const generatorAllocation = requireResult(
    resourceSimulator.allocate({
      resourceId: 'portable-generators',
      quantity: 2,
      missionId: 'restore-the-lighthouse',
      destinationDistrictId: 'old-town',
      purpose: 'Restore public safety radio.',
    }),
    'Allocate generators',
  );
  const busAllocation = requireResult(
    resourceSimulator.allocate({
      resourceId: 'evacuation-buses',
      quantity: 3,
      missionId: 'restore-the-lighthouse',
      destinationDistrictId: 'harbor',
      purpose: 'Evacuate residents before storm surge.',
    }),
    'Allocate evacuation buses',
  );

  const missionResults = await runMissionValidations();
  if (missionResults.some(({ outcome }) => outcome !== 'passed')) {
    throw new Error('Every mission must pass the campaign dry run.');
  }
  const modifierCycle = cycleIncidentModifiers();
  const finalRecoveryPercent = Math.min(
    100,
    portAzureWorld.recovery.overallPercent + missionResults.length * 5,
  );

  return cloneFrozen({
    narrativeBeatIds: campaignNarrative.timeline.map(({ beatId }) => beatId),
    missionResults,
    simulatorEvidence: {
      incidentReportCount: initialReports.length,
      contradictionCount: contradictions.length,
      weatherForecastId: forecast.forecastId,
      weatherRetryCount: 1,
      restoredGridSectorId: restoredGrid.gridSectorId,
      shelterId: shelter.shelterId,
      originalRouteIds: originalJourney.routeIds,
      replannedRouteIds: replannedJourney.routeIds,
      allocationIds: [
        generatorAllocation.allocationId,
        busAllocation.allocationId,
      ],
    },
    modifierIdsActivatedAndReversed: modifierCycle.modifierIds,
    finalScenarioState: modifierCycle.finalState,
    initialRecoveryPercent: portAzureWorld.recovery.overallPercent,
    finalRecoveryPercent,
    finaleThreshold: campaignFinaleRecoveryThreshold,
    finaleUnlocked: finalRecoveryPercent >= campaignFinaleRecoveryThreshold,
  });
};
