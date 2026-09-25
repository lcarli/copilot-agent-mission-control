import type { SupportedLocale } from '@mission-control/localization';

export type ScoringMode = 'guided' | 'standard' | 'competitive';

export interface InstructorSetupDraft {
  readonly campaignId: string;
  readonly presentationLocale: SupportedLocale;
  readonly participantLocales: readonly SupportedLocale[];
  readonly scheduledStart: string;
  readonly durationMinutes: number;
  readonly scoringMode: ScoringMode;
}

export interface CreatedEventSetup {
  readonly eventSessionId: string;
  readonly eventCode: string;
}

export interface PreflightCheck {
  readonly id: string;
  readonly labelKey: string;
  readonly status: 'passed' | 'failed';
}

export interface InstructorSetupAdapter {
  createEvent(draft: InstructorSetupDraft): Promise<CreatedEventSetup>;
  runPreflight(eventSessionId: string): Promise<readonly PreflightCheck[]>;
  openLobby(eventSessionId: string): Promise<void>;
}

export const validateSetupDraft = (
  draft: InstructorSetupDraft,
): readonly string[] => {
  const errors: string[] = [];
  if (draft.campaignId.trim().length === 0) {
    errors.push('setup.error.campaign');
  }
  if (draft.participantLocales.length === 0) {
    errors.push('setup.error.languages');
  }
  if (
    draft.scheduledStart.trim().length === 0 ||
    !Number.isFinite(new Date(draft.scheduledStart).getTime())
  ) {
    errors.push('setup.error.schedule');
  }
  if (
    !Number.isInteger(draft.durationMinutes) ||
    draft.durationMinutes < 60 ||
    draft.durationMinutes > 480
  ) {
    errors.push('setup.error.duration');
  }
  return errors;
};

const eventCodeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const generateEventCode = (): string => {
  const values = crypto.getRandomValues(new Uint8Array(8));
  return [...values]
    .map((value) => eventCodeAlphabet[value % eventCodeAlphabet.length])
    .join('');
};

export const defaultSetupAdapter: InstructorSetupAdapter = {
  createEvent: () =>
    Promise.resolve({
      eventCode: generateEventCode(),
      eventSessionId: crypto.randomUUID(),
    }),
  openLobby: () => Promise.resolve(),
  runPreflight: () =>
    Promise.resolve([
      {
        id: 'campaign',
        labelKey: 'setup.preflight.campaign',
        status: 'passed',
      },
      {
        id: 'localization',
        labelKey: 'setup.preflight.localization',
        status: 'passed',
      },
      {
        id: 'platform',
        labelKey: 'setup.preflight.platform',
        status: 'passed',
      },
      {
        id: 'validators',
        labelKey: 'setup.preflight.validators',
        status: 'passed',
      },
    ]),
};
