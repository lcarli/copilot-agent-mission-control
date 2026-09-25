import type { ScoreLedgerEntry } from './types.js';

export interface ScoreLedgerRepository {
  appendOnce(
    deduplicationKey: string,
    entries: readonly ScoreLedgerEntry[],
  ): Promise<boolean>;
  list(
    eventSessionId: string,
    unitId?: string,
  ): Promise<readonly ScoreLedgerEntry[]>;
}

const clone = <T>(value: T): T => structuredClone(value);

export class InMemoryScoreLedgerRepository implements ScoreLedgerRepository {
  readonly #entries: ScoreLedgerEntry[] = [];
  readonly #deduplicationKeys = new Set<string>();

  public appendOnce(
    deduplicationKey: string,
    entries: readonly ScoreLedgerEntry[],
  ): Promise<boolean> {
    if (this.#deduplicationKeys.has(deduplicationKey)) {
      return Promise.resolve(false);
    }
    this.#deduplicationKeys.add(deduplicationKey);
    this.#entries.push(...entries.map(clone));
    return Promise.resolve(true);
  }

  public list(
    eventSessionId: string,
    unitId?: string,
  ): Promise<readonly ScoreLedgerEntry[]> {
    return Promise.resolve(
      this.#entries
        .filter(
          (entry) =>
            entry.eventSessionId === eventSessionId &&
            (unitId === undefined || entry.unitId === unitId),
        )
        .map(clone),
    );
  }
}
