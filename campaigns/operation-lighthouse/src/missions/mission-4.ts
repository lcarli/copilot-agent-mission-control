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
  validationScores,
  validatorOutput,
} from './shared.js';

export const specialistNetworkContent: MissionContent = {
  missionId: 'specialist-network',
  version: '1.0.0',
  validatorId: 'operation-lighthouse.specialist-network',
  validatorVersion: '1.0.0',
  content: {
    en: {
      locale: 'en',
      title: 'Specialist Network',
      briefing:
        'Coordinate bounded specialists through explicit, evidence-preserving handoffs and independent review.',
      coreObjectives: [
        'Define at least three specialist roles with bounded responsibilities.',
        'Declare input and output contracts for every specialist.',
        'Route work through explicit handoffs that preserve evidence.',
        'Require independent review before operational approval.',
      ],
      advancedObjectives: [
        'Run independent analyses concurrently.',
        'Detect and escalate unresolved specialist disagreement.',
        'Record latency and tool usage for every specialist.',
      ],
      hints: [
        'Give each specialist one clear decision domain.',
        'Make handoffs name their sender, recipient, evidence, and payload.',
        'Keep the reviewer separate from the specialist proposing the decision.',
      ],
    },
    fr: {
      locale: 'fr',
      title: 'Réseau de spécialistes',
      briefing:
        'Coordonnez des spécialistes au périmètre défini avec des transmissions explicites et une revue indépendante.',
      coreObjectives: [
        'Définir au moins trois rôles spécialisés et limités.',
        'Déclarer les contrats d’entrée et de sortie de chaque spécialiste.',
        'Acheminer le travail en préservant les preuves lors des transmissions.',
        'Exiger une revue indépendante avant approbation opérationnelle.',
      ],
      advancedObjectives: [
        'Exécuter des analyses indépendantes en parallèle.',
        'Détecter et escalader les désaccords non résolus.',
        'Consigner la latence et l’utilisation des outils par spécialiste.',
      ],
      hints: [
        'Attribuez un seul domaine de décision clair à chaque spécialiste.',
        'Nommez l’émetteur, le destinataire, les preuves et la charge utile.',
        'Séparez la personne qui révise du spécialiste qui propose la décision.',
      ],
    },
    'pt-BR': {
      locale: 'pt-BR',
      title: 'Rede de especialistas',
      briefing:
        'Coordene especialistas com escopo limitado por transferências explícitas, preservando evidências e revisão independente.',
      coreObjectives: [
        'Defina pelo menos três funções especialistas com responsabilidades limitadas.',
        'Declare contratos de entrada e saída para cada especialista.',
        'Encaminhe o trabalho por transferências que preservem evidências.',
        'Exija revisão independente antes da aprovação operacional.',
      ],
      advancedObjectives: [
        'Execute análises independentes em paralelo.',
        'Detecte e escale divergências não resolvidas.',
        'Registre latência e uso de ferramentas por especialista.',
      ],
      hints: [
        'Dê a cada especialista um único domínio claro de decisão.',
        'Nomeie origem, destino, evidências e conteúdo de cada transferência.',
        'Mantenha a revisão separada de quem propôs a decisão.',
      ],
    },
  },
};

const rule = (
  ruleId: string,
  passed: boolean,
  severity: ValidationRuleResult['severity'] = 'required',
): ValidationRuleResult => ({
  ruleId,
  status: passed ? 'passed' : 'failed',
  severity,
  messageKey: `validation.specialistNetwork.${ruleId}.${passed ? 'passed' : 'failed'}`,
});

export const specialistNetworkValidator: VersionedValidator = {
  id: specialistNetworkContent.validatorId,
  version: specialistNetworkContent.validatorVersion,
  validate(
    context: ResolvedValidationContext,
    request: ValidationRequest,
    signal: AbortSignal,
  ) {
    if (signal.aborted) {
      throw signal.reason;
    }
    const submission = context.submission;
    const specialists = Array.isArray(submission.specialists)
      ? submission.specialists.filter(isRecord)
      : [];
    const specialistIds = new Set(
      specialists.flatMap((specialist) =>
        typeof specialist.roleId === 'string' ? [specialist.roleId] : [],
      ),
    );
    const boundedSpecialists = specialists.every(
      (specialist) =>
        typeof specialist.roleId === 'string' &&
        typeof specialist.responsibility === 'string' &&
        specialist.responsibility.trim().length > 0 &&
        isStringArray(specialist.inputFields) &&
        specialist.inputFields.length > 0 &&
        isStringArray(specialist.outputFields) &&
        specialist.outputFields.length > 0,
    );
    const handoffs = Array.isArray(submission.handoffs)
      ? submission.handoffs.filter(isRecord)
      : [];
    const validHandoffs = handoffs.every(
      (handoff) =>
        typeof handoff.sourceRole === 'string' &&
        specialistIds.has(handoff.sourceRole) &&
        typeof handoff.targetRole === 'string' &&
        specialistIds.has(handoff.targetRole) &&
        handoff.sourceRole !== handoff.targetRole &&
        isStringArray(handoff.evidenceIds) &&
        handoff.evidenceIds.length > 0 &&
        isRecord(handoff.payload),
    );
    const routedRoles = new Set(
      handoffs.flatMap((handoff) =>
        typeof handoff.targetRole === 'string' ? [handoff.targetRole] : [],
      ),
    );
    const review = isRecord(submission.review) ? submission.review : undefined;
    const reviewerId =
      review !== undefined && typeof review.reviewerRoleId === 'string'
        ? review.reviewerRoleId
        : '';
    const proposerId =
      review !== undefined && typeof review.proposerRoleId === 'string'
        ? review.proposerRoleId
        : '';
    const independentReview =
      reviewerId.length > 0 &&
      proposerId.length > 0 &&
      reviewerId !== proposerId &&
      specialistIds.has(reviewerId) &&
      review?.approved === true;
    const concurrentAnalyses =
      Array.isArray(submission.concurrentAnalyses) &&
      submission.concurrentAnalyses.filter(isRecord).length >= 2;
    const disagreements = Array.isArray(submission.disagreements)
      ? submission.disagreements.filter(isRecord)
      : [];
    const disagreementsHandled =
      disagreements.length > 0 &&
      disagreements.every(
        (disagreement) =>
          disagreement.detected === true &&
          (disagreement.resolved === true ||
            disagreement.humanEscalationRequired === true),
      );
    const telemetryComplete = specialists.every(
      (specialist) =>
        typeof specialist.latencyMs === 'number' &&
        specialist.latencyMs >= 0 &&
        isStringArray(specialist.toolsUsed),
    );

    const rules = [
      rule('minimum-specialists', specialistIds.size >= 3),
      rule('bounded-contracts', specialists.length >= 3 && boundedSpecialists),
      rule(
        'correct-routing',
        validHandoffs &&
          [...specialistIds].every((roleId) => routedRoles.has(roleId)),
      ),
      rule('evidence-preservation', handoffs.length > 0 && validHandoffs),
      rule('independent-review', independentReview),
      rule('concurrent-analysis', concurrentAnalyses, 'advanced'),
      rule('disagreement-handling', disagreementsHandled, 'advanced'),
      rule(
        'human-escalation',
        disagreements.some(
          (disagreement) =>
            disagreement.resolved !== true &&
            disagreement.humanEscalationRequired === true,
        ),
        'advanced',
      ),
      rule('specialist-telemetry', telemetryComplete, 'advanced'),
      rule(
        'mission-binding',
        context.missionId === specialistNetworkContent.missionId &&
          request.missionVersion === specialistNetworkContent.version,
      ),
    ] as const;

    return Promise.resolve(
      validatorOutput(
        rules,
        validationScores({
          requiredOutcome:
            rules.filter(
              ({ severity, status }) =>
                severity === 'required' && status === 'passed',
            ).length * 18,
          evidenceAndGrounding: validHandoffs ? 95 : 30,
          reliability: independentReview ? 95 : 35,
          explainability: boundedSpecialists ? 90 : 35,
          efficiency: telemetryComplete && concurrentAnalyses ? 90 : 45,
        }),
      ),
    );
  },
};
