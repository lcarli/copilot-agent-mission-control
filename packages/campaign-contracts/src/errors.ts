export type CampaignLoadErrorCode =
  | 'campaign-entry-missing'
  | 'campaign-entry-ambiguous'
  | 'document-missing'
  | 'document-read-failed'
  | 'document-parse-failed'
  | 'document-schema-invalid'
  | 'path-outside-pack'
  | 'campaign-identity-mismatch'
  | 'campaign-version-mismatch'
  | 'capacity-invalid'
  | 'mission-reference-invalid'
  | 'mission-prerequisite-invalid'
  | 'mission-prerequisite-cycle'
  | 'duplicate-identifier'
  | 'scoring-weights-invalid'
  | 'capability-unavailable'
  | 'localization-parity-invalid'
  | 'localization-placeholder-invalid'
  | 'localization-reference-missing'
  | 'asset-checksum-invalid'
  | 'platform-version-incompatible'
  | 'submission-schema-invalid';

export interface CampaignLoadIssue {
  readonly documentPath: string;
  readonly pointer: string;
  readonly code: CampaignLoadErrorCode;
  readonly messageKey: string;
  readonly args?: Readonly<Record<string, string | number | boolean>>;
}

export class CampaignLoadError extends Error {
  public readonly issues: readonly CampaignLoadIssue[];

  public constructor(issues: readonly CampaignLoadIssue[]) {
    super(
      `Campaign pack validation failed with ${String(issues.length)} issue(s).`,
    );
    this.name = 'CampaignLoadError';
    this.issues = issues;
  }
}
