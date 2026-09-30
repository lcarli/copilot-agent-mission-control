import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { AxeBuilder } from '@axe-core/playwright';
import { buildLocalWorkshopApp } from '@mission-control/api';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { createServer } from 'vite';

import {
  readRehearsalEnvelopes,
  requiredObject,
  requiredString,
} from './support/workshop-fixtures.js';

const audit = async (page: Page, phase: string) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    results.violations.map(({ id, impact, nodes }) => ({
      id,
      impact,
      targets: nodes.map(({ target }) => target),
    })),
    phase,
  ).toEqual([]);
};

const tabTo = async (page: Page, target: Locator) => {
  for (let attempts = 0; attempts < 60; attempts += 1) {
    await page.keyboard.press('Tab');
    if (await target.evaluate((node) => node === document.activeElement))
      return;
  }
  throw new Error('The requested control is not reachable by keyboard.');
};

for (const theme of ['light', 'dark'] as const) {
  test(`accessible local operations and public projection in ${theme} theme`, async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    const instructorToken = randomBytes(32).toString('hex');
    const api = buildLocalWorkshopApp({ instructorToken });
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
      await page.goto(`${url}?scoutTheme=${theme}`);
      for (const locale of ['en', 'fr', 'pt-BR']) {
        await page.locator('.preferences select').first().selectOption(locale);
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await audit(page, `${theme} setup ${locale}`);
      }
      await page.locator('.preferences select').first().selectOption('en');
      await page.goto('about:blank');
      await page.goto(`${url}?scoutTheme=${theme}`);
      await expect(page.getByLabel('Local instructor token')).toBeVisible();
      await page.keyboard.press('Tab');
      await expect(
        page.getByRole('link', { name: 'Skip to command center' }),
      ).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('#command-center')).toBeFocused();
      const tokenInput = page.getByLabel('Local instructor token');
      await tabTo(page, tokenInput);
      const focusStyle = await tokenInput.evaluate((node) => {
        const style = getComputedStyle(node);
        return { width: style.outlineWidth, style: style.outlineStyle };
      });
      expect(focusStyle.style).toBe('solid');
      expect(parseFloat(focusStyle.width)).toBeGreaterThanOrEqual(2);
      await tokenInput.fill(instructorToken);
      await tabTo(
        page,
        page.getByRole('button', { name: 'Create local event', exact: true }),
      );
      await page.keyboard.press('Enter');
      const openLobby = page.getByRole('button', {
        name: 'Open lobby',
        exact: true,
      });
      await expect(openLobby).toBeVisible();
      await tabTo(page, openLobby);
      await page.keyboard.press('Enter');
      const start = page.getByRole('button', {
        name: 'Start event',
        exact: true,
      });
      await expect(start).toBeVisible();
      await tabTo(page, start);
      await page.keyboard.press('Enter');
      const openMission = page.getByRole('button', {
        name: 'Open mission',
        exact: true,
      });
      await expect(openMission).toBeVisible();
      await tabTo(page, openMission);
      await page.keyboard.press('Enter');
      await expect(page.locator('.briefing-panel .status-pill')).toHaveText(
        'Open',
      );
      await audit(page, `${theme} active instructor`);
      const pause = page.getByRole('button', {
        name: 'Pause mission',
        exact: true,
      });
      await tabTo(page, pause);
      await page.keyboard.press('Enter');
      await expect(page.locator('.briefing-panel .status-pill')).toHaveText(
        'Paused',
      );
      await audit(page, `${theme} paused instructor`);
      const resume = page.getByRole('button', {
        name: 'Resume mission',
        exact: true,
      });
      await tabTo(page, resume);
      await page.keyboard.press('Enter');
      await expect(page.locator('.briefing-panel .status-pill')).toHaveText(
        'Open',
      );

      const eventId = await page.getByLabel('Event session ID').inputValue();
      const code = (
        await page.locator('.local-connection p strong').textContent()
      )?.trim();
      if (code === undefined) throw new Error('Missing event code.');
      const post = async (path: string, body: unknown, token?: string) => {
        const response = await fetch(`${address}/api/v1/${path}`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'idempotency-key': randomUUID(),
            ...(token === undefined
              ? {}
              : { authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10_000),
        });
        expect(response.ok).toBe(true);
        return response.json() as Promise<unknown>;
      };
      const joined = requiredObject(
        await post('registrations', {
          eventCode: code,
          displayName: 'Synthetic accessibility unit',
          locale: 'en',
        }),
      );
      const participantToken = requiredString(joined, 'unitToken');
      await post('missions/signal-in-the-storm/start', {}, participantToken);
      const envelope = (await readRehearsalEnvelopes())[0];
      if (envelope === undefined) throw new Error('Missing Mission 1 fixture.');
      await post(
        'missions/signal-in-the-storm/submissions',
        envelope,
        participantToken,
      );

      const publicPage = await context.newPage();
      await publicPage.emulateMedia({
        colorScheme: theme,
        reducedMotion: 'reduce',
      });
      for (const locale of ['en', 'fr', 'pt-BR']) {
        await publicPage.goto(
          `${url}?view=presentation&eventSessionId=${eventId}&locale=${locale}&scoutTheme=${theme}`,
        );
        await expect(
          publicPage.locator('.presentation-recovery > strong'),
        ).toHaveText('59%');
        await expect(publicPage.locator('html')).toHaveAttribute(
          'lang',
          locale,
        );
        await audit(publicPage, `${theme} public ${locale}`);
      }
      await publicPage.setViewportSize({ width: 320, height: 720 });
      expect(
        await publicPage.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true);
      await audit(publicPage, `${theme} public narrow`);
      const moving = await publicPage.locator('*').evaluateAll((nodes) =>
        nodes.some((node) => {
          const style = getComputedStyle(node);
          return (
            style.animationName !== 'none' ||
            style.transitionDuration
              .split(',')
              .some((duration) => parseFloat(duration) > 0)
          );
        }),
      );
      expect(moving).toBe(false);
      await page.getByLabel('Local instructor token').fill('invalid'.repeat(8));
      await page
        .getByRole('button', { name: 'Connect / refresh event', exact: true })
        .click();
      await expect(page.getByRole('alert')).toContainText('401');
      await audit(page, `${theme} instructor error`);
      await api.close();
      await expect(publicPage.getByRole('alert')).toBeVisible({
        timeout: 10_000,
      });
      await expect(publicPage.locator('.presentation-recovery')).toHaveCount(0);
      await audit(publicPage, `${theme} public unavailable`);
    } finally {
      await vite.close();
      await api.close();
    }
  });
}
