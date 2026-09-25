import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CommandCenterApp } from '../src/index.js';

describe('CommandCenterApp', () => {
  it('renders accessible application landmarks and controls', () => {
    const markup = renderToStaticMarkup(<CommandCenterApp />);

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
      <CommandCenterApp initialLocale="pt-BR" />,
    );

    expect(markup).toContain('Centro de Comando Operação Farol');
    expect(markup).toContain('Status do evento');
    expect(markup).toContain('Progresso das unidades');
  });
});
