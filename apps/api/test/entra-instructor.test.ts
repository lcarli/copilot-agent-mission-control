import { randomBytes } from 'node:crypto';

import { EventUnitService } from '@mission-control/event-management';
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type JWTPayload,
} from 'jose';
import { beforeAll, expect, it } from 'vitest';

import { EntraInstructorAuthorizer } from '../src/entra-instructor.js';
import { createLocalWorkshopRuntime } from '../src/local-workshop.js';

const tenantId = '11111111-1111-4111-8111-111111111111';
const apiClientId = '22222222-2222-4222-8222-222222222222';
const spaClientId = '33333333-3333-4333-8333-333333333333';
const owner = '44444444-4444-4444-8444-444444444444';
const other = '55555555-5555-4555-8555-555555555555';
const config = { tenantId, apiClientId, spaClientId };
const runtime = createLocalWorkshopRuntime(randomBytes(32).toString('hex'));
const keys = await generateKeyPair('RS256');
const resolver = createLocalJWKSet({
  keys: [
    { ...(await exportJWK(keys.publicKey)), kid: 'synthetic-signing-key' },
  ],
});
const authorizer = new EntraInstructorAuthorizer(
  config,
  runtime.eventRepository,
  resolver,
);
let eventId: string;
let foreignEvent: string;

const token = async (override: JWTPayload = {}) => {
  const now = Math.floor(Date.now() / 1000);
  return `Bearer ${await new SignJWT({
    iss: `https://login.microsoftonline.com/${tenantId}/v2.0`,
    aud: apiClientId,
    tid: tenantId,
    oid: owner,
    sub: 'pairwise-user-subject',
    azp: spaClientId,
    scp: 'Workshop.Access',
    roles: ['event-admin'],
    ver: '2.0',
    iat: now,
    nbf: now,
    exp: now + 600,
    ...override,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'synthetic-signing-key' })
    .sign(keys.privateKey)}`;
};

beforeAll(async () => {
  const events = new EventUnitService({
    repository: runtime.eventRepository,
    unitTokens: runtime.unitTokens,
  });
  const create = (tid: string) =>
    events.createEventSession(
      {
        campaignId: 'operation-lighthouse',
        campaignVersion: '1.0.0',
        defaultLocale: 'en',
        supportedLocales: ['en'],
        scoringPolicyVersion: '1.0.0',
      },
      {
        instructor: {
          actorType: 'instructor',
          actorId: owner,
          role: 'event-admin',
          tenantId: tid,
        },
      },
    );
  eventId = (await create(tenantId)).eventSession.eventSessionId;
  foreignEvent = (await create(other)).eventSession.eventSessionId;
});

it('authorizes signed delegated access tokens using immutable tenant and object IDs', async () => {
  const actor = await authorizer.authorize(
    await token({ preferred_username: 'not-an-identity' }),
    'event.manage-lobby',
    eventId,
  );
  expect(actor).toEqual({
    actorType: 'instructor',
    actorId: owner,
    tenantId,
    role: 'event-admin',
  });
  expect(await runtime.eventRepository.getEventSession(eventId)).toMatchObject({
    createdBy: owner,
    createdInTenant: tenantId,
  });
});

it.each([
  { aud: spaClientId },
  { iss: 'https://login.microsoftonline.com/common/v2.0' },
  { tid: other },
  { azp: other },
  { exp: 1 },
  { nbf: 9_000_000_000 },
  { iat: 9_000_000_000 },
  { scp: 'User.Read' },
  { scp: undefined },
  { roles: 'event-admin' },
  { oid: undefined },
  { oid: 'mutable-display-name' },
  { ver: '1.0' },
  { sub: '' },
])(
  'rejects invalid claims instead of accepting ID/app-only or wrong-resource tokens: %j',
  async (claims) => {
    await expect(
      authorizer.authorize(await token(claims), 'event.create'),
    ).rejects.toMatchObject({ status: 401 });
  },
);

it('checks roles, ownership and tenant before allowing even platform-admin event access', async () => {
  await expect(
    authorizer.authorize(
      await token({ roles: ['instructor'] }),
      'event.create',
    ),
  ).rejects.toMatchObject({ code: 'instructor-action-denied' });
  await expect(
    authorizer.authorize(await token({ roles: [] }), 'event.create'),
  ).rejects.toMatchObject({ code: 'instructor-role-required' });
  await expect(
    authorizer.authorize(await token({ roles: undefined }), 'event.create'),
  ).rejects.toMatchObject({ code: 'instructor-role-required' });
  await expect(
    authorizer.authorize(
      await token({ oid: other }),
      'event.manage-lobby',
      eventId,
    ),
  ).rejects.toMatchObject({ code: 'instructor-scope-denied' });
  expect(
    (
      await authorizer.authorize(
        await token({ roles: ['platform-admin'], oid: other }),
        'event.manage-lobby',
        eventId,
      )
    ).role,
  ).toBe('platform-admin');
  await expect(
    authorizer.authorize(
      await token({ roles: ['platform-admin'] }),
      'event.manage-lobby',
      foreignEvent,
    ),
  ).rejects.toMatchObject({ status: 403 });
});

it('fails closed for unsigned/foreign signatures and distinguishes key-provider outages', async () => {
  const header = await token();
  const untrusted = await generateKeyPair('RS256');
  const foreign = `Bearer ${await new SignJWT({}).setProtectedHeader({ alg: 'RS256', kid: 'synthetic-signing-key' }).sign(untrusted.privateKey)}`;
  for (const invalid of [
    undefined,
    'Bearer invalid',
    foreign,
    header.replace('Bearer ', 'Basic '),
  ]) {
    await expect(
      authorizer.authorize(invalid, 'event.create'),
    ).rejects.toMatchObject({ status: 401 });
  }
  const unavailable = new EntraInstructorAuthorizer(
    config,
    runtime.eventRepository,
    () => Promise.reject(new TypeError('Synthetic JWKS network outage')),
  );
  await expect(
    unavailable.authorize(header, 'event.create'),
  ).rejects.toMatchObject({
    code: 'instructor-identity-unavailable',
    status: 503,
    retryAfterSeconds: 1,
  });
});
