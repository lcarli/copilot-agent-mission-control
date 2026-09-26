import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { validateAssetManifest } from '../src/index.js';

const manifest = (asset: Record<string, unknown>) => ({
  schemaVersion: '1.0',
  kind: 'asset-manifest',
  campaignId: 'operation-lighthouse',
  campaignVersion: '1.0.0',
  assets: [asset],
});

const validAsset = {
  assetId: 'OL-TEST-IMAGE-001',
  scene: 'test',
  narrativePurposeKey: 'assets.test.purpose',
  mediaType: 'image',
  requiredVariants: [
    { id: 'presentation', descriptionKey: 'assets.variants.presentation' },
  ],
  languageRequirements: ['en', 'fr', 'pt-BR'],
  continuityReferences: [],
  generationPrompt:
    'Create a fictional coastal operations image with clear composition, accessible contrast, and no embedded labels.',
  negativePrompt: 'Generated text, real logos, and watermarks.',
  accessibilityRequirements: ['assets.test.accessibility'],
  output: {
    format: 'svg',
    maximumBytes: 10_000,
    width: 1920,
    height: 1080,
    aspectRatio: '16:9',
  },
  licensing: {
    usageRightsKey: 'assets.licensing.usageRights',
    restrictionsKey: 'assets.licensing.restrictions',
  },
  provenance: {
    generator: 'pending',
    model: 'pending',
    generatedAt: '2026-09-25T20:00:00Z',
    reviewer: 'unassigned',
  },
  reviewStatus: 'prompt-ready',
};

describe('asset manifest tooling', () => {
  it('accepts complete prompt-ready metadata', async () => {
    const result = await validateAssetManifest(manifest(validAsset), '.');

    expect(result).toEqual({
      valid: true,
      issues: [],
      assetCount: 1,
      approvedAssetCount: 0,
    });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('detects duplicate IDs, missing prompt safeguards, and bad references', async () => {
    const result = await validateAssetManifest(
      {
        ...manifest(validAsset),
        assets: [
          validAsset,
          {
            ...validAsset,
            negativePrompt: 'Avoid artifacts.',
            continuityReferences: ['OL-MISSING-001'],
          },
        ],
      },
      '.',
    );

    expect(result.valid).toBe(false);
    expect(result.issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        'duplicate-asset-id',
        'prompt-incomplete',
        'continuity-reference-invalid',
      ]),
    );
  });

  it('verifies approved file format, size, and checksum', async () => {
    const rootDirectory = await mkdtemp(join(tmpdir(), 'lighthouse-media-'));
    await writeFile(join(rootDirectory, 'asset.svg'), '<svg></svg>', 'utf8');
    const result = await validateAssetManifest(
      manifest({
        ...validAsset,
        reviewStatus: 'approved',
        file: {
          path: 'asset.svg',
          sha256:
            'e9c3e76c12e21d2f0b05d0ff0c37cb718ad4d5d26115a4e63c3a69c85b7c5f3c',
        },
      }),
      rootDirectory,
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([
      expect.objectContaining({ code: 'file-checksum-invalid' }),
    ]);
  });
});
