import type {
  ResolvedValidationContext,
  ValidationRequest,
  ValidationRuleResult,
  VersionedValidator,
} from '@mission-control/validation-worker';

import { resourceIds } from '../simulators/resources.js';
import type { MissionContent } from './shared.js';
import {
  isRecord,
  isStringArray,
  validationScores,
  validatorOutput,
} from './shared.js';

export const restoreTheLighthouseContent: MissionContent = {
  missionId: 'restore-the-lighthouse',
  version: '1.0.0',
  validatorId: 'operation-lighthouse.restore-the-lighthouse',
  validatorVersion: '1.0.0',
  content: {
    en: {
      locale: 'en',
      title: 'Restore the Lighthouse',
      briefing:
        'Coordinate specialists and constrained city resources into a safe, evidence-grounded recovery plan.',
      coreObjectives: [
        'Assess the combined grid, communications, and storm-surge incident.',
        'Gather current evidence from multiple city systems.',
        'Prioritize actions and allocate finite resources.',
        'Route specialist work and independently validate the final plan.',
        'Submit a complete auditable decision package.',
      ],
      advancedObjectives: [
        'React to an instructor incident modifier and tool failure.',
        'Explain rejected alternatives and efficiency tradeoffs.',
        'Request human approval for every high-impact action.',
      ],
      hints: [
        'Build the plan from current simulator evidence, not cached assumptions.',
        'Check every allocation against the finite inventory.',
        'Record why each action was accepted, rejected, or escalated.',
      ],
    },
    fr: {
      locale: 'fr',
      title: 'Restaurer Lighthouse',
      briefing:
        'Coordonnez les spécialistes et les ressources limitées dans un plan de rétablissement sûr et étayé.',
      coreObjectives: [
        'Évaluer l’incident combinant réseau électrique, communications et surcote.',
        'Recueillir des preuves actuelles depuis plusieurs systèmes.',
        'Prioriser les actions et allouer les ressources limitées.',
        'Acheminer le travail spécialisé et valider le plan indépendamment.',
        'Soumettre un dossier de décision complet et auditable.',
      ],
      advancedObjectives: [
        'Réagir à un modificateur instructeur et à une panne d’outil.',
        'Expliquer les alternatives rejetées et les compromis d’efficacité.',
        'Demander une approbation humaine pour chaque action à fort impact.',
      ],
      hints: [
        'Fondez le plan sur les preuves actuelles des simulateurs.',
        'Vérifiez chaque allocation par rapport à l’inventaire limité.',
        'Consignez pourquoi chaque action est acceptée, rejetée ou escaladée.',
      ],
    },
    'pt-BR': {
      locale: 'pt-BR',
      title: 'Restaurar o Lighthouse',
      briefing:
        'Coordene especialistas e recursos limitados da cidade em um plano seguro e fundamentado de recuperação.',
      coreObjectives: [
        'Avalie o incidente combinado de rede elétrica, comunicações e maré de tempestade.',
        'Colete evidências atuais de vários sistemas da cidade.',
        'Priorize ações e aloque recursos finitos.',
        'Encaminhe o trabalho especialista e valide o plano independentemente.',
        'Envie um pacote de decisão completo e auditável.',
      ],
      advancedObjectives: [
        'Reaja a um modificador do instrutor e a uma falha de ferramenta.',
        'Explique alternativas rejeitadas e escolhas de eficiência.',
        'Solicite aprovação humana para toda ação de alto impacto.',
      ],
      hints: [
        'Construa o plano com evidências atuais dos simuladores.',
        'Confira cada alocação contra o inventário finito.',
        'Registre por que cada ação foi aceita, rejeitada ou escalada.',
      ],
    },
  },
};

const knownResources = new Set<string>(resourceIds);
const rule = (
  ruleId: string,
  passed: boolean,
  severity: ValidationRuleResult['severity'] = 'required',
): ValidationRuleResult => ({
  ruleId,
  status: passed ? 'passed' : 'failed',
  severity,
  messageKey: `validation.restoreTheLighthouse.${ruleId}.${passed ? 'passed' : 'failed'}`,
});

export const restoreTheLighthouseValidator: VersionedValidator = {
  id: restoreTheLighthouseContent.validatorId,
  version: restoreTheLighthouseContent.validatorVersion,
  validate(
    context: ResolvedValidationContext,
    request: ValidationRequest,
    signal: AbortSignal,
  ) {
    if (signal.aborted) {
      throw signal.reason;
    }
    const submission = context.submission;
    const assessment = isRecord(submission.incidentAssessment)
      ? submission.incidentAssessment
      : undefined;
    const hazards =
      assessment !== undefined && isStringArray(assessment.hazards)
        ? assessment.hazards
        : [];
    const evidenceIds = isStringArray(submission.evidenceIds)
      ? submission.evidenceIds
      : [];
    const toolSources = new Set(
      Array.isArray(submission.toolTrace)
        ? submission.toolTrace
            .filter(isRecord)
            .flatMap((entry) =>
              typeof entry.tool === 'string' && entry.status === 'success'
                ? [entry.tool]
                : [],
            )
        : [],
    );
    const actions = Array.isArray(submission.prioritizedActions)
      ? submission.prioritizedActions.filter(isRecord)
      : [];
    const validPriorities =
      actions.length > 0 &&
      actions.every(
        (action, index) =>
          action.priority === index + 1 &&
          typeof action.actionId === 'string' &&
          typeof action.rationale === 'string' &&
          isStringArray(action.evidenceIds) &&
          action.evidenceIds.length > 0,
      );
    const allocations = Array.isArray(submission.resourceAllocations)
      ? submission.resourceAllocations.filter(isRecord)
      : [];
    const validAllocations =
      allocations.length > 0 &&
      allocations.every(
        (allocation) =>
          typeof allocation.resourceId === 'string' &&
          knownResources.has(allocation.resourceId) &&
          typeof allocation.quantity === 'number' &&
          Number.isInteger(allocation.quantity) &&
          allocation.quantity > 0 &&
          typeof allocation.destinationDistrictId === 'string' &&
          typeof allocation.purpose === 'string',
      );
    const handoffs = Array.isArray(submission.specialistHandoffs)
      ? submission.specialistHandoffs.filter(isRecord)
      : [];
    const validHandoffs =
      handoffs.length >= 2 &&
      handoffs.every(
        (handoff) =>
          typeof handoff.sourceRole === 'string' &&
          typeof handoff.targetRole === 'string' &&
          handoff.sourceRole !== handoff.targetRole &&
          isStringArray(handoff.evidenceIds) &&
          handoff.evidenceIds.length > 0,
      );
    const review = isRecord(submission.finalReview)
      ? submission.finalReview
      : undefined;
    const validatedPlan =
      review?.approved === true &&
      typeof review.reviewerRoleId === 'string' &&
      typeof review.planVersion === 'string';
    const audit = isRecord(submission.audit) ? submission.audit : undefined;
    const auditable =
      audit !== undefined &&
      typeof audit.decisionId === 'string' &&
      typeof audit.createdAt === 'string' &&
      isStringArray(audit.evidenceIds) &&
      audit.evidenceIds.length > 0;
    const modifierHandled =
      typeof submission.incidentModifierId === 'string' &&
      submission.incidentModifierApplied === true;
    const replanned =
      isRecord(submission.replan) &&
      typeof submission.replan.failedTool === 'string' &&
      isStringArray(submission.replan.changedActionIds) &&
      submission.replan.changedActionIds.length > 0;
    const rejectedAlternatives =
      Array.isArray(submission.rejectedAlternatives) &&
      submission.rejectedAlternatives
        .filter(isRecord)
        .every(
          (alternative) =>
            typeof alternative.alternativeId === 'string' &&
            typeof alternative.reason === 'string',
        ) &&
      submission.rejectedAlternatives.length > 0;
    const highImpactActions = actions.filter(
      (action) => action.impact === 'high',
    );
    const approvals = Array.isArray(submission.humanApprovals)
      ? submission.humanApprovals.filter(isRecord)
      : [];
    const highImpactApproved =
      highImpactActions.length > 0 &&
      highImpactActions.every((action) =>
        approvals.some(
          (approval) =>
            approval.actionId === action.actionId &&
            approval.approved === true &&
            typeof approval.approverRole === 'string',
        ),
      );
    const efficient =
      typeof submission.totalToolCalls === 'number' &&
      submission.totalToolCalls > 0 &&
      submission.totalToolCalls <= 16;

    const rules = [
      rule('combined-assessment', hazards.length >= 3),
      rule(
        'multiple-tool-evidence',
        evidenceIds.length >= 5 && toolSources.size >= 4,
      ),
      rule('prioritized-plan', validPriorities),
      rule('resource-allocation', validAllocations),
      rule('specialist-routing', validHandoffs),
      rule('final-validation', validatedPlan),
      rule('auditable-package', auditable),
      rule('incident-modifier', modifierHandled, 'advanced'),
      rule('tool-failure-replan', replanned, 'advanced'),
      rule('rejected-alternatives', rejectedAlternatives, 'advanced'),
      rule('human-approval', highImpactApproved, 'advanced'),
      rule('efficient-tool-use', efficient, 'advanced'),
      rule(
        'mission-binding',
        context.missionId === restoreTheLighthouseContent.missionId &&
          request.missionVersion === restoreTheLighthouseContent.version,
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
            ).length * 14,
          evidenceAndGrounding:
            evidenceIds.length >= 5 && toolSources.size >= 4 ? 100 : 30,
          reliability:
            validatedPlan && auditable && highImpactApproved ? 100 : 40,
          explainability: validPriorities && rejectedAlternatives ? 95 : 45,
          efficiency: efficient ? 95 : 40,
        }),
      ),
    );
  },
};
