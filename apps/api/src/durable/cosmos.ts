import type { TokenCredential } from '@azure/core-auth';
import { CosmosClient, type OperationInput } from '@azure/cosmos';
import { isRecord } from '@mission-control/campaign-operation-lighthouse';
import { Value } from '@sinclair/typebox/value';

import {
  documentSchemas,
  type DocumentBackend,
  type DocumentFilter,
  type DocumentKind,
  type DocumentWrite,
  type VersionedDocument,
} from './documents.js';
import { jsonValue, StateConflict, stateProblem } from './values.js';

export const durableLimits = {
  itemBytes: 1_500_000,
  batchBytes: 1_800_000,
  batchOperations: 100,
  queryDocuments: 10_000,
} as const;

const isKind = (value: unknown): value is DocumentKind =>
  typeof value === 'string' && Object.hasOwn(documentSchemas, value);

function decodeStored(value: unknown): VersionedDocument {
  if (
    !isRecord(value) ||
    value.schemaVersion !== '1.0' ||
    typeof value.id !== 'string' ||
    typeof value.eventSessionId !== 'string' ||
    typeof value._etag !== 'string' ||
    !isKind(value.kind) ||
    !Value.Check(documentSchemas[value.kind], value.value)
  )
    throw stateProblem('state-document-invalid', 500);
  return {
    etag: value._etag,
    document: {
      id: value.id,
      eventSessionId: value.eventSessionId,
      schemaVersion: '1.0',
      kind: value.kind,
      value: jsonValue(value.value),
    },
  };
}

const statusOf = (error: unknown) =>
  error instanceof Error && 'code' in error ? Number(error.code) : undefined;

export function assertBatchBounds(writes: readonly DocumentWrite[]) {
  if (
    writes.length > durableLimits.batchOperations ||
    Buffer.byteLength(JSON.stringify(writes), 'utf8') >
      durableLimits.batchBytes ||
    writes.some(
      ({ document }) =>
        Buffer.byteLength(JSON.stringify(document), 'utf8') >
        durableLimits.itemBytes,
    )
  )
    throw stateProblem('state-transaction-too-large', 413);
}

export interface CosmosStateOptions {
  readonly endpoint: string;
  readonly database: string;
  readonly container: string;
}

export class CosmosDocumentBackend implements DocumentBackend {
  readonly #client: CosmosClient;
  readonly #container;

  constructor(options: CosmosStateOptions, credential: TokenCredential) {
    this.#client = new CosmosClient({
      endpoint: options.endpoint,
      aadCredentials: credential,
      consistencyLevel: 'Session',
      connectionPolicy: {
        requestTimeout: 4_000,
        retryOptions: { maxRetryAttemptCount: 2, maxWaitTimeInSeconds: 2 },
      },
    });
    this.#container = this.#client
      .database(options.database)
      .container(options.container);
  }

  async read(partition: string, id: string) {
    let resource: unknown;
    try {
      const response = await this.#container.item(id, partition).read();
      if (response.statusCode === 404) return undefined;
      resource = response.resource;
    } catch (error) {
      if (statusOf(error) === 404) return undefined;
      throw stateProblem('state-storage-unavailable');
    }
    const stored = decodeStored(resource);
    if (
      stored.document.eventSessionId !== partition ||
      stored.document.id !== id
    )
      throw stateProblem('state-scope-invalid', 500);
    return stored;
  }

  async query(
    kind: DocumentKind,
    partition?: string,
    filters: readonly DocumentFilter[] = [],
  ) {
    const parameters: { name: string; value: string | boolean }[] = [
      { name: '@kind', value: kind },
    ];
    const predicates = ['c.kind = @kind'];
    if (partition !== undefined) {
      predicates.push('c.eventSessionId = @partition');
      parameters.push({ name: '@partition', value: partition });
    }
    for (const [index, filter] of filters.entries()) {
      if (
        !['eventCodeLookup', 'unitId', 'missionId', 'pending'].includes(
          filter.field,
        )
      )
        throw stateProblem('state-query-invalid', 500);
      const parameter = `@filter${String(index)}`;
      predicates.push(`c.value.${filter.field} = ${parameter}`);
      parameters.push({ name: parameter, value: filter.value });
    }
    const iterator = this.#container.items.query<unknown>(
      {
        query: `SELECT * FROM c WHERE ${predicates.join(' AND ')}`,
        parameters,
      },
      {
        maxItemCount: 100,
        ...(partition === undefined ? {} : { partitionKey: partition }),
      },
    );
    const found: VersionedDocument[] = [];
    while (iterator.hasMoreResults()) {
      let resources: unknown[];
      try {
        resources = (await iterator.fetchNext()).resources;
      } catch {
        throw stateProblem('state-storage-unavailable');
      }
      for (const resource of resources) {
        const row = decodeStored(resource);
        if (
          row.document.kind !== kind ||
          (partition !== undefined && row.document.eventSessionId !== partition)
        )
          throw stateProblem('state-scope-invalid', 500);
        found.push(row);
      }
      if (found.length > durableLimits.queryDocuments)
        throw stateProblem('state-query-capacity-reached');
    }
    return found;
  }

  async batch(partition: string, writes: readonly DocumentWrite[]) {
    assertBatchBounds(writes);
    const operations: OperationInput[] = writes.map((write) => {
      if (write.document.eventSessionId !== partition)
        throw stateProblem('state-scope-invalid', 500);
      if (write.operation === 'replace')
        return {
          operationType: 'Replace',
          id: write.document.id,
          ifMatch: write.etag,
          resourceBody: { ...write.document },
        };
      return {
        operationType: write.operation === 'create' ? 'Create' : 'Upsert',
        resourceBody: { ...write.document },
      };
    });
    const response = await this.#container.items
      .batch(operations, partition)
      .catch((error: unknown) => {
        if ([409, 412].includes(statusOf(error) ?? 0))
          throw new StateConflict();
        throw stateProblem('state-storage-unavailable');
      });
    if ([409, 412].includes(response.code ?? 0)) throw new StateConflict();
    if (response.code === undefined || response.result === undefined)
      throw stateProblem('state-storage-unavailable');
    if (
      response.result.some(
        ({ statusCode }) => statusCode === 409 || statusCode === 412,
      )
    )
      throw new StateConflict();
    if (
      response.code < 200 ||
      response.code >= 300 ||
      response.result.length !== writes.length ||
      response.result.some(
        ({ statusCode }) => statusCode < 200 || statusCode >= 300,
      )
    )
      throw stateProblem('state-storage-unavailable');
  }

  async check(): Promise<'up' | 'down'> {
    try {
      const { resource } = await this.#container.read();
      return resource?.partitionKey?.paths.length === 1 &&
        resource.partitionKey.paths[0] === '/eventSessionId' &&
        (resource.defaultTtl === undefined || resource.defaultTtl === -1)
        ? 'up'
        : 'down';
    } catch {
      return 'down';
    }
  }

  close() {
    this.#client.dispose();
  }
}
