import { ManagedIdentityCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import { BlobClient } from '@azure/storage-blob';

import { CosmosDocumentBackend } from './durable/cosmos.js';
import { PublicationWorker } from './durable/publication.js';
import { createDurableWorkshopData } from './durable/runtime-data.js';
import { stateProblem } from './durable/values.js';
import { EntraInstructorAuthorizer } from './entra-instructor.js';
import { loadHostedCampaign } from './hosted-campaign.js';
import type { HostedConfig } from './hosted-config.js';
import { loadSigningKey } from './hosted-signing.js';
import { SignalRPublicTransport } from './signalr.js';
import type { WorkshopRuntime } from './workshop-runtime.js';

export async function createHostedWorkshopRuntime(
  config: HostedConfig,
): Promise<WorkshopRuntime> {
  const credential = new ManagedIdentityCredential({
    clientId: config.managedIdentityClientId,
  });
  const key = await loadSigningKey(
    new SecretClient(config.keyVaultUri, credential, {
      retryOptions: { maxRetries: 2 },
    }),
    config.signingSecretName,
    config.signingSecretVersion,
  );
  const campaign = await loadHostedCampaign(
    new BlobClient(config.campaignBlobUrl, credential, {
      retryOptions: { maxTries: 2 },
    }),
    config.campaignSha256,
  );
  const backend = new CosmosDocumentBackend(
    {
      endpoint: config.cosmosEndpoint,
      database: config.cosmosDatabase,
      container: config.cosmosContainer,
    },
    credential,
  );
  try {
    if ((await backend.check()) !== 'up')
      throw stateProblem('state-storage-unavailable');
    const data = createDurableWorkshopData(backend, key.bytes);
    const authorizer = new EntraInstructorAuthorizer(
      config,
      data.eventRepository,
    );
    const transport = new SignalRPublicTransport(config.signalRUri, credential);
    const publication = new PublicationWorker(backend, (id, projection) =>
      transport.publish(id, projection),
    );
    const keyValid = () =>
      key.expiresOn === undefined || key.expiresOn.getTime() > Date.now();
    const readinessProbes = [
      { name: 'cosmos-state', check: () => backend.check() },
      {
        name: 'pinned-signing-key',
        check: (): 'up' | 'down' => (keyValid() ? 'up' : 'down'),
      },
    ];
    return {
      ...data,
      profile: {
        mode: 'hosted',
        persistence: 'cosmos',
        transport: 'signalr',
        source: 'hosted-event',
        closeConfirmationPhrase: 'CLOSE EVENT',
      },
      identity: {
        tenantId: config.tenantId,
        clientId: config.spaClientId,
        scope: `api://${config.apiClientId}/Workshop.Access`,
        redirectUri: `${config.dashboardOrigin}/auth.html`,
      },
      missionContent: campaign.missions,
      campaignArtifactSha256: config.campaignSha256,
      assertOperational() {
        if (!keyValid()) throw stateProblem('signing-key-expired');
      },
      authorizeInstructor: (header, action, id) =>
        authorizer.authorize(header, action, id),
      realtime: {
        negotiate: (id) => transport.negotiate(id),
        start: (projection, onError) => {
          publication.start(projection, onError);
        },
      },
      readinessProbes,
      eventProbes: [
        ...readinessProbes,
        { name: 'signalr-publication', check: () => transport.check() },
      ],
      async close() {
        await publication.stop();
        backend.close();
      },
    };
  } catch (error) {
    backend.close();
    throw error;
  }
}
