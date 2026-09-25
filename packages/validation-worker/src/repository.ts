import type { ValidationResult } from './types.js';

export interface ValidationResultRepository {
  get(validationRequestId: string): Promise<ValidationResult | undefined>;
  saveOnce(result: ValidationResult): Promise<ValidationResult>;
}

const clone = <T>(value: T): T => structuredClone(value);

export class InMemoryValidationResultRepository implements ValidationResultRepository {
  readonly #results = new Map<string, ValidationResult>();

  public get(
    validationRequestId: string,
  ): Promise<ValidationResult | undefined> {
    const result = this.#results.get(validationRequestId);
    return Promise.resolve(result === undefined ? undefined : clone(result));
  }

  public saveOnce(result: ValidationResult): Promise<ValidationResult> {
    const existing = this.#results.get(result.validationRequestId);
    if (existing !== undefined) {
      return Promise.resolve(clone(existing));
    }
    this.#results.set(result.validationRequestId, clone(result));
    return Promise.resolve(clone(result));
  }
}
