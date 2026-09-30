import { randomUUID } from 'node:crypto';

import Fastify, { type FastifyInstance } from 'fastify';

import type { ApiConfig } from './config.js';
import { runHealthProbes, type HealthProbe } from './health.js';
import { handleRequestError, sendProblem } from './problems.js';
import { RequestBudget, workshopRequestLimits } from './request-budget.js';

const correlationHeader = 'x-correlation-id';
const correlationIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface BuildAppOptions {
  readonly config: ApiConfig;
  readonly eventProbes?: readonly HealthProbe[];
  readonly errorHandler?: typeof handleRequestError;
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
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false } },
    genReqId: requestCorrelationId,
    logger: options.logger === false ? false : { level: config.logLevel },
  });
  const budget = new RequestBudget();

  app.addHook('onRequest', (request, reply, done) => {
    void reply.header(correlationHeader, request.id);
    void reply.header('x-content-type-options', 'nosniff');
    const route = request.routeOptions.url ?? 'unmatched';
    if (!route.startsWith('/api/v1/health/')) {
      try {
        budget.consume(['ip', request.ip], workshopRequestLimits.requestsPerIp);
        if (
          route === '/api/v1/registrations' ||
          route === '/api/v1/auth/refresh'
        )
          budget.consume(
            ['authentication', request.ip],
            workshopRequestLimits.authenticationPerIp,
          );
      } catch (error) {
        done(
          error instanceof Error ? error : new Error('Request budget failed.'),
        );
        return;
      }
    }
    done();
  });

  app.setErrorHandler(options.errorHandler ?? handleRequestError);
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
