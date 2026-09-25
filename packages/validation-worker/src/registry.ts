import { ValidationWorkerError } from './errors.js';
import type { VersionedValidator } from './types.js';

export interface ValidatorRegistry {
  resolve(id: string, version: string): VersionedValidator;
}

export class InMemoryValidatorRegistry implements ValidatorRegistry {
  readonly #validators = new Map<string, VersionedValidator>();

  public constructor(validators: readonly VersionedValidator[] = []) {
    for (const validator of validators) {
      const key = this.#key(validator.id, validator.version);
      if (this.#validators.has(key)) {
        throw new ValidationWorkerError('validation-request-invalid');
      }
      this.#validators.set(key, validator);
    }
  }

  public resolve(id: string, version: string): VersionedValidator {
    const validator = this.#validators.get(this.#key(id, version));
    if (validator === undefined) {
      throw new ValidationWorkerError('validator-not-found');
    }
    return validator;
  }

  #key(id: string, version: string): string {
    return `${id}@${version}`;
  }
}
