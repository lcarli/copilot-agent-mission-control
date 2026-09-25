import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { stringify } from 'yaml';
import { describe, expect, it } from 'vitest';

import {
  CampaignLoadError,
  loadCampaignPack,
  type CampaignCapabilities,
} from '../src/index.js';

const localizationKeys = [
  'campaign.title',
  'campaign.synopsis',
  'missions.signal.title',
  'missions.signal.brief',
  'missions.core.heading',
  'missions.advanced.heading',
  'missions.signal.completion',
  'missions.signal.objectives.classify',
  'missions.signal.objectives.duplicates',
  'missions.signal.hints.level1',
  'missions.signal.hints.level2',
  'missions.signal.hints.level3',
  'modifiers.incidentSurge.title',
  'modifiers.incidentSurge.description',
  'assets.opening.purpose',
  'assets.variants.presentation',
  'assets.opening.script',
  'assets.opening.pronunciation',
  'assets.opening.accessibility',
  'assets.licensing.usageRights',
  'assets.licensing.restrictions',
] as const;

const capabilities: CampaignCapabilities = {
  eventTypes: new Set(['mission.submitted']),
  tools: new Set(['incident-intake']),
  validators: new Set(['signal-in-the-storm-validator']),
  dashboardEffects: new Set(['map-marker']),
  instructorModifiers: new Set(['incident-surge']),
};

interface PackOverrides {
  readonly campaign?: Record<string, unknown>;
  readonly mission?: Record<string, unknown>;
  readonly assetManifest?: Record<string, unknown>;
  readonly localizations?: Partial<
    Record<'en' | 'fr' | 'pt-BR', Record<string, unknown>>
  >;
}

const createPack = async (overrides: PackOverrides = {}): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'mission-control-campaign-'));
  await Promise.all([
    mkdir(join(root, 'missions'), { recursive: true }),
    mkdir(join(root, 'schemas', 'submissions'), { recursive: true }),
    mkdir(join(root, 'schemas', 'modifiers'), { recursive: true }),
    mkdir(join(root, 'assets'), { recursive: true }),
    mkdir(join(root, 'locales'), { recursive: true }),
  ]);

  const campaign = {
    schemaVersion: '1.0',
    kind: 'campaign',
    id: 'operation-lighthouse',
    version: '1.0.0',
    titleKey: 'campaign.title',
    synopsisKey: 'campaign.synopsis',
    defaultLocale: 'en',
    supportedLocales: ['en', 'fr', 'pt-BR'],
    minimumPlatformVersion: '0.1.0',
    compatiblePlatformVersions: '>=0.1.0 <2.0.0',
    capacity: {
      recommendedParticipants: 50,
      maximumParticipants: 50,
    },
    missions: ['signal-in-the-storm'],
    missionFiles: {
      'signal-in-the-storm': 'missions/signal-in-the-storm.yaml',
    },
    assetManifest: 'assets/manifest.json',
    localizationFiles: {
      en: 'locales/en.json',
      fr: 'locales/fr.json',
      'pt-BR': 'locales/pt-BR.json',
    },
    ...overrides.campaign,
  };

  const mission = {
    schemaVersion: '1.0',
    kind: 'mission',
    campaignId: 'operation-lighthouse',
    campaignVersion: '1.0.0',
    id: 'signal-in-the-storm',
    version: '1.0.0',
    prerequisiteMissions: [],
    recommendedDurationMinutes: 50,
    contentKeys: {
      title: 'missions.signal.title',
      brief: 'missions.signal.brief',
      coreObjectivesHeading: 'missions.core.heading',
      advancedObjectivesHeading: 'missions.advanced.heading',
      completion: 'missions.signal.completion',
    },
    objectives: {
      core: [
        {
          id: 'classify-incident',
          descriptionKey: 'missions.signal.objectives.classify',
        },
      ],
      advanced: [
        {
          id: 'detect-duplicates',
          descriptionKey: 'missions.signal.objectives.duplicates',
        },
      ],
    },
    requiredEventTypes: ['mission.submitted'],
    availableTools: [
      {
        id: 'incident-intake',
        operations: ['get-report'],
        required: false,
      },
    ],
    submissionSchema: 'schemas/submissions/signal-in-the-storm.schema.json',
    validator: {
      id: 'signal-in-the-storm-validator',
      version: '1.0.0',
      timeoutMs: 10000,
    },
    hints: [
      { level: 1, contentKey: 'missions.signal.hints.level1' },
      { level: 2, contentKey: 'missions.signal.hints.level2' },
      { level: 3, contentKey: 'missions.signal.hints.level3' },
    ],
    scoring: {
      maximumPoints: 1000,
      dimensionWeights: {
        requiredOutcome: 4000,
        evidenceAndGrounding: 2000,
        reliability: 1500,
        explainability: 1500,
        efficiency: 1000,
      },
      hintBonusAdjustments: {
        level1: 0,
        level2: -25,
        level3: -50,
      },
    },
    dashboardEffects: [
      {
        id: 'add-incident-marker',
        triggerEventType: 'mission.completed',
        effectType: 'map-marker',
      },
    ],
    instructorModifiers: [
      {
        id: 'incident-surge',
        titleKey: 'modifiers.incidentSurge.title',
        descriptionKey: 'modifiers.incidentSurge.description',
        parametersSchema: 'schemas/modifiers/incident-surge.schema.json',
      },
    ],
    failureBehavior: {
      allowRetry: true,
      maximumAttempts: null,
      pauseOnSimulatorFailure: true,
      blockedOutcomeAllowed: true,
    },
    ...overrides.mission,
  };

  const assetManifest = {
    schemaVersion: '1.0',
    kind: 'asset-manifest',
    campaignId: 'operation-lighthouse',
    campaignVersion: '1.0.0',
    assets: [
      {
        assetId: 'OL-OPENING-VIDEO-001',
        scene: 'opening',
        narrativePurposeKey: 'assets.opening.purpose',
        mediaType: 'video',
        requiredVariants: [
          {
            id: 'presentation',
            descriptionKey: 'assets.variants.presentation',
          },
        ],
        languageRequirements: ['en', 'fr', 'pt-BR'],
        targetDurationSeconds: 60,
        continuityReferences: [],
        generationPrompt:
          'A cinematic but realistic view of fictional Port Azure as a severe coastal storm approaches, without visible text or real-world logos.',
        negativePrompt:
          'Generated text, real logos, watermarks, and unsafe emergency behavior.',
        scriptKeys: {
          en: 'assets.opening.script',
          fr: 'assets.opening.script',
          'pt-BR': 'assets.opening.script',
        },
        pronunciationNotesKey: 'assets.opening.pronunciation',
        captionFileRequirements: [
          { locale: 'en', format: 'vtt' },
          { locale: 'fr', format: 'vtt' },
          { locale: 'pt-BR', format: 'vtt' },
        ],
        accessibilityRequirements: ['assets.opening.accessibility'],
        output: {
          format: 'mp4',
          maximumBytes: 104857600,
          width: 1920,
          height: 1080,
          aspectRatio: '16:9',
          frameRate: 24,
          audioChannels: 2,
        },
        licensing: {
          usageRightsKey: 'assets.licensing.usageRights',
          restrictionsKey: 'assets.licensing.restrictions',
        },
        provenance: {
          generator: 'pending',
          model: 'pending',
          generatedAt: '2026-09-25T14:00:00Z',
          reviewer: 'unassigned',
        },
        reviewStatus: 'prompt-ready',
      },
    ],
    ...overrides.assetManifest,
  };

  const createLocalization = (
    locale: 'en' | 'fr' | 'pt-BR',
  ): Record<string, unknown> => ({
    schemaVersion: '1.0',
    kind: 'localization',
    campaignId: 'operation-lighthouse',
    campaignVersion: '1.0.0',
    locale,
    messages: Object.fromEntries(
      localizationKeys.map((key) => [key, `${locale}: ${key}`]),
    ),
    ...overrides.localizations?.[locale],
  });

  await Promise.all([
    writeFile(join(root, 'campaign.yaml'), stringify(campaign), 'utf8'),
    writeFile(
      join(root, 'missions', 'signal-in-the-storm.yaml'),
      stringify(mission),
      'utf8',
    ),
    writeFile(
      join(root, 'assets', 'manifest.json'),
      JSON.stringify(assetManifest),
      'utf8',
    ),
    ...(['en', 'fr', 'pt-BR'] as const).map((locale) =>
      writeFile(
        join(root, 'locales', `${locale}.json`),
        JSON.stringify(createLocalization(locale)),
        'utf8',
      ),
    ),
    writeFile(
      join(root, 'schemas', 'submissions', 'signal-in-the-storm.schema.json'),
      JSON.stringify({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        additionalProperties: false,
        required: ['category'],
        properties: { category: { type: 'string' } },
      }),
      'utf8',
    ),
    writeFile(
      join(root, 'schemas', 'modifiers', 'incident-surge.schema.json'),
      JSON.stringify({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        additionalProperties: false,
      }),
      'utf8',
    ),
  ]);

  return root;
};

const load = (root: string) =>
  loadCampaignPack(root, {
    platformVersion: '0.1.0',
    capabilities,
  });

const expectLoadErrorCodes = async (
  promise: Promise<unknown>,
  expectedCodes: readonly string[],
): Promise<CampaignLoadError> => {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(CampaignLoadError);
    const campaignError = error as CampaignLoadError;
    const actualCodes = campaignError.issues.map((issue) => issue.code);
    expect(actualCodes).toEqual(expect.arrayContaining([...expectedCodes]));
    return campaignError;
  }
  throw new Error('Expected campaign loading to fail.');
};

describe('loadCampaignPack', () => {
  it('loads and resolves a valid JSON/YAML campaign pack', async () => {
    const root = await createPack();
    const pack = await load(root);

    expect(pack.manifest.id).toBe('operation-lighthouse');
    expect(pack.missions.get('signal-in-the-storm')?.version).toBe('1.0.0');
    expect(pack.localizations.size).toBe(3);
    expect(pack.submissionSchemas.has('signal-in-the-storm')).toBe(true);
  });

  it('rejects paths that escape the campaign root', async () => {
    const root = await createPack({
      campaign: {
        assetManifest: '../outside.json',
      },
    });

    await expectLoadErrorCodes(load(root), ['document-schema-invalid']);
  });

  it('rejects incompatible platform versions', async () => {
    const root = await createPack({
      campaign: {
        minimumPlatformVersion: '2.0.0',
        compatiblePlatformVersions: '>=2.0.0 <3.0.0',
      },
    });

    await expectLoadErrorCodes(load(root), ['platform-version-incompatible']);
  });

  it('rejects invalid scoring and prerequisite graphs', async () => {
    const root = await createPack({
      mission: {
        prerequisiteMissions: ['signal-in-the-storm'],
        scoring: {
          maximumPoints: 1000,
          dimensionWeights: {
            requiredOutcome: 1,
            evidenceAndGrounding: 1,
            reliability: 1,
            explainability: 1,
            efficiency: 1,
          },
          hintBonusAdjustments: {
            level1: 0,
            level2: -25,
            level3: -50,
          },
        },
      },
    });

    await expectLoadErrorCodes(load(root), [
      'mission-prerequisite-invalid',
      'mission-prerequisite-cycle',
      'scoring-weights-invalid',
    ]);
  });

  it('rejects localization key and placeholder drift', async () => {
    const root = await createPack({
      localizations: {
        en: {
          messages: {
            ...Object.fromEntries(
              localizationKeys.map((key) => [key, `en: ${key}`]),
            ),
            'campaign.title': 'Hello {unitId}',
          },
        },
        fr: {
          messages: {
            ...Object.fromEntries(
              localizationKeys
                .filter((key) => key !== 'campaign.synopsis')
                .map((key) => [key, `fr: ${key}`]),
            ),
            'campaign.title': 'Bonjour {teamId}',
          },
        },
      },
    });

    await expectLoadErrorCodes(load(root), [
      'localization-parity-invalid',
      'localization-placeholder-invalid',
    ]);
  });

  it('rejects an approved asset with a mismatched checksum', async () => {
    const fileContent = 'reviewed asset';
    const root = await createPack({
      assetManifest: {
        assets: [
          {
            assetId: 'OL-OPENING-VIDEO-001',
            scene: 'opening',
            narrativePurposeKey: 'assets.opening.purpose',
            mediaType: 'video',
            requiredVariants: [
              {
                id: 'presentation',
                descriptionKey: 'assets.variants.presentation',
              },
            ],
            languageRequirements: ['en'],
            targetDurationSeconds: 60,
            continuityReferences: [],
            generationPrompt:
              'A complete cinematic prompt that is deliberately long enough for schema validation and review.',
            negativePrompt:
              'Generated text, real logos, watermarks, and unsafe behavior.',
            accessibilityRequirements: ['assets.opening.accessibility'],
            output: { format: 'mp4', maximumBytes: 1000 },
            licensing: {
              usageRightsKey: 'assets.licensing.usageRights',
              restrictionsKey: 'assets.licensing.restrictions',
            },
            provenance: {
              generator: 'test',
              model: 'test',
              generatedAt: '2026-09-25T14:00:00Z',
              reviewer: 'reviewer',
            },
            reviewStatus: 'approved',
            file: {
              path: 'assets/opening.mp4',
              sha256: createHash('sha256')
                .update(`${fileContent}-different`)
                .digest('hex'),
            },
          },
        ],
      },
    });
    await writeFile(join(root, 'assets', 'opening.mp4'), fileContent);

    await expectLoadErrorCodes(load(root), ['asset-checksum-invalid']);
  });

  it('reports structured errors without embedding source content', async () => {
    const root = await createPack({
      campaign: {
        capacity: {
          recommendedParticipants: 100,
          maximumParticipants: 50,
        },
      },
    });

    try {
      await load(root);
      throw new Error('Expected campaign loading to fail.');
    } catch (error) {
      expect(error).toBeInstanceOf(CampaignLoadError);
      const campaignError = error as CampaignLoadError;
      expect(campaignError.issues[0]).toMatchObject({
        code: 'capacity-invalid',
        documentPath: 'campaign.yaml',
        pointer: '/capacity',
      });
      expect(JSON.stringify(campaignError.issues)).not.toContain(
        'recommendedParticipants',
      );
    }
  });
});
