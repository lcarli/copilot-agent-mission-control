import { readFile } from 'node:fs/promises';

import type {
  SimulatorInvocation,
  SimulatorObservation,
} from '@mission-control/event-contracts';

export interface RehearsalEnvelope {
  readonly schemaVersion: '1.0';
  readonly missionId: string;
  readonly evidence: Readonly<Record<string, unknown>>;
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const requiredObject = (
  value: unknown,
): Readonly<Record<string, unknown>> => {
  if (!isRecord(value))
    throw new Error('Expected a structured workshop response.');
  return value;
};

export const requiredString = (value: unknown, key: string): string => {
  const field = requiredObject(value)[key];
  if (typeof field !== 'string' || field.length === 0)
    throw new Error(`Missing ${key}.`);
  return field;
};

export async function readRehearsalEnvelopes(): Promise<
  readonly RehearsalEnvelope[]
> {
  const value: unknown = JSON.parse(
    await readFile(
      new URL(
        '../../../../campaigns/operation-lighthouse/test/fixtures/rehearsal-submissions.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  if (!Array.isArray(value) || value.length !== 5)
    throw new Error('Expected five rehearsal envelopes.');
  const entries: readonly unknown[] = value;
  return entries.map((entry) => {
    const envelope = requiredObject(entry);
    if (envelope.schemaVersion !== '1.0')
      throw new Error('Unsupported rehearsal envelope version.');
    return {
      schemaVersion: '1.0',
      missionId: requiredString(envelope, 'missionId'),
      evidence: requiredObject(envelope.evidence),
    };
  });
}

export async function groundRehearsalEvidence(
  input: RehearsalEnvelope,
  invoke: (invocation: SimulatorInvocation) => Promise<SimulatorObservation>,
): Promise<{
  readonly envelope: RehearsalEnvelope;
  readonly observations: readonly SimulatorObservation[];
}> {
  if (
    input.missionId !== 'connected-city' &&
    input.missionId !== 'restore-the-lighthouse'
  )
    return { envelope: structuredClone(input), observations: [] };

  const observations: SimulatorObservation[] = [];
  const call = async (
    tool: string,
    operation: string,
    args: Record<string, unknown> = {},
  ) => {
    const receipt = await invoke({ tool, operation, arguments: args });
    observations.push(receipt);
    return receipt.evidenceId;
  };
  const ids = new Map<string, string>();
  await call('weather', 'forecast');
  ids.set('fixture-forecast', await call('weather', 'forecast'));
  ids.set('fixture-shelter', await call('shelter', 'list'));
  ids.set(
    'fixture-journey',
    await call('transport', 'journey', {
      originDistrictId: 'harbor',
      destinationDistrictId: 'north-hills',
      mode: 'emergency',
    }),
  );
  if (input.missionId === 'restore-the-lighthouse') {
    ids.set('fixture-grid', await call('grid', 'health'));
    ids.set('fixture-inventory', await call('resources', 'inventory'));
  }
  const replace = (value: unknown): unknown => {
    if (typeof value === 'string') return ids.get(value) ?? value;
    if (Array.isArray(value)) return value.map(replace);
    if (isRecord(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, replace(entry)]),
      );
    }
    return value;
  };
  return {
    envelope: {
      schemaVersion: '1.0',
      missionId: input.missionId,
      evidence: {
        ...requiredObject(replace(input.evidence)),
        toolTrace: observations.map(({ tool, evidenceId, result }) => ({
          tool,
          evidenceId,
          status: result.ok ? 'success' : 'failed',
        })),
        ...(input.missionId === 'restore-the-lighthouse'
          ? {
              totalToolCalls: observations.length,
              replan: {
                failedTool: 'weather',
                changedActionIds: ['evacuate-harbor'],
              },
            }
          : {}),
      },
    },
    observations,
  };
}
