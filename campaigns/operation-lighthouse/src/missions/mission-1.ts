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

export const signalInTheStormContent: MissionContent = {
  missionId: 'signal-in-the-storm',
  version: '1.0.0',
  validatorId: 'operation-lighthouse.signal-in-the-storm',
  validatorVersion: '1.0.0',
  content: {
    en: {
      locale: 'en',
      title: 'Signal in the Storm',
      briefing:
        'Turn an urgent incident report into a concise, structured assessment without inventing facts.',
      coreObjectives: [
        'Classify the incident category and severity.',
        'Extract the location and affected city services.',
        'Identify missing critical information.',
        'Return output matching the supplied contract.',
      ],
      advancedObjectives: [
        'Flag a probable duplicate.',
        'Explain severity using only report evidence.',
        'Handle reports written in English, French, or Brazilian Portuguese.',
      ],
      hints: [
        'Start by listing the exact required output fields.',
        'Separate explicit report details from missing information.',
        'Validate the final object against the JSON schema before returning it.',
      ],
    },
    fr: {
      locale: 'fr',
      title: 'Signal dans la tempête',
      briefing:
        'Transformez un signalement urgent en évaluation structurée et concise, sans inventer de faits.',
      coreObjectives: [
        'Classer la catégorie et la gravité de l’incident.',
        'Extraire le lieu et les services municipaux touchés.',
        'Identifier les informations critiques manquantes.',
        'Produire un résultat conforme au contrat fourni.',
      ],
      advancedObjectives: [
        'Signaler un doublon probable.',
        'Expliquer la gravité uniquement avec les éléments du signalement.',
        'Traiter les signalements en anglais, français ou portugais brésilien.',
      ],
      hints: [
        'Commencez par dresser la liste exacte des champs de sortie requis.',
        'Séparez les détails explicites des informations manquantes.',
        'Validez l’objet final avec le schéma JSON avant de le renvoyer.',
      ],
    },
    'pt-BR': {
      locale: 'pt-BR',
      title: 'Sinal na tempestade',
      briefing:
        'Transforme um relato urgente em uma avaliação estruturada e concisa, sem inventar fatos.',
      coreObjectives: [
        'Classifique a categoria e a gravidade do incidente.',
        'Extraia o local e os serviços urbanos afetados.',
        'Identifique informações críticas ausentes.',
        'Retorne uma saída compatível com o contrato fornecido.',
      ],
      advancedObjectives: [
        'Sinalize uma provável duplicata.',
        'Explique a gravidade usando apenas evidências do relato.',
        'Processe relatos em inglês, francês ou português brasileiro.',
      ],
      hints: [
        'Comece listando exatamente os campos obrigatórios da saída.',
        'Separe detalhes explícitos das informações ausentes.',
        'Valide o objeto final com o esquema JSON antes de retorná-lo.',
      ],
    },
  },
};

const categories = new Set([
  'flooding',
  'medical',
  'power',
  'transport',
  'communications',
]);
const severities = new Set(['low', 'moderate', 'high', 'critical']);

const rule = (
  ruleId: string,
  passed: boolean,
  severity: ValidationRuleResult['severity'] = 'required',
): ValidationRuleResult => ({
  ruleId,
  status: passed ? 'passed' : 'failed',
  severity,
  messageKey: `validation.signalInTheStorm.${ruleId}.${passed ? 'passed' : 'failed'}`,
});

export const signalInTheStormValidator: VersionedValidator = {
  id: signalInTheStormContent.validatorId,
  version: signalInTheStormContent.validatorVersion,
  validate(
    context: ResolvedValidationContext,
    request: ValidationRequest,
    signal: AbortSignal,
  ) {
    if (signal.aborted) {
      throw signal.reason;
    }
    const submission = context.submission;
    const validObject = isRecord(submission);
    const category =
      validObject && typeof submission.category === 'string'
        ? submission.category
        : undefined;
    const severity =
      validObject && typeof submission.severity === 'string'
        ? submission.severity
        : undefined;
    const location =
      validObject && typeof submission.location === 'string'
        ? submission.location.trim()
        : '';
    const affectedServices =
      validObject && isStringArray(submission.affectedServices)
        ? submission.affectedServices
        : [];
    const missingInformation =
      validObject && isStringArray(submission.missingInformation)
        ? submission.missingInformation
        : undefined;
    const explanation =
      validObject && typeof submission.severityExplanation === 'string'
        ? submission.severityExplanation.trim()
        : '';
    const duplicateOf =
      validObject && typeof submission.duplicateOf === 'string'
        ? submission.duplicateOf.trim()
        : '';

    const rules = [
      rule('valid-object', validObject),
      rule(
        'known-category',
        category !== undefined && categories.has(category),
      ),
      rule(
        'known-severity',
        severity !== undefined && severities.has(severity),
      ),
      rule('location', location.length > 0),
      rule('affected-services', affectedServices.length > 0),
      rule('missing-information', missingInformation !== undefined),
      rule('severity-explanation', explanation.length > 0, 'advanced'),
      rule('duplicate-detection', duplicateOf.length > 0, 'advanced'),
      rule(
        'mission-binding',
        context.missionId === signalInTheStormContent.missionId &&
          request.missionVersion === signalInTheStormContent.version,
      ),
    ] as const;

    return Promise.resolve(
      validatorOutput(
        rules,
        validationScores({
          requiredOutcome:
            rules.filter(
              ({ severity: importance, status }) =>
                importance === 'required' && status === 'passed',
            ).length * 16,
          evidenceAndGrounding: explanation.length > 0 ? 70 : 35,
          reliability:
            category !== undefined &&
            categories.has(category) &&
            severity !== undefined &&
            severities.has(severity)
              ? 85
              : 30,
          explainability: explanation.length > 0 ? 90 : 40,
          efficiency: 80,
        }),
      ),
    );
  },
};
