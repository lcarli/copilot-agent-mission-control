import type { SupportedLocale } from '@mission-control/localization';

import type { ParticipantAuthSession } from './auth.js';
import type { ParticipantConfigRepository } from './config.js';
import type {
  ParticipantCredentialRepository,
  ParticipantCredentials,
} from './credentials.js';

export interface JoinEventRequest {
  readonly displayName: string;
  readonly eventCode: string;
  readonly locale: SupportedLocale;
}

export interface JoinedEventSummary {
  readonly eventSessionId: string;
  readonly unitId: string;
}

export interface ConnectivityCheckResult {
  readonly endpoint:
    'liveness' | 'readiness' | 'event-session' | 'unit' | 'missions';
  readonly status: 'pass' | 'fail';
  readonly statusCode?: number;
}

export class ParticipantRegistrationError extends Error {
  constructor(
    readonly code:
      | 'configuration-missing'
      | 'registration-failed'
      | 'registration-response-invalid',
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = 'ParticipantRegistrationError';
  }
}

export interface ParticipantRegistrationClient {
  checkConnectivity(): Promise<readonly ConnectivityCheckResult[]>;
  join(request: JoinEventRequest): Promise<JoinedEventSummary>;
}

interface RegistrationResponse {
  readonly eventSession: { readonly eventSessionId: string };
  readonly reconnectSecret: string;
  readonly unit: { readonly unitId: string };
  readonly unitToken: string;
}

const parseRegistrationResponse = (value: unknown): RegistrationResponse => {
  if (typeof value !== 'object' || value === null) {
    throw new ParticipantRegistrationError('registration-response-invalid');
  }
  const candidate = value as Record<string, unknown>;
  const eventSession = candidate.eventSession;
  const unit = candidate.unit;
  if (
    typeof candidate.unitToken !== 'string' ||
    typeof candidate.reconnectSecret !== 'string' ||
    typeof eventSession !== 'object' ||
    eventSession === null ||
    !('eventSessionId' in eventSession) ||
    typeof eventSession.eventSessionId !== 'string' ||
    typeof unit !== 'object' ||
    unit === null ||
    !('unitId' in unit) ||
    typeof unit.unitId !== 'string'
  ) {
    throw new ParticipantRegistrationError('registration-response-invalid');
  }
  return {
    eventSession: { eventSessionId: eventSession.eventSessionId },
    reconnectSecret: candidate.reconnectSecret,
    unit: { unitId: unit.unitId },
    unitToken: candidate.unitToken,
  };
};

export interface HttpParticipantRegistrationClientOptions {
  readonly auth: ParticipantAuthSession;
  readonly configRepository: ParticipantConfigRepository;
  readonly credentialRepository: ParticipantCredentialRepository;
  readonly fetch?: typeof globalThis.fetch;
  readonly updateToken: (token: string) => void;
}

export class HttpParticipantRegistrationClient implements ParticipantRegistrationClient {
  readonly #auth: ParticipantAuthSession;
  readonly #configRepository: ParticipantConfigRepository;
  readonly #credentialRepository: ParticipantCredentialRepository;
  readonly #fetch: typeof globalThis.fetch;
  readonly #updateToken: (token: string) => void;

  constructor(options: HttpParticipantRegistrationClientOptions) {
    this.#auth = options.auth;
    this.#configRepository = options.configRepository;
    this.#credentialRepository = options.credentialRepository;
    this.#fetch = options.fetch ?? globalThis.fetch;
    this.#updateToken = options.updateToken;
  }

  async join(request: JoinEventRequest): Promise<JoinedEventSummary> {
    const config = await this.#requireConfig();
    let response: Response;
    try {
      response = await this.#fetch(`${config.apiUrl}/api/v1/registrations`, {
        body: JSON.stringify(request),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      throw new ParticipantRegistrationError('registration-failed', {
        cause: error,
      });
    }
    if (!response.ok) {
      throw new ParticipantRegistrationError('registration-failed');
    }
    let joined: RegistrationResponse;
    try {
      joined = parseRegistrationResponse(await response.json());
    } catch (error) {
      if (error instanceof ParticipantRegistrationError) throw error;
      throw new ParticipantRegistrationError('registration-response-invalid', {
        cause: error,
      });
    }
    const credentials: ParticipantCredentials = {
      eventCode: request.eventCode,
      eventSessionId: joined.eventSession.eventSessionId,
      reconnectSecret: joined.reconnectSecret,
      unitId: joined.unit.unitId,
      unitToken: joined.unitToken,
    };
    await this.#credentialRepository.save(credentials);
    this.#updateToken(joined.unitToken);
    return {
      eventSessionId: credentials.eventSessionId,
      unitId: credentials.unitId,
    };
  }

  async checkConnectivity(): Promise<readonly ConnectivityCheckResult[]> {
    const config = await this.#requireConfig();
    const checks = [
      { endpoint: 'liveness', path: '/api/v1/health/live', protected: false },
      { endpoint: 'readiness', path: '/api/v1/health/ready', protected: false },
      {
        endpoint: 'event-session',
        path: '/api/v1/event-session',
        protected: true,
      },
      { endpoint: 'unit', path: '/api/v1/unit', protected: true },
      { endpoint: 'missions', path: '/api/v1/missions', protected: true },
    ] as const;
    let authorization: Readonly<Record<'authorization', string>> | undefined;
    try {
      authorization = this.#auth.authorizationHeader();
    } catch {
      authorization = undefined;
    }
    return Promise.all(
      checks.map(async (check): Promise<ConnectivityCheckResult> => {
        const currentAuthorization = authorization;
        let request: RequestInit;
        if (check.protected) {
          if (currentAuthorization === undefined) {
            return { endpoint: check.endpoint, status: 'fail' };
          }
          request = {
            headers: currentAuthorization,
            signal: AbortSignal.timeout(5_000),
          };
        } else {
          request = { signal: AbortSignal.timeout(5_000) };
        }
        try {
          const response = await this.#fetch(
            `${config.apiUrl}${check.path}`,
            request,
          );
          return {
            endpoint: check.endpoint,
            status: response.ok ? 'pass' : 'fail',
            statusCode: response.status,
          };
        } catch {
          return { endpoint: check.endpoint, status: 'fail' };
        }
      }),
    );
  }

  async #requireConfig() {
    const config = await this.#configRepository.load();
    if (config === undefined) {
      throw new ParticipantRegistrationError('configuration-missing');
    }
    return config;
  }
}
