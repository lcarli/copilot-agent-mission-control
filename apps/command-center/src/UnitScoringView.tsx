import { useState } from 'react';

export interface UnitMissionScoreSummary {
  readonly missionId: string;
  readonly title: string;
  readonly status:
    'not-started' | 'active' | 'submitted' | 'completed' | 'blocked';
  readonly validationOutcome?: 'passed' | 'partial' | 'retry' | 'blocked';
  readonly points: number;
}

export interface UnitAchievementSummary {
  readonly achievementId: string;
  readonly title: string;
}

export interface UnitScoreSummary {
  readonly unitId: string;
  readonly displayName: string;
  readonly rank: number;
  readonly totalPoints: number;
  readonly basePoints: number;
  readonly bonusPoints: number;
  readonly adjustmentPoints: number;
  readonly dimensions: {
    readonly requiredOutcome: number;
    readonly evidenceAndGrounding: number;
    readonly reliability: number;
    readonly explainability: number;
    readonly efficiency: number;
  };
  readonly missions: readonly UnitMissionScoreSummary[];
  readonly achievements: readonly UnitAchievementSummary[];
}

export interface UnitScoringViewProps {
  readonly translate: (key: string) => string;
  readonly units?: readonly UnitScoreSummary[];
}

const defaultUnits: readonly UnitScoreSummary[] = [
  {
    achievements: [
      { achievementId: 'evidence-first', title: 'Evidence First' },
      { achievementId: 'reliable-recovery', title: 'Reliable Recovery' },
    ],
    adjustmentPoints: 0,
    basePoints: 1470,
    bonusPoints: 130,
    dimensions: {
      efficiency: 140,
      evidenceAndGrounding: 330,
      explainability: 250,
      reliability: 280,
      requiredOutcome: 600,
    },
    displayName: 'Harbor Team',
    missions: [
      {
        missionId: 'signal-in-the-storm',
        points: 800,
        status: 'completed',
        title: 'Signal in the Storm',
        validationOutcome: 'passed',
      },
      {
        missionId: 'ground-truth',
        points: 800,
        status: 'completed',
        title: 'Ground Truth',
        validationOutcome: 'passed',
      },
      {
        missionId: 'connected-city',
        points: 0,
        status: 'active',
        title: 'Connected City',
      },
    ],
    rank: 1,
    totalPoints: 1600,
    unitId: 'unit-1',
  },
  {
    achievements: [
      { achievementId: 'clear-handoffs', title: 'Clear Handoffs' },
    ],
    adjustmentPoints: 25,
    basePoints: 1400,
    bonusPoints: 120,
    dimensions: {
      efficiency: 130,
      evidenceAndGrounding: 300,
      explainability: 270,
      reliability: 260,
      requiredOutcome: 585,
    },
    displayName: 'North Star',
    missions: [],
    rank: 2,
    totalPoints: 1545,
    unitId: 'unit-2',
  },
  {
    achievements: [],
    adjustmentPoints: -25,
    basePoints: 1360,
    bonusPoints: 110,
    dimensions: {
      efficiency: 115,
      evidenceAndGrounding: 310,
      explainability: 240,
      reliability: 245,
      requiredOutcome: 535,
    },
    displayName: 'Équipe Horizon',
    missions: [],
    rank: 3,
    totalPoints: 1445,
    unitId: 'unit-3',
  },
];

const dimensionKeys = [
  'requiredOutcome',
  'evidenceAndGrounding',
  'reliability',
  'explainability',
  'efficiency',
] as const;

export function UnitScoringView({
  translate: t,
  units = defaultUnits,
}: UnitScoringViewProps) {
  const [selectedUnitId, setSelectedUnitId] = useState(units[0]?.unitId);
  const selected = units.find(({ unitId }) => unitId === selectedUnitId);
  const maximumDimension = Math.max(
    1,
    ...units.flatMap(({ dimensions }) =>
      dimensionKeys.map((dimension) => dimensions[dimension]),
    ),
  );

  return (
    <section className="scoring-view" aria-labelledby="scoring-title">
      <div className="scoring-heading">
        <div>
          <p className="eyebrow">{t('scores.eyebrow')}</p>
          <h2 id="scoring-title">{t('scores.title')}</h2>
          <p>{t('scores.description')}</p>
        </div>
        <span>{t('scores.authoritative')}</span>
      </div>

      <div className="scoring-grid">
        <section
          className="panel ranking-panel"
          aria-labelledby="ranking-title"
        >
          <div className="panel-heading">
            <h3 id="ranking-title">{t('scores.ranking')}</h3>
          </div>
          <ol className="ranking-list">
            {units.map((unit) => (
              <li key={unit.unitId}>
                <button
                  aria-current={
                    unit.unitId === selectedUnitId ? 'true' : undefined
                  }
                  onClick={() => {
                    setSelectedUnitId(unit.unitId);
                  }}
                  type="button"
                >
                  <span className="rank-number">{unit.rank}</span>
                  <span>
                    <strong>{unit.displayName}</strong>
                    <small>
                      {unit.achievements.length} {t('scores.achievements')}
                    </small>
                  </span>
                  <strong>{unit.totalPoints}</strong>
                </button>
              </li>
            ))}
          </ol>
        </section>

        {selected === undefined ? null : (
          <>
            <section className="panel score-detail">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">
                    #{selected.rank} {t('scores.rank')}
                  </p>
                  <h3>{selected.displayName}</h3>
                </div>
                <strong className="total-score">{selected.totalPoints}</strong>
              </div>
              <dl className="score-breakdown">
                <div>
                  <dt>{t('scores.base')}</dt>
                  <dd>{selected.basePoints}</dd>
                </div>
                <div>
                  <dt>{t('scores.bonus')}</dt>
                  <dd>{selected.bonusPoints}</dd>
                </div>
                <div>
                  <dt>{t('scores.adjustments')}</dt>
                  <dd>{selected.adjustmentPoints}</dd>
                </div>
              </dl>
              <div className="dimension-list">
                {dimensionKeys.map((dimension) => (
                  <div key={dimension}>
                    <span>{t(`scores.dimension.${dimension}`)}</span>
                    <progress
                      max={maximumDimension}
                      value={selected.dimensions[dimension]}
                    />
                    <strong>{selected.dimensions[dimension]}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel mission-progress-panel">
              <div className="panel-heading">
                <h3>{t('scores.missionProgress')}</h3>
              </div>
              {selected.missions.length === 0 ? (
                <p className="score-empty">{t('scores.noMissionDetails')}</p>
              ) : (
                <ul>
                  {selected.missions.map((mission) => (
                    <li key={mission.missionId}>
                      <div>
                        <strong>{mission.title}</strong>
                        <span>
                          {t(`scores.missionStatus.${mission.status}`)}
                          {mission.validationOutcome === undefined
                            ? ''
                            : ` · ${t(
                                `scores.validation.${mission.validationOutcome}`,
                              )}`}
                        </span>
                      </div>
                      <strong>{mission.points}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel achievements-panel">
              <div className="panel-heading">
                <h3>{t('scores.achievementsTitle')}</h3>
              </div>
              {selected.achievements.length === 0 ? (
                <p className="score-empty">{t('scores.noAchievements')}</p>
              ) : (
                <ul>
                  {selected.achievements.map((achievement) => (
                    <li key={achievement.achievementId}>
                      <span aria-hidden="true">★</span>
                      {achievement.title}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </section>
  );
}
