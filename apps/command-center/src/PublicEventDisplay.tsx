import {
  decodePublicPresentationProjection,
  type PublicPresentationProjection,
} from '@mission-control/event-contracts';
import { useEffect, useState } from 'react';

import { PublicPresentationView } from './PublicPresentationView.js';
import {
  DashboardRealtimeController,
  type DashboardConnectionStatus,
} from './realtime.js';

export async function fetchPublicProjection(
  eventSessionId: string,
  signal?: AbortSignal,
  fetcher: typeof globalThis.fetch = globalThis.fetch,
): Promise<PublicPresentationProjection> {
  const response = await fetcher(
    `/api/v1/public/event-session?eventSessionId=${encodeURIComponent(eventSessionId)}`,
    { cache: 'no-store', ...(signal === undefined ? {} : { signal }) },
  );
  if (!response.ok)
    throw new Error(`Public projection HTTP ${String(response.status)}`);
  const projection = decodePublicPresentationProjection(await response.json());
  if (
    projection.eventSessionId !== eventSessionId ||
    (projection.source !== 'local-event' &&
      projection.source !== 'hosted-event') ||
    (projection.source === 'hosted-event' && projection.revision === undefined)
  ) {
    throw new Error('Public projection scope mismatch.');
  }
  return projection;
}

export function PublicEventDisplay({
  eventSessionId,
  translate,
}: {
  readonly eventSessionId?: string;
  readonly translate: (key: string) => string;
}) {
  const [projection, setProjection] = useState<PublicPresentationProjection>();
  const [failed, setFailed] = useState(false);
  const [connection, setConnection] = useState<DashboardConnectionStatus>();
  useEffect(() => {
    setProjection(undefined);
    setFailed(false);
    setConnection(undefined);
    if (eventSessionId === undefined) return;
    const lifetime = new AbortController();
    const active = () => !lifetime.signal.aborted;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let realtime:
      | DashboardRealtimeController<
          PublicPresentationProjection,
          PublicPresentationProjection
        >
      | undefined;
    let snapshotHealthy = false;
    const fetchSnapshot = async () => {
      try {
        const value = await fetchPublicProjection(
          eventSessionId,
          AbortSignal.any([lifetime.signal, AbortSignal.timeout(5_000)]),
        );
        snapshotHealthy = true;
        return value;
      } catch (error) {
        snapshotHealthy = false;
        if (!lifetime.signal.aborted) {
          setFailed(true);
          setProjection(undefined);
        }
        throw error;
      }
    };
    const refresh = async () => {
      try {
        const value = await fetchSnapshot();
        if (!lifetime.signal.aborted) {
          setProjection(value);
          setFailed(false);
          if (value.source === 'hosted-event') {
            const { publicRealtimeAdapter } =
              await import('./public-realtime.js');
            if (!active()) return;
            realtime = new DashboardRealtimeController({
              adapter: publicRealtimeAdapter(
                eventSessionId,
                fetchSnapshot,
                () => {
                  if (!lifetime.signal.aborted) setConnection('polling');
                },
              ),
              applyMessage: (_current, message) => message.payload,
              cursorStore: { load: () => undefined, save: () => undefined },
              onProjection: (next) => {
                if (!lifetime.signal.aborted && snapshotHealthy) {
                  setProjection(next);
                  setFailed(false);
                }
              },
              onStatus: (status) => {
                if (!lifetime.signal.aborted) setConnection(status);
              },
              onError: () => {
                if (!lifetime.signal.aborted) setConnection('polling');
              },
              pollingIntervalMs: 2_000,
            });
            await realtime.start();
          }
        }
      } catch {
        if (!lifetime.signal.aborted) {
          setFailed(true);
          setProjection(undefined);
        }
      } finally {
        if (!lifetime.signal.aborted && realtime === undefined)
          timeout = setTimeout(() => {
            void refresh();
          }, 2_000);
      }
    };
    void refresh();
    return () => {
      lifetime.abort();
      realtime?.stop();
      clearTimeout(timeout);
    };
  }, [eventSessionId]);

  return (
    <>
      {connection === undefined ? null : (
        <p role="status">{translate(`hosted.connection.${connection}`)}</p>
      )}
      {failed ? (
        <p role="alert">{translate('presentation.connectionFailed')}</p>
      ) : null}
      <PublicPresentationView
        {...(projection?.eventSessionId === eventSessionId &&
        projection !== undefined
          ? { projection }
          : {})}
        translate={translate}
      />
    </>
  );
}
