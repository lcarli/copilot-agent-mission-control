import {
  decodePublicPresentationProjection,
  type PublicPresentationProjection,
} from '@mission-control/event-contracts';
import { useEffect, useState } from 'react';

import { PublicPresentationView } from './PublicPresentationView.js';

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
    projection.source !== 'local-event'
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
  useEffect(() => {
    setProjection(undefined);
    setFailed(false);
    if (eventSessionId === undefined) return;
    const lifetime = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const refresh = async () => {
      try {
        const signal = AbortSignal.any([
          lifetime.signal,
          AbortSignal.timeout(5_000),
        ]);
        const value = await fetchPublicProjection(eventSessionId, signal);
        if (!lifetime.signal.aborted) {
          setProjection(value);
          setFailed(false);
        }
      } catch {
        if (!lifetime.signal.aborted) {
          setFailed(true);
          setProjection(undefined);
        }
      } finally {
        if (!lifetime.signal.aborted)
          timeout = setTimeout(() => {
            void refresh();
          }, 2_000);
      }
    };
    void refresh();
    return () => {
      lifetime.abort();
      clearTimeout(timeout);
    };
  }, [eventSessionId]);

  return (
    <>
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
