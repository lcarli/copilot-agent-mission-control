import type { PublicPresentationProjection } from '@mission-control/event-contracts';

export type {
  PublicMissionSummary,
  PublicDistrictSummary,
  PublicRankingSummary,
  PublicRecognitionSummary,
  PublicPresentationProjection,
} from '@mission-control/event-contracts';

export interface PublicPresentationViewProps {
  readonly projection?: PublicPresentationProjection;
  readonly translate: (key: string) => string;
}

export function PublicPresentationView({
  projection,
  translate: t,
}: PublicPresentationViewProps) {
  if (projection === undefined) {
    return (
      <section
        className="public-presentation"
        aria-label={t('nav.presentation')}
      >
        <p role="status">{t('presentation.disconnected')}</p>
      </section>
    );
  }
  return (
    <section
      className="public-presentation"
      aria-labelledby="public-presentation-title"
    >
      <header className="presentation-header">
        <div>
          <p className="eyebrow">
            {t(
              projection.source === 'local-event'
                ? 'presentation.local'
                : 'presentation.supplied',
            )}
          </p>
          <h2 id="public-presentation-title">{projection.eventName}</h2>
        </div>
        <div className="presentation-units">
          <strong>{projection.connectedUnitCount}</strong>
          <span>
            {t(
              projection.activityWindowSeconds === undefined
                ? 'presentation.unitsConnected'
                : 'presentation.recentActivity',
            )}
          </span>
        </div>
      </header>
      {projection.activityWindowSeconds === undefined ? null : (
        <p>
          {t('presentation.activityWindow')} {projection.activityWindowSeconds}s
        </p>
      )}
      {projection.recoverySource === 'scenario-baseline' ? (
        <p className="runtime-notice">{t('presentation.baseline')}</p>
      ) : null}
      <div className="presentation-hero">
        <article className="presentation-mission">
          <p>{t('presentation.activeMission')}</p>
          <h3>{projection.activeMission.title}</h3>
          <span>{t(`controls.status.${projection.activeMission.phase}`)}</span>
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
                  aria-label={`${district.displayName} ${t('presentation.recovery')}`}
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
          {projection.rankings.length === 0 ? (
            <p>{t('presentation.noScores')}</p>
          ) : null}
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
        {projection.recognitions.length === 0 ? (
          <p>{t('scores.noAchievements')}</p>
        ) : null}
        <ul>
          {projection.recognitions.map((recognition) => (
            <li key={recognition.recognitionId}>
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
