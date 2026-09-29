import { execFile } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildLocalWorkshopApp } from '@mission-control/api';
import {
  decodeMissionSubmissionFeedback,
  decodePublicPresentationProjection,
  decodeSimulatorObservation,
  type SimulatorObservation,
} from '@mission-control/event-contracts';
import { test, expect } from '@playwright/test';
import { createServer } from 'vite';

const repositoryRoot = fileURLToPath(new URL('../../..', import.meta.url));
const cliPath = fileURLToPath(
  new URL('../../../apps/participant-cli/dist/cli.js', import.meta.url),
);
const dashboardRoot = fileURLToPath(
  new URL('../../../apps/command-center', import.meta.url),
);

function runCli(home: string, args: readonly string[], unitToken?: string) {
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    MISSION_CONTROL_HOME: home,
    LC_ALL: 'en',
  };
  if (unitToken === undefined) delete environment.MISSION_CONTROL_UNIT_TOKEN;
  else environment.MISSION_CONTROL_UNIT_TOKEN = unitToken;
  return new Promise<{ code: number; stdout: string; stderr: string }>(
    (resolve, reject) => {
      execFile(
        process.execPath,
        [cliPath, ...args],
        {
          cwd: repositoryRoot,
          env: environment,
          timeout: 15_000,
        },
        (error, stdout, stderr) => {
          if (
            error !== null &&
            (typeof error.code !== 'number' || error.killed)
          ) {
            reject(
              new Error('Participant CLI process failed.', { cause: error }),
            );
            return;
          }
          resolve({
            code: error === null ? 0 : Number(error.code),
            stdout,
            stderr,
          });
        },
      );
    },
  );
}

test('instructor browser -> participant CLI -> evaluation -> public browser, including recovery', async ({
  page,
  context,
}) => {
  const instructorToken = randomBytes(32).toString('hex');
  const api = buildLocalWorkshopApp({ instructorToken });
  const address = await api.listen({ host: '127.0.0.1', port: 0 });
  const home = await mkdtemp(join(tmpdir(), 'lighthouse-e2e-'));
  const vite = await createServer({
    root: dashboardRoot,
    server: {
      host: '127.0.0.1',
      port: 0,
      proxy: { '/api': { target: address } },
    },
    logLevel: 'error',
  });
  try {
    await vite.listen();
    const viteAddress = vite.httpServer?.address();
    if (
      viteAddress === null ||
      viteAddress === undefined ||
      typeof viteAddress === 'string'
    ) {
      throw new Error('Dashboard did not start on a TCP port.');
    }
    const url = `http://127.0.0.1:${String(viteAddress.port)}`;
    await page.goto(url);
    await page.getByLabel('Local instructor token').fill(instructorToken);
    await page
      .getByRole('button', { name: 'Create local event', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Open lobby', exact: true }),
    ).toBeVisible();
    const eventId = await page.getByLabel('Event session ID').inputValue();
    const code = (
      await page.locator('.local-connection p strong').textContent()
    )?.trim();
    if (code === undefined || code === '')
      throw new Error('No registration code returned.');
    await page.getByRole('button', { name: 'Open lobby', exact: true }).click();
    await page
      .getByRole('button', { name: 'Start event', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Open mission', exact: true })
      .click();
    await expect(page.locator('.briefing-panel .status-pill')).toHaveText(
      'Open',
    );

    const publicPage = await context.newPage();
    await publicPage.goto(
      `${url}/?view=presentation&eventSessionId=${eventId}`,
    );
    await expect(
      publicPage.getByRole('heading', { name: 'Signal in the Storm' }),
    ).toBeVisible();
    await expect(
      publicPage.getByText('No evaluated scores yet.'),
    ).toBeVisible();
    await expect(publicPage.getByLabel('Local instructor token')).toHaveCount(
      0,
    );

    expect(
      (
        await runCli(home, [
          'config',
          'set',
          '--api-url',
          address,
          '--locale',
          'en',
        ])
      ).code,
    ).toBe(0);
    const joined = await runCli(home, [
      'join',
      '--event-code',
      code,
      '--name',
      'Synthetic confidential name',
    ]);
    expect(joined.code, joined.stderr).toBe(0);
    expect((await runCli(home, ['connectivity'])).stdout).not.toContain('FAIL');
    expect(
      (await runCli(home, ['mission', 'start', 'signal-in-the-storm'])).code,
    ).toBe(0);

    const evidencePath = join(home, 'evidence.json');
    await writeFile(
      evidencePath,
      JSON.stringify({
        schemaVersion: '1.0',
        missionId: 'signal-in-the-storm',
        evidence: {},
      }),
    );
    const localCheck = await runCli(home, [
      'mission',
      'validate',
      'signal-in-the-storm',
      '--evidence',
      evidencePath,
    ]);
    expect(localCheck.code).toBe(0);
    expect(localCheck.stdout).toContain('not mission approval');
    const partial = await runCli(home, [
      'mission',
      'submit',
      'signal-in-the-storm',
      '--evidence',
      evidencePath,
    ]);
    expect(partial.code).toBe(1);
    expect(partial.stdout).toContain('"outcome": "partial"');
    await expect(
      publicPage.getByRole('progressbar', { name: 'Mission progress' }),
    ).toHaveAttribute('value', '0');

    await page
      .getByRole('button', { name: 'Pause mission', exact: true })
      .click();
    await expect(page.locator('.briefing-panel .status-pill')).toHaveText(
      'Paused',
    );
    const paused = await runCli(home, [
      'mission',
      'submit',
      'signal-in-the-storm',
      '--evidence',
      evidencePath,
    ]);
    expect(paused.code).toBe(1);
    expect(paused.stderr).toContain('mission-not-available');
    await page
      .getByRole('button', { name: 'Resume mission', exact: true })
      .click();
    await expect(page.locator('.briefing-panel .status-pill')).toHaveText(
      'Open',
    );

    const example = await readFile(
      join(
        repositoryRoot,
        'campaigns',
        'operation-lighthouse',
        'starters',
        'mission-1',
        'examples',
        'evidence.json',
      ),
      'utf8',
    );
    await writeFile(evidencePath, example);
    const key = randomUUID();
    const args = [
      'mission',
      'submit',
      'signal-in-the-storm',
      '--evidence',
      evidencePath,
      '--idempotency-key',
      key,
    ];
    const passed = await runCli(home, args);
    expect(passed.code, passed.stderr).toBe(0);
    expect(passed.stdout).toContain('"outcome": "passed"');
    expect(passed.stdout).toContain('"totalPoints": 882');
    expect((await runCli(home, args)).stdout).toBe(passed.stdout);
    await expect(
      publicPage.getByRole('progressbar', { name: 'Mission progress' }),
    ).toHaveAttribute('value', '100');
    await expect(publicPage.locator('.presentation-ranking')).toContainText(
      '882',
    );
    await expect(publicPage.locator('body')).not.toContainText(
      'Synthetic confidential name',
    );
    await expect(
      publicPage.getByText('City recovery is the scenario starting state', {
        exact: false,
      }),
    ).toBeVisible();
    expect((await runCli(home, ['reconnect'])).code).toBe(0);
    expect((await runCli(home, ['connectivity'])).stdout).not.toContain('FAIL');

    await api.close();
    await expect(publicPage.getByRole('alert')).toContainText(
      'Event connection failed',
      { timeout: 10_000 },
    );
    await expect(publicPage.locator('.presentation-ranking')).toHaveCount(0);
  } finally {
    await vite.close();
    await api.close();
    await rm(home, { recursive: true, force: true });
  }
});

test('all five missions use server observations and avoid double-awarding', async () => {
  const instructorToken = randomBytes(32).toString('hex');
  const api = buildLocalWorkshopApp({ instructorToken });
  const address = await api.listen({ host: '127.0.0.1', port: 0 });
  const home = await mkdtemp(join(tmpdir(), 'lighthouse-tools-e2e-'));
  const request = async (
    path: string,
    body?: unknown,
    token = instructorToken,
  ): Promise<unknown> => {
    const response = await fetch(`${address}/api/v1/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'idempotency-key': randomUUID(),
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    expect(response.ok, `${path} HTTP ${String(response.status)}`).toBe(true);
    return response.json();
  };
  const requiredString = (value: unknown, key: string): string => {
    if (typeof value !== 'object' || value === null)
      throw new Error(`Missing ${key}`);
    const field: unknown = Reflect.get(value, key);
    if (typeof field !== 'string') throw new Error(`Missing ${key}`);
    return field;
  };
  try {
    expect(
      (
        await runCli(home, [
          'config',
          'set',
          '--api-url',
          address,
          '--locale',
          'en',
        ])
      ).code,
    ).toBe(0);
    const created = await request('event-sessions', {
      campaignId: 'operation-lighthouse',
      defaultLocale: 'en',
      supportedLocales: ['en'],
    });
    const code = requiredString(created, 'eventCode');
    if (
      typeof created !== 'object' ||
      created === null ||
      !('eventSession' in created)
    )
      throw new Error('Missing event.');
    const id = requiredString(created.eventSession, 'eventSessionId');
    const command = (
      commandType: string,
      expectedVersion: number,
      target: Record<string, string> = {},
    ) =>
      request(`event-sessions/${id}/commands`, {
        schemaVersion: '1.0',
        commandId: randomUUID(),
        commandType,
        eventSessionId: id,
        expectedVersion,
        requestedAt: new Date().toISOString(),
        target,
        payload: {},
      });
    await command('event-session.open-lobby', 1);
    await command('event-session.start', 2);
    const joined = await request('registrations', {
      eventCode: code,
      displayName: 'Synthetic fixture unit',
      locale: 'en',
    });
    const token = requiredString(joined, 'unitToken');
    const fixtures: unknown = JSON.parse(
      await readFile(
        join(
          repositoryRoot,
          'campaigns',
          'operation-lighthouse',
          'test',
          'fixtures',
          'rehearsal-submissions.json',
        ),
        'utf8',
      ),
    );
    if (!Array.isArray(fixtures) || fixtures.length !== 5)
      throw new Error('Expected five rehearsal envelopes.');
    let totalPoints = 0;
    for (let envelope of fixtures as unknown[]) {
      const missionId = requiredString(envelope, 'missionId');
      await command('mission.open', 1, { missionId });
      await request(`missions/${missionId}/start`, {}, token);
      if (
        missionId === 'connected-city' ||
        missionId === 'restore-the-lighthouse'
      ) {
        const receipts: SimulatorObservation[] = [];
        const invoke = async (
          tool: string,
          operation: string,
          args: Record<string, unknown> = {},
        ) => {
          const path = join(home, 'tool-request.json');
          await writeFile(
            path,
            JSON.stringify({ tool, operation, arguments: args }),
          );
          const output = await runCli(
            home,
            ['mission', 'tool', missionId, '--request', path],
            token,
          );
          const receipt = decodeSimulatorObservation(
            JSON.parse(output.stdout) as unknown,
          );
          expect(output.code).toBe(receipt.result.ok ? 0 : 1);
          receipts.push(receipt);
          return receipt.evidenceId;
        };
        const ids: Record<string, string> = {};
        await invoke('weather', 'forecast');
        ids['fixture-forecast'] = await invoke('weather', 'forecast');
        ids['fixture-shelter'] = await invoke('shelter', 'list');
        ids['fixture-journey'] = await invoke('transport', 'journey', {
          originDistrictId: 'harbor',
          destinationDistrictId: 'north-hills',
          mode: 'emergency',
        });
        if (missionId === 'restore-the-lighthouse') {
          ids['fixture-grid'] = await invoke('grid', 'health');
          ids['fixture-inventory'] = await invoke('resources', 'inventory');
        }
        const replaceIds = (value: unknown): unknown => {
          if (typeof value === 'string') return ids[value] ?? value;
          if (Array.isArray(value)) return value.map(replaceIds);
          if (typeof value === 'object' && value !== null) {
            return Object.fromEntries(
              Object.entries(value).map(([key, entry]) => [
                key,
                replaceIds(entry),
              ]),
            );
          }
          return value;
        };
        const updated = replaceIds(envelope);
        if (
          typeof updated !== 'object' ||
          updated === null ||
          !('evidence' in updated) ||
          typeof updated.evidence !== 'object' ||
          updated.evidence === null
        ) {
          throw new Error('Invalid evidence fixture.');
        }
        const toolTrace = receipts.map(({ tool, evidenceId, result }) => ({
          tool,
          evidenceId,
          status: result.ok ? 'success' : 'failed',
        }));
        envelope = {
          ...updated,
          evidence: {
            ...updated.evidence,
            toolTrace,
            ...(missionId === 'restore-the-lighthouse'
              ? {
                  totalToolCalls: receipts.length,
                  replan: {
                    failedTool: 'weather',
                    changedActionIds: ['evacuate-harbor'],
                  },
                }
              : {}),
          },
        };
      }
      const submitted = await request(
        `missions/${missionId}/submissions`,
        envelope,
        token,
      );
      const submissionId = requiredString(submitted, 'submissionId');
      const feedback = decodeMissionSubmissionFeedback(
        await request(`submissions/${submissionId}`, undefined, token),
      );
      expect(feedback.missionId).toBe(missionId);
      expect(feedback.outcome).toBe('passed');
      expect(feedback.score.totalPoints).toBeGreaterThan(totalPoints);
      totalPoints = feedback.score.totalPoints;
      const repeated = await request(
        `missions/${missionId}/submissions`,
        envelope,
        token,
      );
      const replayed = decodeMissionSubmissionFeedback(
        await request(
          `submissions/${requiredString(repeated, 'submissionId')}`,
          undefined,
          token,
        ),
      );
      expect(replayed.score.totalPoints).toBe(totalPoints);
      expect(replayed.score.awardedPoints).toBe(0);
      const projection = decodePublicPresentationProjection(
        await request(`public/event-session?eventSessionId=${id}`),
      );
      expect(projection.activeMission.progressPercent).toBe(100);
      expect(projection.rankings[0]?.score).toBe(totalPoints);
      await command('mission.close', 2, { missionId });
    }
  } finally {
    await api.close();
    await rm(home, { recursive: true, force: true });
  }
});
