export type DashboardConnectionStatus =
  'connecting' | 'connected' | 'reconnecting' | 'polling' | 'stopped';

export interface DashboardRealtimeMessage<TPayload> {
  readonly cursor: string;
  readonly messageId: string;
  readonly occurredAt: string;
  readonly payload: TPayload;
  readonly projectionVersion: number;
  readonly schemaVersion: string;
  readonly type: string;
}

export interface DashboardProjectionSnapshot<TProjection> {
  readonly cursor: string;
  readonly projection: TProjection;
  readonly projectionVersion: number;
}

export type DashboardReplay<TPayload> =
  | {
      readonly cursor: string;
      readonly kind: 'replay';
      readonly messages: readonly DashboardRealtimeMessage<TPayload>[];
    }
  | { readonly kind: 'cursor-expired' };

export interface DashboardRealtimeAdapter<TProjection, TPayload> {
  connect(
    onMessage: (message: DashboardRealtimeMessage<TPayload>) => void,
    onDisconnect: () => void,
  ): Promise<() => void>;
  fetchSnapshot(): Promise<DashboardProjectionSnapshot<TProjection>>;
  replay(cursor: string): Promise<DashboardReplay<TPayload>>;
}

export interface DashboardCursorStore {
  load(): string | undefined;
  save(cursor: string): void;
}

export interface DashboardPollingScheduler {
  clearInterval(handle: unknown): void;
  setInterval(callback: () => void, intervalMs: number): unknown;
}

export interface DashboardRealtimeControllerOptions<TProjection, TPayload> {
  readonly adapter: DashboardRealtimeAdapter<TProjection, TPayload>;
  readonly applyMessage: (
    current: TProjection | undefined,
    message: DashboardRealtimeMessage<TPayload>,
  ) => TProjection;
  readonly cursorStore: DashboardCursorStore;
  readonly onError?: (error: unknown) => void;
  readonly onProjection: (
    projection: TProjection,
    projectionVersion: number,
  ) => void;
  readonly onStatus: (status: DashboardConnectionStatus) => void;
  readonly pollingIntervalMs?: number;
  readonly scheduler?: DashboardPollingScheduler;
}

const browserScheduler: DashboardPollingScheduler = {
  clearInterval(handle) {
    clearInterval(handle as ReturnType<typeof setInterval>);
  },
  setInterval(callback, intervalMs) {
    return setInterval(callback, intervalMs);
  },
};

export class DashboardRealtimeController<TProjection, TPayload> {
  readonly #adapter: DashboardRealtimeAdapter<TProjection, TPayload>;
  readonly #applyMessage: DashboardRealtimeControllerOptions<
    TProjection,
    TPayload
  >['applyMessage'];
  readonly #cursorStore: DashboardCursorStore;
  readonly #onError: (error: unknown) => void;
  readonly #onProjection: DashboardRealtimeControllerOptions<
    TProjection,
    TPayload
  >['onProjection'];
  readonly #onStatus: DashboardRealtimeControllerOptions<
    TProjection,
    TPayload
  >['onStatus'];
  readonly #pollingIntervalMs: number;
  readonly #scheduler: DashboardPollingScheduler;
  readonly #seenMessageIds = new Set<string>();
  readonly #seenMessageOrder: string[] = [];
  #cursor: string | undefined;
  #disconnect: (() => void) | undefined;
  #pollingHandle: unknown;
  #projection: TProjection | undefined;
  #projectionVersion = -1;
  #reconnecting: Promise<void> | undefined;
  #stopped = false;
  #started = false;
  #generation = 0;
  #lifetime = 0;
  #refreshing: Promise<void> | undefined;
  #polling = false;

  #current(generation: number) {
    return !this.#stopped && generation === this.#generation;
  }

  constructor(
    options: DashboardRealtimeControllerOptions<TProjection, TPayload>,
  ) {
    this.#adapter = options.adapter;
    this.#applyMessage = options.applyMessage;
    this.#cursorStore = options.cursorStore;
    this.#onError = options.onError ?? (() => undefined);
    this.#onProjection = options.onProjection;
    this.#onStatus = options.onStatus;
    this.#pollingIntervalMs = options.pollingIntervalMs ?? 5_000;
    this.#scheduler = options.scheduler ?? browserScheduler;
  }

  async start(): Promise<void> {
    if (this.#started) return;
    this.#started = true;
    const lifetime = ++this.#lifetime;
    this.#stopped = false;
    this.#onStatus('connecting');

    try {
      try {
        this.#cursor = this.#cursorStore.load();
      } catch (error) {
        if (lifetime !== this.#lifetime) return;
        this.#onError(error);
      }
      await this.reconnect();
    } catch (error) {
      if (lifetime !== this.#lifetime) return;
      this.#onError(error);
      this.#startPolling();
    }
  }

  async reconnect(): Promise<void> {
    if (this.#stopped) return;
    if (this.#reconnecting !== undefined) return this.#reconnecting;

    const reconnecting = this.#performReconnect();
    this.#reconnecting = reconnecting;
    const release = () => {
      if (this.#reconnecting === reconnecting) this.#reconnecting = undefined;
    };
    void reconnecting.then(release, release);
    return reconnecting;
  }

  stop(): void {
    this.#stopped = true;
    this.#started = false;
    this.#lifetime += 1;
    this.#reconnecting = undefined;
    this.#refreshing = undefined;
    this.#polling = false;
    this.#generation += 1;
    this.#disconnect?.();
    this.#disconnect = undefined;
    this.#stopPolling();
    this.#onStatus('stopped');
  }

  async refreshNow(): Promise<void> {
    if (this.#stopped) return;
    if (this.#refreshing !== undefined) return this.#refreshing;
    const lifetime = this.#lifetime;
    const refreshing = this.#replaceFromSnapshot().catch((error: unknown) => {
      if (!this.#stopped && lifetime === this.#lifetime) this.#onError(error);
    });
    this.#refreshing = refreshing;
    const release = () => {
      if (this.#refreshing === refreshing) this.#refreshing = undefined;
    };
    void refreshing.then(release, release);
    return refreshing;
  }

  async #performReconnect(): Promise<void> {
    const lifetime = this.#lifetime;
    if (this.#projection !== undefined) this.#onStatus('reconnecting');
    const generation = ++this.#generation;
    this.#disconnect?.();
    this.#disconnect = undefined;

    try {
      await this.#connect();
      if (!this.#current(generation)) return;
      await this.#recoverFromCursorOrSnapshot();
      if (!this.#current(generation)) return;
      this.#onStatus('connected');
      this.#startPolling(false);
    } catch (error) {
      if (this.#stopped || lifetime !== this.#lifetime) return;
      this.#onError(error);
      await this.refreshNow();
      if (lifetime === this.#lifetime) this.#startPolling();
    }
  }

  async #recoverFromCursorOrSnapshot(): Promise<void> {
    const generation = this.#generation;
    if (this.#cursor === undefined) {
      await this.#replaceFromSnapshot();
      return;
    }

    const before = this.#projectionVersion;
    const replay = await this.#adapter.replay(this.#cursor);
    if (!this.#current(generation)) return;
    if (replay.kind === 'cursor-expired') {
      await this.#replaceFromSnapshot();
      return;
    }

    for (const message of replay.messages) {
      this.#acceptMessage(message);
    }
    if (
      Math.max(
        before,
        ...replay.messages.map((message) => message.projectionVersion),
      ) === this.#projectionVersion
    )
      this.#saveCursor(replay.cursor);
    if (this.#projection === undefined) {
      await this.#replaceFromSnapshot();
    }
  }

  async #connect(): Promise<void> {
    this.#stopPolling();
    const generation = this.#generation;
    const state = { disconnected: false };
    const disconnect = await this.#adapter.connect(
      (message) => {
        if (generation === this.#generation) this.#acceptMessage(message);
      },
      () => {
        state.disconnected = true;
        if (generation === this.#generation && !this.#stopped) {
          this.#startPolling();
          const recoveryGeneration = this.#generation;
          queueMicrotask(() => {
            if (this.#current(recoveryGeneration)) void this.reconnect();
          });
        }
      },
    );
    if (this.#stopped) {
      disconnect();
      return;
    }
    if (state.disconnected || generation !== this.#generation) {
      disconnect();
      throw new Error('Real-time connection closed during establishment.');
    }
    this.#disconnect = disconnect;
  }

  #acceptMessage(message: DashboardRealtimeMessage<TPayload>): void {
    if (
      this.#stopped ||
      !Number.isSafeInteger(message.projectionVersion) ||
      message.projectionVersion < 0 ||
      message.projectionVersion <= this.#projectionVersion
    )
      return;
    if (this.#seenMessageIds.has(message.messageId)) return;
    this.#seenMessageIds.add(message.messageId);
    this.#seenMessageOrder.push(message.messageId);
    if (this.#seenMessageOrder.length > 2_048) {
      const expiredMessageId = this.#seenMessageOrder.shift();
      if (expiredMessageId !== undefined) {
        this.#seenMessageIds.delete(expiredMessageId);
      }
    }
    try {
      this.#projection = this.#applyMessage(this.#projection, message);
      this.#projectionVersion = message.projectionVersion;
      this.#saveCursor(message.cursor);
      this.#onProjection(this.#projection, this.#projectionVersion);
    } catch (error) {
      this.#onError(error);
    }
  }

  async #replaceFromSnapshot(): Promise<void> {
    const generation = this.#generation;
    const snapshot = await this.#adapter.fetchSnapshot();
    if (
      this.#stopped ||
      generation !== this.#generation ||
      !Number.isSafeInteger(snapshot.projectionVersion) ||
      snapshot.projectionVersion < this.#projectionVersion
    )
      return;
    this.#projection = snapshot.projection;
    this.#projectionVersion = snapshot.projectionVersion;
    this.#seenMessageIds.clear();
    this.#seenMessageOrder.length = 0;
    this.#saveCursor(snapshot.cursor);
    this.#onProjection(snapshot.projection, snapshot.projectionVersion);
  }

  #saveCursor(cursor: string): void {
    this.#cursor = cursor;
    try {
      this.#cursorStore.save(cursor);
    } catch (error) {
      this.#onError(error);
    }
  }

  #startPolling(disconnected = true): void {
    if (this.#stopped) return;
    if (disconnected) {
      const disconnect = this.#disconnect;
      this.#disconnect = undefined;
      this.#generation += 1;
      disconnect?.();
      this.#onStatus('polling');
    }
    this.#stopPolling();
    this.#pollingHandle = this.#scheduler.setInterval(() => {
      void this.#pollAndReconnect();
    }, this.#pollingIntervalMs);
  }

  async #pollAndReconnect(): Promise<void> {
    if (this.#stopped || this.#polling) return;
    this.#polling = true;
    const lifetime = this.#lifetime;
    try {
      if (this.#disconnect === undefined) await this.reconnect();
      else await this.refreshNow();
    } finally {
      if (lifetime === this.#lifetime) this.#polling = false;
    }
  }

  #stopPolling(): void {
    if (this.#pollingHandle === undefined) return;
    this.#scheduler.clearInterval(this.#pollingHandle);
    this.#pollingHandle = undefined;
  }
}

export function createBrowserCursorStore(
  storageKey: string,
  onError: (error: unknown) => void,
): DashboardCursorStore {
  return {
    load() {
      try {
        return window.localStorage.getItem(storageKey) ?? undefined;
      } catch (error) {
        onError(error);
        return undefined;
      }
    },
    save(cursor) {
      try {
        window.localStorage.setItem(storageKey, cursor);
      } catch (error) {
        onError(error);
      }
    },
  };
}
