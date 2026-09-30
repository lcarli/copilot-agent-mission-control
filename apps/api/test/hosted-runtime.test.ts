import { createHash, randomBytes } from 'node:crypto';

import { lighthouseRuntimeDescriptor } from '@mission-control/campaign-operation-lighthouse';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { loadConfig } from '../src/config.js';
import type { HostedConfig } from '../src/hosted-config.js';
import { createHostedWorkshopRuntime } from '../src/hosted-runtime.js';
import { buildHostedWorkshopApp } from '../src/hosted-workshop.js';

const sdk = vi.hoisted(() => ({
  identity: vi.fn(),
  getSecret: vi.fn(),
  getProperties: vi.fn(),
  downloadToBuffer: vi.fn(),
  check: vi.fn(),
  close: vi.fn(),
}));
vi.mock('@azure/identity', () => ({
  ManagedIdentityCredential: class {
    constructor(options: unknown) {
      sdk.identity(options);
    }
    getToken() {
      return Promise.resolve({
        token: 'synthetic-service-token',
        expiresOnTimestamp: Date.now() + 60_000,
      });
    }
  },
}));
vi.mock('@azure/keyvault-secrets', () => ({
  SecretClient: class {
    getSecret = sdk.getSecret;
  },
}));
vi.mock('@azure/storage-blob', () => ({
  BlobClient: class {
    getProperties = sdk.getProperties;
    downloadToBuffer = sdk.downloadToBuffer;
  },
}));
vi.mock('../src/durable/cosmos.js', async (original) => ({
  ...(await original<typeof import('../src/durable/cosmos.js')>()),
  CosmosDocumentBackend: class {
    check = sdk.check;
    close = sdk.close;
    read() {
      return Promise.resolve(undefined);
    }
    query() {
      return Promise.resolve([]);
    }
  },
}));
const bytes = Buffer.from(JSON.stringify(lighthouseRuntimeDescriptor));
const expiry = new Date(Date.now() + 3_600_000);
const config: HostedConfig = {
  managedIdentityClientId: '11111111-1111-4111-8111-111111111111',
  tenantId: '22222222-2222-4222-8222-222222222222',
  apiClientId: '33333333-3333-4333-8333-333333333333',
  spaClientId: '44444444-4444-4444-8444-444444444444',
  dashboardOrigin: 'https://dashboard.example.test',
  keyVaultUri: 'https://example.vault.azure.net',
  signingSecretName: 'participant-signing',
  signingSecretVersion: 'a'.repeat(32),
  cosmosEndpoint: 'https://example.documents.azure.com',
  cosmosDatabase: 'workshop',
  cosmosContainer: 'state',
  campaignBlobUrl:
    'https://example.blob.core.windows.net/campaigns/runtime.json',
  campaignSha256: createHash('sha256').update(bytes).digest('hex'),
  signalRUri: 'https://example.service.signalr.net',
};
const apps: ReturnType<typeof buildHostedWorkshopApp>[] = [];
beforeEach(() => {
  vi.clearAllMocks();
  sdk.getSecret.mockResolvedValue({
    value: randomBytes(32).toString('base64'),
    properties: {
      version: config.signingSecretVersion,
      enabled: true,
      expiresOn: expiry,
    },
  });
  sdk.getProperties.mockResolvedValue({
    contentLength: bytes.length,
    etag: 'immutable',
  });
  sdk.downloadToBuffer.mockResolvedValue(bytes);
  sdk.check.mockResolvedValue('up');
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(null, { status: 503 }))),
  );
});
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('assembles the explicit managed-identity runtime and keeps HTTP ready during a SignalR outage', async () => {
  const runtime = await createHostedWorkshopRuntime(config);
  const app = buildHostedWorkshopApp({
    runtime,
    config: loadConfig(),
    logger: false,
  });
  apps.push(app);
  expect(sdk.identity).toHaveBeenCalledWith({
    clientId: config.managedIdentityClientId,
  });
  expect((await app.inject('/api/v1/workshop')).json()).toMatchObject({
    mode: 'hosted',
    persistence: 'cosmos',
    transport: 'signalr',
    authentication: {
      clientId: config.spaClientId,
      redirectUri: `${config.dashboardOrigin}/auth.html`,
    },
  });
  expect((await app.inject('/api/v1/health/ready')).statusCode).toBe(200);
  expect((await app.inject('/api/v1/health/event')).statusCode).toBe(503);
  expect(
    (await app.inject('/api/v1/public/event-session?eventSessionId=absent'))
      .statusCode,
  ).toBe(404);
  vi.spyOn(Date, 'now').mockReturnValue(expiry.getTime() + 1);
  expect((await app.inject('/api/v1/health/live')).statusCode).toBe(200);
  expect((await app.inject('/api/v1/health/ready')).statusCode).toBe(503);
  expect((await app.inject('/api/v1/workshop')).json()).toMatchObject({
    code: 'signing-key-expired',
  });
});

it('does not fall back to memory when signing, immutable content or storage initialization fails', async () => {
  sdk.getSecret.mockRejectedValueOnce(new Error('Synthetic Key Vault outage'));
  await expect(createHostedWorkshopRuntime(config)).rejects.toThrow('pinned');
  sdk.downloadToBuffer.mockResolvedValueOnce(Buffer.from('changed'));
  await expect(createHostedWorkshopRuntime(config)).rejects.toThrow('digest');
  sdk.check.mockResolvedValueOnce('down');
  await expect(createHostedWorkshopRuntime(config)).rejects.toMatchObject({
    code: 'state-storage-unavailable',
  });
  expect(sdk.close).toHaveBeenCalledOnce();
});
