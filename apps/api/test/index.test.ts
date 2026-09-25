import { afterEach, describe, expect, it } from 'vitest';

import {
  ApiProblem,
  buildApp,
  ConfigurationError,
  loadConfig,
  workspaceName,
  type BuildAppOptions,
  type ProblemDetails,
} from '../src/index.js';

const apps: ReturnType<typeof buildApp>[] = [];

function createApp(overrides: Partial<BuildAppOptions> = {}) {
  const app = buildApp({
    config: loadConfig({
      LOG_LEVEL: 'silent',
      SERVICE_VERSION: '1.2.3',
    }),
    logger: false,
    ...overrides,
  });
  apps.push(app);
  return app;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
});

describe('api workspace', () => {
  it('exposes its package identity', () => {
    expect(workspaceName).toBe('@mission-control/api');
  });

  it('validates runtime configuration', () => {
    expect(() => loadConfig({ PORT: '0' })).toThrow(ConfigurationError);
    expect(() => loadConfig({ LOG_LEVEL: 'verbose' })).toThrow(
      ConfigurationError,
    );
  });

  it('exposes versioned public configuration without runtime secrets', async () => {
    const response = await createApp().inject({
      method: 'GET',
      url: '/api/v1/config',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      apiVersion: 'v1',
      schemaVersion: '1.0',
      service: '@mission-control/api',
      supportedLocales: ['en', 'fr', 'pt-BR'],
      version: '1.2.3',
    });
  });

  it('reports liveness and propagates valid correlation IDs', async () => {
    const correlationId = '018f6f4e-7e8f-7b6d-9b3b-9f690c46d470';
    const response = await createApp().inject({
      headers: {
        'x-correlation-id': correlationId,
      },
      method: 'GET',
      url: '/api/v1/health/live',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-correlation-id']).toBe(correlationId);
    expect(response.json()).toMatchObject({
      checks: [],
      schemaVersion: '1.0',
      status: 'up',
      version: '1.2.3',
    });
  });

  it('returns 503 when a readiness dependency is down', async () => {
    const response = await createApp({
      readinessProbes: [
        {
          check: () => 'down',
          name: 'campaign-storage',
        },
      ],
    }).inject({
      method: 'GET',
      url: '/api/v1/health/ready',
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      checks: [{ name: 'campaign-storage', status: 'down' }],
      status: 'down',
    });
  });

  it('returns RFC 9457 details for missing routes', async () => {
    const response = await createApp().inject({
      method: 'GET',
      url: '/api/v1/unknown',
    });
    const problem = response.json<ProblemDetails>();

    expect(response.statusCode).toBe(404);
    expect(response.headers['content-type']).toContain(
      'application/problem+json',
    );
    expect(problem).toMatchObject({
      code: 'route-not-found',
      errors: [],
      messageKey: 'errors.route.notFound',
      status: 404,
      title: 'Route not found',
      type: 'https://mission-control.example/problems/route-not-found',
    });
    expect(problem.correlationId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('maps known and unhandled failures without exposing internals', async () => {
    const app = createApp();
    app.get('/api/v1/test/conflict', () => {
      throw new ApiProblem({
        code: 'aggregate-version-conflict',
        messageKey: 'errors.aggregate.versionConflict',
        status: 409,
        title: 'Aggregate version conflict',
      });
    });
    app.get('/api/v1/test/failure', () => {
      throw new Error('storage-account-key=secret');
    });

    const conflict = await app.inject({
      method: 'GET',
      url: '/api/v1/test/conflict',
    });
    const failure = await app.inject({
      method: 'GET',
      url: '/api/v1/test/failure',
    });

    expect(conflict.statusCode).toBe(409);
    expect(conflict.json()).toMatchObject({
      code: 'aggregate-version-conflict',
    });
    expect(failure.statusCode).toBe(500);
    expect(failure.body).not.toContain('storage-account-key');
    expect(failure.body).not.toContain('stack');
  });
});
