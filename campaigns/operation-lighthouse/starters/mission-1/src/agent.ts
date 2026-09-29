export interface IncidentIntake {
  readonly report: string;
}

export interface IncidentAssessment {
  readonly category:
    'flooding' | 'medical' | 'power' | 'transport' | 'communications';
  readonly affectedServices: readonly string[];
  readonly location: string;
  readonly missingInformation: readonly string[];
  readonly severity: 'low' | 'moderate' | 'high' | 'critical';
  readonly severityExplanation?: string;
  readonly duplicateOf?: string;
}

export function assessIncident(_input: IncidentIntake): IncidentAssessment {
  // TODO: implement classification from the supplied report without inventing facts.
  throw new Error(
    'Implement the incident assessment before running this starter.',
  );
}
