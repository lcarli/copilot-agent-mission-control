import { describe, expect, it } from 'vitest';

import { workspaceName } from '../src/index.js';

describe('event-contracts workspace', () => {
  it('exposes its package identity', () => {
    expect(workspaceName).toBe('@mission-control/event-contracts');
  });
});
