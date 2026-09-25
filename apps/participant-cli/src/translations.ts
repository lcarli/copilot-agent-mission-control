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
