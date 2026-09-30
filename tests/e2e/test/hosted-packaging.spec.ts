import { createHash, randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { buildLocalWorkshopApp } from '@mission-control/api';
import { expect, test } from '@playwright/test';

import { createDashboardServer } from '../../../apps/command-center/server-dist/app.js';
import {
  decodeLighthouseRuntime,
  lighthouseRuntimeDescriptor,
} from '../../../campaigns/operation-lighthouse/dist/runtime.js';

test('the generated runtime artifact matches the installed catalog and exact byte digest', async () => {
  const root = new URL(
    '../../../campaigns/operation-lighthouse/dist/',
    import.meta.url,
  );
  const bytes = await readFile(new URL('runtime.json', root));
  expect(bytes.length).toBeLessThanOrEqual(1_000_000);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  expect((await readFile(new URL('runtime.sha256', root), 'utf8')).trim()).toBe(
    `${sha256}  runtime.json`,
  );
  expect(decodeLighthouseRuntime(JSON.parse(bytes.toString()))).toEqual(
    lighthouseRuntimeDescriptor,
  );
});

test('the compiled dashboard and auth bridge work behind the production same-origin proxy', async ({
  page,
  context,
}) => {
  const instructorToken = randomBytes(32).toString('hex');
  const api = buildLocalWorkshopApp({ instructorToken });
  const apiOrigin = await api.listen({ host: '127.0.0.1', port: 0 });
  const dashboard = await createDashboardServer({
    apiOrigin,
    staticDirectory: fileURLToPath(
      new URL('../../../apps/command-center/dist/', import.meta.url),
    ),
  });
  dashboard.listen(0, '127.0.0.1');
  try {
    await once(dashboard, 'listening');
    const address = dashboard.address();
    if (address === null || typeof address === 'string')
      throw new Error('Dashboard listener did not start.');
    const origin = `http://127.0.0.1:${String(address.port)}`;
    const bridge = await context.request.get(`${origin}/auth.html`);
    expect(bridge.status()).toBe(200);
    expect(bridge.headers()['cache-control']).toBe('no-store');
    expect(await bridge.text()).toContain('/assets/auth-');
    expect((await context.request.get(`${origin}/health/ready`)).status()).toBe(
      200,
    );
    expect(
      (await context.request.get(`${origin}/server-dist/index.js`)).status(),
    ).toBe(404);
    await page.goto(origin);
    await page.getByLabel('Local instructor token').fill(instructorToken);
    await page
      .getByRole('button', { name: 'Create local event', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Open lobby', exact: true }),
    ).toBeVisible();
    const eventId = await page.getByLabel('Event session ID').inputValue();
    const publicPage = await context.newPage();
    await publicPage.goto(
      `${origin}/?view=presentation&eventSessionId=${eventId}`,
    );
    await expect(
      publicPage.locator('.presentation-recovery > strong'),
    ).toHaveText('58%');
    await expect(publicPage.getByLabel('Local instructor token')).toHaveCount(
      0,
    );
    expect(await publicPage.locator('body').innerText()).not.toContain(
      instructorToken,
    );
    await publicPage.close();
    await page.goto('about:blank');
  } finally {
    dashboard.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      dashboard.close((error) => {
        if (error === undefined) resolve();
        else reject(error);
      }),
    );
    await api.close();
  }
});
