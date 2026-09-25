export interface ParticipantTokenClaims {
  readonly eventSessionId?: string;
  readonly expiresAt?: number;
  readonly unitId?: string;
}

export interface ParticipantTokenSource {
  read(): string | undefined;
}

export interface MutableParticipantTokenSource extends ParticipantTokenSource {
  write(token: string): void;
}

export class ParticipantAuthenticationError extends Error {
  constructor(
    readonly code: 'token-missing' | 'token-invalid' | 'token-expired',
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = 'ParticipantAuthenticationError';
  }
}

const decodeClaims = (token: string): ParticipantTokenClaims => {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[1] === undefined) {
    throw new ParticipantAuthenticationError('token-invalid');
  }
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8'),
    ) as Record<string, unknown>;
    return {
      ...(typeof payload.event_session_id === 'string'
        ? { eventSessionId: payload.event_session_id }
        : {}),
      ...(typeof payload.exp === 'number' ? { expiresAt: payload.exp } : {}),
      ...(typeof payload.unit_id === 'string'
        ? { unitId: payload.unit_id }
        : {}),
    };
  } catch (error) {
    throw new ParticipantAuthenticationError('token-invalid', {
      cause: error,
    });
  }
};

export class ParticipantAuthSession {
  constructor(
    private readonly tokenSource: ParticipantTokenSource,
    private readonly now: () => Date = () => new Date(),
  ) {}

  status(): {
    readonly authenticated: boolean;
    readonly claims?: ParticipantTokenClaims;
  } {
    const token = this.tokenSource.read();
    if (token === undefined || token.length === 0) {
      return { authenticated: false };
    }
    const claims = decodeClaims(token);
    if (
      claims.expiresAt !== undefined &&
      claims.expiresAt <= Math.floor(this.now().getTime() / 1000)
    ) {
      return { authenticated: false, claims };
    }
    return { authenticated: true, claims };
  }

  authorizationHeader(): Readonly<Record<'authorization', string>> {
    const token = this.tokenSource.read();
    if (token === undefined || token.length === 0) {
      throw new ParticipantAuthenticationError('token-missing');
    }
    const claims = decodeClaims(token);
    if (
      claims.expiresAt !== undefined &&
      claims.expiresAt <= Math.floor(this.now().getTime() / 1000)
    ) {
      throw new ParticipantAuthenticationError('token-expired');
    }
    return { authorization: `Bearer ${token}` };
  }
}

export function createEnvironmentTokenSource(
  environment: NodeJS.ProcessEnv,
): ParticipantTokenSource {
  return {
    read: () => environment.MISSION_CONTROL_UNIT_TOKEN,
  };
}

export function createMutableTokenSource(
  initialToken?: string,
): MutableParticipantTokenSource {
  let token = initialToken;
  return {
    read: () => token,
    write: (value) => {
      token = value;
    },
  };
}
