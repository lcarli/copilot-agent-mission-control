import { ConfigurationError } from './config.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export interface HostedConfig {
  readonly managedIdentityClientId: string;
  readonly tenantId: string;
  readonly apiClientId: string;
  readonly spaClientId: string;
  readonly dashboardOrigin: string;
  readonly keyVaultUri: string;
  readonly signingSecretName: string;
  readonly signingSecretVersion: string;
  readonly cosmosEndpoint: string;
  readonly cosmosDatabase: string;
  readonly cosmosContainer: string;
  readonly campaignBlobUrl: string;
  readonly campaignSha256: string;
  readonly signalRUri: string;
}

function required(
  environment: NodeJS.ProcessEnv,
  name: string,
  pattern: RegExp,
) {
  const value = environment[name];
  if (value === undefined || !pattern.test(value))
    throw new ConfigurationError(
      `${name} is missing or invalid for the hosted workshop.`,
    );
  return value;
}

function httpsUrl(
  environment: NodeJS.ProcessEnv,
  name: string,
  host: RegExp,
  blob = false,
) {
  const value = required(environment, name, /^https:\/\//u);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ConfigurationError(`${name} must be an HTTPS URL.`);
  }
  if (
    url.protocol !== 'https:' ||
    !host.test(url.hostname) ||
    url.port !== '' ||
    url.username !== '' ||
    url.password !== '' ||
    url.search !== '' ||
    url.hash !== '' ||
    (blob
      ? !/^\/campaigns\/[A-Za-z0-9._/-]+\.json$/u.test(url.pathname)
      : url.pathname !== '/')
  )
    throw new ConfigurationError(
      `${name} must identify the configured HTTPS resource without credentials or query parameters.`,
    );
  return blob ? url.href : url.origin;
}

export function loadHostedConfig(
  environment: NodeJS.ProcessEnv = process.env,
): HostedConfig {
  if (environment.WORKSHOP_RUNTIME !== 'hosted')
    throw new ConfigurationError(
      'WORKSHOP_RUNTIME=hosted is required; use start:local for rehearsal.',
    );
  const apiClientId = required(
    environment,
    'ENTRA_API_CLIENT_ID',
    uuid,
  ).toLowerCase();
  const spaClientId = required(
    environment,
    'ENTRA_SPA_CLIENT_ID',
    uuid,
  ).toLowerCase();
  if (apiClientId === spaClientId)
    throw new ConfigurationError(
      'Use separate API and SPA Entra registrations.',
    );
  return {
    managedIdentityClientId: required(
      environment,
      'AZURE_CLIENT_ID',
      uuid,
    ).toLowerCase(),
    tenantId: required(environment, 'ENTRA_TENANT_ID', uuid).toLowerCase(),
    apiClientId,
    spaClientId,
    dashboardOrigin: httpsUrl(
      environment,
      'DASHBOARD_ORIGIN',
      /^(?!localhost$)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/iu,
    ),
    keyVaultUri: httpsUrl(
      environment,
      'KEY_VAULT_URI',
      /^[a-z0-9-]+\.vault\.azure\.net$/iu,
    ),
    signingSecretName: required(
      environment,
      'UNIT_SIGNING_SECRET_NAME',
      /^[a-z0-9-]{1,127}$/iu,
    ),
    signingSecretVersion: required(
      environment,
      'UNIT_SIGNING_SECRET_VERSION',
      /^[a-f0-9]{32}$/iu,
    ),
    cosmosEndpoint: httpsUrl(
      environment,
      'COSMOS_ENDPOINT',
      /^[a-z0-9-]+\.documents\.azure\.com$/iu,
    ),
    cosmosDatabase: required(
      environment,
      'COSMOS_DATABASE',
      /^[a-z0-9_-]{1,100}$/iu,
    ),
    cosmosContainer: required(
      environment,
      'COSMOS_STATE_CONTAINER',
      /^[a-z0-9_-]{1,100}$/iu,
    ),
    campaignBlobUrl: httpsUrl(
      environment,
      'CAMPAIGN_RUNTIME_BLOB_URL',
      /^[a-z0-9]+\.blob\.core\.windows\.net$/iu,
      true,
    ),
    campaignSha256: required(
      environment,
      'CAMPAIGN_RUNTIME_SHA256',
      /^[a-f0-9]{64}$/u,
    ),
    signalRUri: httpsUrl(
      environment,
      'SIGNALR_SERVICE_URI',
      /^[a-z0-9-]+\.service\.signalr\.net$/iu,
    ),
  };
}
