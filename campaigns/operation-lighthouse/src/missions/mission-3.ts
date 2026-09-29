import type {
  ResolvedValidationContext,
  ValidationRequest,
  ValidationRuleResult,
  VersionedValidator,
} from '@mission-control/validation-worker';

import type { MissionContent } from './shared.js';
import {
  isRecord,
  isStringArray,
  requiredRulePercentage,
  validationScores,
  validatorOutput,
} from './shared.js';
import { observedToolEvidence } from './tool-evidence.js';

export const connectedCityContent: MissionContent = {
  missionId: 'connected-city',
  version: '1.0.0',
  validatorId: 'operation-lighthouse.connected-city',
  validatorVersion: '1.1.0',
  content: {
    en: {
      locale: 'en',
      title: 'Connected City',
      briefing:
        'Use approved city tools to recommend a safe shelter and viable route from current evidence.',
      coreObjectives: [
        'Query weather, shelter, and transport systems.',
        'Recommend a shelter and route supported by tool evidence.',
        'Handle an unavailable or invalid tool response safely.',
      ],
      advancedObjectives: [
        'Compare multiple routes.',
        'Retry transient failures with a limit.',
        'Record a concise tool-use trace.',
      ],
      hints: [
        'Collect current conditions before selecting a destination.',
        'Reject closed routes and shelters without enough capacity.',
        'Record tool names and evidence identifiers, not credentials.',
      ],
    },
    fr: {
      locale: 'fr',
      title: 'Ville connectée',
      briefing:
        'Utilisez les outils municipaux approuvés pour recommander un abri sûr et un itinéraire praticable.',
      coreObjectives: [
        'Interroger les systèmes météo, abris et transport.',
        'Fonder la recommandation d’abri et d’itinéraire sur les résultats.',
        'Gérer sans risque une réponse d’outil indisponible ou invalide.',
      ],
      advancedObjectives: [
        'Comparer plusieurs itinéraires.',
        'Limiter les nouvelles tentatives après une panne transitoire.',
        'Conserver une trace concise des outils utilisés.',
      ],
      hints: [
        'Collectez les conditions actuelles avant de choisir une destination.',
        'Écartez les routes fermées et les abris sans capacité suffisante.',
        'Consignez les outils et les preuves, jamais les identifiants secrets.',
      ],
    },
    'pt-BR': {
      locale: 'pt-BR',
      title: 'Cidade conectada',
      briefing:
        'Use ferramentas aprovadas da cidade para recomendar um abrigo seguro e uma rota viável.',
      coreObjectives: [
        'Consulte os sistemas de clima, abrigos e transporte.',
        'Baseie a recomendação de abrigo e rota nos resultados das ferramentas.',
        'Trate com segurança respostas indisponíveis ou inválidas.',
      ],
      advancedObjectives: [
        'Compare várias rotas.',
        'Limite novas tentativas após falhas transitórias.',
        'Registre um histórico conciso do uso de ferramentas.',
      ],
      hints: [
        'Colete as condições atuais antes de escolher o destino.',
        'Descarte rotas fechadas e abrigos sem capacidade suficiente.',
        'Registre ferramentas e evidências, nunca credenciais.',
      ],
    },
  },
};

const requiredTools = new Set(['weather', 'shelter', 'transport']);
const rule = (
  ruleId: string,
  passed: boolean,
  severity: ValidationRuleResult['severity'] = 'required',
): ValidationRuleResult => ({
  ruleId,
  status: passed ? 'passed' : 'failed',
  severity,
  messageKey: `validation.connectedCity.${ruleId}.${passed ? 'passed' : 'failed'}`,
});

export const connectedCityValidator: VersionedValidator = {
  id: connectedCityContent.validatorId,
  version: connectedCityContent.validatorVersion,
  validate(
    context: ResolvedValidationContext,
    request: ValidationRequest,
    signal: AbortSignal,
  ) {
    if (signal.aborted) {
      throw signal.reason;
    }
    const submission = context.submission;
    const toolTrace = Array.isArray(submission.toolTrace)
      ? submission.toolTrace.filter(isRecord)
      : [];
    const observed = observedToolEvidence(context);
    const successfulTools = new Set(
      observed.successful.map(({ tool }) => tool),
    );
    const recommendation = isRecord(submission.recommendation)
      ? submission.recommendation
      : undefined;
    const shelterId =
      recommendation !== undefined &&
      typeof recommendation.shelterId === 'string'
        ? recommendation.shelterId
        : '';
    const routeIds =
      recommendation !== undefined && isStringArray(recommendation.routeIds)
        ? recommendation.routeIds
        : [];
    const evidenceIds =
      recommendation !== undefined && isStringArray(recommendation.evidenceIds)
        ? recommendation.evidenceIds
        : [];
    const cited = observed.successful.filter(({ evidenceId }) =>
      evidenceIds.includes(evidenceId),
    );
    const shelter = cited
      .filter(
        ({ tool, operation }) => tool === 'shelter' && operation === 'list',
      )
      .flatMap(({ result }) =>
        result.ok && Array.isArray(result.value)
          ? result.value.filter(isRecord)
          : [],
      )
      .find((item) => item.shelterId === shelterId);
    const validShelter =
      shelter?.status === 'open' &&
      typeof shelter.capacity === 'number' &&
      typeof shelter.occupancy === 'number' &&
      shelter.occupancy < shelter.capacity;
    const validRoute =
      routeIds.length > 0 &&
      cited.some(
        ({ tool, operation, result }) =>
          tool === 'transport' &&
          operation === 'journey' &&
          result.ok &&
          isRecord(result.value) &&
          isStringArray(result.value.routeIds) &&
          result.value.destinationDistrictId === shelter?.districtId &&
          result.value.routeIds.length === routeIds.length &&
          result.value.routeIds.every((id, index) => routeIds[index] === id),
      );
    const grounded =
      observed.grounded(evidenceIds, 3) &&
      [...requiredTools].every((tool) =>
        cited.some((item) => item.tool === tool),
      );
    const handledFailure = observed.traceValid && observed.recoveredFailure;
    const comparedRoutes =
      recommendation !== undefined &&
      Array.isArray(recommendation.alternatives) &&
      recommendation.alternatives.length > 0;
    const rules = [
      rule(
        'required-tools',
        [...requiredTools].every((tool) => successfulTools.has(tool)),
      ),
      rule('tool-provenance', observed.traceValid),
      rule('shelter-recommendation', validShelter),
      rule('route-recommendation', validRoute),
      rule('evidence-grounding', grounded),
      rule('failure-handling', handledFailure),
      rule('route-comparison', comparedRoutes, 'advanced'),
      rule(
        'bounded-retries',
        observed.observations.length > 0 && observed.boundedRetries,
        'advanced',
      ),
      rule(
        'concise-trace',
        observed.traceValid &&
          toolTrace.length <= 8 &&
          observed.observations.length <= 8,
        'advanced',
      ),
      rule(
        'mission-binding',
        context.missionId === connectedCityContent.missionId &&
          request.missionVersion === connectedCityContent.version,
      ),
    ] as const;

    return Promise.resolve(
      validatorOutput(
        rules,
        validationScores({
          requiredOutcome: requiredRulePercentage(rules),
          evidenceAndGrounding: grounded ? 95 : 35,
          reliability: handledFailure ? 90 : 45,
          explainability: validRoute && validShelter ? 85 : 30,
          efficiency:
            observed.traceValid && observed.observations.length <= 8 ? 90 : 40,
        }),
      ),
    );
  },
};
