import { describe, expect, it } from 'vitest';

import {
  activateIncidentModifier,
  deactivateIncidentModifier,
  incidentModifierCatalog,
  incidentModifierIds,
  initialCampaignScenarioState,
} from '../src/index.js';

describe('instructor incident modifiers', () => {
  it('documents every closed-catalog modifier as reversible', () => {
    expect(Object.keys(incidentModifierCatalog)).toEqual(incidentModifierIds);
    for (const modifier of Object.values(incidentModifierCatalog)) {
      expect(modifier.reversible).toBe(true);
      expect(modifier.description.length).toBeGreaterThan(20);
      expect(modifier.facilitatorGuidance.length).toBeGreaterThan(20);
    }
  });

  it('activates and reverses a deterministic storm escalation', () => {
    const initial = initialCampaignScenarioState();
    const activated = activateIncidentModifier(
      initial,
      'storm-surge-escalation',
      {},
    );
    if (!activated.ok) {
      throw new Error('Expected modifier activation.');
    }
    expect(activated.value.weatherScenarioId).toBe('storm-surge');
    expect(
      deactivateIncidentModifier(activated.value, 'storm-surge-escalation'),
    ).toMatchObject({
      ok: true,
      value: {
        weatherScenarioId: 'accelerating-storm',
        activeModifiers: {},
      },
    });
  });

  it('rejects unsafe shelter capacity reductions', () => {
    const result = activateIncidentModifier(
      initialCampaignScenarioState(),
      'shelter-capacity-pressure',
      {
        shelterId: 'east-bank-arena',
        reduction: 400,
      },
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'conflict' },
    });
  });

  it('allows only one unavailable simulator tool at a time', () => {
    const first = activateIncidentModifier(
      initialCampaignScenarioState(),
      'simulator-tool-outage',
      { toolId: 'transport' },
    );
    if (!first.ok) {
      throw new Error('Expected first tool outage.');
    }

    expect(
      activateIncidentModifier(first.value, 'simulator-tool-outage', {
        toolId: 'weather',
      }),
    ).toMatchObject({
      ok: false,
      error: { code: 'conflict' },
    });
  });

  it('rejects unknown targets and keeps input state immutable', () => {
    const initial = initialCampaignScenarioState();
    const result = activateIncidentModifier(
      initial,
      'route-emergency-closure',
      { routeId: 'unknown-route' },
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: 'invalid-request' },
    });
    expect(Object.isFrozen(initial)).toBe(true);
    expect(initial.revision).toBe(1);
  });
});
