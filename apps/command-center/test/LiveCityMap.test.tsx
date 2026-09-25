import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LiveCityMap } from '../src/index.js';

const translate = (key: string) => key;

describe('LiveCityMap', () => {
  it('renders districts, incidents, services, routes, and recovery', () => {
    const markup = renderToStaticMarkup(<LiveCityMap translate={translate} />);

    expect(markup).toContain('Harbor');
    expect(markup).toContain('Grid instability');
    expect(markup).toContain('Shelter 3');
    expect(markup).toContain('<path');
    expect(markup).toContain('69%');
    expect(markup).toContain('map.summary');
  });

  it('calculates recovery from the supplied district projection', () => {
    const markup = renderToStaticMarkup(
      <LiveCityMap
        districts={[
          {
            districtId: 'one',
            name: 'One',
            recoveryPercent: 25,
            status: 'critical',
            x: 25,
            y: 25,
          },
          {
            districtId: 'two',
            name: 'Two',
            recoveryPercent: 75,
            status: 'stable',
            x: 75,
            y: 75,
          },
        ]}
        incidents={[]}
        routes={[]}
        services={[]}
        translate={translate}
      />,
    );

    expect(markup).toContain('50%');
    expect(markup).toContain('aria-label="map.title. map.recovery: 50%"');
  });
});
