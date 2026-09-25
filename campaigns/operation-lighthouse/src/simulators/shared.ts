export type SimulatorResult<T> =
  | {
      readonly ok: true;
      readonly value: T;
    }
  | {
      readonly ok: false;
      readonly error: SimulatorError;
    };

export interface SimulatorError {
  readonly code:
    | 'invalid-request'
    | 'not-found'
    | 'temporarily-unavailable'
    | 'scenario-complete';
  readonly message: string;
  readonly retryable: boolean;
}

export const cloneFrozen = <T>(value: T): T => {
  const clone = structuredClone(value);
  const freeze = (candidate: unknown): void => {
    if (
      typeof candidate !== 'object' ||
      candidate === null ||
      Object.isFrozen(candidate)
    ) {
      return;
    }
    Object.freeze(candidate);
    for (const nested of Object.values(candidate)) {
      freeze(nested);
    }
  };
  freeze(clone);
  return clone;
};
