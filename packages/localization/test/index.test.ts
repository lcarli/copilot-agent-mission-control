import { describe, expect, it } from 'vitest';

import { workspaceName } from '../src/index.js';

describe('localization workspace', () => {
  it('exposes its package identity', () => {
    expect(workspaceName).toBe('@mission-control/localization');
  });
});
