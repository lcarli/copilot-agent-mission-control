import { randomUUID } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import {
  createServer,
  request as httpRequest,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { request as httpsRequest } from 'node:https';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';

const maximumRequestBytes = 1_048_576;
const requestHeaders = [
  'accept',
  'authorization',
  'content-type',
  'content-length',
  'idempotency-key',
  'x-correlation-id',
] as const;
const responseHeaders = [
  'content-type',
  'content-length',
  'content-encoding',
  'vary',
  'etag',
  'retry-after',
  'x-correlation-id',
] as const;
const contentTypes: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

export function dashboardApiOrigin(value: string | undefined): URL {
  let origin: URL;
  try {
    origin = new URL(value ?? '');
  } catch {
    throw new Error('MISSION_CONTROL_API_URL must be an explicit API origin.');
  }
  if (
    (origin.protocol !== 'https:' &&
      !(
        origin.protocol === 'http:' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)
      )) ||
    origin.username !== '' ||
    origin.password !== '' ||
    origin.pathname !== '/' ||
    origin.search !== '' ||
    origin.hash !== ''
  )
    throw new Error(
      'MISSION_CONTROL_API_URL requires HTTPS (or loopback HTTP), without credentials, a path or a query.',
    );
  return origin;
}

function reportFailure(error: unknown, correlationId: string): void {
  const code =
    error instanceof Error &&
    'code' in error &&
    typeof error.code === 'string' &&
    /^[A-Z_0-9]+$/.test(error.code)
      ? error.code
      : 'DASHBOARD_REQUEST_FAILED';
  console.error('Dashboard request failed', { code, correlationId });
}

function problem(
  response: ServerResponse,
  status: number,
  code: string,
  correlationId: string,
): void {
  if (response.destroyed || response.writableEnded) return;
  if (response.headersSent) {
    response.destroy();
    return;
  }
  response.statusCode = status;
  for (const header of ['content-length', 'content-encoding', 'etag', 'vary'])
    response.removeHeader(header);
  response.setHeader('content-type', 'application/problem+json');
  response.setHeader('x-correlation-id', correlationId);
  response.setHeader('cache-control', 'no-store');
  if (status === 503) response.setHeader('retry-after', '1');
  response.end(
    JSON.stringify({
      code,
      correlationId,
      errors: [],
      messageArgs: {},
      messageKey:
        status >= 500 ? 'errors.internal' : 'errors.validation.failed',
      status,
      title:
        status >= 500
          ? 'The dashboard could not complete this request.'
          : 'The request could not be accepted.',
      type: `https://mission-control.example/problems/${code}`,
    }),
  );
}

function proxy(
  request: IncomingMessage,
  response: ServerResponse,
  target: URL,
  timeoutMs: number,
  correlationId: string,
): void {
  const headers: Record<string, string | string[]> = {};
  for (const name of requestHeaders) {
    const value = request.headers[name];
    if (value !== undefined) headers[name] = value;
  }
  if (Number(headers['content-length'] ?? 0) > maximumRequestBytes) {
    problem(response, 413, 'payload-too-large', correlationId);
    request.resume();
    return;
  }
  const send = target.protocol === 'https:' ? httpsRequest : httpRequest;
  const upstream = send(
    target,
    { method: request.method ?? 'GET', headers },
    (received) => {
      if (response.destroyed || response.writableEnded) {
        received.destroy();
        return;
      }
      if (received.statusCode === undefined) {
        reportFailure(new Error('Missing upstream status'), correlationId);
        problem(response, 503, 'dashboard-api-unavailable', correlationId);
        received.destroy();
        return;
      }
      response.statusCode = received.statusCode;
      for (const name of responseHeaders) {
        const value = received.headers[name];
        if (value !== undefined) response.setHeader(name, value);
      }
      received.on('error', (error) => {
        reportFailure(error, correlationId);
        problem(response, 503, 'dashboard-api-unavailable', correlationId);
      });
      received.pipe(response);
    },
  );
  // No transparent retries: uncertain mutations retain their original client-owned key/body.
  const timeout = setTimeout(
    () =>
      upstream.destroy(
        Object.assign(new Error('API request timed out'), {
          code: 'UPSTREAM_TIMEOUT',
        }),
      ),
    timeoutMs,
  );
  timeout.unref();
  upstream.on('error', (error) => {
    clearTimeout(timeout);
    reportFailure(error, correlationId);
    problem(response, 503, 'dashboard-api-unavailable', correlationId);
  });
  response.on('close', () => {
    clearTimeout(timeout);
    if (!response.writableFinished) upstream.destroy();
  });
  request.on('aborted', () => upstream.destroy());
  request.on('error', (error) => {
    upstream.destroy();
    reportFailure(error, correlationId);
    problem(response, 400, 'request-invalid', correlationId);
  });
  let receivedBytes = 0;
  request.on('data', (chunk: Buffer) => {
    receivedBytes += chunk.length;
    if (receivedBytes > maximumRequestBytes) {
      request.unpipe(upstream);
      problem(response, 413, 'payload-too-large', correlationId);
      upstream.destroy();
    }
  });
  request.pipe(upstream);
}

export async function createDashboardServer(options: {
  readonly apiOrigin: string;
  readonly staticDirectory: string;
  readonly upstreamTimeoutMs?: number;
}) {
  const apiOrigin = dashboardApiOrigin(options.apiOrigin);
  const root = await realpath(options.staticDirectory);
  for (const entry of ['index.html', 'auth.html']) {
    if (!(await stat(resolve(root, entry))).isFile())
      throw new Error('The dashboard build is incomplete.');
  }

  const handle = async (
    request: IncomingMessage,
    response: ServerResponse,
    correlationId: string,
  ) => {
    response.setHeader('cache-control', 'no-store');
    response.setHeader('x-content-type-options', 'nosniff');
    response.setHeader('referrer-policy', 'no-referrer');
    response.setHeader('x-frame-options', 'SAMEORIGIN');
    response.setHeader(
      'cross-origin-opener-policy',
      'same-origin-allow-popups',
    );
    if (
      request.url === undefined ||
      !request.url.startsWith('/') ||
      request.url.startsWith('//') ||
      request.url.includes('\\')
    ) {
      problem(response, 400, 'request-invalid', correlationId);
      return;
    }
    const url = new URL(request.url, 'http://dashboard.invalid');
    if (url.pathname.startsWith('/api/')) {
      if (
        !['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(
          request.method ?? '',
        )
      ) {
        problem(response, 405, 'method-not-allowed', correlationId);
        return;
      }
      const target = new URL(apiOrigin);
      target.pathname = url.pathname;
      target.search = url.search;
      proxy(
        request,
        response,
        target,
        options.upstreamTimeoutMs ?? 15_000,
        correlationId,
      );
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.setHeader('allow', 'GET, HEAD');
      problem(response, 405, 'method-not-allowed', correlationId);
      return;
    }
    if (['/health/live', '/health/ready'].includes(url.pathname)) {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ service: 'command-center', status: 'up' }));
      return;
    }
    let pathname: string;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      problem(response, 400, 'request-invalid', correlationId);
      return;
    }
    if (
      pathname.includes('\\') ||
      pathname.includes('\0') ||
      pathname.split('/').some((part) => part.startsWith('.'))
    ) {
      problem(response, 404, 'route-not-found', correlationId);
      return;
    }
    if (pathname === '/') pathname = '/index.html';
    let file: string;
    try {
      file = await realpath(resolve(root, `.${pathname}`));
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        ['ENOENT', 'ENOTDIR'].includes(String(error.code))
      ) {
        problem(response, 404, 'route-not-found', correlationId);
        return;
      }
      throw error;
    }
    const withinRoot = relative(root, file);
    if (
      withinRoot === '..' ||
      withinRoot.startsWith(`..${sep}`) ||
      isAbsolute(withinRoot)
    ) {
      problem(response, 404, 'route-not-found', correlationId);
      return;
    }
    const metadata = await stat(file);
    const contentType = contentTypes[extname(file)];
    if (!metadata.isFile() || contentType === undefined) {
      problem(response, 404, 'route-not-found', correlationId);
      return;
    }
    if (metadata.size > 10_000_000)
      throw new Error('Static asset exceeds the serving limit.');
    response.setHeader('content-type', contentType);
    response.setHeader('content-length', metadata.size);
    if (pathname.startsWith('/assets/'))
      response.setHeader(
        'cache-control',
        'public, max-age=31536000, immutable',
      );
    response.end(request.method === 'HEAD' ? undefined : await readFile(file));
  };
  const server = createServer(
    { maxHeaderSize: 16_384, requestTimeout: 30_000, headersTimeout: 10_000 },
    (request, response) => {
      const correlationId = randomUUID();
      void handle(request, response, correlationId).catch((error: unknown) => {
        reportFailure(error, correlationId);
        problem(response, 500, 'dashboard-request-failed', correlationId);
      });
    },
  );
  server.maxHeadersCount = 50;
  return server;
}
