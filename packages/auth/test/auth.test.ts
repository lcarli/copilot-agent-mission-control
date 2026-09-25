import { randomBytes } from 'node:crypto';

import { v7 as uuidV7 } from 'uuid';
import { describe, expect, it } from 'vitest';

import {
  AuthenticationError,
  UnitTokenService,
  authorizeInstructor,
  createEventCode,
  formatEventCode,
  hashEventCode,
  normalizeEventCode,
  verifyEventCode,
} from '../src/index.js';

describe('event codes', () => {
  it('generates display-safe codes and stores only a verifier', async () => {
    const result = await createEventCode();

    expect(result.eventCode).toMatch(
      /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/u,
    );
    expect(result.verifier).not.toContain(normalizeEventCode(result.eventCode));
    await expect(
      verifyEventCode(result.eventCode.toLowerCase(), result.verifier),
    ).resolves.toBe(true);
    await expect(verifyEventCode('22222-22222', result.verifier)).resolves.toBe(
      false,
    );
  });

  it('normalizes formatting and rejects weak input before hashing', async () => {
    expect(normalizeEventCode('abcde-fghjk')).toBe('ABCDEFGHJK');
    expect(formatEventCode('abcdefghjk')).toBe('ABCDE-FGHJK');
    await expect(hashEventCode('short')).rejects.toMatchObject({
      code: 'event-code-invalid',
    });
  });
});

describe('unit tokens', () => {
  const service = new UnitTokenService({
    secret: randomBytes(32),
    issuer: 'https://mission-control.test',
    audience: 'mission-control-api',
    ttlSeconds: 300,
  });
  const eventSessionId = uuidV7();
  const unitId = uuidV7();

  it('issues a short-lived token scoped to one event session and unit', async () => {
    const issuedAt = new Date('2026-09-25T14:00:00Z');
    const token = await service.issue(
      {
        eventSessionId,
        unitId,
        tokenVersion: 3,
        locale: 'pt-BR',
      },
      issuedAt,
    );
    const claims = await service.verify(
      token,
      {
        eventSessionId,
        unitId,
        tokenVersion: 3,
      },
      new Date('2026-09-25T14:01:00Z'),
    );

    expect(claims).toMatchObject({
      subject: unitId,
      eventSessionId,
      unitId,
      role: 'participant',
      tokenVersion: 3,
      locale: 'pt-BR',
    });
    expect(claims.expiresAt - claims.issuedAt).toBe(300);
  });

  it('rejects expiry, cross-unit scope, and revoked versions', async () => {
    const issuedAt = new Date('2026-09-25T14:00:00Z');
    const token = await service.issue(
      {
        eventSessionId,
        unitId,
        tokenVersion: 2,
        locale: 'en',
      },
      issuedAt,
    );

    await expect(
      service.verify(
        token,
        { unitId: uuidV7() },
        new Date('2026-09-25T14:01:00Z'),
      ),
    ).rejects.toMatchObject({ code: 'token-scope-invalid' });
    await expect(
      service.verify(
        token,
        { tokenVersion: 3 },
        new Date('2026-09-25T14:01:00Z'),
      ),
    ).rejects.toMatchObject({ code: 'token-version-revoked' });
    await expect(
      service.verify(token, {}, new Date('2026-09-25T14:10:00Z')),
    ).rejects.toMatchObject({ code: 'token-invalid' });
  });
});

describe('instructor authorization', () => {
  const eventSessionId = uuidV7();

  it('authorizes an active scoped instructor for operational commands', () => {
    const actor = authorizeInstructor(
      {
        subject: 'entra-object-id',
        tenantId: 'tenant-id',
        active: true,
        roles: new Set(['instructor']),
        eventSessionIds: new Set([eventSessionId]),
      },
      'event.manage-missions',
      eventSessionId,
    );

    expect(actor).toEqual({
      actorType: 'instructor',
      actorId: 'entra-object-id',
      role: 'instructor',
      tenantId: 'tenant-id',
    });
  });

  it('denies inactive, unscoped, and underprivileged instructors', () => {
    expect(() =>
      authorizeInstructor(
        {
          subject: 'inactive',
          tenantId: 'tenant-id',
          active: false,
          roles: new Set(['event-admin']),
          eventSessionIds: '*',
        },
        'event.create',
      ),
    ).toThrow(AuthenticationError);

    try {
      authorizeInstructor(
        {
          subject: 'instructor',
          tenantId: 'tenant-id',
          active: true,
          roles: new Set(['instructor']),
          eventSessionIds: new Set(),
        },
        'event.manage-missions',
        eventSessionId,
      );
    } catch (error) {
      expect((error as AuthenticationError).code).toBe(
        'instructor-scope-denied',
      );
    }

    expect(() =>
      authorizeInstructor(
        {
          subject: 'instructor',
          tenantId: 'tenant-id',
          active: true,
          roles: new Set(['instructor']),
          eventSessionIds: '*',
        },
        'event.create',
      ),
    ).toThrow(AuthenticationError);
  });
});
