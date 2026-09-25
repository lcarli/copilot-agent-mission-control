import {
  assertLocalizationParity,
  type MessageCatalog,
  type SupportedLocale,
} from '@mission-control/localization';

export const characterIds = [
  'mission-commander',
  'maya-chen',
  'jules-martin',
  'aurora',
] as const;
export const narrativeBeatIds = [
  'opening',
  'signal-in-the-storm',
  'ground-truth',
  'connected-city',
  'specialist-network',
  'restore-the-lighthouse',
  'finale',
] as const;
export const glossaryTermIds = [
  'agent',
  'evidence',
  'grounding',
  'tool',
  'handoff',
  'human-approval',
  'recovery',
] as const;

export type CharacterId = (typeof characterIds)[number];
export type NarrativeBeatId = (typeof narrativeBeatIds)[number];
export type GlossaryTermId = (typeof glossaryTermIds)[number];

export interface CampaignCharacter {
  readonly characterId: CharacterId;
  readonly canonicalName: string;
  readonly roleKey: string;
  readonly purposeKey: string;
  readonly voiceKey: string;
  readonly pronunciationKey: string;
}

export interface NarrativeBeat {
  readonly beatId: NarrativeBeatId;
  readonly sequence: number;
  readonly missionId?: string;
  readonly titleKey: string;
  readonly situationKey: string;
  readonly transitionKey: string;
  readonly speakerId: CharacterId;
}

export interface GlossaryTerm {
  readonly termId: GlossaryTermId;
  readonly termKey: string;
  readonly definitionKey: string;
  readonly usageKey: string;
}

export interface LocalizationGuideline {
  readonly guidelineId:
    | 'stable-names'
    | 'natural-language'
    | 'operational-tone'
    | 'inclusive-language'
    | 'no-baked-text'
    | 'preserve-placeholders';
  readonly descriptionKey: string;
}

export interface CampaignNarrative {
  readonly characters: readonly CampaignCharacter[];
  readonly timeline: readonly NarrativeBeat[];
  readonly glossary: readonly GlossaryTerm[];
  readonly localizationGuidelines: readonly LocalizationGuideline[];
}

export const campaignNarrative: CampaignNarrative = {
  characters: [
    {
      characterId: 'mission-commander',
      canonicalName: 'Mission Commander',
      roleKey: 'character.missionCommander.role',
      purposeKey: 'character.missionCommander.purpose',
      voiceKey: 'character.missionCommander.voice',
      pronunciationKey: 'character.missionCommander.pronunciation',
    },
    {
      characterId: 'maya-chen',
      canonicalName: 'Maya Chen',
      roleKey: 'character.mayaChen.role',
      purposeKey: 'character.mayaChen.purpose',
      voiceKey: 'character.mayaChen.voice',
      pronunciationKey: 'character.mayaChen.pronunciation',
    },
    {
      characterId: 'jules-martin',
      canonicalName: 'Jules Martin',
      roleKey: 'character.julesMartin.role',
      purposeKey: 'character.julesMartin.purpose',
      voiceKey: 'character.julesMartin.voice',
      pronunciationKey: 'character.julesMartin.pronunciation',
    },
    {
      characterId: 'aurora',
      canonicalName: 'Aurora',
      roleKey: 'character.aurora.role',
      purposeKey: 'character.aurora.purpose',
      voiceKey: 'character.aurora.voice',
      pronunciationKey: 'character.aurora.pronunciation',
    },
  ],
  timeline: [
    {
      beatId: 'opening',
      sequence: 1,
      titleKey: 'timeline.opening.title',
      situationKey: 'timeline.opening.situation',
      transitionKey: 'timeline.opening.transition',
      speakerId: 'mission-commander',
    },
    {
      beatId: 'signal-in-the-storm',
      sequence: 2,
      missionId: 'signal-in-the-storm',
      titleKey: 'timeline.mission1.title',
      situationKey: 'timeline.mission1.situation',
      transitionKey: 'timeline.mission1.transition',
      speakerId: 'maya-chen',
    },
    {
      beatId: 'ground-truth',
      sequence: 3,
      missionId: 'ground-truth',
      titleKey: 'timeline.mission2.title',
      situationKey: 'timeline.mission2.situation',
      transitionKey: 'timeline.mission2.transition',
      speakerId: 'jules-martin',
    },
    {
      beatId: 'connected-city',
      sequence: 4,
      missionId: 'connected-city',
      titleKey: 'timeline.mission3.title',
      situationKey: 'timeline.mission3.situation',
      transitionKey: 'timeline.mission3.transition',
      speakerId: 'aurora',
    },
    {
      beatId: 'specialist-network',
      sequence: 5,
      missionId: 'specialist-network',
      titleKey: 'timeline.mission4.title',
      situationKey: 'timeline.mission4.situation',
      transitionKey: 'timeline.mission4.transition',
      speakerId: 'maya-chen',
    },
    {
      beatId: 'restore-the-lighthouse',
      sequence: 6,
      missionId: 'restore-the-lighthouse',
      titleKey: 'timeline.mission5.title',
      situationKey: 'timeline.mission5.situation',
      transitionKey: 'timeline.mission5.transition',
      speakerId: 'mission-commander',
    },
    {
      beatId: 'finale',
      sequence: 7,
      titleKey: 'timeline.finale.title',
      situationKey: 'timeline.finale.situation',
      transitionKey: 'timeline.finale.transition',
      speakerId: 'jules-martin',
    },
  ],
  glossary: glossaryTermIds.map((termId) => ({
    termId,
    termKey: `glossary.${termId}.term`,
    definitionKey: `glossary.${termId}.definition`,
    usageKey: `glossary.${termId}.usage`,
  })),
  localizationGuidelines: [
    {
      guidelineId: 'stable-names',
      descriptionKey: 'guidance.stableNames',
    },
    {
      guidelineId: 'natural-language',
      descriptionKey: 'guidance.naturalLanguage',
    },
    {
      guidelineId: 'operational-tone',
      descriptionKey: 'guidance.operationalTone',
    },
    {
      guidelineId: 'inclusive-language',
      descriptionKey: 'guidance.inclusiveLanguage',
    },
    {
      guidelineId: 'no-baked-text',
      descriptionKey: 'guidance.noBakedText',
    },
    {
      guidelineId: 'preserve-placeholders',
      descriptionKey: 'guidance.preservePlaceholders',
    },
  ],
};

const en: MessageCatalog = {
  locale: 'en',
  messages: {
    'character.missionCommander.role': 'Mission Commander',
    'character.missionCommander.purpose':
      'Guides the room, frames decisions, and authorizes major transitions.',
    'character.missionCommander.voice':
      'Calm, concise, decisive, and never sensational.',
    'character.missionCommander.pronunciation': 'MIH-shun kuh-MAN-der',
    'character.mayaChen.role': 'Operations Lead',
    'character.mayaChen.purpose':
      'Provides mission briefs, priorities, and operational constraints.',
    'character.mayaChen.voice':
      'Direct and practical, with explicit constraints and expected outcomes.',
    'character.mayaChen.pronunciation': 'MY-uh CHEN',
    'character.julesMartin.role': 'Field Coordinator',
    'character.julesMartin.purpose':
      'Reports changing conditions and the human impact across Port Azure.',
    'character.julesMartin.voice':
      'Observant, empathetic, factual, and clear about uncertainty.',
    'character.julesMartin.pronunciation': 'JOOL mar-TAN',
    'character.aurora.role': 'City Operations System',
    'character.aurora.purpose':
      'Announces alerts, validation outcomes, and authoritative system status.',
    'character.aurora.voice':
      'Neutral, precise, accessible, and consistent across every channel.',
    'character.aurora.pronunciation': 'uh-ROAR-uh',
    'timeline.opening.title': 'Storm watch',
    'timeline.opening.situation':
      'Port Azure activates the Lighthouse Response Unit as the storm accelerates.',
    'timeline.opening.transition':
      'Emergency channels overload and the first reports require triage.',
    'timeline.mission1.title': 'Signal in the Storm',
    'timeline.mission1.situation':
      'Unstructured and duplicate reports prevent operators from seeing priorities.',
    'timeline.mission1.transition':
      'Structured incidents expose contradictions that require stronger evidence.',
    'timeline.mission2.title': 'Ground Truth',
    'timeline.mission2.situation':
      'Conflicting reports trigger unnecessary dispatches and weaken confidence.',
    'timeline.mission2.transition':
      'Verified reports reveal that static bulletins are no longer current.',
    'timeline.mission3.title': 'Connected City',
    'timeline.mission3.situation':
      'Units must query live city systems for shelters, weather, and routes.',
    'timeline.mission3.transition':
      'The volume of tool evidence exceeds one general-purpose agent.',
    'timeline.mission4.title': 'Specialist Network',
    'timeline.mission4.situation':
      'Weather, infrastructure, logistics, and communications analyses diverge.',
    'timeline.mission4.transition':
      'A grid failure and storm surge force all specialists into one response.',
    'timeline.mission5.title': 'Restore the Lighthouse',
    'timeline.mission5.situation':
      'Critical communications fail while resources, routes, and shelter space are constrained.',
    'timeline.mission5.transition':
      'Validated plans combine into a citywide recovery sequence.',
    'timeline.finale.title': 'Light returns',
    'timeline.finale.situation':
      'Port Azure reaches the collective recovery threshold and stabilizes essential services.',
    'timeline.finale.transition':
      'The Mission Commander recognizes every unit and closes the operation.',
    'glossary.agent.term': 'Agent',
    'glossary.agent.definition':
      'A bounded software collaborator that follows instructions and produces a defined outcome.',
    'glossary.agent.usage':
      'Name the role and responsibility; do not imply human judgment or autonomy.',
    'glossary.evidence.term': 'Evidence',
    'glossary.evidence.definition':
      'A traceable observation, report, or tool result supporting a statement.',
    'glossary.evidence.usage':
      'Cite its identifier and distinguish it from assumptions.',
    'glossary.grounding.term': 'Grounding',
    'glossary.grounding.definition':
      'Constraining an answer to supplied, attributable evidence.',
    'glossary.grounding.usage':
      'Prefer evidence-grounded over fact-checked when no external verification occurred.',
    'glossary.tool.term': 'Tool',
    'glossary.tool.definition':
      'An approved capability an agent invokes through a defined contract.',
    'glossary.tool.usage':
      'Describe the capability and result, never hidden implementation credentials.',
    'glossary.handoff.term': 'Handoff',
    'glossary.handoff.definition':
      'A structured transfer of responsibility, context, and evidence between specialists.',
    'glossary.handoff.usage':
      'State sender, recipient, purpose, evidence, and expected response.',
    'glossary.human-approval.term': 'Human approval',
    'glossary.human-approval.definition':
      'An explicit decision by an authorized person before a high-impact action.',
    'glossary.human-approval.usage':
      'Use approval, not human in the loop, in participant-facing instructions.',
    'glossary.recovery.term': 'Recovery',
    'glossary.recovery.definition':
      'Measured restoration of safe, reliable city services.',
    'glossary.recovery.usage':
      'Express recovery as evidence-based progress, not a guarantee of safety.',
    'guidance.stableNames':
      'Keep Port Azure, Maya Chen, Jules Martin, and Aurora unchanged in every locale.',
    'guidance.naturalLanguage':
      'Translate for natural professional meaning rather than word-for-word equivalence.',
    'guidance.operationalTone':
      'Use calm, specific language; avoid panic, blame, and sensational descriptions.',
    'guidance.inclusiveLanguage':
      'Use inclusive language and avoid gendering units, operators, residents, or agents.',
    'guidance.noBakedText':
      'Keep generated visuals free of text; apply localized labels and captions in the platform.',
    'guidance.preservePlaceholders':
      'Preserve placeholder names and technical identifiers exactly.',
  },
};

const fr: MessageCatalog = {
  locale: 'fr',
  messages: {
    'character.missionCommander.role': 'Commandement de mission',
    'character.missionCommander.purpose':
      'Guide la salle, cadre les décisions et autorise les transitions majeures.',
    'character.missionCommander.voice':
      'Calme, concis, décisif et jamais sensationnaliste.',
    'character.missionCommander.pronunciation': 'mi-sion ko-man-deur',
    'character.mayaChen.role': 'Responsable des opérations',
    'character.mayaChen.purpose':
      'Présente les missions, les priorités et les contraintes opérationnelles.',
    'character.mayaChen.voice':
      'Directe et pragmatique, avec des contraintes et résultats attendus explicites.',
    'character.mayaChen.pronunciation': 'MAÏ-a TCHEN',
    'character.julesMartin.role': 'Coordinateur terrain',
    'character.julesMartin.purpose':
      "Décrit l'évolution de la situation et ses effets humains dans Port Azure.",
    'character.julesMartin.voice':
      "Attentif, empathique, factuel et clair sur l'incertitude.",
    'character.julesMartin.pronunciation': 'JULE mar-TIN',
    'character.aurora.role': 'Système des opérations municipales',
    'character.aurora.purpose':
      "Annonce les alertes, les résultats de validation et l'état officiel des systèmes.",
    'character.aurora.voice':
      'Neutre, précis, accessible et cohérent sur tous les canaux.',
    'character.aurora.pronunciation': 'o-RO-ra',
    'timeline.opening.title': 'Veille de tempête',
    'timeline.opening.situation':
      "Port Azure active l'unité d'intervention Lighthouse alors que la tempête s'intensifie.",
    'timeline.opening.transition':
      "Les canaux d'urgence saturent et les premiers signalements doivent être triés.",
    'timeline.mission1.title': 'Signal dans la tempête',
    'timeline.mission1.situation':
      'Des signalements non structurés et dupliqués masquent les priorités.',
    'timeline.mission1.transition':
      'Les incidents structurés révèlent des contradictions qui exigent de meilleures preuves.',
    'timeline.mission2.title': 'Vérité terrain',
    'timeline.mission2.situation':
      'Des signalements contradictoires provoquent des interventions inutiles.',
    'timeline.mission2.transition':
      'Les rapports vérifiés montrent que les bulletins statiques ne sont plus à jour.',
    'timeline.mission3.title': 'Ville connectée',
    'timeline.mission3.situation':
      'Les unités doivent interroger les systèmes municipaux pour les abris, la météo et les itinéraires.',
    'timeline.mission3.transition':
      "Le volume de preuves dépasse les capacités d'un agent généraliste.",
    'timeline.mission4.title': 'Réseau de spécialistes',
    'timeline.mission4.situation':
      'Les analyses météo, infrastructure, logistique et communication divergent.',
    'timeline.mission4.transition':
      'Une panne électrique et une surcote imposent une réponse coordonnée.',
    'timeline.mission5.title': 'Restaurer Lighthouse',
    'timeline.mission5.situation':
      'Les communications critiques tombent alors que les ressources et les places sont limitées.',
    'timeline.mission5.transition':
      'Les plans validés forment une séquence de rétablissement à l’échelle de la ville.',
    'timeline.finale.title': 'La lumière revient',
    'timeline.finale.situation':
      'Port Azure atteint le seuil collectif de rétablissement et stabilise les services essentiels.',
    'timeline.finale.transition':
      'Le commandement remercie chaque unité et clôt l’opération.',
    'glossary.agent.term': 'Agent',
    'glossary.agent.definition':
      'Collaborateur logiciel au périmètre défini, suivant des instructions et produisant un résultat attendu.',
    'glossary.agent.usage':
      'Nommer son rôle et sa responsabilité sans lui attribuer un jugement humain.',
    'glossary.evidence.term': 'Élément probant',
    'glossary.evidence.definition':
      'Observation, rapport ou résultat d’outil traçable qui étaye une affirmation.',
    'glossary.evidence.usage':
      'Citer son identifiant et le distinguer des hypothèses.',
    'glossary.grounding.term': 'Ancrage dans les sources',
    'glossary.grounding.definition':
      'Limitation d’une réponse aux éléments fournis et attribuables.',
    'glossary.grounding.usage':
      'Préférer fondé sur les sources à vérifié si aucune vérification externe n’a eu lieu.',
    'glossary.tool.term': 'Outil',
    'glossary.tool.definition':
      'Capacité approuvée qu’un agent utilise au moyen d’un contrat défini.',
    'glossary.tool.usage':
      'Décrire la capacité et le résultat, jamais les identifiants secrets.',
    'glossary.handoff.term': 'Transmission',
    'glossary.handoff.definition':
      'Transfert structuré de responsabilité, de contexte et de preuves entre spécialistes.',
    'glossary.handoff.usage':
      'Indiquer l’émetteur, le destinataire, le but, les preuves et la réponse attendue.',
    'glossary.human-approval.term': 'Approbation humaine',
    'glossary.human-approval.definition':
      'Décision explicite d’une personne autorisée avant une action à fort impact.',
    'glossary.human-approval.usage':
      'Employer approbation plutôt que human in the loop dans les consignes.',
    'glossary.recovery.term': 'Rétablissement',
    'glossary.recovery.definition':
      'Restauration mesurée de services municipaux sûrs et fiables.',
    'glossary.recovery.usage':
      'Présenter le rétablissement comme un progrès étayé, jamais comme une garantie.',
    'guidance.stableNames':
      'Conserver Port Azure, Maya Chen, Jules Martin et Aurora dans toutes les langues.',
    'guidance.naturalLanguage':
      'Traduire le sens professionnel naturel plutôt que mot à mot.',
    'guidance.operationalTone':
      'Employer un langage calme et précis, sans panique, reproche ni sensationnalisme.',
    'guidance.inclusiveLanguage':
      'Employer une langue inclusive sans genrer les unités, opérateurs, habitants ou agents.',
    'guidance.noBakedText':
      'Ne pas intégrer de texte aux visuels générés; ajouter les libellés et sous-titres dans la plateforme.',
    'guidance.preservePlaceholders':
      'Conserver exactement les noms des paramètres et les identifiants techniques.',
  },
};

const ptBr: MessageCatalog = {
  locale: 'pt-BR',
  messages: {
    'character.missionCommander.role': 'Comando da missão',
    'character.missionCommander.purpose':
      'Orienta a sala, contextualiza decisões e autoriza transições importantes.',
    'character.missionCommander.voice':
      'Calmo, conciso, decisivo e nunca sensacionalista.',
    'character.missionCommander.pronunciation': 'MÍ-shan co-MÉN-der',
    'character.mayaChen.role': 'Líder de operações',
    'character.mayaChen.purpose':
      'Apresenta missões, prioridades e restrições operacionais.',
    'character.mayaChen.voice':
      'Direta e prática, com restrições e resultados esperados explícitos.',
    'character.mayaChen.pronunciation': 'MÁI-a TCHEN',
    'character.julesMartin.role': 'Coordenador de campo',
    'character.julesMartin.purpose':
      'Relata mudanças nas condições e o impacto humano em Port Azure.',
    'character.julesMartin.voice':
      'Atento, empático, factual e claro sobre incertezas.',
    'character.julesMartin.pronunciation': 'JUL mar-TÃ',
    'character.aurora.role': 'Sistema de operações da cidade',
    'character.aurora.purpose':
      'Anuncia alertas, resultados de validação e o estado oficial dos sistemas.',
    'character.aurora.voice':
      'Neutra, precisa, acessível e consistente em todos os canais.',
    'character.aurora.pronunciation': 'au-RÓ-ra',
    'timeline.opening.title': 'Alerta de tempestade',
    'timeline.opening.situation':
      'Port Azure ativa a Unidade de Resposta Lighthouse enquanto a tempestade se intensifica.',
    'timeline.opening.transition':
      'Os canais de emergência ficam sobrecarregados e os primeiros relatos exigem triagem.',
    'timeline.mission1.title': 'Sinal na tempestade',
    'timeline.mission1.situation':
      'Relatos não estruturados e duplicados impedem a identificação de prioridades.',
    'timeline.mission1.transition':
      'Incidentes estruturados revelam contradições que exigem evidências melhores.',
    'timeline.mission2.title': 'Verdade em campo',
    'timeline.mission2.situation':
      'Relatos conflitantes provocam deslocamentos desnecessários e reduzem a confiança.',
    'timeline.mission2.transition':
      'Relatos verificados mostram que boletins estáticos já estão desatualizados.',
    'timeline.mission3.title': 'Cidade conectada',
    'timeline.mission3.situation':
      'As unidades precisam consultar sistemas da cidade para abrigos, clima e rotas.',
    'timeline.mission3.transition':
      'O volume de evidências supera a capacidade de um único agente generalista.',
    'timeline.mission4.title': 'Rede de especialistas',
    'timeline.mission4.situation':
      'As análises de clima, infraestrutura, logística e comunicação divergem.',
    'timeline.mission4.transition':
      'Uma falha elétrica e uma nova maré de tempestade exigem resposta conjunta.',
    'timeline.mission5.title': 'Restaurar o Lighthouse',
    'timeline.mission5.situation':
      'Comunicações críticas falham enquanto recursos, rotas e vagas são limitados.',
    'timeline.mission5.transition':
      'Planos validados formam uma sequência de recuperação para toda a cidade.',
    'timeline.finale.title': 'A luz retorna',
    'timeline.finale.situation':
      'Port Azure atinge o limiar coletivo de recuperação e estabiliza serviços essenciais.',
    'timeline.finale.transition':
      'O Comando da Missão reconhece cada unidade e encerra a operação.',
    'glossary.agent.term': 'Agente',
    'glossary.agent.definition':
      'Colaborador de software com escopo definido, que segue instruções e produz um resultado específico.',
    'glossary.agent.usage':
      'Nomeie a função e a responsabilidade sem atribuir julgamento humano ou autonomia.',
    'glossary.evidence.term': 'Evidência',
    'glossary.evidence.definition':
      'Observação, relato ou resultado de ferramenta rastreável que sustenta uma afirmação.',
    'glossary.evidence.usage':
      'Cite o identificador e diferencie a evidência de suposições.',
    'glossary.grounding.term': 'Fundamentação',
    'glossary.grounding.definition':
      'Restrição de uma resposta às evidências fornecidas e atribuíveis.',
    'glossary.grounding.usage':
      'Prefira fundamentado em evidências a verificado quando não houve checagem externa.',
    'glossary.tool.term': 'Ferramenta',
    'glossary.tool.definition':
      'Capacidade aprovada que um agente utiliza por meio de um contrato definido.',
    'glossary.tool.usage':
      'Descreva a capacidade e o resultado, nunca credenciais de implementação.',
    'glossary.handoff.term': 'Transferência',
    'glossary.handoff.definition':
      'Transferência estruturada de responsabilidade, contexto e evidências entre especialistas.',
    'glossary.handoff.usage':
      'Informe origem, destino, objetivo, evidências e resposta esperada.',
    'glossary.human-approval.term': 'Aprovação humana',
    'glossary.human-approval.definition':
      'Decisão explícita de uma pessoa autorizada antes de uma ação de alto impacto.',
    'glossary.human-approval.usage':
      'Use aprovação em vez de human in the loop nas instruções aos participantes.',
    'glossary.recovery.term': 'Recuperação',
    'glossary.recovery.definition':
      'Restauração mensurada de serviços urbanos seguros e confiáveis.',
    'glossary.recovery.usage':
      'Apresente a recuperação como progresso baseado em evidências, não como garantia.',
    'guidance.stableNames':
      'Mantenha Port Azure, Maya Chen, Jules Martin e Aurora iguais em todos os idiomas.',
    'guidance.naturalLanguage':
      'Traduza com linguagem profissional natural, evitando equivalência palavra por palavra.',
    'guidance.operationalTone':
      'Use linguagem calma e específica; evite pânico, culpa e descrições sensacionalistas.',
    'guidance.inclusiveLanguage':
      'Use linguagem inclusiva sem atribuir gênero a unidades, operadores, moradores ou agentes.',
    'guidance.noBakedText':
      'Mantenha visuais gerados sem texto; aplique rótulos e legendas localizados na plataforma.',
    'guidance.preservePlaceholders':
      'Preserve exatamente os nomes de parâmetros e identificadores técnicos.',
  },
};

export const campaignNarrativeCatalogs = new Map<
  SupportedLocale,
  MessageCatalog
>([
  ['en', en],
  ['fr', fr],
  ['pt-BR', ptBr],
]);

assertLocalizationParity(campaignNarrativeCatalogs);
