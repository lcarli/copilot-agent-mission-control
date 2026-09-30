import { once } from 'node:events';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { createServer, request, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, expect, it, vi } from 'vitest';

import { createDashboardServer, dashboardApiOrigin } from '../server/app.js';

const servers: Server[] = [];
const directories: string[] = [];

async function listen(server: Server): Promise<string> {
  servers.push(server);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (address === null || typeof address === 'string')
    throw new Error('Expected a local TCP listener.');
  return `http://127.0.0.1:${String(address.port)}`;
}

async function fixture(
  apiOrigin = 'http://127.0.0.1:1',
  upstreamTimeoutMs = 2000,
) {
  const directory = await mkdtemp(join(tmpdir(), 'lighthouse-static-'));
  directories.push(directory);
  const staticDirectory = join(directory, 'dist');
  await mkdir(join(staticDirectory, 'assets'), { recursive: true });
  await Promise.all([
    writeFile(join(staticDirectory, 'index.html'), '<title>Dashboard</title>'),
    writeFile(
      join(staticDirectory, 'auth.html'),
      '<title>Identity bridge</title>',
    ),
    writeFile(
      join(staticDirectory, 'assets', 'app-hash.js'),
      'console.log("public bundle");',
    ),
    writeFile(
      join(directory, 'private.json'),
      '{"private":"must not be served"}',
    ),
  ]);
  const server = await createDashboardServer({
    apiOrigin,
    staticDirectory,
    upstreamTimeoutMs,
  });
  return { url: await listen(server), directory, staticDirectory };
}

afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => {
        if (error === undefined) resolve();
        else reject(error);
      }),
    );
  }
  for (const directory of directories.splice(0))
    await rm(directory, { force: true, recursive: true });
  vi.restoreAllMocks();
});

it('requires an explicit fixed API origin without credentials or non-loopback HTTP', () => {
  expect(dashboardApiOrigin('https://api.example.test').origin).toBe(
    'https://api.example.test',
  );
  for (const value of [
    undefined,
    '',
    'not-a-url',
    'http://api.example.test',
    'https://user:password@api.example.test',
    'https://api.example.test/path',
    'https://api.example.test?secret=value',
  ])
    expect(() => dashboardApiOrigin(value)).toThrow('MISSION_CONTROL_API_URL');
});

it('serves only built assets, supports HEAD, and keeps the auth bridge and health uncached', async () => {
  const { url } = await fixture();
  const index = await fetch(url);
  expect(await index.text()).toContain('Dashboard');
  expect(index.headers.get('cache-control')).toBe('no-store');
  expect(index.headers.get('x-content-type-options')).toBe('nosniff');
  expect(index.headers.get('cross-origin-opener-policy')).toBe(
    'same-origin-allow-popups',
  );
  const bridge = await fetch(`${url}/auth.html`);
  expect(await bridge.text()).toContain('Identity bridge');
  expect(bridge.headers.get('x-frame-options')).toBe('SAMEORIGIN');
  const asset = await fetch(`${url}/assets/app-hash.js`, { method: 'HEAD' });
  expect(asset.status).toBe(200);
  expect(asset.headers.get('content-type')).toContain('javascript');
  expect(asset.headers.get('cache-control')).toContain('immutable');
  expect(await asset.text()).toBe('');
  for (const path of ['/health/live', '/health/ready']) {
    expect(await (await fetch(`${url}${path}`)).json()).toEqual({
      service: 'command-center',
      status: 'up',
    });
  }
  expect((await fetch(`${url}/auth.html`, { method: 'POST' })).status).toBe(
    405,
  );
  expect((await fetch(`${url}/missing.js`)).status).toBe(404);
});

it('denies traversal, dot files, malformed paths and symlinks outside the static root', async () => {
  const { url, directory, staticDirectory } = await fixture();
  await symlink(
    directory,
    join(staticDirectory, 'assets', 'escape'),
    'junction',
  );
  for (const path of [
    '/..%2fprivate.json',
    '/.env',
    '/assets/escape/private.json',
  ]) {
    const response = await fetch(`${url}${path}`);
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain('must not be served');
  }
  expect((await fetch(`${url}/%invalid`)).status).toBe(400);
  expect(
    (await fetch(`${url}//other.example.test/api/v1/workshop`)).status,
  ).toBe(400);
});

it('preserves mutation bytes, keys, authorization and upstream failures without forwarding cookies or forged proxy headers', async () => {
  const calls: {
    url: string | undefined;
    headers: Record<string, string | string[] | undefined>;
    body: string;
  }[] = [];
  const upstream = await listen(
    createServer((incoming, response) => {
      const chunks: Buffer[] = [];
      incoming.on('data', (chunk: Buffer) => chunks.push(chunk));
      incoming.on('end', () => {
        calls.push({
          url: incoming.url,
          headers: incoming.headers,
          body: Buffer.concat(chunks).toString(),
        });
        response.writeHead(503, {
          'content-type': 'application/problem+json',
          'retry-after': '7',
          'x-correlation-id': 'upstream-correlation',
        });
        response.end('{"code":"state-transaction-conflict"}');
      });
    }),
  );
  const { url } = await fixture(upstream);
  const bytes = '{ "one": 1, "two": "two" }\n';
  const result = await fetch(`${url}/api/v1/event-sessions?mode=unchanged`, {
    method: 'POST',
    body: bytes,
    headers: {
      authorization: 'Bearer synthetic-instructor',
      'idempotency-key': 'unchanged-key',
      'content-type': 'application/json',
      cookie: 'private=do-not-forward',
      'x-forwarded-for': '203.0.113.20',
    },
  });
  expect(result.status).toBe(503);
  expect(result.headers.get('retry-after')).toBe('7');
  expect(result.headers.get('x-correlation-id')).toBe('upstream-correlation');
  expect(await result.json()).toEqual({ code: 'state-transaction-conflict' });
  expect(calls).toHaveLength(1);
  expect(calls[0]?.body).toBe(bytes);
  expect(calls[0]?.url).toBe('/api/v1/event-sessions?mode=unchanged');
  expect(calls[0]?.headers.authorization).toBe('Bearer synthetic-instructor');
  expect(calls[0]?.headers['idempotency-key']).toBe('unchanged-key');
  expect(calls[0]?.headers.cookie).toBeUndefined();
  expect(calls[0]?.headers['x-forwarded-for']).toBeUndefined();
});

it('bounds unavailable or stalled upstream requests and never retries an uncertain mutation', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  let calls = 0;
  const upstream = await listen(
    createServer((incoming) => {
      calls++;
      incoming.resume();
    }),
  );
  const { url } = await fixture(upstream, 30);
  const response = await fetch(`${url}/api/v1/event-sessions`, {
    method: 'POST',
    body: '{}',
  });
  expect(response.status).toBe(503);
  expect(response.headers.get('retry-after')).toBe('1');
  expect(await response.json()).toMatchObject({
    code: 'dashboard-api-unavailable',
  });
  expect(calls).toBe(1);
  expect(log).toHaveBeenCalledWith(
    'Dashboard request failed',
    expect.objectContaining({ code: 'UPSTREAM_TIMEOUT' }),
  );
});

it('rejects oversized fixed and streamed bodies without crashing on a late upstream response', async () => {
  const upstream = await listen(
    createServer((incoming, response) => {
      incoming.resume();
      incoming.on('end', () => response.end('accepted'));
    }),
  );
  const { url } = await fixture(upstream);
  const body = 'x'.repeat(1_048_577);
  expect(
    (await fetch(`${url}/api/v1/event-sessions`, { method: 'POST', body }))
      .status,
  ).toBe(413);
  const status = await new Promise<number | undefined>((resolve, reject) => {
    const outgoing = request(
      `${url}/api/v1/event-sessions`,
      { method: 'POST' },
      (response) => {
        response.resume();
        resolve(response.statusCode);
      },
    );
    outgoing.on('error', reject);
    outgoing.write(body);
    outgoing.end();
  });
  expect(status).toBe(413);
  expect((await fetch(`${url}/health/ready`)).status).toBe(200);
});
