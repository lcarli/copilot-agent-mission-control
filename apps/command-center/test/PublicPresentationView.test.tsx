import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  PublicPresentationView,
  type PublicPresentationProjection,
} from '../src/index.js';

const translate = (key: string) => key;

describe('PublicPresentationView', () => {
  it('does not invent participant achievements when no event is connected', () => {
    const markup = renderToStaticMarkup(
      <PublicPresentationView translate={translate} />,
    );

    expect(markup).toContain('presentation.disconnected');
    expect(markup).not.toContain('Beacon Builders');
    expect(markup).not.toContain('presentation.live');
    expect(markup).not.toContain('<progress');
  });

  it('renders only the explicit public projection allowlist', () => {
    const projection = {
      activeMission: {
        phase: 'Analysis',
        progressPercent: 50,
        title: 'Public mission',
      },
      collectiveRecoveryPercent: 55,
      connectedUnitCount: 2,
      districts: [],
      eventName: 'Public event',
      participantEmail: 'private@example.com',
      prompt: 'private prompt',
      rankings: [{ moderatedUnitName: 'Safe Name', rank: 1, score: 10 }],
      recognitions: [],
      sourceCode: 'private source',
      token: 'private token',
    } as PublicPresentationProjection;

    const markup = renderToStaticMarkup(
      <PublicPresentationView projection={projection} translate={translate} />,
    );

    expect(markup).toContain('Safe Name');
    expect(markup).not.toContain('private@example.com');
    expect(markup).not.toContain('private prompt');
    expect(markup).not.toContain('private source');
    expect(markup).not.toContain('private token');
  });
});
