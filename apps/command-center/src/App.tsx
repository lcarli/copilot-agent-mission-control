import {
  SUPPORTED_LOCALES,
  createLocalizer,
  type SupportedLocale,
} from '@mission-control/localization';
import { useMemo, useState } from 'react';

import { catalogs } from './messages.js';
import { InstructorSetupFlow } from './InstructorSetupFlow.js';
import { LiveCityMap } from './LiveCityMap.js';
import { LobbyConnectivityView } from './LobbyConnectivityView.js';

export interface CommandCenterAppProps {
  readonly initialLocale?: SupportedLocale;
  readonly initialView?: 'setup' | 'dashboard' | 'lobby';
}

type ThemeChoice = 'auto' | 'light' | 'dark';

const metricCards = [
  ['shell.connectedUnits', '24 / 25'],
  ['shell.collectiveRecovery', '68%'],
  ['shell.currentMission', 'Ground Truth'],
] as const;

export function CommandCenterApp({
  initialLocale = 'en',
  initialView = 'setup',
}: CommandCenterAppProps) {
  const [locale, setLocale] = useState<SupportedLocale>(initialLocale);
  const [theme, setTheme] = useState<ThemeChoice>('auto');
  const [activePage, setActivePage] = useState<
    'setup' | 'overview' | 'missions' | 'units' | 'health'
  >(
    initialView === 'setup'
      ? 'setup'
      : initialView === 'lobby'
        ? 'units'
        : 'overview',
  );
  const localizer = useMemo(
    () => createLocalizer({ catalogs, defaultLocale: 'en' }),
    [],
  );
  const t = (key: string): string => localizer.format(key, {}, locale).message;

  const updateTheme = (choice: ThemeChoice) => {
    setTheme(choice);
    const resolved =
      choice === 'auto'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : choice;
    document.documentElement.dataset.theme = resolved;
  };

  return (
    <>
      <a className="skip-link" href="#command-center">
        {t('shell.skip')}
      </a>
      <div className="app-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">{t('app.title')}</p>
            <h1>{t('app.subtitle')}</h1>
          </div>
          <div className="preferences" aria-label="Display preferences">
            <label>
              <span>{t('shell.locale')}</span>
              <select
                value={locale}
                onChange={(event) => {
                  setLocale(event.target.value as SupportedLocale);
                }}
              >
                {SUPPORTED_LOCALES.map((supportedLocale) => (
                  <option key={supportedLocale} value={supportedLocale}>
                    {supportedLocale}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t('shell.theme')}</span>
              <select
                value={theme}
                onChange={(event) => {
                  updateTheme(event.target.value as ThemeChoice);
                }}
              >
                <option value="auto">{t('theme.auto')}</option>
                <option value="light">{t('theme.light')}</option>
                <option value="dark">{t('theme.dark')}</option>
              </select>
            </label>
          </div>
        </header>

        <nav className="primary-nav" aria-label="Primary">
          {['setup', 'overview', 'missions', 'units', 'health'].map((item) => (
            <button
              aria-current={item === activePage ? 'page' : undefined}
              key={item}
              onClick={() => {
                setActivePage(
                  item as
                    'setup' | 'overview' | 'missions' | 'units' | 'health',
                );
              }}
              type="button"
            >
              {t(`nav.${item}`)}
            </button>
          ))}
        </nav>

        <main id="command-center" tabIndex={-1}>
          {activePage === 'setup' ? (
            <InstructorSetupFlow locale={locale} translate={t} />
          ) : activePage === 'units' || activePage === 'health' ? (
            <LobbyConnectivityView translate={t} />
          ) : (
            <>
              <section
                className="status-strip"
                aria-label={t('shell.eventStatus')}
              >
                <div>
                  <span className="status-dot" aria-hidden="true" />
                  <span>{t('shell.eventStatus')}</span>
                  <strong>{t('shell.active')}</strong>
                </div>
                <time dateTime="2026-09-25T14:05:00Z">14:05 UTC</time>
              </section>

              <section className="metric-grid" aria-label="Event summary">
                {metricCards.map(([label, value]) => (
                  <article className="metric-card" key={label}>
                    <p>{t(label)}</p>
                    <strong>{value}</strong>
                  </article>
                ))}
              </section>

              <div className="workspace-grid">
                <section className="panel map-panel" id="overview">
                  <LiveCityMap translate={t} />
                </section>

                <aside
                  className="panel activity-panel"
                  aria-labelledby="activity-title"
                >
                  <div className="panel-heading">
                    <h2 id="activity-title">{t('shell.activity')}</h2>
                  </div>
                  <div className="empty-state" aria-live="polite">
                    <p>{t('shell.activityDescription')}</p>
                  </div>
                </aside>

                <section className="panel" id="units">
                  <div className="panel-heading">
                    <h2>{t('shell.units')}</h2>
                  </div>
                  <div className="empty-state">
                    <p>{t('shell.unitsDescription')}</p>
                  </div>
                </section>

                <section className="panel" id="missions">
                  <div className="panel-heading">
                    <h2>{t('shell.controls')}</h2>
                  </div>
                  <div className="empty-state">
                    <p>{t('shell.controlsDescription')}</p>
                  </div>
                </section>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}
