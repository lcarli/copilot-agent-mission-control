import { createHash, randomBytes } from 'node:crypto';

import type { SecretClient } from '@azure/keyvault-secrets';
import { lighthouseRuntimeDescriptor } from '@mission-control/campaign-operation-lighthouse';
import { expect, it, vi } from 'vitest';

import {
  loadHostedCampaign,
  type CampaignDescriptorClient,
} from '../src/hosted-campaign.js';
import { loadHostedConfig } from '../src/hosted-config.js';
import { loadSigningKey, signingMaterial } from '../src/hosted-signing.js';

const version = 'a'.repeat(32);
const environment = {
  WORKSHOP_RUNTIME: 'hosted',
  AZURE_CLIENT_ID: '11111111-1111-4111-8111-111111111111',
  ENTRA_TENANT_ID: '22222222-2222-4222-8222-222222222222',
  ENTRA_API_CLIENT_ID: '33333333-3333-4333-8333-333333333333',
  ENTRA_SPA_CLIENT_ID: '44444444-4444-4444-8444-444444444444',
  DASHBOARD_ORIGIN: 'https://dashboard.example.test',
  KEY_VAULT_URI: 'https://example.vault.azure.net',
  UNIT_SIGNING_SECRET_NAME: 'participant-signing',
  UNIT_SIGNING_SECRET_VERSION: version,
  COSMOS_ENDPOINT: 'https://example.documents.azure.com',
  COSMOS_DATABASE: 'workshop',
  COSMOS_STATE_CONTAINER: 'state',
  CAMPAIGN_RUNTIME_BLOB_URL:
    'https://example.blob.core.windows.net/campaigns/immutable/runtime.json',
  CAMPAIGN_RUNTIME_SHA256: 'b'.repeat(64),
  SIGNALR_SERVICE_URI: 'https://example.service.signalr.net',
};

it('requires explicit hosted configuration without insecure URL or signing defaults', () => {
  expect(loadHostedConfig(environment).cosmosContainer).toBe('state');
  for (const name of Object.keys(environment)) {
    expect(() =>
      loadHostedConfig({ ...environment, [name]: undefined }),
    ).toThrow();
  }
  for (const invalid of [
    { WORKSHOP_RUNTIME: 'local' },
    { AZURE_CLIENT_ID: 'principal-not-client-id' },
    { COSMOS_ENDPOINT: 'http://example.documents.azure.com' },
    { KEY_VAULT_URI: 'https://example.vault.azure.net.evil.test' },
    {
      SIGNALR_SERVICE_URI: 'https://user:password@example.service.signalr.net',
    },
    {
      CAMPAIGN_RUNTIME_BLOB_URL: `${environment.CAMPAIGN_RUNTIME_BLOB_URL}?sig=not-allowed`,
    },
    { ENTRA_SPA_CLIENT_ID: environment.ENTRA_API_CLIENT_ID },
    { UNIT_SIGNING_SECRET_VERSION: 'latest' },
  ])
    expect(() => loadHostedConfig({ ...environment, ...invalid })).toThrow();
});

it('loads exactly the pinned, usable 32-byte signing secret and rejects unavailable material', async () => {
  const bytes = randomBytes(32);
  const secret = {
    name: 'participant-signing',
    value: bytes.toString('base64'),
    properties: {
      vaultUrl: environment.KEY_VAULT_URI,
      name: 'participant-signing',
      version,
      enabled: true,
    },
  };
  const getSecret = vi
    .fn<SecretClient['getSecret']>()
    .mockResolvedValue(secret);
  expect(
    (await loadSigningKey({ getSecret }, secret.name, version)).bytes,
  ).toEqual(bytes);
  expect(getSecret.mock.calls[0]?.[1]?.version).toBe(version);
  for (const properties of [
    { version: 'other' },
    { enabled: false },
    { expiresOn: new Date(1) },
    { notBefore: new Date(Date.now() + 60_000) },
  ])
    expect(() =>
      signingMaterial(
        { ...secret, properties: { ...secret.properties, ...properties } },
        version,
      ),
    ).toThrow();
  for (const value of [
    undefined,
    '',
    'raw-not-base64',
    randomBytes(31).toString('base64'),
  ]) {
    const bad =
      value === undefined
        ? { name: secret.name, properties: secret.properties }
        : { ...secret, value };
    expect(() => signingMaterial(bad, version)).toThrow();
  }
  getSecret.mockRejectedValueOnce(new Error('Synthetic Key Vault failure'));
  await expect(
    loadSigningKey({ getSecret }, secret.name, version),
  ).rejects.toThrow('pinned');
});

it('downloads only the bounded immutable campaign descriptor with an ETag and digest check', async () => {
  const bytes = Buffer.from(JSON.stringify(lighthouseRuntimeDescriptor));
  const digest = createHash('sha256').update(bytes).digest('hex');
  const getProperties = vi
    .fn<CampaignDescriptorClient['getProperties']>()
    .mockResolvedValue({
      etag: 'immutable-etag',
      contentLength: bytes.length,
    });
  const downloadToBuffer = vi
    .fn<CampaignDescriptorClient['downloadToBuffer']>()
    .mockResolvedValue(bytes);
  const client = { getProperties, downloadToBuffer };
  expect((await loadHostedCampaign(client, digest)).missions).toHaveLength(5);
  expect(downloadToBuffer).toHaveBeenCalledWith(
    0,
    bytes.length,
    expect.objectContaining({
      conditions: { ifMatch: 'immutable-etag' },
      concurrency: 1,
    }),
  );
  await expect(loadHostedCampaign(client, '0'.repeat(64))).rejects.toThrow(
    'digest',
  );
  getProperties.mockResolvedValueOnce({
    etag: 'changed',
    contentLength: 1_000_001,
  });
  await expect(loadHostedCampaign(client, digest)).rejects.toThrow('bounded');
});
