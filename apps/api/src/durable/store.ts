import { AsyncLocalStorage } from 'node:async_hooks';

import { isRecord } from '@mission-control/campaign-operation-lighthouse';
import type { Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { v7 as uuidV7 } from 'uuid';

import { LocalRequests, workshopProblem } from '../local-requests.js';
import { ApiProblem } from '../problems.js';
import { knownWorkshopProblem } from '../workshop-errors.js';
import type { WorkshopRequests } from '../workshop-runtime.js';
import { assertBatchBounds } from './cosmos.js';
import {
  documentSchemas,
  type DocumentBackend,
  type DocumentFilter,
  type DocumentKind,
  type DocumentWrite,
  type StateDocument,
  type VersionedDocument,
} from './documents.js';
import {
  digest,
  jsonValue,
  ReplayCipher,
  StateConflict,
  stateProblem,
} from './values.js';

type DocumentValue<K extends DocumentKind> = Static<
  (typeof documentSchemas)[K]
>;

interface Session {
  readonly partition: string;
  readonly head: VersionedDocument | undefined;
  readonly revision: number;
  readonly readOnly: boolean;
  readonly writes: Map<string, StateDocument>;
  readonly queries: Map<string, Promise<readonly VersionedDocument[]>>;
  readonly reads: Map<string, Promise<VersionedDocument | undefined>>;
}

export const documentId = (
  kind: DocumentKind,
  parts: readonly string[] = [],
) => (parts.length === 0 ? kind : `${kind}:${digest(parts)}`);

function decodeValue<K extends DocumentKind>(
  kind: K,
  document: StateDocument,
): DocumentValue<K> {
  const value: unknown = document.value;
  if (
    isRecord(value) &&
    typeof value.eventSessionId === 'string' &&
    kind !== 'creation' &&
    value.eventSessionId !== document.eventSessionId
  )
    throw stateProblem('state-scope-invalid', 500);
  if (document.kind !== kind || !Value.Check(documentSchemas[kind], value))
    throw stateProblem('state-document-invalid', 500);
  return value;
}

export class DurableWorkshopStore implements WorkshopRequests {
  readonly #context = new AsyncLocalStorage<Session>();
  readonly #queue = new LocalRequests();
  readonly #pending = new Map<
    string,
    { fingerprint: string; result: Promise<unknown> }
  >();
  readonly #cipher: ReplayCipher;

  constructor(
    readonly backend: DocumentBackend,
    signingKey: Uint8Array,
  ) {
    this.#cipher = new ReplayCipher(signingKey);
  }

  partition(): string {
    const session = this.#context.getStore();
    if (session === undefined)
      throw stateProblem('state-transaction-required', 500);
    return session.partition;
  }

  revision(): number {
    const session = this.#context.getStore();
    if (session === undefined)
      throw stateProblem('state-snapshot-required', 500);
    return session.revision;
  }

  #partition(explicit?: string) {
    const session = this.#context.getStore();
    if (
      session !== undefined &&
      explicit !== undefined &&
      session.partition !== explicit
    )
      throw stateProblem('state-scope-invalid', 500);
    return explicit ?? session?.partition;
  }

  async get<K extends DocumentKind>(
    kind: K,
    parts: readonly string[] = [],
    partition?: string,
  ) {
    const resolved = this.#partition(partition);
    if (resolved === undefined) throw stateProblem('state-scope-required', 500);
    const id = documentId(kind, parts);
    const session = this.#context.getStore();
    const pending = session?.writes.get(id);
    if (pending !== undefined)
      return structuredClone(decodeValue(kind, pending));
    let read = session?.reads.get(id);
    if (read === undefined) {
      read = this.backend.read(resolved, id);
      session?.reads.set(id, read);
    }
    const existing = await read;
    return existing === undefined
      ? undefined
      : structuredClone(decodeValue(kind, existing.document));
  }

  async query<K extends DocumentKind>(
    kind: K,
    partition?: string,
    filters: readonly DocumentFilter[] = [],
  ): Promise<readonly DocumentValue<K>[]> {
    const resolved = this.#partition(partition);
    const session = this.#context.getStore();
    const key = JSON.stringify([kind, filters]);
    let query = session?.queries.get(key);
    if (query === undefined) {
      query = this.backend.query(kind, resolved, filters);
      session?.queries.set(key, query);
    }
    const mapKey = (document: StateDocument) =>
      JSON.stringify([document.eventSessionId, document.id]);
    const documents = new Map(
      (await query).map(({ document }) => [mapKey(document), document]),
    );
    for (const document of session?.writes.values() ?? []) {
      if (document.kind === kind) documents.set(mapKey(document), document);
    }
    return [...documents.values()]
      .filter(({ value }) =>
        filters.every(
          ({ field, value: expected }) =>
            isRecord(value) && value[field] === expected,
        ),
      )
      .map((document) => structuredClone(decodeValue(kind, document)));
  }

  put(
    kind: DocumentKind,
    parts: readonly string[],
    value: unknown,
    partition?: string,
  ): void {
    const resolved = this.#partition(partition);
    const session = this.#context.getStore();
    if (session === undefined || session.readOnly || resolved === undefined)
      throw stateProblem('state-transaction-required', 500);
    const document: StateDocument = {
      id: documentId(kind, parts),
      eventSessionId: resolved,
      schemaVersion: '1.0',
      kind,
      value: jsonValue(value),
    };
    decodeValue(kind, document);
    session.writes.set(document.id, document);
  }

  async #session(partition: string, readOnly: boolean): Promise<Session> {
    const head = await this.backend.read(partition, 'head');
    return {
      partition,
      head,
      revision:
        head === undefined ? 0 : decodeValue('head', head.document).revision,
      readOnly,
      writes: new Map(),
      queries: new Map(),
      reads: new Map(),
    };
  }

  serialize<T>(resource: string, operation: () => Promise<T>): Promise<T> {
    return this.#queue.serialize(resource, async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const session = await this.#session(resource, true);
        const result = await this.#context.run(session, operation);
        const after = await this.backend.read(resource, 'head');
        if (after?.etag === session.head?.etag) return result;
      }
      throw stateProblem('state-snapshot-changed');
    });
  }

  mutate(
    resource: string,
    scope: readonly string[],
    key: string | string[] | undefined,
    body: unknown,
    operation: () => Promise<unknown>,
  ): Promise<unknown> {
    if (typeof key !== 'string' || !/^[A-Za-z0-9._:-]{1,200}$/u.test(key))
      throw workshopProblem('idempotency-key-required', 422);
    const requestId = digest([...scope, key]);
    const fingerprint = digest(body);
    const pending = this.#pending.get(requestId);
    if (pending !== undefined) {
      if (pending.fingerprint !== fingerprint)
        throw workshopProblem('idempotency-key-reused');
      return pending.result;
    }
    const result = this.#queue.serialize(resource, async () => {
      const partition =
        resource === 'create-event'
          ? await this.#creationPartition(requestId, fingerprint)
          : resource;
      try {
        return await this.#mutate(partition, requestId, fingerprint, operation);
      } catch (error) {
        if (error instanceof StateConflict)
          throw stateProblem('state-transaction-conflict');
        throw error;
      }
    });
    this.#pending.set(requestId, { fingerprint, result });
    const release = () => {
      this.#pending.delete(requestId);
    };
    void result.then(release, release);
    return result;
  }

  async #creationPartition(
    requestId: string,
    fingerprint: string,
  ): Promise<string> {
    const partition = 'workshop-directory';
    const id = documentId('creation', [requestId]);
    let existing = await this.backend.read(partition, id);
    if (existing === undefined) {
      const value = { eventSessionId: uuidV7(), fingerprint };
      try {
        await this.backend.batch(partition, [
          {
            operation: 'create',
            document: {
              id,
              eventSessionId: partition,
              schemaVersion: '1.0',
              kind: 'creation',
              value,
            },
          },
        ]);
        return value.eventSessionId;
      } catch (error) {
        if (!(error instanceof StateConflict)) throw error;
        existing = await this.backend.read(partition, id);
      }
    }
    if (existing === undefined)
      throw stateProblem('state-creation-unavailable');
    const creation = decodeValue('creation', existing.document);
    if (creation.fingerprint !== fingerprint)
      throw workshopProblem('idempotency-key-reused');
    return creation.eventSessionId;
  }

  async #mutate(
    partition: string,
    requestId: string,
    fingerprint: string,
    operation: () => Promise<unknown>,
  ) {
    const session = await this.#session(partition, false);
    return this.#context.run(session, async () => {
      const associatedData = JSON.stringify([partition, requestId]);
      const replay = await this.get('replay', [requestId]);
      if (replay !== undefined) {
        if (replay.fingerprint !== fingerprint)
          throw workshopProblem('idempotency-key-reused');
        return this.#unseal(replay.sealed, associatedData);
      }
      let result: unknown;
      let failure: ApiProblem | undefined;
      try {
        result = await operation();
      } catch (error) {
        const known = knownWorkshopProblem(error);
        if (known === undefined || known.status < 400 || known.status >= 500)
          throw error;
        failure = known;
        // Failed operations keep only their rejection audit, never partial business state.
        const rejected = [...session.writes.values()].filter(
          (document) =>
            document.kind === 'audit' &&
            isRecord(document.value) &&
            document.value.status === 'rejected',
        );
        session.writes.clear();
        for (const document of rejected)
          session.writes.set(document.id, document);
      }
      const outcome =
        failure === undefined
          ? { kind: 'success', value: result }
          : {
              kind: 'failure',
              problem: {
                code: failure.code,
                status: failure.status,
                title: failure.title,
                messageKey: failure.messageKey,
                messageArgs: failure.messageArgs,
                ...(failure.retryAfterSeconds === undefined
                  ? {}
                  : { retryAfterSeconds: failure.retryAfterSeconds }),
              },
            };
      this.put('replay', [requestId], {
        fingerprint,
        sealed: this.#cipher.seal(outcome, associatedData),
      });
      const revision = session.revision + 1;
      if ((await this.get('event')) !== undefined)
        this.put('publication', [], { revision, pending: true });
      const head: StateDocument = {
        id: 'head',
        eventSessionId: partition,
        kind: 'head',
        schemaVersion: '1.0',
        value: { revision },
      };
      const headWrite: DocumentWrite =
        session.head === undefined
          ? { operation: 'create', document: head }
          : { operation: 'replace', document: head, etag: session.head.etag };
      const writes: DocumentWrite[] = [
        headWrite,
        ...[...session.writes.values()].map((document): DocumentWrite => ({
          operation: 'upsert',
          document,
        })),
      ];
      assertBatchBounds(writes);
      await this.backend.batch(partition, writes);
      if (failure !== undefined) throw failure;
      return result;
    });
  }

  #unseal(sealed: string, associatedData: string): unknown {
    const outcome = this.#cipher.open(sealed, associatedData);
    if (!isRecord(outcome)) throw stateProblem('state-replay-invalid', 500);
    if (outcome.kind === 'success' && 'value' in outcome) return outcome.value;
    const problem = outcome.problem;
    if (
      outcome.kind === 'failure' &&
      isRecord(problem) &&
      typeof problem.code === 'string' &&
      typeof problem.status === 'number' &&
      typeof problem.title === 'string' &&
      typeof problem.messageKey === 'string' &&
      problem.status >= 400 &&
      problem.status < 500
    ) {
      const messageArgs: Record<string, string> = {};
      if (!isRecord(problem.messageArgs))
        throw stateProblem('state-replay-invalid', 500);
      for (const [key, value] of Object.entries(problem.messageArgs)) {
        if (typeof value !== 'string')
          throw stateProblem('state-replay-invalid', 500);
        messageArgs[key] = value;
      }
      const retryAfterSeconds = problem.retryAfterSeconds;
      if (
        retryAfterSeconds !== undefined &&
        (typeof retryAfterSeconds !== 'number' ||
          !Number.isSafeInteger(retryAfterSeconds) ||
          retryAfterSeconds < 0)
      )
        throw stateProblem('state-replay-invalid', 500);
      throw new ApiProblem({
        code: problem.code,
        status: problem.status,
        title: problem.title,
        messageKey: problem.messageKey,
        messageArgs,
        ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
      });
    }
    throw stateProblem('state-replay-invalid', 500);
  }
}
