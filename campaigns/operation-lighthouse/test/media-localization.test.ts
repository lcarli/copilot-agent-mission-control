import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { validateMediaLocalization } from '../src/index.js';

describe('media localization parity', () => {
  it('validates keys, placeholders, expansion, variants, reviews, and captions', async () => {
    const rootDirectory = resolve(import.meta.dirname, '..');
    const result = await validateMediaLocalization(rootDirectory);

    expect(result).toMatchObject({
      valid: true,
      issues: [],
      localeCount: 3,
      captionCount: 21,
    });
    expect(result.keyCount).toBeGreaterThan(50);
    expect(result.maximumExpansionRatio).toBeLessThan(2.5);
    expect(Object.isFrozen(result)).toBe(true);
  });
});
