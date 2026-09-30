import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

import {
  decodeLighthouseRuntime,
  lighthouseRuntimeDescriptor,
} from '../dist/runtime.js';

const descriptor = decodeLighthouseRuntime(lighthouseRuntimeDescriptor);
const bytes = Buffer.from(`${JSON.stringify(descriptor, null, 2)}\n`, 'utf8');
if (bytes.length > 1_000_000)
  throw new Error(
    'The campaign runtime descriptor exceeds the hosted byte limit.',
  );

const sha256 = createHash('sha256').update(bytes).digest('hex');
await writeFile(new URL('../dist/runtime.json', import.meta.url), bytes);
await writeFile(
  new URL('../dist/runtime.sha256', import.meta.url),
  `${sha256}  runtime.json\n`,
);
console.log(
  `Generated campaign runtime descriptor (${bytes.length} bytes, SHA-256 ${sha256}).`,
);
