import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  PublicPresentationView,
  type PublicPresentationProjection,
} from '../src/index.js';

const translate = (key: string) => key;

describe('PublicPresentationView', () => {
  it('renders large-screen public event status', () => {
    const markup = renderToStaticMarkup(
      <PublicPresentationView translate={translate} />,
    );

    expect(markup).toContain('Operation Lighthouse');
    expect(markup).toContain('Mission 4 · Unified Response');
    expect(markup).toContain('Beacon Builders');
    expect(markup).toContain('presentation.collectiveRecovery');
    expect(markup).toContain('<progress');
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
