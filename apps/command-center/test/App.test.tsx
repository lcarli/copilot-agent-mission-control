import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CommandCenterApp } from '../src/index.js';

describe('CommandCenterApp', () => {
  it('renders accessible application landmarks and controls', () => {
    const markup = renderToStaticMarkup(
      <CommandCenterApp initialView="dashboard" />,
    );

    expect(markup).toContain('<header');
    expect(markup).toContain('<nav');
    expect(markup).toContain('<main');
    expect(markup).toContain('<aside');
    expect(markup).toContain('href="#command-center"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('value="pt-BR"');
  });

  it('renders a localized shell from the initial locale', () => {
    const markup = renderToStaticMarkup(
      <CommandCenterApp initialLocale="pt-BR" initialView="dashboard" />,
    );

    expect(markup).toContain('Centro de Comando Operação Farol');
    expect(markup).toContain('Status do evento');
    expect(markup).toContain('Progresso das unidades');
  });

  it('renders the guided setup flow by default', () => {
    const markup = renderToStaticMarkup(<CommandCenterApp />);

    expect(markup).toContain('Prepare a new event');
    expect(markup).toContain('Operation Lighthouse 1.0');
    expect(markup).toContain('Participant languages');
    expect(markup).toContain('Event setup progress');
  });

  it('renders the lobby and connectivity projection', () => {
    const markup = renderToStaticMarkup(
      <CommandCenterApp initialView="lobby" />,
    );

    expect(markup).toContain('Units and connectivity');
    expect(markup).toContain('Harbor Team');
    expect(markup).toContain('Platform health');
    expect(markup).toContain('<progress');
  });

  it('renders mission controls from the mission navigation view', () => {
    const markup = renderToStaticMarkup(
      <CommandCenterApp initialView="missions" />,
    );

    expect(markup).toContain('Mission control');
    expect(markup).toContain('Publish hint');
    expect(markup).toContain('Incident modifiers');
  });

  it('renders authoritative unit scoring projections', () => {
    const markup = renderToStaticMarkup(
      <CommandCenterApp initialView="scores" />,
    );

    expect(markup).toContain('Unit progress and scoring');
    expect(markup).toContain('Server-calculated');
    expect(markup).toContain('Harbor Team');
  });

  it('renders the specialist topology projection', () => {
    const markup = renderToStaticMarkup(
      <CommandCenterApp initialView="topology" />,
    );

    expect(markup).toContain('Agent topology');
    expect(markup).toContain('Response Orchestrator');
    expect(markup).toContain('Coordination activity');
  });

  it('renders the multilingual public presentation projection', () => {
    const markup = renderToStaticMarkup(
      <CommandCenterApp initialLocale="fr" initialView="presentation" />,
    );

    expect(markup).toContain('Affichage public en direct');
    expect(markup).toContain('Operation Lighthouse');
    expect(markup).toContain('Rétablissement collectif');
    expect(markup).toContain(
      'les données personnelles et opérationnelles sensibles ne sont pas affichées',
    );
  });
});
