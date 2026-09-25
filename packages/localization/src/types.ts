export const SUPPORTED_LOCALES = ['en', 'fr', 'pt-BR'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export interface MessageCatalog {
  readonly locale: SupportedLocale;
  readonly messages: Readonly<Record<string, string>>;
}

export interface LocaleResolution {
  readonly requestedLocales: readonly string[];
  readonly locale: SupportedLocale;
  readonly fallbackChain: readonly SupportedLocale[];
}

export interface FormattedMessage {
  readonly key: string;
  readonly message: string;
  readonly locale: SupportedLocale;
  readonly requestedLocale: SupportedLocale;
  readonly usedFallback: boolean;
}

export type MessageValues = Readonly<
  Record<
    string,
    | string
    | number
    | bigint
    | boolean
    | Date
    | null
    | undefined
    | readonly (string | number)[]
  >
>;

export type LocalizationIssueCode =
  | 'catalog-missing'
  | 'key-missing'
  | 'key-extra'
  | 'placeholder-mismatch'
  | 'message-syntax-invalid';

export interface LocalizationIssue {
  readonly code: LocalizationIssueCode;
  readonly locale: SupportedLocale;
  readonly key?: string;
  readonly canonicalPlaceholders?: readonly string[];
  readonly actualPlaceholders?: readonly string[];
}
