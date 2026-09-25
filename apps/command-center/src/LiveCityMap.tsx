export interface CityDistrict {
  readonly districtId: string;
  readonly name: string;
  readonly recoveryPercent: number;
  readonly status: 'stable' | 'recovering' | 'critical';
  readonly x: number;
  readonly y: number;
}

export interface CityIncident {
  readonly incidentId: string;
  readonly label: string;
  readonly severity: 'advisory' | 'warning' | 'critical';
  readonly x: number;
  readonly y: number;
}

export interface CityService {
  readonly label: string;
  readonly serviceId: string;
  readonly status: 'online' | 'degraded' | 'offline';
  readonly x: number;
  readonly y: number;
}

export interface CityRoute {
  readonly path: string;
  readonly routeId: string;
  readonly status: 'open' | 'constrained' | 'closed';
}

export interface LiveCityMapProps {
  readonly districts?: readonly CityDistrict[];
  readonly incidents?: readonly CityIncident[];
  readonly routes?: readonly CityRoute[];
  readonly services?: readonly CityService[];
  readonly translate: (key: string) => string;
}

const districts: readonly CityDistrict[] = [
  {
    districtId: 'harbor',
    name: 'Harbor',
    recoveryPercent: 42,
    status: 'critical',
    x: 17,
    y: 63,
  },
  {
    districtId: 'old-town',
    name: 'Old Town',
    recoveryPercent: 68,
    status: 'recovering',
    x: 42,
    y: 37,
  },
  {
    districtId: 'north-hills',
    name: 'North Hills',
    recoveryPercent: 91,
    status: 'stable',
    x: 66,
    y: 18,
  },
  {
    districtId: 'east-bank',
    name: 'East Bank',
    recoveryPercent: 76,
    status: 'recovering',
    x: 75,
    y: 61,
  },
];

const incidents: readonly CityIncident[] = [
  {
    incidentId: 'grid-17',
    label: 'Grid instability',
    severity: 'critical',
    x: 24,
    y: 69,
  },
  {
    incidentId: 'road-8',
    label: 'Road closure',
    severity: 'warning',
    x: 57,
    y: 49,
  },
];

const services: readonly CityService[] = [
  {
    label: 'Shelter 3',
    serviceId: 'shelter-3',
    status: 'online',
    x: 69,
    y: 28,
  },
  {
    label: 'Transit hub',
    serviceId: 'transit-hub',
    status: 'degraded',
    x: 46,
    y: 57,
  },
];

const routes: readonly CityRoute[] = [
  {
    path: 'M 12 75 C 28 54, 38 63, 50 48 S 72 35, 86 20',
    routeId: 'coastal-route',
    status: 'constrained',
  },
  {
    path: 'M 16 31 C 31 26, 44 42, 58 58 S 75 72, 88 67',
    routeId: 'cross-city-route',
    status: 'open',
  },
];

export function LiveCityMap({
  districts: districtData = districts,
  incidents: incidentData = incidents,
  routes: routeData = routes,
  services: serviceData = services,
  translate: t,
}: LiveCityMapProps) {
  const recovery = Math.round(
    districtData.reduce((sum, district) => sum + district.recoveryPercent, 0) /
      Math.max(1, districtData.length),
  );

  return (
    <section className="city-map-panel" aria-labelledby="city-map-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{t('map.eyebrow')}</p>
          <h2 id="city-map-title">{t('map.title')}</h2>
        </div>
        <span className="live-indicator">{t('map.live')}</span>
      </div>

      <div
        aria-label={`${t('map.title')}. ${t('map.recovery')}: ${String(recovery)}%`}
        className="city-map"
        role="img"
      >
        <svg
          aria-hidden="true"
          className="route-layer"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          {routeData.map((route) => (
            <path
              className={`route route-${route.status}`}
              d={route.path}
              key={route.routeId}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {districtData.map((district) => (
          <article
            className={`district district-${district.status}`}
            key={district.districtId}
            style={{
              left: `${String(district.x)}%`,
              top: `${String(district.y)}%`,
            }}
          >
            <strong>{district.name}</strong>
            <span>{district.recoveryPercent}%</span>
          </article>
        ))}

        {incidentData.map((incident) => (
          <div
            className={`map-marker incident incident-${incident.severity}`}
            key={incident.incidentId}
            style={{
              left: `${String(incident.x)}%`,
              top: `${String(incident.y)}%`,
            }}
            title={incident.label}
          >
            <span aria-hidden="true">!</span>
          </div>
        ))}

        {serviceData.map((service) => (
          <div
            className={`map-marker service service-${service.status}`}
            key={service.serviceId}
            style={{
              left: `${String(service.x)}%`,
              top: `${String(service.y)}%`,
            }}
            title={service.label}
          >
            <span aria-hidden="true">+</span>
          </div>
        ))}
      </div>

      <div className="map-footer">
        <div>
          <span>{t('map.recovery')}</span>
          <strong>{recovery}%</strong>
          <progress max="100" value={recovery} />
        </div>
        <ul aria-label={t('map.legend')}>
          <li>
            <span className="legend-symbol district-stable" />
            {t('map.stable')}
          </li>
          <li>
            <span className="legend-symbol district-recovering" />
            {t('map.recovering')}
          </li>
          <li>
            <span className="legend-symbol district-critical" />
            {t('map.critical')}
          </li>
        </ul>
      </div>

      <details className="map-accessible-summary">
        <summary>{t('map.summary')}</summary>
        <ul>
          {districtData.map((district) => (
            <li key={district.districtId}>
              {district.name}: {t(`map.${district.status}`)},{' '}
              {district.recoveryPercent}% {t('map.recovered')}
            </li>
          ))}
          {incidentData.map((incident) => (
            <li key={incident.incidentId}>
              {t('map.incident')}: {incident.label}
            </li>
          ))}
          {serviceData.map((service) => (
            <li key={service.serviceId}>
              {t('map.service')}: {service.label},{' '}
              {t(`map.serviceStatus.${service.status}`)}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
