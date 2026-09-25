import IntlMessageFormat from 'intl-messageformat';

import { LocalizationError } from './errors.js';
import { resolveLocale } from './locale.js';
import type {
  FormattedMessage,
  LocaleResolution,
  MessageCatalog,
  MessageValues,
  SupportedLocale,
} from './types.js';

export interface LocalizerOptions {
  readonly catalogs: ReadonlyMap<SupportedLocale, MessageCatalog>;
  readonly defaultLocale?: SupportedLocale;
}

export class Localizer {
  readonly #catalogs: ReadonlyMap<SupportedLocale, MessageCatalog>;
  readonly #defaultLocale: SupportedLocale;
  readonly #cache = new Map<string, IntlMessageFormat>();

  public constructor(options: LocalizerOptions) {
    this.#catalogs = options.catalogs;
    this.#defaultLocale = options.defaultLocale ?? 'en';
  }

  public resolve(
    requestedLocales?: string | readonly string[],
  ): LocaleResolution {
    return resolveLocale(requestedLocales, this.#defaultLocale);
  }

  public format(
    key: string,
    values: MessageValues = {},
    requestedLocales?: string | readonly string[],
  ): FormattedMessage {
    const resolution = this.resolve(requestedLocales);
    const source = resolution.fallbackChain
      .map((locale) => ({
        locale,
        message: this.#catalogs.get(locale)?.messages[key],
      }))
      .find(
        (
          candidate,
        ): candidate is { locale: SupportedLocale; message: string } =>
          candidate.message !== undefined,
      );

    if (!source) {
      throw new LocalizationError('message-not-found', {
        key,
        locale: resolution.locale,
      });
    }

    const cacheKey = `${source.locale}\u0000${key}\u0000${source.message}`;
    let formatter = this.#cache.get(cacheKey);
    if (!formatter) {
      try {
        formatter = new IntlMessageFormat(source.message, source.locale);
        this.#cache.set(cacheKey, formatter);
      } catch (error) {
        throw new LocalizationError('message-format-invalid', {
          key,
          locale: source.locale,
          cause: error,
        });
      }
    }

    try {
      const formatted = formatter.format(values);
      return {
        key,
        message: Array.isArray(formatted)
          ? formatted.map(String).join('')
          : String(formatted),
        locale: source.locale,
        requestedLocale: resolution.locale,
        usedFallback: source.locale !== resolution.locale,
      };
    } catch (error) {
      throw new LocalizationError('message-values-invalid', {
        key,
        locale: source.locale,
        cause: error,
      });
    }
  }
}

export const createLocalizer = (options: LocalizerOptions): Localizer =>
  new Localizer(options);
