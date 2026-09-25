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
    this.#stopped = false;
    this.#onStatus('connecting');

    try {
      try {
        this.#cursor = this.#cursorStore.load();
      } catch (error) {
        this.#onError(error);
      }
      await this.#recoverFromCursorOrSnapshot();
      await this.#connect();
    } catch (error) {
      this.#onError(error);
      this.#startPolling();
    }
  }

  async reconnect(): Promise<void> {
    if (this.#stopped) return;
    if (this.#reconnecting !== undefined) return this.#reconnecting;

    this.#reconnecting = this.#performReconnect().finally(() => {
      this.#reconnecting = undefined;
    });
    return this.#reconnecting;
  }

  stop(): void {
    this.#stopped = true;
    this.#disconnect?.();
    this.#disconnect = undefined;
    this.#stopPolling();
    this.#onStatus('stopped');
  }

  async refreshNow(): Promise<void> {
    if (this.#stopped) return;
    try {
      await this.#replaceFromSnapshot();
    } catch (error) {
      this.#onError(error);
    }
  }

  async #performReconnect(): Promise<void> {
    this.#onStatus('reconnecting');
    this.#disconnect?.();
    this.#disconnect = undefined;

    try {
      await this.#recoverFromCursorOrSnapshot();
      await this.#connect();
    } catch (error) {
      this.#onError(error);
      this.#startPolling();
    }
  }

  async #recoverFromCursorOrSnapshot(): Promise<void> {
    if (this.#cursor === undefined) {
      await this.#replaceFromSnapshot();
      return;
    }

    const replay = await this.#adapter.replay(this.#cursor);
    if (replay.kind === 'cursor-expired') {
      await this.#replaceFromSnapshot();
      return;
    }

    for (const message of replay.messages) {
      this.#acceptMessage(message);
    }
    this.#saveCursor(replay.cursor);
    if (this.#projection === undefined) {
      await this.#replaceFromSnapshot();
    }
  }

  async #connect(): Promise<void> {
    this.#stopPolling();
    this.#disconnect = await this.#adapter.connect(
      (message) => {
        this.#acceptMessage(message);
      },
      () => {
        void this.reconnect();
      },
    );
    if (this.#stopped) {
      this.#disconnect();
      this.#disconnect = undefined;
      return;
    }
    this.#onStatus('connected');
  }

  #acceptMessage(message: DashboardRealtimeMessage<TPayload>): void {
    if (this.#seenMessageIds.has(message.messageId)) return;
    this.#seenMessageIds.add(message.messageId);
    this.#seenMessageOrder.push(message.messageId);
    if (this.#seenMessageOrder.length > 2_048) {
      const expiredMessageId = this.#seenMessageOrder.shift();
      if (expiredMessageId !== undefined) {
        this.#seenMessageIds.delete(expiredMessageId);
      }
    }
    this.#saveCursor(message.cursor);

    if (
      this.#projection !== undefined &&
      message.projectionVersion <= this.#projectionVersion
    ) {
      return;
    }

    try {
      this.#projection = this.#applyMessage(this.#projection, message);
      this.#projectionVersion = message.projectionVersion;
      this.#onProjection(this.#projection, this.#projectionVersion);
    } catch (error) {
      this.#onError(error);
    }
  }

  async #replaceFromSnapshot(): Promise<void> {
    const snapshot = await this.#adapter.fetchSnapshot();
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

  #startPolling(): void {
    this.#disconnect?.();
    this.#disconnect = undefined;
    this.#stopPolling();
    this.#onStatus('polling');
    this.#pollingHandle = this.#scheduler.setInterval(() => {
      void this.#pollAndReconnect();
    }, this.#pollingIntervalMs);
  }

  async #pollAndReconnect(): Promise<void> {
    await this.refreshNow();
    await this.reconnect();
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
