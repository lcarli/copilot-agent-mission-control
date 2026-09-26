import { resolve } from 'node:path';

import { validateMediaLocalization } from '../dist/media-localization.js';

const rootDirectory = resolve(import.meta.dirname, '..');
const result = await validateMediaLocalization(rootDirectory);

if (!result.valid) {
  for (const issue of result.issues) {
    console.error(`${issue.code} ${issue.path}: ${issue.message}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Operation Lighthouse media localization is valid (${String(result.localeCount)} locales, ${String(result.keyCount)} keys, ${String(result.captionCount)} captions, max expansion ${result.maximumExpansionRatio.toFixed(2)}x).`,
  );
}
