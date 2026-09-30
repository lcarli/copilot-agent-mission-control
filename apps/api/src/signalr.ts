import { createHash } from 'node:crypto';

import type { TokenCredential } from '@azure/core-auth';
import {
  decodePublicPresentationProjection,
  type PublicPresentationProjection,
} from '@mission-control/event-contracts';

import { stateProblem } from './durable/values.js';

export const publicHub = (eventSessionId: string) =>
  `workshop_${createHash('sha256').update(eventSessionId).digest('hex')}`;

export class SignalRPublicTransport {
  constructor(
    private readonly origin: string,
    private readonly credential: TokenCredential,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async #request(path: string, method: 'POST' | 'HEAD', body?: string) {
    const signal = AbortSignal.timeout(4_000);
    try {
      const access = await this.credential.getToken(
        'https://signalr.azure.com/.default',
        { abortSignal: signal },
      );
      if (access === null) throw stateProblem('realtime-identity-unavailable');
      const response = await this.fetcher(`${this.origin}${path}`, {
        method,
        signal,
        redirect: 'error',
        headers: {
          authorization: `Bearer ${access.token}`,
          'content-type': 'application/json',
        },
        ...(body === undefined ? {} : { body }),
      });
      if (!response.ok) throw stateProblem('realtime-unavailable');
      return response;
    } catch {
      throw stateProblem('realtime-unavailable');
    }
  }

  async negotiate(eventSessionId: string) {
    const hub = publicHub(eventSessionId);
    const response = await this.#request(
      `/api/hubs/${hub}/:generateToken?api-version=2024-12-01&minutesToExpire=5`,
      'POST',
    );
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw stateProblem('realtime-response-invalid');
    }
    if (
      typeof body !== 'object' ||
      body === null ||
      !('token' in body) ||
      typeof body.token !== 'string' ||
      body.token.length < 1 ||
      body.token.length > 16_000
    )
      throw stateProblem('realtime-response-invalid');
    return {
      url: `${this.origin}/client/?hub=${hub}`,
      accessToken: body.token,
    };
  }

  async publish(eventSessionId: string, value: PublicPresentationProjection) {
    const projection = decodePublicPresentationProjection(value);
    if (
      projection.eventSessionId !== eventSessionId ||
      projection.source !== 'hosted-event' ||
      projection.revision === undefined
    )
      throw stateProblem('realtime-projection-invalid', 500);
    const body = JSON.stringify({
      target: 'publicProjection',
      arguments: [projection],
    });
    if (Buffer.byteLength(body) > 900_000)
      throw stateProblem('realtime-projection-too-large', 413);
    await this.#request(
      `/api/hubs/${publicHub(eventSessionId)}/:send?api-version=2024-12-01`,
      'POST',
      body,
    );
  }

  async check(): Promise<'up' | 'down'> {
    try {
      await this.#request('/api/health?api-version=2024-12-01', 'HEAD');
      return 'up';
    } catch {
      return 'down';
    }
  }
}
