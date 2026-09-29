import { readFile } from 'node:fs/promises';

import { Ajv2020 } from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';

import {
  signalInTheStormContent,
  signalInTheStormValidator,
} from '../src/index.js';

const readJson = async (path: string): Promise<unknown> =>
  JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8')) as unknown;

describe('Mission 1 published starter contract', () => {
  it('publishes the canonical identifier and a schema-valid server-passing example', async () => {
    const manifest = await readJson('../starters/starter-manifest.json');
    expect(manifest).toMatchObject({
      missions: [{ missionId: 'signal-in-the-storm' }, {}, {}, {}, {}],
    });
    const schema = await readJson(
      '../starters/mission-1/contracts/output.schema.json',
    );
    const example = await readJson(
      '../starters/mission-1/examples/evidence.json',
    );
    expect(example).toMatchObject({
      schemaVersion: '1.0',
      missionId: signalInTheStormContent.missionId,
    });
    if (
      typeof schema !== 'object' ||
      schema === null ||
      typeof example !== 'object' ||
      example === null ||
      !('evidence' in example) ||
      typeof example.evidence !== 'object' ||
      example.evidence === null ||
      Array.isArray(example.evidence)
    ) {
      throw new Error('Invalid published starter files.');
    }
    const validate = new Ajv2020({ strict: true }).compile(schema);
    expect(validate(example.evidence), JSON.stringify(validate.errors)).toBe(
      true,
    );
    const request = {
      schemaVersion: '1.0' as const,
      validationRequestId: 'test-validation',
      submissionId: 'test-submission',
      eventSessionId: 'test-event',
      unitId: 'test-unit',
      missionId: signalInTheStormContent.missionId,
      missionVersion: signalInTheStormContent.version,
      validatorId: signalInTheStormValidator.id,
      validatorVersion: signalInTheStormValidator.version,
      scoringPolicyVersion: '1.0.0',
      scenarioSeed: 'test',
      requestedAt: '2026-09-29T12:00:00Z',
      deadlineAt: '2026-09-29T12:00:05Z',
    };
    const submission: Readonly<Record<string, unknown>> = {
      ...example.evidence,
    };
    const result = await signalInTheStormValidator.validate(
      {
        ...request,
        submission,
        observedEvidence: [],
      },
      request,
      new AbortController().signal,
    );
    expect(result.outcome).toBe('passed');
    expect(validate({ ...submission, location: undefined })).toBe(false);
    expect(validate({ ...submission, affectedServices: undefined })).toBe(
      false,
    );
    expect(validate({ ...submission, severity: 'unknown' })).toBe(false);
    expect(validate({ ...submission, unexpected: true })).toBe(false);
  });

  describe('remaining published readiness contracts', () => {
    it('keeps all canonical mission and tool names consistent', async () => {
      const manifest = await readJson('../starters/starter-manifest.json');
      expect(manifest).toMatchObject({
        missions: [
          { missionId: 'signal-in-the-storm' },
          { missionId: 'ground-truth' },
          { missionId: 'connected-city' },
          { missionId: 'specialist-network' },
          { missionId: 'restore-the-lighthouse' },
        ],
      });
      expect(
        await readJson('../starters/mission-3/contracts/tools.json'),
      ).toMatchObject({
        tools: [
          { toolId: 'weather' },
          { toolId: 'shelter' },
          { toolId: 'transport' },
        ],
      });
    });

    it('replaces the Mission 2 placeholder with matching report and bulletin identifiers', async () => {
      expect(
        await readJson(
          '../starters/mission-2/context/operational-bulletin.json',
        ),
      ).toMatchObject({
        scenarioId: 'east-bank-underpass-closure',
        bulletinId: 'bulletin-03',
        relatedReportIds: ['incident-004', 'incident-005'],
      });
      expect(
        await readJson('../starters/mission-2/context/incident-reports.json'),
      ).toMatchObject({
        scenarioId: 'east-bank-underpass-closure',
        reports: [{ reportId: 'incident-004' }, { reportId: 'incident-005' }],
      });
    });

    it('describes the complete Mission 5 fixture and rejects a generic evidence object', async () => {
      const schema = await readJson(
        '../starters/mission-5/contracts/submission.schema.json',
      );
      const fixtures = await readJson('./fixtures/rehearsal-submissions.json');
      if (
        typeof schema !== 'object' ||
        schema === null ||
        !Array.isArray(fixtures)
      ) {
        throw new Error('Invalid Mission 5 schema or fixtures.');
      }
      const validate = new Ajv2020({ strict: true }).compile(schema);
      expect(validate(fixtures[4]), JSON.stringify(validate.errors)).toBe(true);
      expect(
        validate({
          schemaVersion: '1.0',
          missionId: 'restore-the-lighthouse',
          evidence: {},
        }),
      ).toBe(false);
    });
  });
});
