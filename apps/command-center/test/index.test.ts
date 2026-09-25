import { describe, expect, it } from 'vitest';

import { workspaceName } from '../src/index.js';

describe('command-center workspace', () => {
  it('exposes its package identity', () => {
    expect(workspaceName).toBe('@mission-control/command-center');
  });
});
