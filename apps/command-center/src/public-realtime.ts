import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import {
  decodePublicPresentationProjection,
  type PublicPresentationProjection,
} from '@mission-control/event-contracts';

import type { DashboardRealtimeAdapter } from './realtime.js';

export function publicRealtimeAdapter(
  eventSessionId: string,
  fetchProjection: () => Promise<PublicPresentationProjection>,
  onInvalidMessage: () => void,
): DashboardRealtimeAdapter<
  PublicPresentationProjection,
  PublicPresentationProjection
> {
  const decode = (value: unknown) => {
    const projection = decodePublicPresentationProjection(value);
    if (
      projection.eventSessionId !== eventSessionId ||
      projection.source !== 'hosted-event' ||
      projection.revision === undefined ||
      !Number.isSafeInteger(projection.revision)
    )
      throw new Error(
        'Public real-time projection scope or revision is invalid.',
      );
    return {
      projection,
      projectionVersion: projection.revision,
      cursor: String(projection.revision),
    };
  };
  return {
    async connect(onMessage, onDisconnect) {
      const connection = new HubConnectionBuilder()
        .withUrl(
          `/api/v1/public/events/${encodeURIComponent(eventSessionId)}/hub`,
          { timeout: 5_000 },
        )
        .configureLogging(LogLevel.None)
        .build();
      connection.on('publicProjection', (value: unknown) => {
        try {
          const snapshot = decode(value);
          onMessage({
            ...snapshot,
            payload: snapshot.projection,
            messageId: `${eventSessionId}:${snapshot.cursor}`,
            occurredAt: snapshot.projection.updatedAt ?? '',
            schemaVersion: '1.0',
            type: 'publicProjection',
          });
        } catch {
          onInvalidMessage();
        }
      });
      connection.onclose(onDisconnect);
      await connection.start();
      return () => {
        void connection.stop().catch(onInvalidMessage);
      };
    },
    async fetchSnapshot() {
      return decode(await fetchProjection());
    },
    replay: () => Promise.resolve({ kind: 'cursor-expired' }),
  };
}
