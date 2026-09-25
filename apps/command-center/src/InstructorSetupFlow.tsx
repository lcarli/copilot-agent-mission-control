import {
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from '@mission-control/localization';
import { useState } from 'react';

import {
  defaultSetupAdapter,
  validateSetupDraft,
  type InstructorSetupAdapter,
  type InstructorSetupDraft,
  type PreflightCheck,
  type ScoringMode,
} from './setup.js';

export interface InstructorSetupFlowProps {
  readonly adapter?: InstructorSetupAdapter;
  readonly locale: SupportedLocale;
  readonly translate: (key: string) => string;
}

const initialDraft = (locale: SupportedLocale): InstructorSetupDraft => ({
  campaignId: 'operation-lighthouse',
  durationMinutes: 180,
  participantLocales: [...SUPPORTED_LOCALES],
  presentationLocale: locale,
  scheduledStart: '',
  scoringMode: 'standard',
});

export function InstructorSetupFlow({
  adapter = defaultSetupAdapter,
  locale,
  translate: t,
}: InstructorSetupFlowProps) {
  const [draft, setDraft] = useState<InstructorSetupDraft>(() =>
    initialDraft(locale),
  );
  const [step, setStep] = useState(0);
  const [eventSessionId, setEventSessionId] = useState<string>();
  const [eventCode, setEventCode] = useState<string>();
  const [preflight, setPreflight] = useState<readonly PreflightCheck[]>([]);
  const [errors, setErrors] = useState<readonly string[]>([]);
  const [busy, setBusy] = useState(false);

  const updateDraft = <Key extends keyof InstructorSetupDraft>(
    key: Key,
    value: InstructorSetupDraft[Key],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const toggleParticipantLocale = (candidate: SupportedLocale) => {
    updateDraft(
      'participantLocales',
      draft.participantLocales.includes(candidate)
        ? draft.participantLocales.filter((item) => item !== candidate)
        : [...draft.participantLocales, candidate],
    );
  };

  const continueToSchedule = () => {
    const validationErrors = validateSetupDraft({
      ...draft,
      durationMinutes: 180,
      scheduledStart: '2026-01-01T00:00',
    }).filter(
      (error) =>
        error === 'setup.error.campaign' || error === 'setup.error.languages',
    );
    setErrors(validationErrors);
    if (validationErrors.length === 0) {
      setStep(1);
    }
  };

  const createEvent = async () => {
    const validationErrors = validateSetupDraft(draft);
    setErrors(validationErrors);
    if (validationErrors.length > 0) {
      return;
    }
    setBusy(true);
    try {
      const created = await adapter.createEvent(draft);
      setEventSessionId(created.eventSessionId);
      setEventCode(created.eventCode);
      setStep(2);
    } catch {
      setErrors(['setup.error.operation']);
    } finally {
      setBusy(false);
    }
  };

  const runPreflight = async () => {
    if (eventSessionId === undefined) {
      return;
    }
    setBusy(true);
    try {
      setPreflight(await adapter.runPreflight(eventSessionId));
    } catch {
      setErrors(['setup.error.operation']);
    } finally {
      setBusy(false);
    }
  };

  const openLobby = async () => {
    if (
      eventSessionId === undefined ||
      preflight.length === 0 ||
      preflight.some(({ status }) => status !== 'passed')
    ) {
      return;
    }
    setBusy(true);
    try {
      await adapter.openLobby(eventSessionId);
      setStep(3);
    } catch {
      setErrors(['setup.error.operation']);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="setup-layout" aria-labelledby="setup-title">
      <div className="setup-intro">
        <p className="eyebrow">{t('setup.eyebrow')}</p>
        <h2 id="setup-title">{t('setup.title')}</h2>
        <p>{t('setup.description')}</p>
      </div>

      <ol className="setup-steps" aria-label={t('setup.progress')}>
        {['campaign', 'schedule', 'preflight', 'lobby'].map((item, index) => (
          <li
            aria-current={step === index ? 'step' : undefined}
            className={step > index ? 'completed' : undefined}
            key={item}
          >
            <span>{index + 1}</span>
            {t(`setup.step.${item}`)}
          </li>
        ))}
      </ol>

      <div className="setup-card">
        {step === 0 ? (
          <fieldset>
            <legend>{t('setup.step.campaign')}</legend>
            <label>
              <span>{t('setup.campaign')}</span>
              <select
                value={draft.campaignId}
                onChange={(event) => {
                  updateDraft('campaignId', event.target.value);
                }}
              >
                <option value="operation-lighthouse">
                  Operation Lighthouse 1.0
                </option>
              </select>
            </label>
            <label>
              <span>{t('setup.presentationLanguage')}</span>
              <select
                value={draft.presentationLocale}
                onChange={(event) => {
                  updateDraft(
                    'presentationLocale',
                    event.target.value as SupportedLocale,
                  );
                }}
              >
                {SUPPORTED_LOCALES.map((supportedLocale) => (
                  <option key={supportedLocale} value={supportedLocale}>
                    {supportedLocale}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="checkbox-group">
              <legend>{t('setup.participantLanguages')}</legend>
              {SUPPORTED_LOCALES.map((supportedLocale) => (
                <label key={supportedLocale}>
                  <input
                    checked={draft.participantLocales.includes(supportedLocale)}
                    onChange={() => {
                      toggleParticipantLocale(supportedLocale);
                    }}
                    type="checkbox"
                  />
                  <span>{supportedLocale}</span>
                </label>
              ))}
            </fieldset>
            <div className="setup-actions">
              <button
                className="primary-button"
                onClick={continueToSchedule}
                type="button"
              >
                {t('setup.continue')}
              </button>
            </div>
          </fieldset>
        ) : null}

        {step === 1 ? (
          <fieldset>
            <legend>{t('setup.step.schedule')}</legend>
            <label>
              <span>{t('setup.start')}</span>
              <input
                onChange={(event) => {
                  updateDraft('scheduledStart', event.target.value);
                }}
                type="datetime-local"
                value={draft.scheduledStart}
              />
            </label>
            <label>
              <span>{t('setup.duration')}</span>
              <input
                max="480"
                min="60"
                onChange={(event) => {
                  updateDraft('durationMinutes', Number(event.target.value));
                }}
                step="15"
                type="number"
                value={draft.durationMinutes}
              />
            </label>
            <label>
              <span>{t('setup.scoring')}</span>
              <select
                value={draft.scoringMode}
                onChange={(event) => {
                  updateDraft('scoringMode', event.target.value as ScoringMode);
                }}
              >
                {(['guided', 'standard', 'competitive'] as const).map(
                  (mode) => (
                    <option key={mode} value={mode}>
                      {t(`setup.scoring.${mode}`)}
                    </option>
                  ),
                )}
              </select>
            </label>
            <div className="setup-actions">
              <button
                className="secondary-button"
                onClick={() => {
                  setStep(0);
                }}
                type="button"
              >
                {t('setup.back')}
              </button>
              <button
                className="primary-button"
                disabled={busy}
                onClick={() => {
                  void createEvent();
                }}
                type="button"
              >
                {t('setup.generateCode')}
              </button>
            </div>
          </fieldset>
        ) : null}

        {step === 2 ? (
          <div>
            <h3>{t('setup.eventCode')}</h3>
            <output className="event-code" aria-label={t('setup.eventCode')}>
              {eventCode}
            </output>
            <p className="sensitive-note">{t('setup.eventCodeNote')}</p>
            <div className="preflight-list" aria-live="polite">
              {preflight.map((check) => (
                <div className={`preflight-${check.status}`} key={check.id}>
                  <span aria-hidden="true">
                    {check.status === 'passed' ? '✓' : '!'}
                  </span>
                  <span>{t(check.labelKey)}</span>
                </div>
              ))}
            </div>
            <div className="setup-actions">
              <button
                className="secondary-button"
                disabled={busy}
                onClick={() => {
                  void runPreflight();
                }}
                type="button"
              >
                {t('setup.runPreflight')}
              </button>
              <button
                className="primary-button"
                disabled={
                  busy ||
                  preflight.length === 0 ||
                  preflight.some(({ status }) => status !== 'passed')
                }
                onClick={() => {
                  void openLobby();
                }}
                type="button"
              >
                {t('setup.openLobby')}
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="setup-complete" aria-live="polite">
            <span aria-hidden="true">✓</span>
            <h3>{t('setup.lobbyOpen')}</h3>
            <p>{t('setup.lobbyDescription')}</p>
          </div>
        ) : null}

        {errors.length > 0 ? (
          <div className="form-errors" role="alert">
            <strong>{t('setup.error.title')}</strong>
            <ul>
              {errors.map((error) => (
                <li key={error}>{t(error)}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
