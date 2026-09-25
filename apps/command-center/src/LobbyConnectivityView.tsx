export interface LobbyUnitSummary {
  readonly unitId: string;
  readonly displayName: string;
  readonly locale: string;
  readonly status: 'registered' | 'ready' | 'active' | 'disconnected' | 'muted';
  readonly readinessPassed: number;
  readonly readinessTotal: number;
  readonly lastSeenAt: string;
}

export interface PlatformHealthSummary {
  readonly serviceId: string;
  readonly labelKey: string;
  readonly status: 'ready' | 'degraded' | 'unavailable';
}

export interface LobbyConnectivityViewProps {
  readonly capacity?: number;
  readonly health?: readonly PlatformHealthSummary[];
  readonly translate: (key: string) => string;
  readonly units?: readonly LobbyUnitSummary[];
}

const defaultUnits: readonly LobbyUnitSummary[] = [
  {
    displayName: 'Harbor Team',
    lastSeenAt: '2026-09-25T14:35:42Z',
    locale: 'pt-BR',
    readinessPassed: 4,
    readinessTotal: 4,
    status: 'ready',
    unitId: 'unit-1',
  },
  {
    displayName: 'North Star',
    lastSeenAt: '2026-09-25T14:35:31Z',
    locale: 'en',
    readinessPassed: 4,
    readinessTotal: 4,
    status: 'ready',
    unitId: 'unit-2',
  },
  {
    displayName: 'Équipe Horizon',
    lastSeenAt: '2026-09-25T14:34:58Z',
    locale: 'fr',
    readinessPassed: 3,
    readinessTotal: 4,
    status: 'registered',
    unitId: 'unit-3',
  },
  {
    displayName: 'Coastal Agents',
    lastSeenAt: '2026-09-25T14:30:02Z',
    locale: 'en',
    readinessPassed: 2,
    readinessTotal: 4,
    status: 'disconnected',
    unitId: 'unit-4',
  },
];

const defaultHealth: readonly PlatformHealthSummary[] = [
  {
    labelKey: 'lobby.health.api',
    serviceId: 'api',
    status: 'ready',
  },
  {
    labelKey: 'lobby.health.realtime',
    serviceId: 'realtime',
    status: 'ready',
  },
  {
    labelKey: 'lobby.health.storage',
    serviceId: 'storage',
    status: 'ready',
  },
  {
    labelKey: 'lobby.health.validators',
    serviceId: 'validators',
    status: 'degraded',
  },
];

export function LobbyConnectivityView({
  capacity = 50,
  health = defaultHealth,
  translate: t,
  units = defaultUnits,
}: LobbyConnectivityViewProps) {
  const connected = units.filter(
    ({ status }) => status !== 'disconnected',
  ).length;
  const ready = units.filter(
    ({ readinessPassed, readinessTotal, status }) =>
      readinessPassed === readinessTotal &&
      status !== 'disconnected' &&
      status !== 'muted',
  ).length;
  const allSystemsReady = health.every(({ status }) => status === 'ready');

  return (
    <section className="lobby-view" aria-labelledby="lobby-title">
      <div className="lobby-heading">
        <div>
          <p className="eyebrow">{t('lobby.eyebrow')}</p>
          <h2 id="lobby-title">{t('lobby.title')}</h2>
          <p>{t('lobby.description')}</p>
        </div>
        <span
          className={
            allSystemsReady
              ? 'readiness-banner ready'
              : 'readiness-banner warning'
          }
        >
          {t(
            allSystemsReady ? 'lobby.platformReady' : 'lobby.platformAttention',
          )}
        </span>
      </div>

      <div className="lobby-metrics">
        <article>
          <span>{t('lobby.registered')}</span>
          <strong>
            {units.length} / {capacity}
          </strong>
        </article>
        <article>
          <span>{t('lobby.connected')}</span>
          <strong>{connected}</strong>
        </article>
        <article>
          <span>{t('lobby.ready')}</span>
          <strong>{ready}</strong>
        </article>
      </div>

      <div className="lobby-grid">
        <section
          className="panel unit-roster"
          aria-labelledby="unit-roster-title"
        >
          <div className="panel-heading">
            <h3 id="unit-roster-title">{t('lobby.units')}</h3>
            <span>{t('lobby.autoRefresh')}</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">{t('lobby.unit')}</th>
                  <th scope="col">{t('lobby.locale')}</th>
                  <th scope="col">{t('lobby.readiness')}</th>
                  <th scope="col">{t('lobby.status')}</th>
                  <th scope="col">{t('lobby.lastSeen')}</th>
                </tr>
              </thead>
              <tbody>
                {units.map((unit) => (
                  <tr key={unit.unitId}>
                    <th scope="row">{unit.displayName}</th>
                    <td>{unit.locale}</td>
                    <td>
                      <progress
                        aria-label={`${unit.displayName} ${t('lobby.readiness')}`}
                        max={unit.readinessTotal}
                        value={unit.readinessPassed}
                      />
                      <span className="readiness-value">
                        {unit.readinessPassed}/{unit.readinessTotal}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill status-${unit.status}`}>
                        {t(`lobby.status.${unit.status}`)}
                      </span>
                    </td>
                    <td>
                      <time dateTime={unit.lastSeenAt}>
                        {new Date(unit.lastSeenAt).toLocaleTimeString(
                          undefined,
                          {
                            hour: '2-digit',
                            minute: '2-digit',
                          },
                        )}
                      </time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="panel health-panel" aria-labelledby="health-title">
          <div className="panel-heading">
            <h3 id="health-title">{t('lobby.platformHealth')}</h3>
          </div>
          <ul className="health-list">
            {health.map((service) => (
              <li key={service.serviceId}>
                <span
                  aria-hidden="true"
                  className={`health-dot health-${service.status}`}
                />
                <span>{t(service.labelKey)}</span>
                <strong>{t(`lobby.healthStatus.${service.status}`)}</strong>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
