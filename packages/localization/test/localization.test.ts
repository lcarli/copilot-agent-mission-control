import { describe, expect, it } from 'vitest';

import {
  LocalizationError,
  assertLocalizationParity,
  createLocalizer,
  getMessagePlaceholders,
  resolveLocale,
  validateLocalizationParity,
  type MessageCatalog,
  type SupportedLocale,
} from '../src/index.js';

const catalogs = new Map<SupportedLocale, MessageCatalog>([
  [
    'en',
    {
      locale: 'en',
      messages: {
        greeting: 'Hello, {name}!',
        incidents:
          '{count, plural, =0 {No incidents} one {# incident} other {# incidents}}',
        'english.only': 'English fallback',
      },
    },
  ],
  [
    'fr',
    {
      locale: 'fr',
      messages: {
        greeting: 'Bonjour, {name} !',
        incidents:
          '{count, plural, =0 {Aucun incident} one {# incident} other {# incidents}}',
      },
    },
  ],
  [
    'pt-BR',
    {
      locale: 'pt-BR',
      messages: {
        greeting: 'Olá, {name}!',
        incidents:
          '{count, plural, =0 {Nenhum incidente} one {# incidente} other {# incidentes}}',
      },
    },
  ],
]);

describe('locale resolution', () => {
  it('normalizes supported language and regional preferences', () => {
    expect(resolveLocale(['de-DE', 'fr-CA'])).toMatchObject({
      locale: 'fr',
      fallbackChain: ['fr', 'en'],
    });
    expect(resolveLocale('pt_BR')).toMatchObject({
      locale: 'pt-BR',
      fallbackChain: ['pt-BR', 'en'],
    });
  });

  it('uses the configured default and then English', () => {
    expect(resolveLocale('de-DE', 'fr')).toEqual({
      requestedLocales: ['de-DE'],
      locale: 'fr',
      fallbackChain: ['fr', 'en'],
    });
  });
});

describe('message formatting', () => {
  const localizer = createLocalizer({ catalogs });

  it('formats ICU messages using the resolved locale', () => {
    expect(localizer.format('greeting', { name: 'Maya' }, 'fr-CA')).toEqual({
      key: 'greeting',
      message: 'Bonjour, Maya !',
      locale: 'fr',
      requestedLocale: 'fr',
      usedFallback: false,
    });
    expect(localizer.format('incidents', { count: 2 }, 'pt')).toMatchObject({
      message: '2 incidentes',
      locale: 'pt-BR',
    });
  });

  it('falls back per message without changing the requested locale', () => {
    expect(localizer.format('english.only', {}, 'fr')).toEqual({
      key: 'english.only',
      message: 'English fallback',
      locale: 'en',
      requestedLocale: 'fr',
      usedFallback: true,
    });
  });

  it('reports missing keys and values explicitly', () => {
    expect(() => localizer.format('missing', {}, 'en')).toThrow(
      LocalizationError,
    );
    try {
      localizer.format('greeting', {}, 'en');
    } catch (error) {
      expect(error).toBeInstanceOf(LocalizationError);
      expect((error as LocalizationError).code).toBe('message-values-invalid');
    }
  });
});

describe('localization parity', () => {
  it('extracts nested ICU placeholders', () => {
    expect(
      getMessagePlaceholders(
        '{gender, select, female {{count, plural, one {{name}} other {{name}}}} other {{name}}}',
      ),
    ).toEqual(['count', 'gender', 'name']);
  });

  it('reports missing keys, extras, placeholder drift, and invalid syntax', () => {
    const invalidCatalogs = new Map(catalogs);
    invalidCatalogs.set('fr', {
      locale: 'fr',
      messages: {
        greeting: 'Bonjour, {person} !',
        incidents: '{count, plural, one {Incident}',
        extra: 'Extra',
      },
    });

    const issues = validateLocalizationParity(invalidCatalogs);
    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'key-missing',
        'key-extra',
        'placeholder-mismatch',
        'message-syntax-invalid',
      ]),
    );
    expect(() => {
      assertLocalizationParity(invalidCatalogs);
    }).toThrow(LocalizationError);
  });
});
