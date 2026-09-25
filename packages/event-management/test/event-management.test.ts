import { randomBytes } from 'node:crypto';

import { UnitTokenService } from '@mission-control/auth';
import { describe, expect, it } from 'vitest';

import {
  EventManagementError,
  EventUnitService,
  InMemoryEventUnitRepository,
} from '../src/index.js';

const instructor = {
  instructor: {
    actorType: 'instructor' as const,
    actorId: 'entra-instructor-id',
    role: 'event-admin' as const,
    tenantId: 'tenant-id',
  },
};

const createService = () => {
  const repository = new InMemoryEventUnitRepository();
  const unitTokens = new UnitTokenService({
    secret: randomBytes(32),
    issuer: 'https://mission-control.test',
    audience: 'mission-control-api',
    ttlSeconds: 300,
  });
  const service = new EventUnitService({
    repository,
    unitTokens,
    now: () => new Date('2026-09-25T14:00:00Z'),
  });
  return { repository, service };
};

const createLobby = async (service: EventUnitService) => {
  const created = await service.createEventSession(
    {
      campaignId: 'operation-lighthouse',
      campaignVersion: '1.0.0',
      defaultLocale: 'en',
      supportedLocales: ['en', 'fr', 'pt-BR'],
      scoringPolicyVersion: '1.0.0',
    },
    instructor,
  );
  const eventSession = await service.openLobby(
    created.eventSession.eventSessionId,
    created.eventSession.version,
  );
  return { ...created, eventSession };
};

describe('event and unit management', () => {
  it('creates an event without retaining the plaintext event code', async () => {
    const { service } = createService();
    const created = await service.createEventSession(
      {
        campaignId: 'operation-lighthouse',
        campaignVersion: '1.0.0',
        defaultLocale: 'en',
        supportedLocales: ['en', 'fr', 'pt-BR'],
        scoringPolicyVersion: '1.0.0',
      },
      instructor,
    );

    expect(created.eventSession.status).toBe('draft');
    expect(created.eventSession.registrationEnabled).toBe(false);
    expect(created.eventSession.eventCodeVerifier).not.toContain(
      created.eventCode.replace('-', ''),
    );
  });

  it('registers isolated units with unique event-scoped names', async () => {
    const { service } = createService();
    const { eventCode } = await createLobby(service);
    const first = await service.joinEvent({
      eventCode,
      displayName: 'Lighthouse Team',
      locale: 'fr',
    });

    expect(first.unit.locale).toBe('fr');
    expect(first.unitToken).not.toBe('');
    expect(first.reconnectSecret).not.toBe('');
    await expect(
      service.joinEvent({
        eventCode,
        displayName: '  lighthouse   team ',
        locale: 'en',
      }),
    ).rejects.toMatchObject({ code: 'display-name-unavailable' });
  });

  it('reconnects with the event code and opaque reconnect secret', async () => {
    const { service } = createService();
    const { eventCode } = await createLobby(service);
    const joined = await service.joinEvent({
      eventCode,
      displayName: 'Aurora Unit',
      locale: 'pt-BR',
    });

    const reconnected = await service.reconnectUnit({
      eventCode,
      unitId: joined.unit.unitId,
      reconnectSecret: joined.reconnectSecret,
    });

    expect(reconnected.unit.version).toBe(2);
    await expect(
      service.reconnectUnit({
        eventCode,
        unitId: joined.unit.unitId,
        reconnectSecret: 'invalid',
      }),
    ).rejects.toMatchObject({ code: 'unit-reconnect-denied' });
  });

  it('prevents a valid unit token from selecting another unit', async () => {
    const { service } = createService();
    const { eventCode } = await createLobby(service);
    const first = await service.joinEvent({
      eventCode,
      displayName: 'First Unit',
      locale: 'en',
    });
    const second = await service.joinEvent({
      eventCode,
      displayName: 'Second Unit',
      locale: 'en',
    });

    await expect(
      service.authenticateUnit(first.unitToken, second.unit.unitId),
    ).rejects.toMatchObject({ code: 'unit-scope-denied' });
    const authenticated = await service.authenticateUnit(
      first.unitToken,
      first.unit.unitId,
    );
    expect(authenticated.unit.unitId).toBe(first.unit.unitId);
  });

  it('closes registration and rejects reconnection after event closure', async () => {
    const { service } = createService();
    const lobby = await createLobby(service);
    const joined = await service.joinEvent({
      eventCode: lobby.eventCode,
      displayName: 'Closing Unit',
      locale: 'en',
    });
    const closed = await service.closeEvent(
      lobby.eventSession.eventSessionId,
      lobby.eventSession.version,
    );

    expect(closed.status).toBe('closed');
    await expect(
      service.joinEvent({
        eventCode: lobby.eventCode,
        displayName: 'Late Unit',
        locale: 'en',
      }),
    ).rejects.toMatchObject({ code: 'registration-closed' });
    await expect(
      service.reconnectUnit({
        eventCode: lobby.eventCode,
        unitId: joined.unit.unitId,
        reconnectSecret: joined.reconnectSecret,
      }),
    ).rejects.toMatchObject({ code: 'unit-reconnect-denied' });
  });

  it('uses optimistic event versions and explicit lifecycle transitions', async () => {
    const { service } = createService();
    const lobby = await createLobby(service);

    await expect(
      service.startEvent(
        lobby.eventSession.eventSessionId,
        lobby.eventSession.version - 1,
      ),
    ).rejects.toMatchObject({ code: 'event-version-conflict' });

    const active = await service.startEvent(
      lobby.eventSession.eventSessionId,
      lobby.eventSession.version,
    );
    expect(active.status).toBe('active');

    try {
      await service.openLobby(active.eventSessionId, active.version);
    } catch (error) {
      expect(error).toBeInstanceOf(EventManagementError);
      expect((error as EventManagementError).code).toBe('event-state-invalid');
    }
  });
});
