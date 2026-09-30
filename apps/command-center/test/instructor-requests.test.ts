import { expect, it, vi } from 'vitest';

import { InstructorRequests } from '../src/instructor-requests.js';

it('retries the exact serialized action and key after a lost reply, with a renewed authorization token', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockRejectedValueOnce(new TypeError('Synthetic lost response'))
    .mockResolvedValueOnce(Response.json({ accepted: true }));
  let token = 'first-token';
  const state = vi.fn();
  const client = new InstructorRequests(
    () => Promise.resolve(token),
    state,
    fetcher,
  );
  const body = {
    commandId: 'original-id',
    requestedAt: '2026-01-01T00:00:00Z',
    expectedVersion: 4,
  };
  await expect(
    client.mutate('event-sessions/test/commands', body),
  ).rejects.toThrow('lost response');
  expect(state).toHaveBeenLastCalledWith(true, false);
  body.commandId = 'changed-after-send';
  await expect(
    client.mutate('event-sessions/test/commands', body),
  ).rejects.toThrow('pending');
  token = 'renewed-token';
  expect((await client.retry()).value).toEqual({ accepted: true });
  const first = fetcher.mock.calls[0]?.[1];
  expect(fetcher.mock.contexts[0]).toBeUndefined();
  const retried = fetcher.mock.calls[1]?.[1];
  expect(retried?.body).toBe(first?.body);
  expect(new Headers(retried?.headers).get('idempotency-key')).toBe(
    new Headers(first?.headers).get('idempotency-key'),
  );
  expect(new Headers(retried?.headers).get('authorization')).toBe(
    'Bearer renewed-token',
  );
  expect(state).toHaveBeenLastCalledWith(false, false);
});

it.each([401, 409, 422, 429, 503])(
  'clears definite rejections but preserves 429/5xx retries: %d',
  async (status) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ code: 'synthetic-rejection' }, { status }),
      );
    const state = vi.fn();
    const client = new InstructorRequests(
      () => Promise.resolve('token'),
      state,
      fetcher,
    );
    await expect(client.mutate('event-sessions', {})).rejects.toThrow(
      `HTTP ${String(status)}`,
    );
    expect(state).toHaveBeenLastCalledWith(
      status === 429 || status >= 500,
      false,
    );
  },
);

it('prevents an old account response from restoring private state or clearing the new account action', async () => {
  const oldResponse = Promise.withResolvers<Response>();
  const newResponse = Promise.withResolvers<Response>();
  const fetcher = vi
    .fn<typeof fetch>()
    .mockReturnValueOnce(oldResponse.promise)
    .mockReturnValueOnce(newResponse.promise);
  const state = vi.fn();
  const client = new InstructorRequests(
    () => Promise.resolve('token'),
    state,
    fetcher,
  );
  const old = client.mutate('event-sessions', { account: 'old' });
  await vi.waitFor(() => {
    expect(fetcher).toHaveBeenCalledOnce();
  });
  client.reset();
  const current = client.mutate('event-sessions', { account: 'new' });
  oldResponse.resolve(Response.json({ private: 'old' }));
  await expect(old).rejects.toThrow('identity changed');
  expect(state).toHaveBeenLastCalledWith(true, true);
  newResponse.resolve(Response.json({ account: 'new' }));
  expect(await current).toEqual({ account: 'new' });
});
