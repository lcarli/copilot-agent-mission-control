import { randomBytes } from 'node:crypto';

import { beforeEach, expect, it, vi } from 'vitest';

import {
  assertBatchBounds,
  CosmosDocumentBackend,
  durableLimits,
} from '../src/durable/cosmos.js';
import type { DocumentWrite, StateDocument } from '../src/durable/documents.js';
import { ReplayCipher, StateConflict } from '../src/durable/values.js';

const mock = vi.hoisted(() => ({
  options: vi.fn(),
  item: vi.fn(),
  read: vi.fn(),
  query: vi.fn(),
  batch: vi.fn(),
  container: vi.fn(),
  dispose: vi.fn(),
}));

vi.mock('@azure/cosmos', () => ({
  CosmosClient: class {
    constructor(options: unknown) {
      mock.options(options);
    }
    database() {
      return {
        container: () => ({
          item: mock.item,
          items: { query: mock.query, batch: mock.batch },
          read: mock.container,
        }),
      };
    }
    dispose() {
      mock.dispose();
    }
  },
}));

const head: StateDocument = {
  id: 'head',
  eventSessionId: 'event-1',
  schemaVersion: '1.0',
  kind: 'head',
  value: { revision: 2 },
};
const backend = () =>
  new CosmosDocumentBackend(
    {
      endpoint: 'https://example.documents.azure.com',
      database: 'workshop',
      container: 'state',
    },
    {
      getToken: () =>
        Promise.resolve({
          token: 'synthetic-token',
          expiresOnTimestamp: Date.now() + 60_000,
        }),
    },
  );

beforeEach(() => {
  vi.resetAllMocks();
  mock.item.mockReturnValue({ read: mock.read });
});

it('uses token credentials and atomic batches with an ETag guard, not bulk writes', async () => {
  mock.batch.mockResolvedValue({ code: 200, result: [{ statusCode: 200 }] });
  const storage = backend();
  await storage.batch('event-1', [
    { operation: 'replace', document: head, etag: 'previous' },
  ]);
  expect(mock.options).toHaveBeenCalledWith(
    expect.objectContaining({
      consistencyLevel: 'Session',
    }),
  );
  expect(mock.options.mock.calls[0]?.[0]).toHaveProperty(
    'aadCredentials.getToken',
  );
  expect(mock.options.mock.calls[0]?.[0]).not.toHaveProperty('key');
  expect(mock.batch).toHaveBeenCalledWith(
    [
      {
        operationType: 'Replace',
        id: 'head',
        ifMatch: 'previous',
        resourceBody: head,
      },
    ],
    'event-1',
  );
  storage.close();
  expect(mock.dispose).toHaveBeenCalledOnce();
});

it.each([
  { code: 200, result: [{ statusCode: 412 }] },
  { code: 409 },
  { code: 200, result: [{ statusCode: 424 }, { statusCode: 409 }] },
])(
  'rejects conditional or duplicate failures in a batch response',
  async (response) => {
    mock.batch.mockResolvedValue(response);
    await expect(
      backend().batch('event-1', [{ operation: 'upsert', document: head }]),
    ).rejects.toBeInstanceOf(StateConflict);
  },
);

it.each([
  {},
  { code: 200 },
  { code: 200, result: [] },
  { code: 200, result: [{ statusCode: 424 }] },
  { code: 503, result: [{ statusCode: 200 }] },
])(
  'never treats an incomplete or failed batch as success',
  async (response) => {
    mock.batch.mockResolvedValue(response);
    await expect(
      backend().batch('event-1', [{ operation: 'upsert', document: head }]),
    ).rejects.toMatchObject({ code: 'state-storage-unavailable', status: 503 });
  },
);

it('validates read scope and schema and parameterizes indexed event-code lookups', async () => {
  mock.read.mockResolvedValue({
    resource: { ...head, _etag: 'etag' },
    statusCode: 200,
  });
  const storage = backend();
  expect(await storage.read('event-1', 'head')).toMatchObject({
    document: head,
    etag: 'etag',
  });
  await expect(storage.read('other-event', 'head')).rejects.toMatchObject({
    code: 'state-scope-invalid',
  });
  mock.read.mockResolvedValue({
    resource: { ...head, value: { revision: -1 }, _etag: 'etag' },
    statusCode: 200,
  });
  await expect(storage.read('event-1', 'head')).rejects.toMatchObject({
    code: 'state-document-invalid',
  });
  mock.query.mockReturnValue({
    hasMoreResults: vi.fn().mockReturnValueOnce(true).mockReturnValue(false),
    fetchNext: () => Promise.resolve({ resources: [] }),
  });
  await storage.query('event', undefined, [
    { field: 'eventCodeLookup', value: "' OR true" },
  ]);
  expect(mock.query.mock.calls[0]?.[0]).toEqual({
    query:
      'SELECT * FROM c WHERE c.kind = @kind AND c.value.eventCodeLookup = @filter0',
    parameters: [
      { name: '@kind', value: 'event' },
      { name: '@filter0', value: "' OR true" },
    ],
  });
});

it('enforces measured item/batch limits before sending writes', async () => {
  const small: DocumentWrite[] = Array.from(
    { length: 100 },
    (_value, index) => ({
      operation: 'create',
      document: { ...head, id: `head-${String(index)}` },
    }),
  );
  expect(() => {
    assertBatchBounds(small);
  }).not.toThrow();
  expect(() => {
    assertBatchBounds([...small, { operation: 'create', document: head }]);
  }).toThrow();
  const base = {
    ...head,
    kind: 'replay' as const,
    value: { fingerprint: 'test', sealed: '' },
  };
  const size = Buffer.byteLength(JSON.stringify(base));
  const maximum: StateDocument = {
    ...base,
    value: {
      ...base.value,
      sealed: 'a'.repeat(durableLimits.itemBytes - size),
    },
  };
  expect(Buffer.byteLength(JSON.stringify(maximum))).toBe(
    durableLimits.itemBytes,
  );
  expect(() => {
    assertBatchBounds([{ operation: 'create', document: maximum }]);
  }).not.toThrow();
  expect(() => {
    assertBatchBounds([
      { operation: 'create', document: maximum },
      { operation: 'create', document: maximum },
    ]);
  }).toThrow();
  const tooLarge = {
    ...maximum,
    value: { ...base.value, sealed: 'a'.repeat(durableLimits.itemBytes) },
  };
  await expect(
    backend().batch('event-1', [{ operation: 'create', document: tooLarge }]),
  ).rejects.toMatchObject({ status: 413 });
  expect(mock.batch).not.toHaveBeenCalled();
});

it('fails readiness for expiring state containers or wrong partition keys', async () => {
  const storage = backend();
  mock.container.mockResolvedValue({
    resource: { partitionKey: { paths: ['/eventSessionId'] } },
  });
  expect(await storage.check()).toBe('up');
  mock.container.mockResolvedValue({
    resource: { partitionKey: { paths: ['/eventSessionId'] }, defaultTtl: 300 },
  });
  expect(await storage.check()).toBe('down');
  mock.container.mockResolvedValue({
    resource: { partitionKey: { paths: ['/unitId'] } },
  });
  expect(await storage.check()).toBe('down');
});

it('encrypts replay credentials, preserves response order, and authenticates event/key scope', () => {
  const cipher = new ReplayCipher(randomBytes(32));
  const response = {
    token: 'synthetic-token',
    reconnectSecret: 'synthetic-reconnect',
    a: 1,
  };
  const sealed = cipher.seal(response, 'event/key');
  expect(sealed).not.toContain(response.reconnectSecret);
  expect(JSON.stringify(cipher.open(sealed, 'event/key'))).toBe(
    JSON.stringify(response),
  );
  expect(() => cipher.open(sealed, 'other/key')).toThrow();
  expect(() =>
    new ReplayCipher(randomBytes(32)).open(sealed, 'event/key'),
  ).toThrow();
});
