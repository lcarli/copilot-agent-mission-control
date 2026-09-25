import { InstructorCommandError } from './errors.js';
import type {
  InstructorCommandAudit,
  InstructorControlState,
} from './types.js';

export interface InstructorCommandRepository {
  getState(eventSessionId: string): Promise<InstructorControlState | undefined>;
  updateState(
    state: InstructorControlState,
    expectedVersion: number,
  ): Promise<void>;
  findAudit(
    eventSessionId: string,
    idempotencyKey: string,
  ): Promise<InstructorCommandAudit | undefined>;
  appendAudit(audit: InstructorCommandAudit): Promise<void>;
}

const clone = <T>(value: T): T => structuredClone(value);

export class InMemoryInstructorCommandRepository implements InstructorCommandRepository {
  readonly #states = new Map<string, InstructorControlState>();
  readonly #audits = new Map<string, InstructorCommandAudit>();

  public constructor(states: readonly InstructorControlState[] = []) {
    for (const state of states) {
      this.#states.set(state.eventSessionId, clone(state));
    }
  }

  public getState(
    eventSessionId: string,
  ): Promise<InstructorControlState | undefined> {
    const state = this.#states.get(eventSessionId);
    return Promise.resolve(state === undefined ? undefined : clone(state));
  }

  public updateState(
    state: InstructorControlState,
    expectedVersion: number,
  ): Promise<void> {
    const current = this.#states.get(state.eventSessionId);
    if (current === undefined) {
      throw new InstructorCommandError('command-target-not-found');
    }
    if (current.version !== expectedVersion) {
      throw new InstructorCommandError('command-stale-version');
    }
    this.#states.set(state.eventSessionId, clone(state));
    return Promise.resolve();
  }

  public findAudit(
    eventSessionId: string,
    idempotencyKey: string,
  ): Promise<InstructorCommandAudit | undefined> {
    const audit = this.#audits.get(`${eventSessionId}:${idempotencyKey}`);
    return Promise.resolve(audit === undefined ? undefined : clone(audit));
  }

  public appendAudit(audit: InstructorCommandAudit): Promise<void> {
    this.#audits.set(
      `${audit.eventSessionId}:${audit.idempotencyKey}`,
      clone(audit),
    );
    return Promise.resolve();
  }
}
