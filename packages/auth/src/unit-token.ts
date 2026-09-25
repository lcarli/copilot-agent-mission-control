import { SignJWT, errors, jwtVerify } from 'jose';
import { v7 as uuidV7 } from 'uuid';

import { AuthenticationError } from './errors.js';

const UUID_V7_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

export interface UnitTokenClaims {
  readonly subject: string;
  readonly eventSessionId: string;
  readonly unitId: string;
  readonly role: 'participant';
  readonly tokenVersion: number;
  readonly locale: 'en' | 'fr' | 'pt-BR';
  readonly tokenId: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
}

export interface UnitTokenServiceOptions {
  readonly secret: Uint8Array;
  readonly issuer: string;
  readonly audience: string;
  readonly ttlSeconds?: number;
  readonly clockToleranceSeconds?: number;
}

export interface IssueUnitTokenInput {
  readonly eventSessionId: string;
  readonly unitId: string;
  readonly tokenVersion: number;
  readonly locale: 'en' | 'fr' | 'pt-BR';
}

export interface VerifyUnitTokenOptions {
  readonly eventSessionId?: string;
  readonly unitId?: string;
  readonly tokenVersion?: number;
}

const requireUuidV7 = (value: string): void => {
  if (!UUID_V7_PATTERN.test(value)) {
    throw new AuthenticationError('token-scope-invalid');
  }
};

export class UnitTokenService {
  readonly #secret: Uint8Array;
  readonly #issuer: string;
  readonly #audience: string;
  readonly #ttlSeconds: number;
  readonly #clockToleranceSeconds: number;

  public constructor(options: UnitTokenServiceOptions) {
    const ttlSeconds = options.ttlSeconds ?? 900;
    if (
      options.secret.byteLength < 32 ||
      ttlSeconds < 60 ||
      ttlSeconds > 3600 ||
      !options.issuer ||
      !options.audience
    ) {
      throw new AuthenticationError('token-configuration-invalid');
    }
    this.#secret = options.secret;
    this.#issuer = options.issuer;
    this.#audience = options.audience;
    this.#ttlSeconds = ttlSeconds;
    this.#clockToleranceSeconds = options.clockToleranceSeconds ?? 5;
  }

  public async issue(
    input: IssueUnitTokenInput,
    issuedAt = new Date(),
  ): Promise<string> {
    requireUuidV7(input.eventSessionId);
    requireUuidV7(input.unitId);
    if (!Number.isSafeInteger(input.tokenVersion) || input.tokenVersion < 1) {
      throw new AuthenticationError('token-scope-invalid');
    }
    const issuedAtSeconds = Math.floor(issuedAt.getTime() / 1000);
    return new SignJWT({
      event_session_id: input.eventSessionId,
      unit_id: input.unitId,
      role: 'participant',
      token_version: input.tokenVersion,
      locale: input.locale,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuer(this.#issuer)
      .setAudience(this.#audience)
      .setSubject(input.unitId)
      .setJti(uuidV7())
      .setIssuedAt(issuedAtSeconds)
      .setExpirationTime(issuedAtSeconds + this.#ttlSeconds)
      .sign(this.#secret);
  }

  public async verify(
    token: string,
    expected: VerifyUnitTokenOptions = {},
    currentDate = new Date(),
  ): Promise<UnitTokenClaims> {
    try {
      const { payload } = await jwtVerify(token, this.#secret, {
        algorithms: ['HS256'],
        audience: this.#audience,
        clockTolerance: this.#clockToleranceSeconds,
        currentDate,
        issuer: this.#issuer,
        typ: 'JWT',
      });
      const eventSessionId = payload.event_session_id;
      const unitId = payload.unit_id;
      const tokenVersion = payload.token_version;
      const locale = payload.locale;
      if (
        typeof payload.sub !== 'string' ||
        typeof eventSessionId !== 'string' ||
        typeof unitId !== 'string' ||
        payload.sub !== unitId ||
        payload.role !== 'participant' ||
        typeof tokenVersion !== 'number' ||
        !Number.isSafeInteger(tokenVersion) ||
        (locale !== 'en' && locale !== 'fr' && locale !== 'pt-BR') ||
        typeof payload.jti !== 'string' ||
        typeof payload.iat !== 'number' ||
        typeof payload.exp !== 'number'
      ) {
        throw new AuthenticationError('token-invalid');
      }
      requireUuidV7(eventSessionId);
      requireUuidV7(unitId);
      requireUuidV7(payload.jti);
      if (
        (expected.eventSessionId &&
          expected.eventSessionId !== eventSessionId) ||
        (expected.unitId && expected.unitId !== unitId)
      ) {
        throw new AuthenticationError('token-scope-invalid');
      }
      if (
        expected.tokenVersion !== undefined &&
        expected.tokenVersion !== tokenVersion
      ) {
        throw new AuthenticationError('token-version-revoked');
      }
      return {
        subject: payload.sub,
        eventSessionId,
        unitId,
        role: 'participant',
        tokenVersion,
        locale,
        tokenId: payload.jti,
        issuedAt: payload.iat,
        expiresAt: payload.exp,
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      if (error instanceof errors.JOSEError) {
        throw new AuthenticationError('token-invalid', error);
      }
      throw error;
    }
  }
}
