import { describe, expect, it } from 'vitest';

import { workspaceName } from '../src/index.js';

describe('api workspace', () => {
  it('exposes its package identity', () => {
    expect(workspaceName).toBe('@mission-control/api');
  });
});
