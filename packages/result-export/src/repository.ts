import type { ResultExportArtifact } from './types.js';

export interface ResultExportRepository {
  get(
    eventSessionId: string,
    idempotencyKey: string,
  ): Promise<ResultExportArtifact | undefined>;
  saveOnce(artifact: ResultExportArtifact): Promise<ResultExportArtifact>;
}

const clone = <T>(value: T): T => structuredClone(value);

export class InMemoryResultExportRepository implements ResultExportRepository {
  readonly #artifacts = new Map<string, ResultExportArtifact>();

  public get(
    eventSessionId: string,
    idempotencyKey: string,
  ): Promise<ResultExportArtifact | undefined> {
    const artifact = this.#artifacts.get(`${eventSessionId}:${idempotencyKey}`);
    return Promise.resolve(
      artifact === undefined ? undefined : clone(artifact),
    );
  }

  public saveOnce(
    artifact: ResultExportArtifact,
  ): Promise<ResultExportArtifact> {
    const key = `${artifact.eventSessionId}:${artifact.idempotencyKey}`;
    const existing = this.#artifacts.get(key);
    if (existing !== undefined) {
      return Promise.resolve(clone(existing));
    }
    this.#artifacts.set(key, clone(artifact));
    return Promise.resolve(clone(artifact));
  }
}
