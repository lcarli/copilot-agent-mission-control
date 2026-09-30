import type { KeyVaultSecret, SecretClient } from '@azure/keyvault-secrets';

import { ConfigurationError } from './config.js';

export function signingMaterial(
  secret: KeyVaultSecret,
  version: string,
  now = Date.now(),
) {
  const properties = secret.properties;
  if (
    properties.version !== version ||
    properties.enabled === false ||
    (properties.notBefore !== undefined &&
      properties.notBefore.getTime() > now) ||
    (properties.expiresOn !== undefined &&
      properties.expiresOn.getTime() <= now) ||
    typeof secret.value !== 'string' ||
    !/^[A-Za-z0-9+/]{43}=$/u.test(secret.value)
  )
    throw new ConfigurationError(
      'The pinned participant signing secret is unavailable or invalid.',
    );
  const bytes = Buffer.from(secret.value, 'base64');
  if (bytes.length !== 32 || bytes.toString('base64') !== secret.value)
    throw new ConfigurationError(
      'The participant signing secret must contain exactly 32 base64-encoded bytes.',
    );
  return bytes;
}

export async function loadSigningKey(
  client: Pick<SecretClient, 'getSecret'>,
  name: string,
  version: string,
) {
  let secret: KeyVaultSecret;
  try {
    secret = await client.getSecret(name, {
      version,
      abortSignal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw new ConfigurationError(
      'Could not retrieve the pinned participant signing secret.',
    );
  }
  return {
    bytes: signingMaterial(secret, version),
    expiresOn: secret.properties.expiresOn,
  };
}
