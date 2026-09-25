import { cp, mkdir, rm } from 'node:fs/promises';

const outputDirectory = new URL('../dist/', import.meta.url);
const schemaDirectory = new URL('../schemas/', import.meta.url);

await mkdir(outputDirectory, { recursive: true });
await rm(new URL('./schemas/', outputDirectory), {
  force: true,
  recursive: true,
});
await cp(schemaDirectory, new URL('./schemas/', outputDirectory), {
  recursive: true,
});
