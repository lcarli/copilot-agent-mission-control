import {
  authorizeInstructor,
  type InstructorAction,
  type InstructorRole,
} from '@mission-control/auth';
import type { EventUnitRepository } from '@mission-control/event-management';
import {
  createRemoteJWKSet,
  errors,
  jwtVerify,
  type JWTVerifyGetKey,
} from 'jose';

import type { HostedConfig } from './hosted-config.js';
import { workshopProblem } from './local-requests.js';
import { stateProblem } from './durable/values.js';

const isRole = (role: unknown): role is InstructorRole =>
  role === 'instructor' || role === 'event-admin' || role === 'platform-admin';
const identifier = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(
    value,
  );

export class EntraInstructorAuthorizer {
  readonly #keys: JWTVerifyGetKey;
  readonly #issuer: string;

  constructor(
    private readonly config: Pick<
      HostedConfig,
      'tenantId' | 'apiClientId' | 'spaClientId'
    >,
    private readonly events: EventUnitRepository,
    keys?: JWTVerifyGetKey,
  ) {
    this.#issuer = `https://login.microsoftonline.com/${config.tenantId}/v2.0`;
    this.#keys =
      keys ??
      createRemoteJWKSet(
        new URL(
          `https://login.microsoftonline.com/${config.tenantId}/discovery/v2.0/keys`,
        ),
        { timeoutDuration: 3000, cooldownDuration: 30_000 },
      );
  }

  async authorize(
    authorization: string | undefined,
    action: InstructorAction,
    eventSessionId?: string,
  ) {
    if (!authorization?.startsWith('Bearer ') || authorization.length > 16_000)
      throw workshopProblem('instructor-authentication-required', 401);
    const verified = await jwtVerify(authorization.slice(7), this.#keys, {
      algorithms: ['RS256'],
      audience: this.config.apiClientId,
      issuer: this.#issuer,
      clockTolerance: 5,
      requiredClaims: [
        'exp',
        'nbf',
        'iat',
        'sub',
        'tid',
        'oid',
        'azp',
        'scp',
        'ver',
      ],
    }).catch((error: unknown) => {
      if (
        error instanceof errors.JOSEError &&
        [
          'ERR_JWT_CLAIM_VALIDATION_FAILED',
          'ERR_JWT_EXPIRED',
          'ERR_JWS_INVALID',
          'ERR_JWT_INVALID',
          'ERR_JOSE_ALG_NOT_ALLOWED',
          'ERR_JWS_SIGNATURE_VERIFICATION_FAILED',
          'ERR_JWKS_NO_MATCHING_KEY',
        ].includes(error.code)
      )
        throw workshopProblem('instructor-token-invalid', 401);
      throw stateProblem('instructor-identity-unavailable');
    });
    const claims = verified.payload;
    const claimedRoles = claims.roles;
    if (
      claims.tid !== this.config.tenantId ||
      claims.azp !== this.config.spaClientId ||
      claims.ver !== '2.0' ||
      !identifier(claims.oid) ||
      typeof claims.sub !== 'string' ||
      claims.sub.length === 0 ||
      typeof claims.scp !== 'string' ||
      !claims.scp.split(' ').includes('Workshop.Access') ||
      (claimedRoles !== undefined &&
        (!Array.isArray(claimedRoles) ||
          !claimedRoles.every((role: unknown) => typeof role === 'string'))) ||
      typeof claims.iat !== 'number' ||
      typeof claims.exp !== 'number' ||
      claims.iat > Date.now() / 1000 + 5 ||
      claims.exp <= claims.iat
    )
      throw workshopProblem('instructor-token-invalid', 401);
    const roles = new Set<InstructorRole>(
      claimedRoles === undefined ? [] : claimedRoles.filter(isRole),
    );
    const allowed = new Set<string>();
    if (eventSessionId !== undefined) {
      const event = await this.events.getEventSession(eventSessionId);
      if (event === undefined) throw workshopProblem('event-not-found', 404);
      if (event.createdInTenant !== this.config.tenantId)
        throw workshopProblem('instructor-scope-denied', 403);
      if (event.createdBy === claims.oid) allowed.add(eventSessionId);
    }
    return authorizeInstructor(
      {
        subject: claims.oid,
        tenantId: this.config.tenantId,
        active: true,
        roles,
        eventSessionIds: allowed,
      },
      action,
      eventSessionId,
    );
  }
}
