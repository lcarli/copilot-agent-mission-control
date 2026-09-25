import { randomUUID } from 'node:crypto';

import Fastify, { type FastifyInstance } from 'fastify';

import type { ApiConfig } from './config.js';
import { runHealthProbes, type HealthProbe } from './health.js';
import { handleRequestError, sendProblem } from './problems.js';

const correlationHeader = 'x-correlation-id';
const correlationIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface BuildAppOptions {
  readonly config: ApiConfig;
  readonly eventProbes?: readonly HealthProbe[];
  readonly logger?: boolean;
  readonly readinessProbes?: readonly HealthProbe[];
}

function requestCorrelationId(request: {
  readonly headers: Record<string, string | string[] | undefined>;
}): string {
  const header = request.headers[correlationHeader];
  if (typeof header === 'string' && correlationIdPattern.test(header)) {
    return header.toLowerCase();
  }

  return randomUUID();
}

function healthResponse(
  config: ApiConfig,
  checks: Awaited<ReturnType<typeof runHealthProbes>>,
): {
  checks: Awaited<ReturnType<typeof runHealthProbes>>;
  schemaVersion: '1.0';
  service: string;
  status: 'up' | 'down';
  timestamp: string;
  version: string;
} {
  return {
    checks,
    schemaVersion: '1.0',
    service: config.serviceName,
    status: checks.some(({ status }) => status === 'down') ? 'down' : 'up',
    timestamp: new Date().toISOString(),
    version: config.serviceVersion,
  };
}

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const { config } = options;
  const app = Fastify({
    genReqId: requestCorrelationId,
    logger: options.logger ?? { level: config.logLevel },
  });

  app.addHook('onRequest', (request, reply, done) => {
    void reply.header(correlationHeader, request.id);
    done();
  });

  app.setErrorHandler(handleRequestError);
  app.setNotFoundHandler((request, reply) => {
    sendProblem(reply, request.id, {
      code: 'route-not-found',
      messageKey: 'errors.route.notFound',
      status: 404,
      title: 'Route not found',
    });
  });

  const apiPrefix = `/api/${config.apiVersion}`;

  app.get(`${apiPrefix}/config`, () => ({
    apiVersion: config.apiVersion,
    schemaVersion: '1.0',
    service: config.serviceName,
    supportedLocales: config.supportedLocales,
    version: config.serviceVersion,
  }));

  app.get(`${apiPrefix}/health/live`, () => healthResponse(config, []));

  app.get(`${apiPrefix}/health/ready`, async (_request, reply) => {
    const response = healthResponse(
      config,
      await runHealthProbes(options.readinessProbes ?? []),
    );
    if (response.status === 'down') {
      void reply.code(503);
    }
    return response;
  });

  app.get(`${apiPrefix}/health/event`, async (_request, reply) => {
    const response = healthResponse(
      config,
      await runHealthProbes(options.eventProbes ?? []),
    );
    if (response.status === 'down') {
      void reply.code(503);
    }
    return response;
  });

  return app;
}
