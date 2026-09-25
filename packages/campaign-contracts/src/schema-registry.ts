import { readFileSync } from 'node:fs';

import {
  Ajv2020,
  type AnySchema,
  type ErrorObject,
  type ValidateFunction,
} from 'ajv/dist/2020.js';

const schemaNames = [
  'common',
  'campaign',
  'mission',
  'asset-manifest',
  'localization',
] as const;

type RootSchemaName = Exclude<(typeof schemaNames)[number], 'common'>;

const schemaCandidates = [
  new URL('../schemas/v1/', import.meta.url),
  new URL('./schemas/v1/', import.meta.url),
];

const loadSchema = (name: (typeof schemaNames)[number]): object => {
  for (const directory of schemaCandidates) {
    try {
      return JSON.parse(
        readFileSync(new URL(`${name}.schema.json`, directory), 'utf8'),
      ) as object;
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !('code' in error) ||
        error.code !== 'ENOENT'
      ) {
        throw error;
      }
    }
  }

  throw new Error(`Campaign schema is unavailable: ${name}.schema.json`);
};

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  strictRequired: false,
  strictTypes: false,
  validateFormats: true,
});
ajv.addFormat('date-time', {
  type: 'string',
  validate: (value: string) =>
    value.endsWith('Z') && !Number.isNaN(Date.parse(value)),
});

for (const name of schemaNames) {
  ajv.addSchema(loadSchema(name));
}

const requireValidator = (schemaId: string): ValidateFunction => {
  const validator = ajv.getSchema(schemaId);
  if (!validator) {
    throw new Error(`Campaign validator is unavailable: ${schemaId}`);
  }
  return validator;
};

const validators: Record<RootSchemaName, ValidateFunction> = {
  campaign: requireValidator(
    'https://github.com/lcarli/copilot-agent-mission-control/schemas/campaign/v1/campaign.schema.json',
  ),
  mission: requireValidator(
    'https://github.com/lcarli/copilot-agent-mission-control/schemas/campaign/v1/mission.schema.json',
  ),
  'asset-manifest': requireValidator(
    'https://github.com/lcarli/copilot-agent-mission-control/schemas/campaign/v1/asset-manifest.schema.json',
  ),
  localization: requireValidator(
    'https://github.com/lcarli/copilot-agent-mission-control/schemas/campaign/v1/localization.schema.json',
  ),
};

export interface SchemaValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ErrorObject[];
}

export const validateCampaignDocument = (
  schemaName: RootSchemaName,
  value: unknown,
): SchemaValidationResult => {
  const validator = validators[schemaName];
  return {
    valid: validator(value),
    errors: validator.errors ?? [],
  };
};

export const validateJsonSchema = (schema: unknown): readonly ErrorObject[] => {
  if (
    typeof schema !== 'boolean' &&
    (typeof schema !== 'object' || schema === null || Array.isArray(schema))
  ) {
    return [
      {
        instancePath: '',
        schemaPath: '',
        keyword: 'schema',
        params: {},
        message: 'JSON Schema must be an object or boolean.',
      },
    ];
  }
  try {
    ajv.compile(schema as AnySchema);
    return [];
  } catch (error) {
    return [
      {
        instancePath: '',
        schemaPath: '',
        keyword: 'schema',
        params: {},
        message: error instanceof Error ? error.message : 'Invalid JSON Schema',
      },
    ];
  }
};
