import { describe, expect, it, vi } from 'vitest';

import {
  generateEventCode,
  validateSetupDraft,
  type InstructorSetupDraft,
} from '../src/index.js';

const validDraft: InstructorSetupDraft = {
  campaignId: 'operation-lighthouse',
  durationMinutes: 180,
  participantLocales: ['en', 'fr', 'pt-BR'],
  presentationLocale: 'en',
  scheduledStart: '2026-09-25T15:00',
  scoringMode: 'standard',
};

describe('instructor setup', () => {
  it('validates campaign, languages, schedule, and duration', () => {
    expect(validateSetupDraft(validDraft)).toEqual([]);
    expect(
      validateSetupDraft({
        ...validDraft,
        campaignId: '',
        durationMinutes: 30,
        participantLocales: [],
        scheduledStart: '',
      }),
    ).toEqual([
      'setup.error.campaign',
      'setup.error.languages',
      'setup.error.schedule',
      'setup.error.duration',
    ]);
  });

  it('generates an unambiguous eight-character event code', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (values: Uint8Array) => {
        values.set([0, 1, 2, 3, 4, 5, 6, 7]);
        return values;
      },
    });

    expect(generateEventCode()).toBe('ABCDEFGH');
    vi.unstubAllGlobals();
  });
});
