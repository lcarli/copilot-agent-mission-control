import { mkdir, rm, writeFile } from 'node:fs/promises';

import { EVENT_SCHEMA_VERSION, domainEventSchemas } from '../dist/index.js';

const schemaDirectory = new URL(
  `../dist/schemas/v${EVENT_SCHEMA_VERSION.split('.')[0]}/`,
  import.meta.url,
);

await rm(schemaDirectory, { force: true, recursive: true });
await mkdir(schemaDirectory, { recursive: true });

const catalog = [];

for (const [eventType, schema] of Object.entries(domainEventSchemas)) {
  const fileName = `${eventType}.schema.json`;
  await writeFile(
    new URL(fileName, schemaDirectory),
    `${JSON.stringify(
      {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        ...schema,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  catalog.push({
    eventType,
    file: fileName,
    schemaVersion: EVENT_SCHEMA_VERSION,
  });
}

await writeFile(
  new URL('catalog.json', schemaDirectory),
  `${JSON.stringify(catalog, null, 2)}\n`,
  'utf8',
);
