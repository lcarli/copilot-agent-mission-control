export interface EvidenceRecommendation {
  readonly evidenceIds: readonly string[];
  readonly recommendation?: string;
  readonly unknowns: readonly string[];
}

export type GroundingAgent = (
  report: string,
  bulletin: unknown,
) => Promise<EvidenceRecommendation>;

// TODO: export an implementation that distinguishes facts, assumptions, and unknowns.
