import { describe, expect, it } from 'vitest';

import { LocalRequests } from '../src/local-requests.js';
import { ApiProblem } from '../src/problems.js';
import { RequestBudget, workshopRequestLimits } from '../src/request-budget.js';

describe('request budgets', () => {
  it('enforces the exact boundary, preserves scoped keys, and resets expired windows', () => {
    let now = 10_000;
    const budget = new RequestBudget(() => now);
    for (let index = 0; index < 3; index += 1)
      budget.consume(['event-1', 'unit-1'], 3);
    expect(() => {
      budget.consume(['event-1', 'unit-1'], 3);
    }).toThrow(ApiProblem);
    try {
      budget.consume(['event-1', 'unit-1'], 3);
    } catch (error) {
      expect(error).toMatchObject({
        code: 'request-rate-limited',
        status: 429,
        retryAfterSeconds: 60,
      });
    }
    budget.consume(['event-2', 'unit-1'], 3);
    budget.consume(['event-1', 'unit-2'], 3);
    budget.consume(['event-1:unit-1'], 3);
    now += 59_001;
    expect(() => {
      budget.consume(['event-1', 'unit-1'], 3);
    }).toThrow();
    now += 999;
    expect(() => {
      budget.consume(['event-1', 'unit-1'], 3);
    }).not.toThrow();
  });

  it('bounds tracking memory and recovers it after expiration rather than failing open', () => {
    let now = 0;
    const budget = new RequestBudget(() => now);
    for (
      let index = 0;
      index < workshopRequestLimits.trackedBudgetScopes;
      index += 1
    )
      budget.consume([String(index)], 1);
    expect(() => {
      budget.consume(['overflow'], 1);
    }).toThrow('Request tracking is temporarily at capacity');
    now = 60_000;
    expect(() => {
      budget.consume(['overflow'], 1);
    }).not.toThrow();
    expect(() => {
      budget.consume(['invalid'], 0);
    }).toThrow(RangeError);
  });
});

describe('bounded event request queues', () => {
  it('refuses excess pending work without caching a failed admission', async () => {
    const requests = new LocalRequests();
    const gate = Promise.withResolvers<undefined>();
    const pending = Array.from(
      { length: workshopRequestLimits.pendingPerResource },
      () => requests.serialize('event-1', () => gate.promise),
    );
    expect(() =>
      requests.mutate('event-1', ['unit-1'], 'retry-key', {}, () =>
        Promise.resolve('accepted'),
      ),
    ).toThrow('Request queue is full');
    expect(
      await requests.serialize('event-2', () => Promise.resolve('independent')),
    ).toBe('independent');
    gate.resolve(undefined);
    await Promise.all(pending);
    expect(
      await requests.mutate('event-1', ['unit-1'], 'retry-key', {}, () =>
        Promise.resolve('accepted'),
      ),
    ).toBe('accepted');
  });

  it('releases capacity after a rejected operation and coalesces duplicate work', async () => {
    const requests = new LocalRequests();
    const gate = Promise.withResolvers<string>();
    let executed = 0;
    const operation = () => {
      executed += 1;
      return gate.promise;
    };
    const first = requests.mutate('event', ['unit'], 'same-key', {}, operation);
    const second = requests.mutate(
      'event',
      ['unit'],
      'same-key',
      {},
      operation,
    );
    expect(first).toBe(second);
    const failed = expect(first).rejects.toThrow('Expected failure');
    gate.reject(new Error('Expected failure'));
    await failed;
    expect(executed).toBe(1);
    expect(
      await requests.serialize('event', () => Promise.resolve('recovered')),
    ).toBe('recovered');
  });
});
