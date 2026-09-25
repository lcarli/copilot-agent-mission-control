import {
  SUPPORTED_LOCALES,
  type LocaleResolution,
  type SupportedLocale,
} from './types.js';

const canonicalLocale = (
  requestedLocale: string,
): SupportedLocale | undefined => {
  const normalized = requestedLocale.trim().replaceAll('_', '-').toLowerCase();
  if (normalized === 'en' || normalized.startsWith('en-')) {
    return 'en';
  }
  if (normalized === 'fr' || normalized.startsWith('fr-')) {
    return 'fr';
  }
  if (
    normalized === 'pt' ||
    normalized === 'pt-br' ||
    normalized.startsWith('pt-br-')
  ) {
    return 'pt-BR';
  }
  return undefined;
};

export const isSupportedLocale = (value: string): value is SupportedLocale =>
  SUPPORTED_LOCALES.some(
    (locale) => locale.toLowerCase() === value.toLowerCase(),
  );

export const resolveLocale = (
  requestedLocales: string | readonly string[] | undefined,
  defaultLocale: SupportedLocale = 'en',
): LocaleResolution => {
  const requested =
    requestedLocales === undefined
      ? []
      : typeof requestedLocales === 'string'
        ? [requestedLocales]
        : [...requestedLocales];
  const selected =
    requested
      .map((locale) => canonicalLocale(locale))
      .find((locale) => locale !== undefined) ?? defaultLocale;
  const fallbackChain = [...new Set([selected, defaultLocale, 'en'] as const)];

  return {
    requestedLocales: requested,
    locale: selected,
    fallbackChain,
  };
};
