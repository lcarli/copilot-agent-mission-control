import { describe, expect, it, vi } from 'vitest';

import { fetchPublicProjection } from '../src/PublicEventDisplay.js';
import { decodeLocalSnapshot } from '../src/LocalWorkshopView.js';

const projection = {
  schemaVersion: '1.0',
  eventSessionId: 'local-event',
  source: 'local-event',
  eventName: 'Operation Lighthouse',
  activeMission: {
    title: 'Signal in the Storm',
    phase: 'open',
    progressPercent: 50,
  },
  collectiveRecoveryPercent: 58,
  connectedUnitCount: 2,
  districts: [],
  rankings: [],
  recognitions: [],
};

describe('HTTP projection boundary', () => {
  it('fetches the explicitly selected event without instructor credentials', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(projection));
    expect(
      await fetchPublicProjection('local-event', undefined, fetch),
    ).toEqual(projection);
    expect(fetch.mock.calls[0]?.[0]).toBe(
      '/api/v1/public/event-session?eventSessionId=local-event',
    );
    expect(fetch.mock.calls[0]?.[1]).not.toHaveProperty('headers');
  });

  it('rejects cross-event, out-of-range, private and failed responses', async () => {
    for (const value of [
      { ...projection, eventSessionId: 'other' },
      { ...projection, collectiveRecoveryPercent: 101 },
      { ...projection, participantEmail: 'private@example.test' },
    ]) {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(Response.json(value));
      await expect(
        fetchPublicProjection('local-event', undefined, fetch),
      ).rejects.toThrow();
    }
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response('', { status: 503 }));
    await expect(
      fetchPublicProjection('local-event', undefined, fetch),
    ).rejects.toThrow('503');
  });

  it('rejects malformed instructor event state', () => {
    expect(() =>
      decodeLocalSnapshot({ eventSession: { version: 1 }, missions: [] }),
    ).toThrow();
    expect(
      decodeLocalSnapshot({
        eventSession: {
          eventSessionId: 'local-event',
          status: 'active',
          version: 3,
        },
        missions: [],
      }).eventSession.version,
    ).toBe(3);
  });
});
