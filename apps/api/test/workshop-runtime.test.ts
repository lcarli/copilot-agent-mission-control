import { randomBytes, randomUUID } from 'node:crypto';

import { afterEach, expect, it, vi } from 'vitest';

import {
  buildHostedWorkshopApp,
  ConfigurationError,
  loadConfig,
} from '../src/index.js';
import { createLocalWorkshopRuntime } from '../src/local-workshop.js';
import { workshopProblem } from '../src/local-requests.js';
import { buildWorkshopApp } from '../src/workshop.js';

const apps: ReturnType<typeof buildWorkshopApp>[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

it('does not accept the rehearsal runtime as a hosted runtime', () => {
  expect(() =>
    buildHostedWorkshopApp({
      config: loadConfig(),
      runtime: createLocalWorkshopRuntime(randomBytes(32).toString('hex')),
    }),
  ).toThrow(ConfigurationError);
});

it('retains the loopback boundary even when a caller requests a public bind', async () => {
  const app = buildWorkshopApp({
    config: loadConfig({ HOST: '0.0.0.0' }),
    runtime: createLocalWorkshopRuntime(randomBytes(32).toString('hex')),
  });
  apps.push(app);
  const denied = await app.inject({
    url: '/api/v1/workshop',
    remoteAddress: '192.0.2.42',
  });
  expect(denied.statusCode).toBe(403);
  expect(denied.json()).toMatchObject({ code: 'local-loopback-required' });
});

it('uses injected asynchronous identity, repositories, probes and shutdown', async () => {
  const runtime = createLocalWorkshopRuntime(randomBytes(32).toString('hex'));
  const close = vi.fn(() => Promise.resolve());
  const authorize = vi.fn(
    async (_token: string | undefined, action: string) => {
      await Promise.resolve();
      if (action !== 'event.create')
        throw workshopProblem('instructor-scope-denied', 403);
      return {
        actorType: 'instructor' as const,
        actorId: 'verified-owner',
        tenantId: 'verified-tenant',
        role: 'event-admin' as const,
      };
    },
  );
  const app = buildWorkshopApp({
    config: loadConfig(),
    runtime: {
      ...runtime,
      authorizeInstructor: authorize,
      readinessProbes: [{ name: 'storage-double', check: () => 'down' }],
      close,
    },
  });
  const created = await app.inject({
    method: 'POST',
    url: '/api/v1/event-sessions',
    headers: { 'idempotency-key': randomUUID() },
    payload: {
      campaignId: 'operation-lighthouse',
      defaultLocale: 'en',
      supportedLocales: ['en'],
    },
  });
  expect(created.statusCode).toBe(201);
  const { eventSession } = created.json<{
    eventSession: { eventSessionId: string };
  }>();
  expect(
    await runtime.eventRepository.getEventSession(eventSession.eventSessionId),
  ).toMatchObject({ createdBy: 'verified-owner' });
  const denied = await app.inject({
    url: `/api/v1/event-sessions/${eventSession.eventSessionId}`,
  });
  expect(denied.statusCode).toBe(403);
  expect(authorize).toHaveBeenLastCalledWith(
    undefined,
    'event.manage-lobby',
    eventSession.eventSessionId,
  );
  expect((await app.inject({ url: '/api/v1/health/ready' })).statusCode).toBe(
    503,
  );
  expect((await app.inject({ url: '/api/v1/health/live' })).statusCode).toBe(
    200,
  );
  await app.close();
  expect(close).toHaveBeenCalledOnce();
});
