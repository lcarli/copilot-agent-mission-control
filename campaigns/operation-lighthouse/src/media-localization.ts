import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  getMessagePlaceholders,
  type SupportedLocale,
} from '@mission-control/localization';

import { mediaLocales } from './media.js';
import { cloneFrozen } from './simulators/shared.js';

export interface MediaLocalizationIssue {
  readonly code:
    | 'document-invalid'
    | 'key-missing'
    | 'key-extra'
    | 'placeholder-mismatch'
    | 'reference-missing'
    | 'layout-expansion-exceeded'
    | 'variant-invalid'
    | 'caption-missing'
    | 'caption-invalid'
    | 'caption-checksum-invalid'
    | 'review-incomplete';
  readonly path: string;
  readonly message: string;
}

export interface MediaLocalizationValidation {
  readonly valid: boolean;
  readonly issues: readonly MediaLocalizationIssue[];
  readonly localeCount: number;
  readonly keyCount: number;
  readonly captionCount: number;
  readonly maximumExpansionRatio: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readJson = async (path: string): Promise<unknown> =>
  JSON.parse(await readFile(path, 'utf8')) as unknown;

const stringValue = (
  value: Record<string, unknown>,
  key: string,
): string | undefined => {
  const candidate = value[key];
  return typeof candidate === 'string' && candidate.length > 0
    ? candidate
    : undefined;
};

const addIssue = (
  issues: MediaLocalizationIssue[],
  code: MediaLocalizationIssue['code'],
  path: string,
  message: string,
): void => {
  issues.push({ code, path, message });
};

const loadCatalogs = async (
  mediaDirectory: string,
  issues: MediaLocalizationIssue[],
): Promise<ReadonlyMap<SupportedLocale, Readonly<Record<string, string>>>> => {
  const catalogs = new Map<SupportedLocale, Readonly<Record<string, string>>>();
  for (const locale of mediaLocales) {
    const path = resolve(mediaDirectory, 'localization', `${locale}.json`);
    try {
      const value = await readJson(path);
      if (!isRecord(value) || !isRecord(value.messages)) {
        addIssue(
          issues,
          'document-invalid',
          path,
          'Localization document must contain a messages object.',
        );
        continue;
      }
      const messages: Record<string, string> = {};
      for (const [key, message] of Object.entries(value.messages)) {
        if (typeof message !== 'string' || message.trim().length === 0) {
          addIssue(
            issues,
            'document-invalid',
            `${path}#${key}`,
            'Localized message must be a non-empty string.',
          );
        } else {
          messages[key] = message;
        }
      }
      catalogs.set(locale, messages);
    } catch {
      addIssue(
        issues,
        'document-invalid',
        path,
        'Localization document cannot be read.',
      );
    }
  }
  return catalogs;
};

const validateCatalogParity = (
  issues: MediaLocalizationIssue[],
  catalogs: ReadonlyMap<SupportedLocale, Readonly<Record<string, string>>>,
): number => {
  const canonical = catalogs.get('en');
  if (canonical === undefined) {
    return 0;
  }
  const canonicalKeys = Object.keys(canonical).sort();
  let maximumExpansionRatio = 1;
  for (const locale of mediaLocales) {
    const catalog = catalogs.get(locale);
    if (catalog === undefined) {
      continue;
    }
    const keys = Object.keys(catalog);
    for (const key of canonicalKeys) {
      const canonicalMessage = canonical[key];
      const localizedMessage = catalog[key];
      if (localizedMessage === undefined || canonicalMessage === undefined) {
        addIssue(
          issues,
          'key-missing',
          `${locale}:${key}`,
          `Localization key ${key} is missing for ${locale}.`,
        );
        continue;
      }
      const canonicalPlaceholders = getMessagePlaceholders(canonicalMessage);
      const localizedPlaceholders = getMessagePlaceholders(localizedMessage);
      if (canonicalPlaceholders.join('|') !== localizedPlaceholders.join('|')) {
        addIssue(
          issues,
          'placeholder-mismatch',
          `${locale}:${key}`,
          `Placeholders for ${key} do not match English.`,
        );
      }
      const ratio = localizedMessage.length / canonicalMessage.length;
      maximumExpansionRatio = Math.max(maximumExpansionRatio, ratio);
      if (
        locale !== 'en' &&
        canonicalMessage.length >= 20 &&
        localizedMessage.length > canonicalMessage.length * 2 + 30
      ) {
        addIssue(
          issues,
          'layout-expansion-exceeded',
          `${locale}:${key}`,
          `Localized content expands to ${ratio.toFixed(2)} times English.`,
        );
      }
    }
    for (const key of keys) {
      if (!(key in canonical)) {
        addIssue(
          issues,
          'key-extra',
          `${locale}:${key}`,
          `Localization key ${key} does not exist in English.`,
        );
      }
    }
  }
  return maximumExpansionRatio;
};

const collectReferencedKeys = (
  assets: readonly Record<string, unknown>[],
): ReadonlySet<string> => {
  const keys = new Set<string>();
  for (const asset of assets) {
    for (const field of ['narrativePurposeKey', 'pronunciationNotesKey']) {
      const value = stringValue(asset, field);
      if (value !== undefined) {
        keys.add(value);
      }
    }
    for (const field of ['requiredVariants', 'accessibilityRequirements']) {
      const values = asset[field];
      if (!Array.isArray(values)) {
        continue;
      }
      for (const value of values) {
        if (typeof value === 'string') {
          keys.add(value);
        } else if (isRecord(value)) {
          const descriptionKey = stringValue(value, 'descriptionKey');
          if (descriptionKey !== undefined) {
            keys.add(descriptionKey);
          }
        }
      }
    }
    for (const field of ['scriptKeys', 'licensing']) {
      const values = asset[field];
      if (!isRecord(values)) {
        continue;
      }
      for (const value of Object.values(values)) {
        if (typeof value === 'string') {
          keys.add(value);
        }
      }
    }
  }
  return keys;
};

const validateAssetLocalization = (
  issues: MediaLocalizationIssue[],
  assets: readonly Record<string, unknown>[],
  catalogs: ReadonlyMap<SupportedLocale, Readonly<Record<string, string>>>,
): void => {
  const referencedKeys = collectReferencedKeys(assets);
  for (const locale of mediaLocales) {
    const catalog = catalogs.get(locale);
    if (catalog === undefined) {
      continue;
    }
    for (const key of referencedKeys) {
      if (catalog[key] === undefined) {
        addIssue(
          issues,
          'reference-missing',
          `${locale}:${key}`,
          `Asset localization reference ${key} is missing.`,
        );
      }
    }
  }
  for (const [index, asset] of assets.entries()) {
    const variants = asset.requiredVariants;
    if (!Array.isArray(variants) || variants.length === 0) {
      addIssue(
        issues,
        'variant-invalid',
        `/assets/${String(index)}/requiredVariants`,
        'Asset requires at least one localized variant.',
      );
      continue;
    }
    const ids = variants.flatMap((variant) =>
      isRecord(variant) && typeof variant.id === 'string' ? [variant.id] : [],
    );
    if (new Set(ids).size !== variants.length) {
      addIssue(
        issues,
        'variant-invalid',
        `/assets/${String(index)}/requiredVariants`,
        'Asset variant identifiers must be unique.',
      );
    }
  }
};

const normalizedChecksum = (content: string): string =>
  createHash('sha256').update(content.replaceAll('\r\n', '\n')).digest('hex');

const validateCaptions = async (
  issues: MediaLocalizationIssue[],
  rootDirectory: string,
  assets: readonly Record<string, unknown>[],
  catalogs: ReadonlyMap<SupportedLocale, Readonly<Record<string, string>>>,
): Promise<number> => {
  const captionPath = resolve(rootDirectory, 'media', 'caption-manifest.json');
  let captionDocument: unknown;
  try {
    captionDocument = await readJson(captionPath);
  } catch {
    addIssue(
      issues,
      'document-invalid',
      captionPath,
      'Caption manifest cannot be read.',
    );
    return 0;
  }
  if (!isRecord(captionDocument) || !Array.isArray(captionDocument.captions)) {
    addIssue(
      issues,
      'document-invalid',
      captionPath,
      'Caption manifest must contain a captions array.',
    );
    return 0;
  }
  const captions = captionDocument.captions.filter(isRecord);
  const captionByAssetLocale = new Map<string, Record<string, unknown>>();
  for (const caption of captions) {
    const assetId = stringValue(caption, 'assetId');
    const locale = stringValue(caption, 'locale');
    if (assetId !== undefined && locale !== undefined) {
      captionByAssetLocale.set(`${assetId}:${locale}`, caption);
    }
  }

  for (const asset of assets) {
    const assetId = stringValue(asset, 'assetId');
    const scriptKeys = asset.scriptKeys;
    if (assetId === undefined || !isRecord(scriptKeys)) {
      continue;
    }
    for (const locale of mediaLocales) {
      const scriptKey = stringValue(scriptKeys, locale);
      const caption = captionByAssetLocale.get(`${assetId}:${locale}`);
      if (scriptKey === undefined || caption === undefined) {
        addIssue(
          issues,
          'caption-missing',
          `${assetId}:${locale}`,
          'Localized narration requires a caption file.',
        );
        continue;
      }
      const relativePath = stringValue(caption, 'path');
      const expectedChecksum = stringValue(caption, 'sha256');
      const expectedScript = catalogs.get(locale)?.[scriptKey];
      if (
        relativePath === undefined ||
        expectedChecksum === undefined ||
        expectedScript === undefined
      ) {
        addIssue(
          issues,
          'caption-invalid',
          `${assetId}:${locale}`,
          'Caption metadata or localized script is incomplete.',
        );
        continue;
      }
      try {
        const content = await readFile(
          resolve(rootDirectory, relativePath),
          'utf8',
        );
        if (
          !content.startsWith('WEBVTT') ||
          !content.replaceAll('\r\n', '\n').includes(expectedScript)
        ) {
          addIssue(
            issues,
            'caption-invalid',
            relativePath,
            'Caption must be WebVTT and contain the localized script.',
          );
        }
        if (normalizedChecksum(content) !== expectedChecksum) {
          addIssue(
            issues,
            'caption-checksum-invalid',
            relativePath,
            'Caption checksum does not match normalized UTF-8 content.',
          );
        }
      } catch {
        addIssue(
          issues,
          'caption-missing',
          relativePath,
          'Caption file cannot be read.',
        );
      }
    }
  }
  return captions.length;
};

const validateReviews = async (
  issues: MediaLocalizationIssue[],
  rootDirectory: string,
): Promise<void> => {
  const path = resolve(rootDirectory, 'media', 'content-reviews.json');
  try {
    const value = await readJson(path);
    if (!isRecord(value) || !Array.isArray(value.reviews)) {
      throw new Error('Invalid review document.');
    }
    const reviews = value.reviews as unknown[];
    for (const locale of mediaLocales) {
      const approved = reviews.some(
        (candidate) =>
          isRecord(candidate) &&
          candidate.locale === locale &&
          candidate.status === 'approved',
      );
      if (!approved) {
        addIssue(
          issues,
          'review-incomplete',
          `${path}:${locale}`,
          `Approved content review is missing for ${locale}.`,
        );
      }
    }
  } catch {
    addIssue(
      issues,
      'document-invalid',
      path,
      'Content review document cannot be read.',
    );
  }
};

export const validateMediaLocalization = async (
  rootDirectory: string,
): Promise<MediaLocalizationValidation> => {
  const issues: MediaLocalizationIssue[] = [];
  const mediaDirectory = resolve(rootDirectory, 'media');
  const catalogs = await loadCatalogs(mediaDirectory, issues);
  const maximumExpansionRatio = validateCatalogParity(issues, catalogs);

  let assets: readonly Record<string, unknown>[] = [];
  try {
    const manifest = await readJson(
      resolve(mediaDirectory, 'asset-manifest.json'),
    );
    if (!isRecord(manifest) || !Array.isArray(manifest.assets)) {
      throw new Error('Invalid asset manifest.');
    }
    assets = manifest.assets.filter(isRecord);
    validateAssetLocalization(issues, assets, catalogs);
  } catch {
    addIssue(
      issues,
      'document-invalid',
      resolve(mediaDirectory, 'asset-manifest.json'),
      'Asset manifest cannot be read.',
    );
  }

  const captionCount = await validateCaptions(
    issues,
    rootDirectory,
    assets,
    catalogs,
  );
  await validateReviews(issues, rootDirectory);

  return cloneFrozen({
    valid: issues.length === 0,
    issues,
    localeCount: catalogs.size,
    keyCount: Object.keys(catalogs.get('en') ?? {}).length,
    captionCount,
    maximumExpansionRatio,
  });
};
