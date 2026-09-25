import { describe, expect, it } from 'vitest';

import { validateLocalizationParity } from '@mission-control/localization';

import {
  campaignNarrative,
  campaignNarrativeCatalogs,
  characterIds,
  glossaryTermIds,
  narrativeBeatIds,
} from '../src/index.js';

describe('Operation Lighthouse narrative', () => {
  it('keeps canonical character names stable across localized content', () => {
    expect(
      campaignNarrative.characters.map(({ canonicalName }) => canonicalName),
    ).toEqual(['Mission Commander', 'Maya Chen', 'Jules Martin', 'Aurora']);
    expect(
      campaignNarrative.characters.map(({ characterId }) => characterId),
    ).toEqual(characterIds);
  });

  it('defines a complete ordered narrative arc through all five missions', () => {
    expect(campaignNarrative.timeline.map(({ beatId }) => beatId)).toEqual(
      narrativeBeatIds,
    );
    expect(campaignNarrative.timeline.map(({ sequence }) => sequence)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(
      campaignNarrative.timeline.flatMap(({ missionId }) =>
        missionId === undefined ? [] : [missionId],
      ),
    ).toEqual([
      'signal-in-the-storm',
      'ground-truth',
      'connected-city',
      'specialist-network',
      'restore-the-lighthouse',
    ]);
  });

  it('provides every glossary term and localization guideline', () => {
    expect(campaignNarrative.glossary.map(({ termId }) => termId)).toEqual(
      glossaryTermIds,
    );
    expect(campaignNarrative.localizationGuidelines).toHaveLength(6);
  });

  it('maintains key and placeholder parity across supported locales', () => {
    expect(validateLocalizationParity(campaignNarrativeCatalogs)).toEqual([]);
    expect([...campaignNarrativeCatalogs.keys()]).toEqual([
      'en',
      'fr',
      'pt-BR',
    ]);
  });

  it('resolves every narrative reference in each locale', () => {
    const keys = [
      ...campaignNarrative.characters.flatMap((character) => [
        character.roleKey,
        character.purposeKey,
        character.voiceKey,
        character.pronunciationKey,
      ]),
      ...campaignNarrative.timeline.flatMap((beat) => [
        beat.titleKey,
        beat.situationKey,
        beat.transitionKey,
      ]),
      ...campaignNarrative.glossary.flatMap((term) => [
        term.termKey,
        term.definitionKey,
        term.usageKey,
      ]),
      ...campaignNarrative.localizationGuidelines.map(
        ({ descriptionKey }) => descriptionKey,
      ),
    ];

    for (const catalog of campaignNarrativeCatalogs.values()) {
      expect(Object.keys(catalog.messages).sort()).toEqual([...keys].sort());
    }
  });
});
