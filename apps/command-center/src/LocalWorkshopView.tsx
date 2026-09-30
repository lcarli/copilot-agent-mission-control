import { useState } from 'react';
import type { SupportedLocale } from '@mission-control/localization';

import {
  MissionControlPanel,
  type MissionControlAdapter,
  type MissionControlItem,
} from './MissionControlPanel.js';

interface EventSnapshot {
  readonly eventSession: {
    readonly eventSessionId: string;
    readonly status: 'draft' | 'lobby' | 'active' | 'paused' | 'closed';
    readonly version: number;
  };
  readonly missions: readonly MissionControlItem[];
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function decodeLocalSnapshot(value: unknown): EventSnapshot {
  if (
    !record(value) ||
    !record(value.eventSession) ||
    !Array.isArray(value.missions)
  ) {
    throw new Error('Invalid local event snapshot.');
  }
  const event = value.eventSession;
  if (
    typeof event.eventSessionId !== 'string' ||
    !Number.isSafeInteger(event.version) ||
    typeof event.version !== 'number' ||
    event.version < 1 ||
    (event.status !== 'draft' &&
      event.status !== 'lobby' &&
      event.status !== 'active' &&
      event.status !== 'paused' &&
      event.status !== 'closed')
  ) {
    throw new Error('Invalid local event state.');
  }
  const missions = value.missions.map(
    (mission: unknown): MissionControlItem => {
      if (
        !record(mission) ||
        typeof mission.missionId !== 'string' ||
        typeof mission.title !== 'string' ||
        typeof mission.briefing !== 'string' ||
        typeof mission.version !== 'number' ||
        !Number.isSafeInteger(mission.version) ||
        mission.version < 1 ||
        typeof mission.completionPercent !== 'number' ||
        mission.completionPercent < 0 ||
        mission.completionPercent > 100 ||
        (mission.status !== 'locked' &&
          mission.status !== 'open' &&
          mission.status !== 'paused' &&
          mission.status !== 'closed')
      ) {
        throw new Error('Invalid local mission state.');
      }
      return {
        missionId: mission.missionId,
        title: mission.title,
        briefing: mission.briefing,
        status: mission.status,
        version: mission.version,
        completionPercent: mission.completionPercent,
      };
    },
  );
  return {
    eventSession: {
      eventSessionId: event.eventSessionId,
      status: event.status,
      version: event.version,
    },
    missions,
  };
}

export function LocalWorkshopView({
  locale,
  translate: t,
}: {
  readonly locale: SupportedLocale;
  readonly translate: (key: string) => string;
}) {
  const [token, setToken] = useState('');
  const [eventId, setEventId] = useState('');
  const [eventCode, setEventCode] = useState<string>();
  const [snapshot, setSnapshot] = useState<EventSnapshot>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [confirmation, setConfirmation] = useState('');
  const [reason, setReason] = useState('');

  const request = async (path: string, body?: unknown): Promise<unknown> => {
    const response = await fetch(`/api/v1/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        ...(body === undefined
          ? {}
          : {
              'content-type': 'application/json',
              'idempotency-key': crypto.randomUUID(),
            }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const problem: unknown = await response.json();
      throw new Error(
        record(problem) &&
          typeof problem.code === 'string' &&
          /^[a-z][a-z0-9-]{0,119}$/u.test(problem.code)
          ? `HTTP ${String(response.status)} ${problem.code}`
          : `HTTP ${String(response.status)}`,
      );
    }
    return response.json() as Promise<unknown>;
  };
  const run = async (operation: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try {
      await operation();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : t('setup.error.operation'),
      );
    } finally {
      setBusy(false);
    }
  };
  const load = async (id: string) => {
    const current = decodeLocalSnapshot(
      await request(`event-sessions/${encodeURIComponent(id)}`),
    );
    if (current.eventSession.eventSessionId !== id)
      throw new Error('Event scope mismatch.');
    setSnapshot(current);
    setEventId(id);
    return current;
  };
  const command = async (
    type: string,
    expectedVersion: number,
    missionId?: string,
  ) => {
    if (snapshot === undefined) throw new Error('No event selected.');
    const id = snapshot.eventSession.eventSessionId;
    const value = await request(
      `event-sessions/${encodeURIComponent(id)}/commands`,
      {
        schemaVersion: '1.0',
        commandId: crypto.randomUUID(),
        eventSessionId: id,
        commandType: type,
        expectedVersion,
        requestedAt: new Date().toISOString(),
        target: missionId === undefined ? {} : { missionId },
        payload:
          type === 'event-session.close'
            ? { confirmationPhrase: confirmation }
            : {},
        ...(type === 'event-session.close' ? { reason } : {}),
      },
    );
    const current = decodeLocalSnapshot(value);
    if (current.eventSession.eventSessionId !== id)
      throw new Error('Event scope mismatch.');
    setSnapshot(current);
    return current;
  };
  const adapter: MissionControlAdapter = {
    async transition(mission, action) {
      const current = await command(
        `mission.${action}`,
        mission.version,
        mission.missionId,
      );
      const updated = current.missions.find(
        (item) => item.missionId === mission.missionId,
      );
      if (updated === undefined)
        throw new Error('Mission missing from response.');
      return updated;
    },
    publishHint: () =>
      Promise.reject(new Error('Instructor hint broadcast is not connected.')),
    setModifier: () =>
      Promise.reject(new Error('Incident modifiers are not connected.')),
  };
  return (
    <section aria-labelledby="local-workshop-title">
      <h2 id="local-workshop-title">{t('local.title')}</h2>
      <p className="runtime-notice">{t('local.notice')}</p>
      <div className="local-connection panel">
        <label>
          <span>{t('local.token')}</span>
          <input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(event) => {
              setToken(event.target.value);
            }}
          />
        </label>
        <label>
          <span>{t('local.eventId')}</span>
          <input
            value={eventId}
            onChange={(event) => {
              setEventId(event.target.value);
            }}
          />
        </label>
        <div className="mission-actions">
          <button
            type="button"
            className="primary-button"
            disabled={busy || token.length < 32}
            onClick={() => {
              void run(async () => {
                const created = await request('event-sessions', {
                  campaignId: 'operation-lighthouse',
                  defaultLocale: locale,
                  supportedLocales: ['en', 'fr', 'pt-BR'],
                });
                if (
                  !record(created) ||
                  !record(created.eventSession) ||
                  typeof created.eventSession.eventSessionId !== 'string' ||
                  typeof created.eventCode !== 'string'
                ) {
                  throw new Error('Invalid event creation response.');
                }
                setEventCode(created.eventCode);
                setEventId(created.eventSession.eventSessionId);
                await load(created.eventSession.eventSessionId);
              });
            }}
          >
            {t('local.create')}
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={busy || token.length < 32 || eventId === ''}
            onClick={() => {
              void run(async () => {
                if (snapshot?.eventSession.eventSessionId !== eventId)
                  setEventCode(undefined);
                await load(eventId);
              });
            }}
          >
            {t('local.refresh')}
          </button>
        </div>
        {error === undefined ? null : <p role="alert">{error}</p>}
        {eventCode === undefined ? null : (
          <p>
            {t('setup.eventCode')}: <strong>{eventCode}</strong>
          </p>
        )}
      </div>
      {snapshot === undefined ? null : (
        <>
          <p role="status">
            {t('shell.eventStatus')}: {snapshot.eventSession.status}
          </p>
          <p>
            <a
              href={`?view=presentation&eventSessionId=${encodeURIComponent(snapshot.eventSession.eventSessionId)}&locale=${locale}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('local.publicLink')}
            </a>
          </p>
          <div className="mission-actions">
            {snapshot.eventSession.status === 'draft' ||
            snapshot.eventSession.status === 'lobby' ? (
              <button
                type="button"
                className="primary-button"
                disabled={busy}
                onClick={() => {
                  void run(async () => {
                    await command(
                      snapshot.eventSession.status === 'draft'
                        ? 'event-session.open-lobby'
                        : 'event-session.start',
                      snapshot.eventSession.version,
                    );
                  });
                }}
              >
                {t(
                  snapshot.eventSession.status === 'draft'
                    ? 'setup.openLobby'
                    : 'local.start',
                )}
              </button>
            ) : null}
          </div>
          {snapshot.eventSession.status === 'active' ? (
            <MissionControlPanel
              key={snapshot.eventSession.eventSessionId}
              adapter={adapter}
              missions={snapshot.missions}
              modifiers={[]}
              showGuidanceControls={false}
              translate={t}
            />
          ) : null}
          {['lobby', 'active', 'paused'].includes(
            snapshot.eventSession.status,
          ) ? (
            <fieldset className="local-connection panel">
              <legend>{t('local.close')}</legend>
              <label>
                <span>{t('local.reason')}</span>
                <input
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value);
                  }}
                />
              </label>
              <label>
                <span>{t('local.confirmation')} CLOSE LOCAL EVENT</span>
                <input
                  value={confirmation}
                  onChange={(event) => {
                    setConfirmation(event.target.value);
                  }}
                />
              </label>
              <button
                type="button"
                className="secondary-button"
                disabled={
                  busy ||
                  confirmation !== 'CLOSE LOCAL EVENT' ||
                  reason.trim() === ''
                }
                onClick={() => {
                  void run(async () => {
                    await command(
                      'event-session.close',
                      snapshot.eventSession.version,
                    );
                  });
                }}
              >
                {t('local.close')}
              </button>
            </fieldset>
          ) : null}
        </>
      )}
    </section>
  );
}
