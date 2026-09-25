import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LobbyConnectivityView } from '../src/index.js';

const translate = (key: string) => key;

describe('LobbyConnectivityView', () => {
  it('calculates connected and ready unit summaries', () => {
    const markup = renderToStaticMarkup(
      <LobbyConnectivityView
        capacity={10}
        health={[
          {
            labelKey: 'service.api',
            serviceId: 'api',
            status: 'ready',
          },
        ]}
        translate={translate}
        units={[
          {
            displayName: 'Ready Unit',
            lastSeenAt: '2026-09-25T14:00:00Z',
            locale: 'en',
            readinessPassed: 4,
            readinessTotal: 4,
            status: 'ready',
            unitId: 'unit-1',
          },
          {
            displayName: 'Offline Unit',
            lastSeenAt: '2026-09-25T13:55:00Z',
            locale: 'fr',
            readinessPassed: 3,
            readinessTotal: 4,
            status: 'disconnected',
            unitId: 'unit-2',
          },
        ]}
      />,
    );

    expect(markup).toContain('2 / 10');
    expect(markup).toContain('Ready Unit');
    expect(markup).toContain('Offline Unit');
    expect(markup).toContain('lobby.platformReady');
  });

  it('flags degraded dependencies without exposing infrastructure details', () => {
    const markup = renderToStaticMarkup(
      <LobbyConnectivityView
        health={[
          {
            labelKey: 'service.validators',
            serviceId: 'validators',
            status: 'degraded',
          },
        ]}
        translate={translate}
        units={[]}
      />,
    );

    expect(markup).toContain('lobby.platformAttention');
    expect(markup).toContain('lobby.healthStatus.degraded');
    expect(markup).not.toContain('subscription');
    expect(markup).not.toContain('resourceGroup');
  });
});
