import { createHash } from 'node:crypto';
import { readdir, readFile, realpath } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';

import { lt, satisfies, valid } from 'semver';

import {
  readCampaignDocument,
  relativeDocumentPath,
  resolvePackPath,
} from './document.js';
import {
  CampaignLoadError,
  type CampaignLoadErrorCode,
  type CampaignLoadIssue,
} from './errors.js';
import {
  validateCampaignDocument,
  validateJsonSchema,
} from './schema-registry.js';
import {
  supportedLocales,
  type AssetManifest,
  type CampaignCapabilities,
  type CampaignManifest,
  type CampaignPack,
  type LoadCampaignOptions,
  type LocalizationResource,
  type MissionDefinition,
  type SupportedLocale,
} from './types.js';

const campaignEntryNames = [
  'campaign.json',
  'campaign.yaml',
  'campaign.yml',
] as const;

const issue = (
  documentPath: string,
  pointer: string,
  code: CampaignLoadErrorCode,
  messageKey: string,
  args?: Readonly<Record<string, string | number | boolean>>,
): CampaignLoadIssue => ({
  documentPath,
  pointer,
  code,
  messageKey,
  ...(args ? { args } : {}),
});

const schemaIssues = (
  documentPath: string,
  schemaName: 'campaign' | 'mission' | 'asset-manifest' | 'localization',
  value: unknown,
): CampaignLoadIssue[] => {
  const result = validateCampaignDocument(schemaName, value);
  return result.errors.map((error) =>
    issue(
      documentPath,
      error.instancePath || '/',
      'document-schema-invalid',
      'campaign.validation.schemaInvalid',
      {
        keyword: error.keyword,
        path: error.instancePath || '/',
      },
    ),
  );
};

const duplicateValues = (values: readonly string[]): string[] => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  return [...duplicates];
};

const collectLocalizationKeys = (
  manifest: CampaignManifest,
  missions: Iterable<MissionDefinition>,
  assets: AssetManifest,
): Set<string> => {
  const keys = new Set([manifest.titleKey, manifest.synopsisKey]);
  for (const mission of missions) {
    Object.values(mission.contentKeys).forEach((key) => keys.add(key));
    [...mission.objectives.core, ...mission.objectives.advanced].forEach(
      (objective) => {
        if (objective.descriptionKey) {
          keys.add(objective.descriptionKey);
        }
      },
    );
    mission.hints.forEach((hint) => keys.add(hint.contentKey));
    mission.instructorModifiers.forEach((modifier) => {
      keys.add(modifier.titleKey);
      keys.add(modifier.descriptionKey);
    });
  }
  for (const asset of assets.assets) {
    keys.add(asset.narrativePurposeKey);
    asset.requiredVariants.forEach((variant) =>
      keys.add(variant.descriptionKey),
    );
    asset.accessibilityRequirements.forEach((key) => keys.add(key));
    Object.values(asset.scriptKeys ?? {}).forEach((key) => {
      if (key) {
        keys.add(key);
      }
    });
    if (asset.pronunciationNotesKey) {
      keys.add(asset.pronunciationNotesKey);
    }
    keys.add(asset.licensing.usageRightsKey);
    keys.add(asset.licensing.restrictionsKey);
  }
  return keys;
};

const extractPlaceholders = (message: string): string[] =>
  [...message.matchAll(/\{\s*([A-Za-z][A-Za-z0-9_]*)\s*(?:[,}])/gu)].flatMap(
    (match) => (match[1] ? [match[1]] : []),
  );

const validateCapability = (
  issues: CampaignLoadIssue[],
  documentPath: string,
  values: readonly string[],
  available: ReadonlySet<string> | undefined,
  capability: string,
): void => {
  if (!available) {
    return;
  }
  for (const value of values) {
    if (!available.has(value)) {
      issues.push(
        issue(
          documentPath,
          '/',
          'capability-unavailable',
          'campaign.validation.capabilityUnavailable',
          { capability, value },
        ),
      );
    }
  }
};

const validateCapabilities = (
  issues: CampaignLoadIssue[],
  documentPath: string,
  mission: MissionDefinition,
  capabilities: CampaignCapabilities | undefined,
): void => {
  if (!capabilities) {
    return;
  }
  validateCapability(
    issues,
    documentPath,
    mission.requiredEventTypes,
    capabilities.eventTypes,
    'event-type',
  );
  validateCapability(
    issues,
    documentPath,
    mission.availableTools.map((tool) => tool.id),
    capabilities.tools,
    'tool',
  );
  validateCapability(
    issues,
    documentPath,
    [mission.validator.id],
    capabilities.validators,
    'validator',
  );
  validateCapability(
    issues,
    documentPath,
    mission.dashboardEffects.map((effect) => String(effect.effectType)),
    capabilities.dashboardEffects,
    'dashboard-effect',
  );
  validateCapability(
    issues,
    documentPath,
    mission.instructorModifiers.map((modifier) => modifier.id),
    capabilities.instructorModifiers,
    'instructor-modifier',
  );
};

const validateUniqueIds = (
  issues: CampaignLoadIssue[],
  documentPath: string,
  pointer: string,
  ids: readonly string[],
): void => {
  for (const duplicate of duplicateValues(ids)) {
    issues.push(
      issue(
        documentPath,
        pointer,
        'duplicate-identifier',
        'campaign.validation.duplicateIdentifier',
        { id: duplicate },
      ),
    );
  }
};

const validateMissionGraph = (
  issues: CampaignLoadIssue[],
  missions: ReadonlyMap<string, MissionDefinition>,
  missionPaths: ReadonlyMap<string, string>,
): void => {
  for (const [missionId, mission] of missions) {
    const documentPath = missionPaths.get(missionId) ?? '.';
    for (const prerequisite of mission.prerequisiteMissions) {
      if (prerequisite === missionId || !missions.has(prerequisite)) {
        issues.push(
          issue(
            documentPath,
            '/prerequisiteMissions',
            'mission-prerequisite-invalid',
            'campaign.validation.prerequisiteInvalid',
            { missionId, prerequisite },
          ),
        );
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (missionId: string): void => {
    const documentPath = missionPaths.get(missionId) ?? '.';
    if (visiting.has(missionId)) {
      issues.push(
        issue(
          documentPath,
          '/prerequisiteMissions',
          'mission-prerequisite-cycle',
          'campaign.validation.prerequisiteCycle',
          { missionId },
        ),
      );
      return;
    }
    if (visited.has(missionId)) {
      return;
    }
    const mission = missions.get(missionId);
    if (!mission) {
      return;
    }
    visiting.add(missionId);
    for (const prerequisite of mission.prerequisiteMissions) {
      if (missions.has(prerequisite)) {
        visit(prerequisite);
      }
    }
    visiting.delete(missionId);
    visited.add(missionId);
  };
  missions.forEach((_mission, missionId) => {
    visit(missionId);
  });
};

export const loadCampaignPack = async (
  campaignDirectory: string,
  options: LoadCampaignOptions,
): Promise<CampaignPack> => {
  const rootDirectory = await realpath(resolve(campaignDirectory));
  const entries = await readdir(rootDirectory);
  const campaignEntries = campaignEntryNames.filter((name) =>
    entries.includes(name),
  );
  if (campaignEntries.length !== 1) {
    throw new CampaignLoadError([
      issue(
        '.',
        '',
        campaignEntries.length === 0
          ? 'campaign-entry-missing'
          : 'campaign-entry-ambiguous',
        campaignEntries.length === 0
          ? 'campaign.validation.entryMissing'
          : 'campaign.validation.entryAmbiguous',
      ),
    ]);
  }

  const issues: CampaignLoadIssue[] = [];
  const campaignEntry = campaignEntries[0];
  if (!campaignEntry) {
    throw new CampaignLoadError([
      issue(
        '.',
        '',
        'campaign-entry-missing',
        'campaign.validation.entryMissing',
      ),
    ]);
  }
  const manifestPath = resolve(rootDirectory, campaignEntry);
  const manifestDocument = await readCampaignDocument(
    rootDirectory,
    manifestPath,
  );
  if ('issue' in manifestDocument) {
    throw new CampaignLoadError([manifestDocument.issue]);
  }
  const manifestDocumentPath = relativeDocumentPath(
    rootDirectory,
    manifestPath,
  );
  issues.push(
    ...schemaIssues(manifestDocumentPath, 'campaign', manifestDocument.value),
  );
  if (issues.length > 0) {
    throw new CampaignLoadError(issues);
  }
  const manifest = manifestDocument.value as CampaignManifest;

  if (
    manifest.capacity.recommendedParticipants >
    manifest.capacity.maximumParticipants
  ) {
    issues.push(
      issue(
        manifestDocumentPath,
        '/capacity',
        'capacity-invalid',
        'campaign.validation.capacityInvalid',
      ),
    );
  }
  if (
    !valid(options.platformVersion) ||
    lt(options.platformVersion, manifest.minimumPlatformVersion) ||
    (manifest.compatiblePlatformVersions &&
      !satisfies(options.platformVersion, manifest.compatiblePlatformVersions))
  ) {
    issues.push(
      issue(
        manifestDocumentPath,
        '/compatiblePlatformVersions',
        'platform-version-incompatible',
        'campaign.validation.platformVersionIncompatible',
        { platformVersion: options.platformVersion },
      ),
    );
  }

  const declaredMissions = new Set(manifest.missions);
  const missionFileIds = new Set(Object.keys(manifest.missionFiles));
  if (
    declaredMissions.size !== missionFileIds.size ||
    [...declaredMissions].some((id) => !missionFileIds.has(id))
  ) {
    issues.push(
      issue(
        manifestDocumentPath,
        '/missionFiles',
        'mission-reference-invalid',
        'campaign.validation.missionReferencesInvalid',
      ),
    );
  }

  const missions = new Map<string, MissionDefinition>();
  const missionPaths = new Map<string, string>();
  const submissionSchemas = new Map<string, unknown>();

  for (const missionId of manifest.missions) {
    const requestedPath = manifest.missionFiles[missionId];
    if (!requestedPath) {
      continue;
    }
    const resolved = await resolvePackPath(rootDirectory, requestedPath);
    if ('issue' in resolved) {
      issues.push(resolved.issue);
      continue;
    }
    const missionDocument = await readCampaignDocument(
      rootDirectory,
      resolved.absolutePath,
    );
    if ('issue' in missionDocument) {
      issues.push(missionDocument.issue);
      continue;
    }
    const missionPath = relativeDocumentPath(
      rootDirectory,
      resolved.absolutePath,
    );
    const missionSchemaIssues = schemaIssues(
      missionPath,
      'mission',
      missionDocument.value,
    );
    issues.push(...missionSchemaIssues);
    if (missionSchemaIssues.length > 0) {
      continue;
    }
    const mission = missionDocument.value as MissionDefinition;
    missionPaths.set(missionId, missionPath);
    missions.set(missionId, mission);
    if (
      mission.id !== missionId ||
      basename(requestedPath, extname(requestedPath)) !== missionId
    ) {
      issues.push(
        issue(
          missionPath,
          '/id',
          'mission-reference-invalid',
          'campaign.validation.missionIdentityInvalid',
          { expected: missionId, actual: mission.id },
        ),
      );
    }
    if (mission.campaignId !== manifest.id) {
      issues.push(
        issue(
          missionPath,
          '/campaignId',
          'campaign-identity-mismatch',
          'campaign.validation.campaignIdentityMismatch',
        ),
      );
    }
    if (mission.campaignVersion !== manifest.version) {
      issues.push(
        issue(
          missionPath,
          '/campaignVersion',
          'campaign-version-mismatch',
          'campaign.validation.campaignVersionMismatch',
        ),
      );
    }
    validateUniqueIds(
      issues,
      missionPath,
      '/objectives',
      [...mission.objectives.core, ...mission.objectives.advanced].map(
        (objective) => objective.id,
      ),
    );
    validateUniqueIds(
      issues,
      missionPath,
      '/availableTools',
      mission.availableTools.map((tool) => tool.id),
    );
    validateUniqueIds(
      issues,
      missionPath,
      '/dashboardEffects',
      mission.dashboardEffects.map((effect) => effect.id),
    );
    validateUniqueIds(
      issues,
      missionPath,
      '/instructorModifiers',
      mission.instructorModifiers.map((modifier) => modifier.id),
    );
    if (
      Object.values(mission.scoring.dimensionWeights).reduce(
        (total, weight) => total + weight,
        0,
      ) !== 10000
    ) {
      issues.push(
        issue(
          missionPath,
          '/scoring/dimensionWeights',
          'scoring-weights-invalid',
          'campaign.validation.scoringWeightsInvalid',
        ),
      );
    }
    validateCapabilities(issues, missionPath, mission, options.capabilities);

    const schemaRequestedPath = mission.submissionSchema;
    const schemaResolved = await resolvePackPath(
      rootDirectory,
      schemaRequestedPath,
    );
    if ('issue' in schemaResolved) {
      issues.push(schemaResolved.issue);
    } else {
      const schemaDocument = await readCampaignDocument(
        rootDirectory,
        schemaResolved.absolutePath,
      );
      if ('issue' in schemaDocument) {
        issues.push(schemaDocument.issue);
      } else {
        const schemaErrors = validateJsonSchema(schemaDocument.value);
        if (schemaErrors.length > 0) {
          issues.push(
            issue(
              relativeDocumentPath(rootDirectory, schemaResolved.absolutePath),
              '/',
              'submission-schema-invalid',
              'campaign.validation.submissionSchemaInvalid',
            ),
          );
        } else {
          submissionSchemas.set(missionId, schemaDocument.value);
        }
      }
    }

    for (const modifier of mission.instructorModifiers) {
      const modifierSchemaPath = await resolvePackPath(
        rootDirectory,
        modifier.parametersSchema,
      );
      if ('issue' in modifierSchemaPath) {
        issues.push(modifierSchemaPath.issue);
        continue;
      }
      const modifierSchemaDocument = await readCampaignDocument(
        rootDirectory,
        modifierSchemaPath.absolutePath,
      );
      if ('issue' in modifierSchemaDocument) {
        issues.push(modifierSchemaDocument.issue);
      } else if (validateJsonSchema(modifierSchemaDocument.value).length > 0) {
        issues.push(
          issue(
            relativeDocumentPath(
              rootDirectory,
              modifierSchemaPath.absolutePath,
            ),
            '/',
            'submission-schema-invalid',
            'campaign.validation.modifierSchemaInvalid',
          ),
        );
      }
    }
  }

  validateMissionGraph(issues, missions, missionPaths);

  const assetPath = await resolvePackPath(
    rootDirectory,
    manifest.assetManifest,
  );
  let assetManifest: AssetManifest | undefined;
  if ('issue' in assetPath) {
    issues.push(assetPath.issue);
  } else {
    const assetDocument = await readCampaignDocument(
      rootDirectory,
      assetPath.absolutePath,
    );
    if ('issue' in assetDocument) {
      issues.push(assetDocument.issue);
    } else {
      const assetDocumentPath = relativeDocumentPath(
        rootDirectory,
        assetPath.absolutePath,
      );
      const assetSchemaIssues = schemaIssues(
        assetDocumentPath,
        'asset-manifest',
        assetDocument.value,
      );
      issues.push(...assetSchemaIssues);
      if (assetSchemaIssues.length === 0) {
        assetManifest = assetDocument.value as AssetManifest;
        if (assetManifest.campaignId !== manifest.id) {
          issues.push(
            issue(
              assetDocumentPath,
              '/campaignId',
              'campaign-identity-mismatch',
              'campaign.validation.campaignIdentityMismatch',
            ),
          );
        }
        if (assetManifest.campaignVersion !== manifest.version) {
          issues.push(
            issue(
              assetDocumentPath,
              '/campaignVersion',
              'campaign-version-mismatch',
              'campaign.validation.campaignVersionMismatch',
            ),
          );
        }
        validateUniqueIds(
          issues,
          assetDocumentPath,
          '/assets',
          assetManifest.assets.map((asset) => asset.assetId),
        );
        for (const asset of assetManifest.assets) {
          if (asset.reviewStatus === 'approved' && asset.file) {
            const filePath = await resolvePackPath(
              rootDirectory,
              asset.file.path,
            );
            if ('issue' in filePath) {
              issues.push(filePath.issue);
              continue;
            }
            try {
              const digest = createHash('sha256')
                .update(await readFile(filePath.absolutePath))
                .digest('hex');
              if (digest !== asset.file.sha256) {
                issues.push(
                  issue(
                    assetDocumentPath,
                    '/assets',
                    'asset-checksum-invalid',
                    'campaign.validation.assetChecksumInvalid',
                    { assetId: asset.assetId },
                  ),
                );
              }
            } catch {
              issues.push(
                issue(
                  asset.file.path,
                  '',
                  'document-missing',
                  'campaign.validation.documentUnreadable',
                ),
              );
            }
          }
        }
      }
    }
  }

  const localizations = new Map<SupportedLocale, LocalizationResource>();
  for (const locale of supportedLocales) {
    const localizationPath = await resolvePackPath(
      rootDirectory,
      manifest.localizationFiles[locale],
    );
    if ('issue' in localizationPath) {
      issues.push(localizationPath.issue);
      continue;
    }
    const localizationDocument = await readCampaignDocument(
      rootDirectory,
      localizationPath.absolutePath,
    );
    if ('issue' in localizationDocument) {
      issues.push(localizationDocument.issue);
      continue;
    }
    const documentPath = relativeDocumentPath(
      rootDirectory,
      localizationPath.absolutePath,
    );
    const localizationSchemaIssues = schemaIssues(
      documentPath,
      'localization',
      localizationDocument.value,
    );
    issues.push(...localizationSchemaIssues);
    if (localizationSchemaIssues.length > 0) {
      continue;
    }
    const localization = localizationDocument.value as LocalizationResource;
    localizations.set(locale, localization);
    if (localization.locale !== locale) {
      issues.push(
        issue(
          documentPath,
          '/locale',
          'localization-parity-invalid',
          'campaign.validation.localizationLocaleInvalid',
          { expected: locale, actual: localization.locale },
        ),
      );
    }
    if (localization.campaignId !== manifest.id) {
      issues.push(
        issue(
          documentPath,
          '/campaignId',
          'campaign-identity-mismatch',
          'campaign.validation.campaignIdentityMismatch',
        ),
      );
    }
    if (localization.campaignVersion !== manifest.version) {
      issues.push(
        issue(
          documentPath,
          '/campaignVersion',
          'campaign-version-mismatch',
          'campaign.validation.campaignVersionMismatch',
        ),
      );
    }
  }

  const englishLocalization = localizations.get('en');
  const englishKeys = new Set(
    englishLocalization ? Object.keys(englishLocalization.messages) : [],
  );
  for (const [locale, localization] of localizations) {
    const localeKeys = new Set(Object.keys(localization.messages));
    if (
      englishKeys.size !== localeKeys.size ||
      [...englishKeys].some((key) => !localeKeys.has(key))
    ) {
      issues.push(
        issue(
          manifest.localizationFiles[locale],
          '/messages',
          'localization-parity-invalid',
          'campaign.validation.localizationParityInvalid',
          { locale },
        ),
      );
    }
    for (const key of englishKeys) {
      const englishMessage = englishLocalization?.messages[key];
      const translatedMessage = localization.messages[key];
      if (!englishMessage || !translatedMessage) {
        continue;
      }
      const englishPlaceholders = [
        ...new Set(extractPlaceholders(englishMessage)),
      ].sort();
      const translatedPlaceholders = [
        ...new Set(extractPlaceholders(translatedMessage)),
      ].sort();
      if (englishPlaceholders.join('|') !== translatedPlaceholders.join('|')) {
        issues.push(
          issue(
            manifest.localizationFiles[locale],
            `/messages/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`,
            'localization-placeholder-invalid',
            'campaign.validation.localizationPlaceholdersInvalid',
            { key, locale },
          ),
        );
      }
    }
  }

  if (assetManifest) {
    const referencedKeys = collectLocalizationKeys(
      manifest,
      missions.values(),
      assetManifest,
    );
    for (const key of referencedKeys) {
      if (!englishKeys.has(key)) {
        issues.push(
          issue(
            manifest.localizationFiles.en,
            '/messages',
            'localization-reference-missing',
            'campaign.validation.localizationReferenceMissing',
            { key },
          ),
        );
      }
    }
  }

  if (issues.length > 0 || !assetManifest) {
    throw new CampaignLoadError(issues);
  }

  return {
    rootDirectory,
    manifestPath,
    manifest,
    missions,
    assetManifest,
    localizations,
    submissionSchemas,
  };
};
