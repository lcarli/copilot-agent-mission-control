import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

import { signalInTheStormContent } from './missions/mission-1.js';
import { groundTruthContent } from './missions/mission-2.js';
import { connectedCityContent } from './missions/mission-3.js';
import { specialistNetworkContent } from './missions/mission-4.js';
import { restoreTheLighthouseContent } from './missions/mission-5.js';

const closed = { additionalProperties: false } as const;
const text = () => Type.String({ minLength: 1, maxLength: 20_000 });
const localized = <T extends string>(locale: T) =>
  Type.Object(
    {
      locale: Type.Literal(locale),
      title: text(),
      briefing: text(),
      coreObjectives: Type.Array(text(), { minItems: 1, maxItems: 50 }),
      advancedObjectives: Type.Array(text(), { maxItems: 50 }),
      hints: Type.Array(text(), { minItems: 3, maxItems: 3 }),
    },
    closed,
  );
const mission = Type.Object(
  {
    missionId: text(),
    version: text(),
    validatorId: text(),
    validatorVersion: text(),
    content: Type.Object(
      { en: localized('en'), fr: localized('fr'), 'pt-BR': localized('pt-BR') },
      closed,
    ),
  },
  closed,
);
const schema = Type.Object(
  {
    schemaVersion: Type.Literal('1.0'),
    campaignId: Type.Literal('operation-lighthouse'),
    campaignVersion: Type.Literal('1.0.0'),
    missions: Type.Array(mission, { minItems: 5, maxItems: 5 }),
  },
  closed,
);

export const lighthouseRuntimeDescriptor = {
  schemaVersion: '1.0',
  campaignId: 'operation-lighthouse',
  campaignVersion: '1.0.0',
  missions: [
    signalInTheStormContent,
    groundTruthContent,
    connectedCityContent,
    specialistNetworkContent,
    restoreTheLighthouseContent,
  ],
} as const;

export function decodeLighthouseRuntime(value: unknown) {
  const decoded = Value.Decode(schema, value);
  for (const [
    index,
    expected,
  ] of lighthouseRuntimeDescriptor.missions.entries()) {
    const actual = decoded.missions[index];
    if (
      actual?.missionId !== expected.missionId ||
      actual.version !== expected.version ||
      actual.validatorId !== expected.validatorId ||
      actual.validatorVersion !== expected.validatorVersion
    )
      throw new Error(
        'Runtime descriptor requires the installed mission and validator versions, in campaign order.',
      );
  }
  return decoded;
}
