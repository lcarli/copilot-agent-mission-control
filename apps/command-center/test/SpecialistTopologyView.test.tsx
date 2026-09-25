import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SpecialistTopologyView } from '../src/index.js';

const translate = (key: string) => key;

describe('SpecialistTopologyView', () => {
  it('renders agents, tools, handoffs, reviews, and disagreements', () => {
    const markup = renderToStaticMarkup(
      <SpecialistTopologyView translate={translate} />,
    );

    expect(markup).toContain('Response Orchestrator');
    expect(markup).toContain('handoff-router');
    expect(markup).toContain('topology.handoff');
    expect(markup).toContain('topology.review');
    expect(markup).toContain('Coastal route safety window');
    expect(markup).toContain('<line');
  });

  it('shows only aggregated operational metadata', () => {
    const markup = renderToStaticMarkup(
      <SpecialistTopologyView translate={translate} />,
    );

    expect(markup).toContain('420 ms');
    expect(markup).toContain('topology.evidenceItems');
    expect(markup).not.toContain('prompt');
    expect(markup).not.toContain('sourceCode');
    expect(markup).not.toContain('token');
  });
});
