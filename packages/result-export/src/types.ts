export interface ResultExportSource {
  readonly event: {
    readonly eventSessionId: string;
    readonly campaignId: string;
    readonly campaignVersion: string;
    readonly scoringPolicyVersion: string;
    readonly status:
      'draft' | 'lobby' | 'active' | 'paused' | 'closed' | 'archived';
    readonly createdAt: string;
    readonly startedAt?: string;
    readonly closedAt?: string;
    readonly snapshotAt: string;
  };
  readonly units: readonly {
    readonly unitId: string;
    readonly displayName: string;
    readonly status: string;
    readonly locale: string;
    readonly createdAt: string;
  }[];
  readonly missions: readonly {
    readonly unitId: string;
    readonly missionId: string;
    readonly missionVersion: string;
    readonly status: string;
    readonly attemptCount: number;
    readonly highestHintLevel: number;
    readonly latestValidationOutcome?: string;
    readonly startedAt?: string;
    readonly completedAt?: string;
  }[];
  readonly scores: readonly {
    readonly unitId: string;
    readonly rank: number;
    readonly basePoints: number;
    readonly bonusPoints: number;
    readonly adjustmentPoints: number;
    readonly totalPoints: number;
    readonly requiredOutcome: number;
    readonly evidenceAndGrounding: number;
    readonly reliability: number;
    readonly explainability: number;
    readonly efficiency: number;
  }[];
  readonly scoreAdjustments: readonly {
    readonly unitId: string;
    readonly missionId?: string;
    readonly points: number;
    readonly reasonCode: string;
    readonly explanation: string;
    readonly createdAt: string;
  }[];
  readonly recognitions: readonly {
    readonly unitId: string;
    readonly categoryId: string;
    readonly titleKey: string;
    readonly awardedAt: string;
  }[];
}

export interface ResultExportDocument {
  readonly schemaVersion: '1.0';
  readonly exportId: string;
  readonly generatedAt: string;
  readonly event: ResultExportSource['event'];
  readonly units: ResultExportSource['units'];
  readonly missions: ResultExportSource['missions'];
  readonly scores: ResultExportSource['scores'];
  readonly scoreAdjustments: ResultExportSource['scoreAdjustments'];
  readonly recognitions: ResultExportSource['recognitions'];
}

export interface ResultExportArtifact {
  readonly exportId: string;
  readonly eventSessionId: string;
  readonly idempotencyKey: string;
  readonly fileName: string;
  readonly mediaType: 'application/json';
  readonly sha256: string;
  readonly content: string;
  readonly generatedAt: string;
}

export interface ResultExportSourceResolver {
  load(eventSessionId: string): Promise<ResultExportSource>;
}

export interface CreateResultExportInput {
  readonly eventSessionId: string;
  readonly idempotencyKey: string;
}
