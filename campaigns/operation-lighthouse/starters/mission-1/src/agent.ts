export interface IncidentIntake {
  readonly report: string;
}

export interface IncidentAssessment {
  readonly category: string;
  readonly missingInformation: readonly string[];
  readonly severity: string;
}

export function assessIncident(_input: IncidentIntake): IncidentAssessment {
  // TODO: implement classification from the supplied report without inventing facts.
  return {
    category: 'unclassified',
    missingInformation: [],
    severity: 'unknown',
  };
}
