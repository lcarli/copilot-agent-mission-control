import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ApiProblem,
  buildHostedWorkshopApp,
  createDurableWorkshopData,
  loadConfig,
  type WorkshopRuntime,
} from '@mission-control/api';
import { decodePublicPresentationProjection } from '@mission-control/event-contracts';
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type WebSocketRoute } from '@playwright/test';
import { createServer } from 'vite';

import { FileDocumentBackend } from './support/file-document-backend.js';

test('hosted browser uses explicit sign-in, exact uncertain-action retry and scoped SignalR snapshots', async ({
  page,
  context,
}) => {
  test.setTimeout(120_000);
  const directory = await mkdtemp(join(tmpdir(), 'lighthouse-hosted-browser-'));
  const backend = new FileDocumentBackend(join(directory, 'state.json'));
  const data = createDurableWorkshopData(backend, randomBytes(32));
  const token = randomBytes(32).toString('hex');
  const runtime: WorkshopRuntime = {
    ...data,
    profile: {
      mode: 'hosted',
      persistence: 'cosmos',
      transport: 'signalr',
      source: 'hosted-event',
      closeConfirmationPhrase: 'CLOSE EVENT',
    },
    identity: {
      tenantId: '11111111-1111-4111-8111-111111111111',
      clientId: '22222222-2222-4222-8222-222222222222',
      scope: 'api://33333333-3333-4333-8333-333333333333/Workshop.Access',
      redirectUri: 'https://synthetic.example.test/auth.html',
    },
    readinessProbes: [
      { name: 'file-transport-double', check: () => backend.check() },
    ],
    eventProbes: [
      { name: 'file-transport-double', check: () => backend.check() },
    ],
    authorizeInstructor(authorization) {
      if (authorization !== `Bearer ${token}`)
        throw new ApiProblem({
          code: 'instructor-required',
          title: 'Instructor required',
          status: 401,
          messageKey: 'test.instructor',
        });
      return Promise.resolve({
        actorType: 'instructor',
        actorId: 'synthetic-owner',
        role: 'event-admin',
        tenantId: 'synthetic-tenant',
      });
    },
    close: () => {
      backend.close();
      return Promise.resolve();
    },
  };
  const api = buildHostedWorkshopApp({ config: loadConfig(), runtime });
  const address = await api.listen({ host: '127.0.0.1', port: 0 });
  const vite = await createServer({
    root: fileURLToPath(
      new URL('../../../apps/command-center', import.meta.url),
    ),
    server: {
      host: '127.0.0.1',
      port: 0,
      proxy: { '/api': { target: address } },
    },
    logLevel: 'error',
  });
  try {
    await vite.listen();
    const url = vite.resolvedUrls?.local[0];
    if (url === undefined) throw new Error('Dashboard did not start.');
    // Only the external identity provider is doubled; the UI and HTTP mutation/replay are real.
    await page.route('**/src/instructor-identity.*', (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: `export async function createInstructorIdentity() {
        return { signIn: async () => 'synthetic-owner', token: async () => ${JSON.stringify(token)}, signOut: async () => {} };
      }`,
      }),
    );
    let creationBody: string | null | undefined;
    let creationKey: string | undefined;
    let creationAttempts = 0;
    await page.route('**/api/v1/event-sessions', async (route) => {
      const request = route.request();
      creationAttempts += 1;
      if (creationAttempts === 1) {
        creationBody = request.postData();
        creationKey = request.headers()['idempotency-key'];
        expect((await route.fetch()).status()).toBe(201);
        await route.abort('failed');
      } else {
        expect(request.postData()).toBe(creationBody);
        expect(request.headers()['idempotency-key']).toBe(creationKey);
        await route.continue();
      }
    });
    await page.goto(url);
    const create = page.getByRole('button', {
      name: 'Create hosted event',
      exact: true,
    });
    await expect(create).toBeDisabled();
    await expect(page.getByLabel('Local instructor token')).toHaveCount(0);
    await page
      .getByRole('button', {
        name: 'Sign in / renew with Microsoft',
        exact: true,
      })
      .click();
    await create.click();
    const retry = page.getByRole('button', {
      name: 'Retry the same action',
      exact: true,
    });
    await expect(retry).toBeVisible();
    expect(creationAttempts, await page.getByRole('alert').innerText()).toBe(1);
    await expect(create).toBeDisabled();
    await retry.click();
    await expect(
      page.getByRole('button', { name: 'Open lobby', exact: true }),
    ).toBeVisible();
    expect(await backend.query('event')).toHaveLength(1);
    await page.getByRole('button', { name: 'Open lobby', exact: true }).click();
    await page
      .getByRole('button', { name: 'Start event', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Open mission', exact: true }),
    ).toBeVisible();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([]);
    const eventId = await page.getByLabel('Event session ID').inputValue();
    const publicPage = await context.newPage();
    const publicRequests: { url: string; authorization: string | undefined }[] =
      [];
    publicPage.on('request', (request) => {
      publicRequests.push({
        url: request.url(),
        authorization: request.headers()['authorization'],
      });
    });
    let socket: WebSocketRoute | undefined;
    await publicPage.route('**/hub/negotiate?*', (route) =>
      route.fulfill({
        json: {
          negotiateVersion: 1,
          connectionId: 'synthetic-connection',
          connectionToken: 'synthetic-connection',
          availableTransports: [
            { transport: 'WebSockets', transferFormats: ['Text', 'Binary'] },
          ],
        },
      }),
    );
    await publicPage.routeWebSocket('**/hub?*', (ws) => {
      socket = ws;
      ws.onMessage((message) => {
        if (
          typeof message === 'string' &&
          message.includes('"protocol":"json"')
        )
          ws.send('{}\u001e');
      });
    });
    await publicPage.goto(
      `${url}?view=presentation&eventSessionId=${encodeURIComponent(eventId)}`,
    );
    await expect(
      publicPage.getByText(
        'Live updates with periodic snapshot reconciliation',
        { exact: true },
      ),
    ).toBeVisible();
    if (socket === undefined)
      throw new Error('SignalR browser SDK did not establish a socket.');
    const connectedSocket: WebSocketRoute = socket;
    const publicSnapshot = async () =>
      decodePublicPresentationProjection(
        (
          await api.inject(
            `/api/v1/public/event-session?eventSessionId=${encodeURIComponent(eventId)}`,
          )
        ).json(),
      );
    const beforeMessage = await publicSnapshot();
    await publicPage.route('**/api/v1/public/event-session?*', (route) =>
      route.fulfill({ json: beforeMessage }),
    );
    await page
      .getByRole('button', { name: 'Open mission', exact: true })
      .click();
    await expect(page.locator('.briefing-panel .status-pill')).toHaveText(
      'Open',
    );
    const snapshot = await publicSnapshot();
    const send = (value: unknown) => {
      connectedSocket.send(
        `${JSON.stringify({
          type: 1,
          target: 'publicProjection',
          arguments: [value],
        })}\u001e`,
      );
    };
    send({
      ...snapshot,
      eventSessionId: 'foreign-event',
      revision: 999,
      collectiveRecoveryPercent: 99,
    });
    send(snapshot);
    await expect(
      publicPage.getByText('Signal in the Storm', { exact: true }),
    ).toBeVisible();
    await expect(publicPage.getByText('99%', { exact: true })).toHaveCount(0);
    await publicPage.unroute('**/api/v1/public/event-session?*');
    expect(
      publicRequests.every((request) => request.authorization === undefined),
    ).toBe(true);
    expect(
      publicRequests.some(
        (request) =>
          request.url.includes('instructor-identity') ||
          request.url.endsWith('/api/v1/workshop'),
      ),
    ).toBe(false);
    const stored = await page.evaluate(() => {
      const values: (string | null)[] = [];
      for (const storage of [localStorage, sessionStorage]) {
        for (let index = 0; index < storage.length; index += 1) {
          const key = storage.key(index);
          if (key !== null) values.push(key, storage.getItem(key));
        }
      }
      return JSON.stringify(values);
    });
    expect(stored).not.toContain(token);
    await publicPage.route('**/api/v1/public/event-session?*', (route) =>
      route.fulfill({ status: 503, body: '' }),
    );
    await expect(publicPage.getByRole('alert')).toBeVisible();
    await expect(
      publicPage.getByText('Signal in the Storm', { exact: true }),
    ).toHaveCount(0);
    send(snapshot);
    await publicPage.unroute('**/api/v1/public/event-session?*');
    await expect(
      publicPage.getByText('Signal in the Storm', { exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Sign out of this dashboard', exact: true })
      .click();
    await expect(
      page.getByRole('link', {
        name: 'Open public-only display in a separate tab',
      }),
    ).toHaveCount(0);
    await expect(create).toBeDisabled();
    await publicPage.close();
  } finally {
    await page.goto('about:blank');
    await vite.close();
    await api.close();
    await rm(directory, { recursive: true });
  }
});
