import { useState } from 'react';

export type MissionControlStatus = 'locked' | 'open' | 'paused' | 'closed';
export type MissionControlAction = 'open' | 'pause' | 'resume' | 'close';

export interface MissionControlItem {
  readonly missionId: string;
  readonly title: string;
  readonly briefing: string;
  readonly status: MissionControlStatus;
  readonly completionPercent: number;
  readonly version: number;
}

export interface IncidentModifierItem {
  readonly modifierId: string;
  readonly title: string;
  readonly description: string;
  readonly active: boolean;
}

export interface MissionControlAdapter {
  transition(
    mission: MissionControlItem,
    action: MissionControlAction,
  ): Promise<MissionControlItem>;
  publishHint(input: {
    readonly missionId: string;
    readonly level: 1 | 2 | 3;
    readonly unitId?: string;
  }): Promise<void>;
  setModifier(modifierId: string, active: boolean): Promise<void>;
}

export interface MissionControlPanelProps {
  readonly adapter?: MissionControlAdapter;
  readonly modifiers?: readonly IncidentModifierItem[];
  readonly missions?: readonly MissionControlItem[];
  readonly translate: (key: string) => string;
}

const defaultMissions: readonly MissionControlItem[] = [
  {
    briefing: 'Classify incoming field reports and publish structured events.',
    completionPercent: 100,
    missionId: 'signal-in-the-storm',
    status: 'closed',
    title: 'Signal in the Storm',
    version: 4,
  },
  {
    briefing: 'Verify claims against operational bulletins and cite evidence.',
    completionPercent: 68,
    missionId: 'ground-truth',
    status: 'open',
    title: 'Ground Truth',
    version: 2,
  },
  {
    briefing: 'Query city services to recommend a safe shelter and route.',
    completionPercent: 0,
    missionId: 'connected-city',
    status: 'locked',
    title: 'Connected City',
    version: 1,
  },
  {
    briefing:
      'Coordinate specialist agents with explicit handoffs and reviews.',
    completionPercent: 0,
    missionId: 'specialist-network',
    status: 'locked',
    title: 'Specialist Network',
    version: 1,
  },
  {
    briefing:
      'Restore critical services through complete multi-agent orchestration.',
    completionPercent: 0,
    missionId: 'restore-the-lighthouse',
    status: 'locked',
    title: 'Restore the Lighthouse',
    version: 1,
  },
];

const defaultModifiers: readonly IncidentModifierItem[] = [
  {
    active: false,
    description: 'Increase shelter demand and transport pressure.',
    modifierId: 'incident-surge',
    title: 'Incident surge',
  },
  {
    active: false,
    description: 'Introduce contradictory weather sensor readings.',
    modifierId: 'sensor-conflict',
    title: 'Sensor conflict',
  },
];

const nextStatus = (
  status: MissionControlStatus,
  action: MissionControlAction,
): MissionControlStatus => {
  if (action === 'open' || action === 'resume') return 'open';
  if (action === 'pause') return 'paused';
  return 'closed';
};

const defaultAdapter: MissionControlAdapter = {
  publishHint: () => Promise.resolve(),
  setModifier: () => Promise.resolve(),
  transition: (mission, action) =>
    Promise.resolve({
      ...mission,
      status: nextStatus(mission.status, action),
      version: mission.version + 1,
    }),
};

const availableActions = (
  status: MissionControlStatus,
): readonly MissionControlAction[] => {
  if (status === 'locked') return ['open'];
  if (status === 'open') return ['pause', 'close'];
  if (status === 'paused') return ['resume', 'close'];
  return [];
};

export function MissionControlPanel({
  adapter = defaultAdapter,
  modifiers: initialModifiers = defaultModifiers,
  missions: initialMissions = defaultMissions,
  translate: t,
}: MissionControlPanelProps) {
  const [missions, setMissions] = useState([...initialMissions]);
  const [modifiers, setModifiers] = useState([...initialModifiers]);
  const [selectedMissionId, setSelectedMissionId] = useState(
    initialMissions.find(({ status }) => status === 'open')?.missionId ??
      initialMissions[0]?.missionId,
  );
  const [hintLevel, setHintLevel] = useState<1 | 2 | 3>(1);
  const [hintTarget, setHintTarget] = useState('all');
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const selectedMission = missions.find(
    ({ missionId }) => missionId === selectedMissionId,
  );

  const transition = async (action: MissionControlAction) => {
    if (selectedMission === undefined) return;
    setBusy(true);
    setMessage(undefined);
    try {
      const updated = await adapter.transition(selectedMission, action);
      setMissions((current) =>
        current.map((mission) =>
          mission.missionId === updated.missionId ? updated : mission,
        ),
      );
      setMessage(t('controls.commandAccepted'));
    } catch {
      setMessage(t('controls.commandFailed'));
    } finally {
      setBusy(false);
    }
  };

  const publishHint = async () => {
    if (selectedMission === undefined) return;
    setBusy(true);
    setMessage(undefined);
    try {
      await adapter.publishHint({
        level: hintLevel,
        missionId: selectedMission.missionId,
        ...(hintTarget === 'all' ? {} : { unitId: hintTarget }),
      });
      setMessage(t('controls.hintPublished'));
    } catch {
      setMessage(t('controls.commandFailed'));
    } finally {
      setBusy(false);
    }
  };

  const toggleModifier = async (modifier: IncidentModifierItem) => {
    setBusy(true);
    setMessage(undefined);
    try {
      await adapter.setModifier(modifier.modifierId, !modifier.active);
      setModifiers((current) =>
        current.map((item) =>
          item.modifierId === modifier.modifierId
            ? { ...item, active: !item.active }
            : item,
        ),
      );
      setMessage(t('controls.commandAccepted'));
    } catch {
      setMessage(t('controls.commandFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="mission-control"
      aria-labelledby="mission-control-title"
    >
      <div className="control-heading">
        <div>
          <p className="eyebrow">{t('controls.eyebrow')}</p>
          <h2 id="mission-control-title">{t('controls.title')}</h2>
          <p>{t('controls.description')}</p>
        </div>
        {message === undefined ? null : (
          <output className="command-message" aria-live="polite">
            {message}
          </output>
        )}
      </div>

      <ol className="mission-timeline">
        {missions.map((mission, index) => (
          <li key={mission.missionId}>
            <button
              aria-current={
                mission.missionId === selectedMissionId ? 'step' : undefined
              }
              onClick={() => {
                setSelectedMissionId(mission.missionId);
              }}
              type="button"
            >
              <span>{index + 1}</span>
              <strong>{mission.title}</strong>
              <small>{t(`controls.status.${mission.status}`)}</small>
              <progress max="100" value={mission.completionPercent} />
            </button>
          </li>
        ))}
      </ol>

      {selectedMission === undefined ? null : (
        <div className="control-grid">
          <section className="panel briefing-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">{t('controls.activeBriefing')}</p>
                <h3>{selectedMission.title}</h3>
              </div>
              <span className={`status-pill status-${selectedMission.status}`}>
                {t(`controls.status.${selectedMission.status}`)}
              </span>
            </div>
            <div className="briefing-content">
              <p>{selectedMission.briefing}</p>
              <div className="mission-actions">
                {availableActions(selectedMission.status).map((action) => (
                  <button
                    className={
                      action === 'close' ? 'secondary-button' : 'primary-button'
                    }
                    disabled={busy}
                    key={action}
                    onClick={() => {
                      void transition(action);
                    }}
                    type="button"
                  >
                    {t(`controls.action.${action}`)}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="panel hint-panel">
            <div className="panel-heading">
              <h3>{t('controls.hints')}</h3>
            </div>
            <div className="control-form">
              <label>
                <span>{t('controls.hintLevel')}</span>
                <select
                  value={hintLevel}
                  onChange={(event) => {
                    setHintLevel(Number(event.target.value) as 1 | 2 | 3);
                  }}
                >
                  {[1, 2, 3].map((level) => (
                    <option key={level} value={level}>
                      {t('controls.level')} {level}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t('controls.hintTarget')}</span>
                <select
                  value={hintTarget}
                  onChange={(event) => {
                    setHintTarget(event.target.value);
                  }}
                >
                  <option value="all">{t('controls.allUnits')}</option>
                  <option value="unit-1">Harbor Team</option>
                  <option value="unit-2">North Star</option>
                </select>
              </label>
              <button
                className="primary-button"
                disabled={busy || selectedMission.status === 'closed'}
                onClick={() => {
                  void publishHint();
                }}
                type="button"
              >
                {t('controls.publishHint')}
              </button>
            </div>
          </section>

          <section className="panel modifier-panel">
            <div className="panel-heading">
              <h3>{t('controls.modifiers')}</h3>
            </div>
            <ul>
              {modifiers.map((modifier) => (
                <li key={modifier.modifierId}>
                  <div>
                    <strong>{modifier.title}</strong>
                    <p>{modifier.description}</p>
                  </div>
                  <button
                    aria-pressed={modifier.active}
                    className={
                      modifier.active ? 'secondary-button' : 'primary-button'
                    }
                    disabled={busy}
                    onClick={() => {
                      void toggleModifier(modifier);
                    }}
                    type="button"
                  >
                    {t(
                      modifier.active
                        ? 'controls.deactivate'
                        : 'controls.activate',
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </section>
  );
}
