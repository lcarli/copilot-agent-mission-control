import {
  createLocalizer,
  resolveLocale,
  type MessageCatalog,
} from '@mission-control/localization';

const messages = {
  en: {
    'auth.available': 'Participant token is available.',
    'auth.unavailable': 'Participant token is unavailable.',
    'config.missing': 'CLI configuration is missing.',
    'config.saved': 'CLI configuration saved.',
    'diagnostic.api': 'API connectivity',
    'diagnostic.authentication': 'Authentication',
    'diagnostic.configuration': 'Configuration',
    'diagnostic.runtime': 'Node.js runtime',
    'registration.joined': 'Joined event as unit',
    'connectivity.liveness': 'API liveness',
    'connectivity.readiness': 'API readiness',
    'connectivity.event-session': 'Event access',
    'connectivity.unit': 'Unit access',
    'connectivity.missions': 'Mission access',
    'mission.started': 'Mission started.',
    'mission.testsPassed': 'Local tests passed.',
    'mission.testsFailed': 'Local tests failed.',
    'mission.evidenceValid': 'Evidence package is valid.',
  },
  fr: {
    'auth.available': 'Le jeton participant est disponible.',
    'auth.unavailable': 'Le jeton participant est indisponible.',
    'config.missing': 'La configuration CLI est absente.',
    'config.saved': 'Configuration CLI enregistrée.',
    'diagnostic.api': 'Connectivité API',
    'diagnostic.authentication': 'Authentification',
    'diagnostic.configuration': 'Configuration',
    'diagnostic.runtime': 'Environnement Node.js',
    'registration.joined': 'Événement rejoint avec l’unité',
    'connectivity.liveness': 'Disponibilité de l’API',
    'connectivity.readiness': 'Préparation de l’API',
    'connectivity.event-session': 'Accès à l’événement',
    'connectivity.unit': 'Accès à l’unité',
    'connectivity.missions': 'Accès aux missions',
    'mission.started': 'Mission démarrée.',
    'mission.testsPassed': 'Tests locaux réussis.',
    'mission.testsFailed': 'Échec des tests locaux.',
    'mission.evidenceValid': 'Le dossier de preuve est valide.',
  },
  'pt-BR': {
    'auth.available': 'O token do participante está disponível.',
    'auth.unavailable': 'O token do participante não está disponível.',
    'config.missing': 'A configuração da CLI não foi encontrada.',
    'config.saved': 'Configuração da CLI salva.',
    'diagnostic.api': 'Conectividade da API',
    'diagnostic.authentication': 'Autenticação',
    'diagnostic.configuration': 'Configuração',
    'diagnostic.runtime': 'Ambiente Node.js',
    'registration.joined': 'Evento acessado com a unidade',
    'connectivity.liveness': 'Disponibilidade da API',
    'connectivity.readiness': 'Prontidão da API',
    'connectivity.event-session': 'Acesso ao evento',
    'connectivity.unit': 'Acesso à unidade',
    'connectivity.missions': 'Acesso às missões',
    'mission.started': 'Missão iniciada.',
    'mission.testsPassed': 'Testes locais aprovados.',
    'mission.testsFailed': 'Testes locais falharam.',
    'mission.evidenceValid': 'O pacote de evidências é válido.',
  },
} satisfies Record<'en' | 'fr' | 'pt-BR', Record<string, string>>;

const catalogs = new Map<'en' | 'fr' | 'pt-BR', MessageCatalog>(
  Object.entries(messages).map(([locale, catalog]) => [
    locale as 'en' | 'fr' | 'pt-BR',
    {
      locale: locale as 'en' | 'fr' | 'pt-BR',
      messages: catalog,
    },
  ]),
);

const localizer = createLocalizer({ catalogs, defaultLocale: 'en' });

export function createCliLocalizer(requestedLocale?: string) {
  const locale = resolveLocale(requestedLocale).locale;
  return (key: string): string => localizer.format(key, {}, locale).message;
}
