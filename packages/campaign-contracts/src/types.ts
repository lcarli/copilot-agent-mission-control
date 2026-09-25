export const supportedLocales = ['en', 'fr', 'pt-BR'] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

export interface CampaignManifest {
  readonly schemaVersion: '1.0';
  readonly kind: 'campaign';
  readonly id: string;
  readonly version: string;
  readonly titleKey: string;
  readonly synopsisKey: string;
  readonly defaultLocale: SupportedLocale;
  readonly supportedLocales: readonly SupportedLocale[];
  readonly minimumPlatformVersion: string;
  readonly compatiblePlatformVersions?: string;
  readonly capacity: {
    readonly recommendedParticipants: number;
    readonly maximumParticipants: number;
  };
  readonly missions: readonly string[];
  readonly missionFiles: Readonly<Record<string, string>>;
  readonly assetManifest: string;
  readonly localizationFiles: Readonly<Record<SupportedLocale, string>>;
}

export interface MissionDefinition {
  readonly schemaVersion: '1.0';
  readonly kind: 'mission';
  readonly campaignId: string;
  readonly campaignVersion: string;
  readonly id: string;
  readonly version: string;
  readonly prerequisiteMissions: readonly string[];
  readonly contentKeys: Readonly<Record<string, string>>;
  readonly objectives: {
    readonly core: readonly IdentifiedItem[];
    readonly advanced: readonly IdentifiedItem[];
  };
  readonly requiredEventTypes: readonly string[];
  readonly availableTools: readonly ToolDefinition[];
  readonly submissionSchema: string;
  readonly validator: {
    readonly id: string;
    readonly version: string;
    readonly timeoutMs: number;
  };
  readonly hints: readonly {
    readonly level: number;
    readonly contentKey: string;
  }[];
  readonly scoring: {
    readonly maximumPoints: number;
    readonly dimensionWeights: Readonly<Record<string, number>>;
    readonly hintBonusAdjustments: Readonly<Record<string, number>>;
  };
  readonly dashboardEffects: readonly IdentifiedItem[];
  readonly instructorModifiers: readonly (IdentifiedItem & {
    readonly titleKey: string;
    readonly descriptionKey: string;
    readonly parametersSchema: string;
  })[];
}

export interface IdentifiedItem {
  readonly id: string;
  readonly descriptionKey?: string;
  readonly [key: string]: unknown;
}

export interface ToolDefinition extends IdentifiedItem {
  readonly operations: readonly string[];
  readonly required: boolean;
}

export interface AssetManifest {
  readonly schemaVersion: '1.0';
  readonly kind: 'asset-manifest';
  readonly campaignId: string;
  readonly campaignVersion: string;
  readonly assets: readonly AssetRecord[];
}

export interface AssetRecord {
  readonly assetId: string;
  readonly narrativePurposeKey: string;
  readonly requiredVariants: readonly {
    readonly id: string;
    readonly descriptionKey: string;
  }[];
  readonly accessibilityRequirements: readonly string[];
  readonly scriptKeys?: Readonly<Partial<Record<SupportedLocale, string>>>;
  readonly pronunciationNotesKey?: string;
  readonly licensing: {
    readonly usageRightsKey: string;
    readonly restrictionsKey: string;
  };
  readonly reviewStatus: string;
  readonly file?: {
    readonly path: string;
    readonly sha256: string;
  };
}

export interface LocalizationResource {
  readonly schemaVersion: '1.0';
  readonly kind: 'localization';
  readonly campaignId: string;
  readonly campaignVersion: string;
  readonly locale: SupportedLocale;
  readonly messages: Readonly<Record<string, string>>;
  readonly metadata?: Readonly<
    Record<
      string,
      {
        readonly placeholders?: readonly string[];
      }
    >
  >;
}

export interface CampaignPack {
  readonly rootDirectory: string;
  readonly manifestPath: string;
  readonly manifest: CampaignManifest;
  readonly missions: ReadonlyMap<string, MissionDefinition>;
  readonly assetManifest: AssetManifest;
  readonly localizations: ReadonlyMap<SupportedLocale, LocalizationResource>;
  readonly submissionSchemas: ReadonlyMap<string, unknown>;
}

export interface CampaignCapabilities {
  readonly eventTypes?: ReadonlySet<string>;
  readonly tools?: ReadonlySet<string>;
  readonly validators?: ReadonlySet<string>;
  readonly dashboardEffects?: ReadonlySet<string>;
  readonly instructorModifiers?: ReadonlySet<string>;
}

export interface LoadCampaignOptions {
  readonly platformVersion: string;
  readonly capabilities?: CampaignCapabilities;
}
