import { describe, expect, it } from 'vitest';

import {
  lighthouseScoreWeights,
  requiredRulePercentage,
  validationScores,
} from '../src/index.js';

describe('campaign scoring contract', () => {
  it('normalizes percentages into the agreed dimension weights', () => {
    expect(
      Object.values(lighthouseScoreWeights).reduce(
        (sum, value) => sum + value,
        0,
      ),
    ).toBe(10_000);
    expect(
      validationScores({
        requiredOutcome: 100,
        evidenceAndGrounding: 50,
        reliability: 100,
        explainability: 100,
        efficiency: 100,
      }),
    ).toEqual({
      requiredOutcome: 4000,
      evidenceAndGrounding: 1000,
      reliability: 1500,
      explainability: 1500,
      efficiency: 1000,
    });
  });

  it('does not let the number of core rules overflow a dimension', () => {
    const rules = Array.from({ length: 7 }, (_, index) => ({
      ruleId: `rule-${String(index)}`,
      severity: 'required' as const,
      status: index === 0 ? ('failed' as const) : ('passed' as const),
      messageKey: 'validation.test',
    }));
    expect(
      validationScores({ requiredOutcome: requiredRulePercentage(rules) })
        .requiredOutcome,
    ).toBe(3428);
  });

  it('rejects invalid scoring inputs rather than silently clamping them', () => {
    expect(() => validationScores({ requiredOutcome: 112 })).toThrow(
      RangeError,
    );
    expect(() => validationScores({ efficiency: -1 })).toThrow(RangeError);
    expect(() => validationScores({ reliability: Number.NaN })).toThrow(
      RangeError,
    );
    expect(() => requiredRulePercentage([])).toThrow(RangeError);
  });
});
