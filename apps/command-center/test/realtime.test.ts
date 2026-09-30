import { describe, expect, it, vi } from 'vitest';

import {
  DashboardRealtimeController,
  type DashboardConnectionStatus,
  type DashboardCursorStore,
  type DashboardPollingScheduler,
  type DashboardRealtimeAdapter,
  type DashboardRealtimeMessage,
  type DashboardProjectionSnapshot,
  type DashboardReplay,
} from '../src/index.js';

interface Projection {
  readonly value: number;
}

interface Payload {
  readonly value: number;
}

function message(
  messageId: string,
  projectionVersion: number,
  value: number,
): DashboardRealtimeMessage<Payload> {
  return {
    cursor: `cursor-${String(projectionVersion)}`,
    messageId,
    occurredAt: '2026-09-25T14:05:00Z',
    payload: { value },
    projectionVersion,
    schemaVersion: '1.0',
    type: 'projection.updated',
  };
}

function createHarness(options?: {
  readonly connectError?: Error;
  readonly replay?: DashboardReplay<Payload>;
  readonly storedCursor?: string;
  readonly fetchSnapshot?: () => Promise<
    DashboardProjectionSnapshot<Projection>
  >;
}) {
  let onDisconnect: (() => void) | undefined;
  let onMessage:
    ((message: DashboardRealtimeMessage<Payload>) => void) | undefined;
  let pollingCallback: (() => void) | undefined;
  let connectCount = 0;
  let fetchSnapshotCount = 0;
  const statuses: DashboardConnectionStatus[] = [];
  const projections: { projection: Projection; version: number }[] = [];
  const replayCursors: string[] = [];
  const savedCursors: string[] = [];
  const scheduledIntervals: number[] = [];
  const cursorStore: DashboardCursorStore = {
    load: () => options?.storedCursor,
    save: (cursor) => {
      savedCursors.push(cursor);
    },
  };
  const adapter: DashboardRealtimeAdapter<Projection, Payload> = {
    connect(messageHandler, disconnectHandler) {
      connectCount += 1;
      if (options?.connectError !== undefined) throw options.connectError;
      onMessage = messageHandler;
      onDisconnect = disconnectHandler;
      return Promise.resolve(() => undefined);
    },
    fetchSnapshot() {
      fetchSnapshotCount += 1;
      if (options?.fetchSnapshot !== undefined) return options.fetchSnapshot();
      return Promise.resolve({
        cursor: 'snapshot-cursor',
        projection: { value: 4 },
        projectionVersion: 4,
      });
    },
    replay(cursor) {
      replayCursors.push(cursor);
      return Promise.resolve(
        options?.replay ?? {
          cursor: 'replay-cursor',
          kind: 'replay',
          messages: [message('message-6', 6, 6)],
        },
      );
    },
  };
  const scheduler: DashboardPollingScheduler = {
    clearInterval: () => undefined,
    setInterval: (callback, intervalMs) => {
      pollingCallback = callback;
      scheduledIntervals.push(intervalMs);
      return 1;
    },
  };
  const controller = new DashboardRealtimeController({
    adapter,
    applyMessage: (_current, update) => ({ value: update.payload.value }),
    cursorStore,
    onProjection: (projection, version) => {
      projections.push({ projection, version });
    },
    onStatus: (status) => {
      statuses.push(status);
    },
    scheduler,
  });

  return {
    connectCount: () => connectCount,
    controller,
    emitDisconnect: () => onDisconnect?.(),
    emitMessage: (update: DashboardRealtimeMessage<Payload>) =>
      onMessage?.(update),
    fetchSnapshotCount: () => fetchSnapshotCount,
    projections,
    replayCursors,
    runPoll: () => pollingCallback?.(),
    savedCursors,
    scheduledIntervals,
    statuses,
  };
}

describe('DashboardRealtimeController', () => {
  it('rebuilds from a snapshot on start and ignores duplicate or stale messages', async () => {
    const harness = createHarness();

    await harness.controller.start();
    harness.emitMessage(message('message-5', 5, 5));
    harness.emitMessage(message('message-5', 5, 999));
    harness.emitMessage(message('message-3', 3, 3));

    expect(harness.projections).toEqual([
      { projection: { value: 4 }, version: 4 },
      { projection: { value: 5 }, version: 5 },
    ]);
    expect(harness.savedCursors).toEqual(['snapshot-cursor', 'cursor-5']);
    expect(harness.statuses).toEqual(['connecting', 'connected']);
  });

  it('rebuilds from a persisted opaque cursor after a dashboard restart', async () => {
    const harness = createHarness({ storedCursor: 'stored-cursor' });

    await harness.controller.start();

    expect(harness.replayCursors).toEqual(['stored-cursor']);
    expect(harness.fetchSnapshotCount()).toBe(0);
    expect(harness.projections).toEqual([
      { projection: { value: 6 }, version: 6 },
    ]);
    expect(harness.statuses).toEqual(['connecting', 'connected']);
  });

  it('replays from the latest opaque cursor after disconnect', async () => {
    const harness = createHarness();
    await harness.controller.start();
    harness.emitMessage(message('message-5', 5, 5));

    harness.emitDisconnect();
    await vi.waitFor(() => {
      expect(harness.statuses.at(-1)).toBe('connected');
      expect(harness.projections.at(-1)).toEqual({
        projection: { value: 6 },
        version: 6,
      });
    });

    expect(harness.replayCursors).toEqual(['cursor-5']);
  });

  it('replaces state from a snapshot when the replay cursor expired', async () => {
    const harness = createHarness({ replay: { kind: 'cursor-expired' } });
    await harness.controller.start();
    harness.emitDisconnect();

    await vi.waitFor(() => {
      expect(harness.fetchSnapshotCount()).toBe(2);
    });
    expect(harness.projections.at(-1)).toEqual({
      projection: { value: 4 },
      version: 4,
    });
  });

  it('falls back to periodic snapshot refresh when real-time connection fails', async () => {
    const harness = createHarness({ connectError: new Error('offline') });
    await harness.controller.start();

    expect(harness.statuses.at(-1)).toBe('polling');
    expect(harness.scheduledIntervals).toEqual([5_000]);

    harness.runPoll();
    await vi.waitFor(() => {
      expect(harness.fetchSnapshotCount()).toBe(2);
      expect(harness.connectCount()).toBe(2);
    });
  });

  it('never regresses projection or cursor when an older snapshot arrives after a live message', async () => {
    const snapshot =
      Promise.withResolvers<DashboardProjectionSnapshot<Projection>>();
    const harness = createHarness({ fetchSnapshot: () => snapshot.promise });
    const starting = harness.controller.start();
    await vi.waitFor(() => {
      expect(harness.fetchSnapshotCount()).toBe(1);
    });
    harness.emitMessage(message('newer', 9, 9));
    snapshot.resolve({
      cursor: 'stale',
      projection: { value: 4 },
      projectionVersion: 4,
    });
    await starting;
    expect(harness.projections).toEqual([
      { projection: { value: 9 }, version: 9 },
    ]);
    expect(harness.savedCursors).toEqual(['cursor-9']);
    await harness.controller.refreshNow();
    expect(harness.savedCursors).toEqual(['cursor-9']);
    harness.controller.stop();
  });

  it('keeps reconciliation bounded while connected and ignores late results after stop', async () => {
    const pending =
      Promise.withResolvers<DashboardProjectionSnapshot<Projection>>();
    let slow = false;
    const harness = createHarness({
      fetchSnapshot: () =>
        slow
          ? pending.promise
          : Promise.resolve({
              cursor: 'initial',
              projection: { value: 4 },
              projectionVersion: 4,
            }),
    });
    await harness.controller.start();
    slow = true;
    harness.runPoll();
    harness.runPoll();
    const refresh = harness.controller.refreshNow();
    expect(harness.fetchSnapshotCount()).toBe(2);
    harness.controller.stop();
    pending.resolve({
      cursor: 'late',
      projection: { value: 10 },
      projectionVersion: 10,
    });
    await refresh;
    harness.emitMessage(message('late-frame', 11, 11));
    expect(harness.projections).toEqual([
      { projection: { value: 4 }, version: 4 },
    ]);
    expect(harness.statuses.at(-1)).toBe('stopped');
  });
});

it('can restart a stopped controller without an old connection or snapshot replacing its new lifetime', async () => {
  const old = Promise.withResolvers<DashboardProjectionSnapshot<Projection>>();
  let requests = 0;
  const harness = createHarness({
    fetchSnapshot: () => {
      requests += 1;
      return requests === 1
        ? old.promise
        : Promise.resolve({
            projection: { value: 10 },
            projectionVersion: 10,
            cursor: 'new-lifetime',
          });
    },
  });
  const starting = harness.controller.start();
  await vi.waitFor(() => {
    expect(requests).toBe(1);
  });
  harness.controller.stop();
  await harness.controller.start();
  old.resolve({
    projection: { value: 4 },
    projectionVersion: 4,
    cursor: 'old-lifetime',
  });
  await starting;
  expect(harness.projections).toEqual([
    { projection: { value: 10 }, version: 10 },
  ]);
  expect(harness.savedCursors).toEqual(['new-lifetime']);
  expect(harness.statuses.at(-1)).toBe('connected');
  harness.controller.stop();
});
