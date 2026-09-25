export interface PublicMissionSummary {
  readonly title: string;
  readonly phase: string;
  readonly progressPercent: number;
}

export interface PublicDistrictSummary {
  readonly districtId: string;
  readonly displayName: string;
  readonly recoveryPercent: number;
  readonly status: 'critical' | 'stabilizing' | 'recovered';
}

export interface PublicRankingSummary {
  readonly rank: number;
  readonly moderatedUnitName: string;
  readonly score: number;
}

export interface PublicRecognitionSummary {
  readonly recognitionId: string;
  readonly moderatedUnitName: string;
  readonly title: string;
}

export interface PublicPresentationProjection {
  readonly eventName: string;
  readonly activeMission: PublicMissionSummary;
  readonly collectiveRecoveryPercent: number;
  readonly connectedUnitCount: number;
  readonly districts: readonly PublicDistrictSummary[];
  readonly rankings: readonly PublicRankingSummary[];
  readonly recognitions: readonly PublicRecognitionSummary[];
}

export interface PublicPresentationViewProps {
  readonly projection?: PublicPresentationProjection;
  readonly translate: (key: string) => string;
}

const defaultProjection: PublicPresentationProjection = {
  activeMission: {
    phase: 'Specialist coordination',
    progressPercent: 72,
    title: 'Mission 4 · Unified Response',
  },
  collectiveRecoveryPercent: 68,
  connectedUnitCount: 24,
  districts: [
    {
      displayName: 'Harbor',
      districtId: 'harbor',
      recoveryPercent: 82,
      status: 'stabilizing',
    },
    {
      displayName: 'Old Town',
      districtId: 'old-town',
      recoveryPercent: 61,
      status: 'stabilizing',
    },
    {
      displayName: 'North Grid',
      districtId: 'north-grid',
      recoveryPercent: 43,
      status: 'critical',
    },
    {
      displayName: 'University',
      districtId: 'university',
      recoveryPercent: 100,
      status: 'recovered',
    },
  ],
  eventName: 'Operation Lighthouse',
  rankings: [
    { moderatedUnitName: 'Beacon Builders', rank: 1, score: 485 },
    { moderatedUnitName: 'Coastal Coders', rank: 2, score: 462 },
    { moderatedUnitName: 'Signal Crew', rank: 3, score: 451 },
  ],
  recognitions: [
    {
      moderatedUnitName: 'Beacon Builders',
      recognitionId: 'reliability',
      title: 'Reliability leader',
    },
    {
      moderatedUnitName: 'Signal Crew',
      recognitionId: 'evidence',
      title: 'Evidence champion',
    },
  ],
};

export function PublicPresentationView({
  projection = defaultProjection,
  translate: t,
}: PublicPresentationViewProps) {
  return (
    <section
      className="public-presentation"
      aria-labelledby="public-presentation-title"
    >
      <header className="presentation-header">
        <div>
          <p className="eyebrow">{t('presentation.live')}</p>
          <h2 id="public-presentation-title">{projection.eventName}</h2>
        </div>
        <div className="presentation-units">
          <strong>{projection.connectedUnitCount}</strong>
          <span>{t('presentation.unitsConnected')}</span>
        </div>
      </header>

      <div className="presentation-hero">
        <article className="presentation-mission">
          <p>{t('presentation.activeMission')}</p>
          <h3>{projection.activeMission.title}</h3>
          <span>{projection.activeMission.phase}</span>
          <div className="presentation-progress">
            <progress
              aria-label={t('presentation.missionProgress')}
              max="100"
              value={projection.activeMission.progressPercent}
            />
            <strong>{projection.activeMission.progressPercent}%</strong>
          </div>
        </article>
        <article className="presentation-recovery">
          <p>{t('presentation.collectiveRecovery')}</p>
          <strong>{projection.collectiveRecoveryPercent}%</strong>
        </article>
      </div>

      <div className="presentation-columns">
        <section
          className="presentation-panel"
          aria-labelledby="district-title"
        >
          <h3 id="district-title">{t('presentation.districts')}</h3>
          <ul className="presentation-districts">
            {projection.districts.map((district) => (
              <li key={district.districtId}>
                <div>
                  <strong>{district.displayName}</strong>
                  <span className={`status-pill status-${district.status}`}>
                    {t(`presentation.status.${district.status}`)}
                  </span>
                </div>
                <progress
                  aria-label={`${district.displayName} ${t(
                    'presentation.recovery',
                  )}`}
                  max="100"
                  value={district.recoveryPercent}
                />
                <span>{district.recoveryPercent}%</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="presentation-panel" aria-labelledby="ranking-title">
          <h3 id="ranking-title">{t('presentation.leaderboard')}</h3>
          <ol className="presentation-ranking">
            {projection.rankings.map((unit) => (
              <li key={unit.rank}>
                <span>{unit.rank}</span>
                <strong>{unit.moderatedUnitName}</strong>
                <b>{unit.score}</b>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section
        className="presentation-recognition"
        aria-labelledby="recognition-title"
      >
        <h3 id="recognition-title">{t('presentation.recognition')}</h3>
        <ul>
          {projection.recognitions.map((recognition) => (
            <li key={recognition.recognitionId}>
              <span aria-hidden="true">★</span>
              <div>
                <strong>{recognition.title}</strong>
                <p>{recognition.moderatedUnitName}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <footer className="presentation-footer">
        {t('presentation.redactedNotice')}
      </footer>
    </section>
  );
}
