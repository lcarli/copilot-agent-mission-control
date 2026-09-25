import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { UnitScoringView } from '../src/index.js';

const translate = (key: string) => key;

describe('UnitScoringView', () => {
  it('renders ranking, score dimensions, validation, and achievements', () => {
    const markup = renderToStaticMarkup(
      <UnitScoringView translate={translate} />,
    );

    expect(markup).toContain('Harbor Team');
    expect(markup).toContain('1600');
    expect(markup).toContain('scores.dimension.reliability');
    expect(markup).toContain('scores.validation.passed');
    expect(markup).toContain('Evidence First');
  });

  it('preserves the authoritative ranking order supplied by the projection', () => {
    const markup = renderToStaticMarkup(
      <UnitScoringView
        translate={translate}
        units={[
          {
            achievements: [],
            adjustmentPoints: 0,
            basePoints: 10,
            bonusPoints: 0,
            dimensions: {
              efficiency: 0,
              evidenceAndGrounding: 0,
              explainability: 0,
              reliability: 0,
              requiredOutcome: 10,
            },
            displayName: 'Projected Winner',
            missions: [],
            rank: 7,
            totalPoints: 10,
            unitId: 'unit-1',
          },
        ]}
      />,
    );

    expect(markup).toContain('Projected Winner');
    expect(markup).toContain('>7</span>');
  });
});
