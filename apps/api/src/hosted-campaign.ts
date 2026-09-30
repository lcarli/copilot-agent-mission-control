import { createHash } from 'node:crypto';

import type {
  BlobDownloadToBufferOptions,
  BlobGetPropertiesOptions,
} from '@azure/storage-blob';
import { decodeLighthouseRuntime } from '@mission-control/campaign-operation-lighthouse';

import { ConfigurationError } from './config.js';

export interface CampaignDescriptorClient {
  getProperties(
    options: BlobGetPropertiesOptions,
  ): Promise<{ readonly contentLength?: number; readonly etag?: string }>;
  downloadToBuffer(
    offset: number,
    count: number,
    options: BlobDownloadToBufferOptions,
  ): Promise<Buffer>;
}

export async function loadHostedCampaign(
  client: CampaignDescriptorClient,
  sha256: string,
) {
  try {
    const abortSignal = AbortSignal.timeout(8_000);
    const properties = await client.getProperties({ abortSignal });
    const length = properties.contentLength;
    if (
      length === undefined ||
      !Number.isSafeInteger(length) ||
      length < 1 ||
      length > 1_000_000 ||
      properties.etag === undefined
    )
      throw new ConfigurationError(
        'Campaign descriptor exceeds the bounded download contract.',
      );
    const bytes = await client.downloadToBuffer(0, length, {
      abortSignal,
      conditions: { ifMatch: properties.etag },
      concurrency: 1,
    });
    if (
      bytes.length !== length ||
      createHash('sha256').update(bytes).digest('hex') !== sha256
    )
      throw new ConfigurationError(
        'Campaign descriptor digest does not match the pinned artifact.',
      );
    const value: unknown = JSON.parse(bytes.toString('utf8'));
    return decodeLighthouseRuntime(value);
  } catch (error) {
    if (error instanceof ConfigurationError) throw error;
    throw new ConfigurationError(
      'The pinned campaign descriptor could not be loaded or validated.',
    );
  }
}
