import {
  TYPE,
  parse,
  type MessageFormatElement,
} from '@formatjs/icu-messageformat-parser';

import { LocalizationError } from './errors.js';
import {
  SUPPORTED_LOCALES,
  type LocalizationIssue,
  type MessageCatalog,
  type SupportedLocale,
} from './types.js';

const collectPlaceholders = (
  elements: readonly MessageFormatElement[],
  placeholders: Set<string>,
): void => {
  for (const element of elements) {
    switch (element.type) {
      case TYPE.argument:
      case TYPE.number:
      case TYPE.date:
      case TYPE.time:
        placeholders.add(element.value);
        break;
      case TYPE.select:
      case TYPE.plural:
        placeholders.add(element.value);
        Object.values(element.options).forEach((option) => {
          collectPlaceholders(option.value, placeholders);
        });
        break;
      case TYPE.tag:
        collectPlaceholders(element.children, placeholders);
        break;
      case TYPE.literal:
      case TYPE.pound:
        break;
    }
  }
};

export const getMessagePlaceholders = (message: string): readonly string[] => {
  const placeholders = new Set<string>();
  collectPlaceholders(parse(message, { captureLocation: false }), placeholders);
  return [...placeholders].sort();
};

export const validateLocalizationParity = (
  catalogs: ReadonlyMap<SupportedLocale, MessageCatalog>,
  canonicalLocale: SupportedLocale = 'en',
): readonly LocalizationIssue[] => {
  const issues: LocalizationIssue[] = [];
  const canonicalCatalog = catalogs.get(canonicalLocale);
  if (!canonicalCatalog) {
    return [
      {
        code: 'catalog-missing',
        locale: canonicalLocale,
      },
    ];
  }

  const canonicalKeys = Object.keys(canonicalCatalog.messages);
  const canonicalKeySet = new Set(canonicalKeys);
  const canonicalPlaceholders = new Map<string, readonly string[]>();

  for (const key of canonicalKeys) {
    try {
      canonicalPlaceholders.set(
        key,
        getMessagePlaceholders(canonicalCatalog.messages[key] ?? ''),
      );
    } catch {
      issues.push({
        code: 'message-syntax-invalid',
        locale: canonicalLocale,
        key,
      });
    }
  }

  for (const locale of SUPPORTED_LOCALES) {
    const catalog = catalogs.get(locale);
    if (!catalog) {
      issues.push({ code: 'catalog-missing', locale });
      continue;
    }
    const actualKeys = Object.keys(catalog.messages);
    const actualKeySet = new Set(actualKeys);
    for (const key of canonicalKeys) {
      if (!actualKeySet.has(key)) {
        issues.push({ code: 'key-missing', locale, key });
      }
    }
    for (const key of actualKeys) {
      if (!canonicalKeySet.has(key)) {
        issues.push({ code: 'key-extra', locale, key });
      }
    }
    for (const key of canonicalKeys) {
      const message = catalog.messages[key];
      if (message === undefined) {
        continue;
      }
      try {
        const actualPlaceholders = getMessagePlaceholders(message);
        const expectedPlaceholders = canonicalPlaceholders.get(key) ?? [];
        if (actualPlaceholders.join('|') !== expectedPlaceholders.join('|')) {
          issues.push({
            code: 'placeholder-mismatch',
            locale,
            key,
            canonicalPlaceholders: expectedPlaceholders,
            actualPlaceholders,
          });
        }
      } catch {
        issues.push({
          code: 'message-syntax-invalid',
          locale,
          key,
        });
      }
    }
  }
  return issues;
};

export const assertLocalizationParity = (
  catalogs: ReadonlyMap<SupportedLocale, MessageCatalog>,
  canonicalLocale: SupportedLocale = 'en',
): void => {
  const issues = validateLocalizationParity(catalogs, canonicalLocale);
  if (issues.length > 0) {
    throw new LocalizationError('localization-parity-invalid', { issues });
  }
};
