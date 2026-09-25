import { describe, expect, it } from 'vitest';

import { workspaceName } from '../src/index.js';

describe('participant-cli workspace', () => {
  it('exposes its package identity', () => {
    expect(workspaceName).toBe('@mission-control/participant-cli');
  });
});
