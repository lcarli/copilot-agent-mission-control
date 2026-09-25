import type { LocalizationIssue, SupportedLocale } from './types.js';

export type LocalizationErrorCode =
  | 'message-not-found'
  | 'message-format-invalid'
  | 'message-values-invalid'
  | 'localization-parity-invalid';

export class LocalizationError extends Error {
  public readonly code: LocalizationErrorCode;
  public readonly key?: string;
  public readonly locale?: SupportedLocale;
  public readonly issues?: readonly LocalizationIssue[];

  public constructor(
    code: LocalizationErrorCode,
    options: {
      readonly key?: string;
      readonly locale?: SupportedLocale;
      readonly issues?: readonly LocalizationIssue[];
      readonly cause?: unknown;
    } = {},
  ) {
    super(code, options.cause ? { cause: options.cause } : undefined);
    this.name = 'LocalizationError';
    this.code = code;
    if (options.key) {
      this.key = options.key;
    }
    if (options.locale) {
      this.locale = options.locale;
    }
    if (options.issues) {
      this.issues = options.issues;
    }
  }
}
