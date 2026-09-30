import { expect, it, vi } from 'vitest';
import type { TokenCredential } from '@azure/core-auth';
import type { PublicPresentationProjection } from '@mission-control/event-contracts';

import type {
  DocumentBackend,
  VersionedDocument,
} from '../src/durable/documents.js';
import { PublicationWorker } from '../src/durable/publication.js';
import { StateConflict } from '../src/durable/values.js';
import { publicHub, SignalRPublicTransport } from '../src/signalr.js';

const projection: PublicPresentationProjection = {
  schemaVersion: '1.0',
  eventSessionId: 'event-a',
  source: 'hosted-event',
  revision: 2,
  eventName: 'Operation Lighthouse',
  activeMission: { title: 'Mission', phase: 'open', progressPercent: 0 },
  collectiveRecoveryPercent: 58,
  connectedUnitCount: 0,
  districts: [],
  rankings: [],
  recognitions: [],
};
const getToken = vi.fn(() =>
  Promise.resolve({
    token: 'synthetic-managed-identity-token',
    expiresOnTimestamp: Date.now() + 60_000,
  }),
);
const credential: TokenCredential = { getToken };

it('uses separate public-only hubs, the official Entra scope and short-lived negotiation tokens', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ token: 'synthetic-public-token' }));
  const transport = new SignalRPublicTransport(
    'https://example.service.signalr.net',
    credential,
    fetcher,
  );
  const negotiation = await transport.negotiate('event-a');
  expect(publicHub('event-a')).not.toBe(publicHub('event-b'));
  expect(negotiation).toEqual({
    url: `https://example.service.signalr.net/client/?hub=${publicHub('event-a')}`,
    accessToken: 'synthetic-public-token',
  });
  expect(fetcher.mock.calls[0]?.[0]).toContain(
    '/:generateToken?api-version=2024-12-01&minutesToExpire=5',
  );
  expect(getToken).toHaveBeenCalledWith(
    'https://signalr.azure.com/.default',
    expect.anything(),
  );
  expect(fetcher.mock.calls[0]?.[1]?.redirect).toBe('error');
  await transport.publish('event-a', projection);
  const body = fetcher.mock.calls[1]?.[1]?.body;
  if (typeof body !== 'string')
    throw new Error('Expected serialized public projection.');
  expect(JSON.parse(body)).toEqual({
    target: 'publicProjection',
    arguments: [projection],
  });
  await expect(transport.publish('event-b', projection)).rejects.toThrow();
  const privateProjection = { ...projection, privateToken: 'must-not-leak' };
  await expect(
    transport.publish('event-a', privateProjection),
  ).rejects.toThrow();
  fetcher.mockResolvedValueOnce(new Response('', { status: 503 }));
  await expect(transport.negotiate('event-a')).rejects.toMatchObject({
    status: 503,
  });
});

it('retains failed publication and cannot clear a newer pending revision after an overlapping mutation', async () => {
  let row: VersionedDocument = {
    etag: 'r2',
    document: {
      id: 'publication',
      eventSessionId: 'event-a',
      schemaVersion: '1.0',
      kind: 'publication',
      value: { revision: 2, pending: true },
    },
  };
  const backend: DocumentBackend = {
    read: () => Promise.resolve(undefined),
    query: () => Promise.resolve([structuredClone(row)]),
    batch: (_partition, writes) => {
      const write = writes[0];
      if (write?.operation !== 'replace' || write.etag !== row.etag)
        return Promise.reject(new StateConflict());
      row = { document: write.document, etag: 'acknowledged' };
      return Promise.resolve();
    },
    check: () => Promise.resolve('up'),
    close: () => undefined,
  };
  const publish = vi
    .fn<(id: string, p: PublicPresentationProjection) => Promise<void>>()
    .mockRejectedValueOnce(new Error('Synthetic SignalR outage'));
  const worker = new PublicationWorker(backend, publish);
  const error = vi.fn();
  await worker.flush(() => Promise.resolve(projection), error);
  expect(row.document.value).toEqual({ revision: 2, pending: true });
  expect(error).toHaveBeenCalledOnce();
  publish.mockImplementationOnce(() => {
    row = {
      ...row,
      etag: 'r3',
      document: { ...row.document, value: { revision: 3, pending: true } },
    };
    return Promise.resolve();
  });
  await worker.flush(() => Promise.resolve(projection), error);
  expect(row.document.value).toEqual({ revision: 3, pending: true });
  publish.mockResolvedValue(undefined);
  await worker.flush(
    () => Promise.resolve({ ...projection, revision: 3 }),
    error,
  );
  expect(row.document.value).toEqual({ revision: 3, pending: false });
  expect(error).toHaveBeenCalledOnce();
});
