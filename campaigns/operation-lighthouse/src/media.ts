import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

import { cloneFrozen } from './simulators/shared.js';

export const mediaLocales = ['en', 'fr', 'pt-BR'] as const;
export type MediaLocale = (typeof mediaLocales)[number];

export const assetReviewStatuses = [
  'planned',
  'prompt-ready',
  'in-review',
  'approved',
  'rejected',
] as const;
export type AssetReviewStatus = (typeof assetReviewStatuses)[number];

export interface AssetManifestIssue {
  readonly code:
    | 'document-invalid'
    | 'duplicate-asset-id'
    | 'field-invalid'
    | 'continuity-reference-invalid'
    | 'language-coverage-invalid'
    | 'prompt-incomplete'
    | 'provenance-invalid'
    | 'approved-file-required'
    | 'file-missing'
    | 'file-format-invalid'
    | 'file-size-invalid'
    | 'file-checksum-invalid';
  readonly path: string;
  readonly message: string;
}

export interface AssetManifestValidation {
  readonly valid: boolean;
  readonly issues: readonly AssetManifestIssue[];
  readonly assetCount: number;
  readonly approvedAssetCount: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const stringValue = (
  value: Record<string, unknown>,
  key: string,
): string | undefined => {
  const candidate = value[key];
  return typeof candidate === 'string' && candidate.trim().length > 0
    ? candidate
    : undefined;
};

const issue = (
  issues: AssetManifestIssue[],
  code: AssetManifestIssue['code'],
  path: string,
  message: string,
): void => {
  issues.push({ code, path, message });
};

const validatePrompt = (
  issues: AssetManifestIssue[],
  asset: Record<string, unknown>,
  path: string,
): void => {
  const generationPrompt = stringValue(asset, 'generationPrompt');
  if (generationPrompt === undefined || generationPrompt.length < 50) {
    issue(
      issues,
      'prompt-incomplete',
      `${path}/generationPrompt`,
      'Generation prompt must contain at least 50 characters.',
    );
  }
  const negativePrompt = stringValue(asset, 'negativePrompt');
  if (negativePrompt === undefined || negativePrompt.length < 10) {
    issue(
      issues,
      'prompt-incomplete',
      `${path}/negativePrompt`,
      'Negative prompt must contain at least 10 characters.',
    );
    return;
  }
  const normalized = negativePrompt.toLowerCase();
  for (const prohibited of ['text', 'logo', 'watermark']) {
    if (!normalized.includes(prohibited)) {
      issue(
        issues,
        'prompt-incomplete',
        `${path}/negativePrompt`,
        `Negative prompt must prohibit ${prohibited}.`,
      );
    }
  }
};

const validateVariants = (
  issues: AssetManifestIssue[],
  asset: Record<string, unknown>,
  path: string,
): void => {
  const variants = asset.requiredVariants;
  if (!Array.isArray(variants) || variants.length === 0) {
    issue(
      issues,
      'field-invalid',
      `${path}/requiredVariants`,
      'At least one required variant is needed.',
    );
    return;
  }
  const ids = new Set<string>();
  variants.forEach((variant, index) => {
    if (!isRecord(variant)) {
      issue(
        issues,
        'field-invalid',
        `${path}/requiredVariants/${String(index)}`,
        'Variant must be an object.',
      );
      return;
    }
    const id = stringValue(variant, 'id');
    const descriptionKey = stringValue(variant, 'descriptionKey');
    if (id === undefined || descriptionKey === undefined) {
      issue(
        issues,
        'field-invalid',
        `${path}/requiredVariants/${String(index)}`,
        'Variant requires id and descriptionKey.',
      );
      return;
    }
    if (ids.has(id)) {
      issue(
        issues,
        'field-invalid',
        `${path}/requiredVariants`,
        `Variant ${id} is duplicated.`,
      );
    }
    ids.add(id);
  });
};

const validateLanguages = (
  issues: AssetManifestIssue[],
  asset: Record<string, unknown>,
  path: string,
): void => {
  const languages = asset.languageRequirements;
  if (
    !Array.isArray(languages) ||
    languages.length === 0 ||
    languages.some(
      (locale) =>
        typeof locale !== 'string' ||
        !mediaLocales.some((supported) => supported === locale),
    )
  ) {
    issue(
      issues,
      'language-coverage-invalid',
      `${path}/languageRequirements`,
      'Language requirements must use supported campaign locales.',
    );
    return;
  }
  if (new Set(languages).size !== languages.length) {
    issue(
      issues,
      'language-coverage-invalid',
      `${path}/languageRequirements`,
      'Language requirements must not contain duplicates.',
    );
  }
  const scriptKeys = asset.scriptKeys;
  if (scriptKeys !== undefined && isRecord(scriptKeys)) {
    for (const locale of languages) {
      if (
        typeof locale === 'string' &&
        stringValue(scriptKeys, locale) === undefined
      ) {
        issue(
          issues,
          'language-coverage-invalid',
          `${path}/scriptKeys/${locale}`,
          `Script key is missing for ${locale}.`,
        );
      }
    }
  }
};

const validateProvenance = (
  issues: AssetManifestIssue[],
  asset: Record<string, unknown>,
  path: string,
): void => {
  const provenance = asset.provenance;
  if (!isRecord(provenance)) {
    issue(
      issues,
      'provenance-invalid',
      `${path}/provenance`,
      'Provenance is required.',
    );
    return;
  }
  for (const field of ['generator', 'model', 'reviewer']) {
    if (stringValue(provenance, field) === undefined) {
      issue(
        issues,
        'provenance-invalid',
        `${path}/provenance/${field}`,
        `Provenance ${field} is required.`,
      );
    }
  }
  const generatedAt = stringValue(provenance, 'generatedAt');
  if (generatedAt === undefined || Number.isNaN(Date.parse(generatedAt))) {
    issue(
      issues,
      'provenance-invalid',
      `${path}/provenance/generatedAt`,
      'Provenance generatedAt must be a valid timestamp.',
    );
  }
};

const validateFile = async (
  issues: AssetManifestIssue[],
  asset: Record<string, unknown>,
  path: string,
  rootDirectory: string,
): Promise<void> => {
  const reviewStatus = stringValue(asset, 'reviewStatus');
  const file = asset.file;
  if (reviewStatus === 'approved' && !isRecord(file)) {
    issue(
      issues,
      'approved-file-required',
      `${path}/file`,
      'Approved assets require a file reference.',
    );
    return;
  }
  if (!isRecord(file)) {
    return;
  }
  const relativePath = stringValue(file, 'path');
  const expectedChecksum = stringValue(file, 'sha256');
  const output = asset.output;
  if (
    relativePath === undefined ||
    expectedChecksum === undefined ||
    !isRecord(output)
  ) {
    issue(
      issues,
      'field-invalid',
      `${path}/file`,
      'File path, checksum, and output metadata are required.',
    );
    return;
  }
  const absolutePath = resolve(rootDirectory, relativePath);
  if (!absolutePath.startsWith(resolve(rootDirectory))) {
    issue(
      issues,
      'file-missing',
      `${path}/file/path`,
      'Asset file must remain inside the campaign directory.',
    );
    return;
  }
  try {
    const metadata = await stat(absolutePath);
    const maximumBytes = output.maximumBytes;
    if (
      typeof maximumBytes !== 'number' ||
      !Number.isInteger(maximumBytes) ||
      metadata.size > maximumBytes
    ) {
      issue(
        issues,
        'file-size-invalid',
        `${path}/file/path`,
        'Asset file exceeds its configured maximum size.',
      );
    }
    const format = stringValue(output, 'format');
    if (
      format === undefined ||
      extname(relativePath).toLowerCase() !== `.${format.toLowerCase()}`
    ) {
      issue(
        issues,
        'file-format-invalid',
        `${path}/file/path`,
        'Asset file extension must match the output format.',
      );
    }
    const checksum = createHash('sha256')
      .update(await readFile(absolutePath))
      .digest('hex');
    if (checksum !== expectedChecksum) {
      issue(
        issues,
        'file-checksum-invalid',
        `${path}/file/sha256`,
        'Asset file checksum does not match the manifest.',
      );
    }
  } catch {
    issue(
      issues,
      'file-missing',
      `${path}/file/path`,
      `Asset file ${relativePath} cannot be read.`,
    );
  }
};

export const validateAssetManifest = async (
  value: unknown,
  rootDirectory: string,
): Promise<AssetManifestValidation> => {
  const issues: AssetManifestIssue[] = [];
  if (!isRecord(value) || !Array.isArray(value.assets)) {
    return cloneFrozen({
      valid: false,
      issues: [
        {
          code: 'document-invalid',
          path: '/',
          message: 'Asset manifest must be an object with an assets array.',
        },
      ],
      assetCount: 0,
      approvedAssetCount: 0,
    });
  }
  if (
    value.schemaVersion !== '1.0' ||
    value.kind !== 'asset-manifest' ||
    stringValue(value, 'campaignId') === undefined ||
    stringValue(value, 'campaignVersion') === undefined
  ) {
    issue(
      issues,
      'document-invalid',
      '/',
      'Manifest identity fields are invalid.',
    );
  }

  const assets = value.assets;
  const assetIds = new Set<string>();
  const records = assets.filter(isRecord);
  assets.forEach((asset, index) => {
    const path = `/assets/${String(index)}`;
    if (!isRecord(asset)) {
      issue(issues, 'field-invalid', path, 'Asset must be an object.');
      return;
    }
    const assetId = stringValue(asset, 'assetId');
    if (assetId === undefined) {
      issue(
        issues,
        'field-invalid',
        `${path}/assetId`,
        'Asset ID is required.',
      );
    } else if (assetIds.has(assetId)) {
      issue(
        issues,
        'duplicate-asset-id',
        `${path}/assetId`,
        `Asset ID ${assetId} is duplicated.`,
      );
    } else {
      assetIds.add(assetId);
    }
    for (const field of [
      'scene',
      'narrativePurposeKey',
      'mediaType',
      'reviewStatus',
    ]) {
      if (stringValue(asset, field) === undefined) {
        issue(
          issues,
          'field-invalid',
          `${path}/${field}`,
          `${field} is required.`,
        );
      }
    }
    validateVariants(issues, asset, path);
    validateLanguages(issues, asset, path);
    validatePrompt(issues, asset, path);
    validateProvenance(issues, asset, path);
  });

  for (const [index, asset] of records.entries()) {
    const references = asset.continuityReferences;
    if (!Array.isArray(references)) {
      issue(
        issues,
        'field-invalid',
        `/assets/${String(index)}/continuityReferences`,
        'Continuity references must be an array.',
      );
    } else {
      for (const reference of references) {
        if (typeof reference !== 'string' || !assetIds.has(reference)) {
          issue(
            issues,
            'continuity-reference-invalid',
            `/assets/${String(index)}/continuityReferences`,
            `Unknown continuity reference ${String(reference)}.`,
          );
        }
      }
    }
    await validateFile(
      issues,
      asset,
      `/assets/${String(index)}`,
      rootDirectory,
    );
  }

  return cloneFrozen({
    valid: issues.length === 0,
    issues,
    assetCount: assets.length,
    approvedAssetCount: records.filter(
      (asset) => asset.reviewStatus === 'approved',
    ).length,
  });
};

export const validateAssetManifestFile = async (
  manifestPath: string,
  rootDirectory: string,
): Promise<AssetManifestValidation> => {
  try {
    const value: unknown = JSON.parse(await readFile(manifestPath, 'utf8'));
    return await validateAssetManifest(value, rootDirectory);
  } catch {
    return cloneFrozen({
      valid: false,
      issues: [
        {
          code: 'document-invalid',
          path: '/',
          message: `Asset manifest ${manifestPath} cannot be parsed.`,
        },
      ],
      assetCount: 0,
      approvedAssetCount: 0,
    });
  }
};
