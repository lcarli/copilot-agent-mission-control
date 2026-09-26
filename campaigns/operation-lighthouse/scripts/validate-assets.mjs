import { resolve } from 'node:path';

import { validateAssetManifestFile } from '../dist/media.js';

const rootDirectory = resolve(import.meta.dirname, '..');
const manifestPath = resolve(rootDirectory, 'media', 'asset-manifest.json');
const result = await validateAssetManifestFile(manifestPath, rootDirectory);

if (!result.valid) {
  for (const issue of result.issues) {
    console.error(`${issue.code} ${issue.path}: ${issue.message}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Operation Lighthouse asset manifest is valid (${String(result.assetCount)} assets, ${String(result.approvedAssetCount)} approved).`,
  );
}
