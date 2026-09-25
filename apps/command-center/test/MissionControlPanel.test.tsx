import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { MissionControlPanel } from '../src/index.js';

const translate = (key: string) => key;

describe('MissionControlPanel', () => {
  it('renders mission timeline, lifecycle actions, hints, and modifiers', () => {
    const markup = renderToStaticMarkup(
      <MissionControlPanel translate={translate} />,
    );

    expect(markup).toContain('Signal in the Storm');
    expect(markup).toContain('Ground Truth');
    expect(markup).toContain('controls.action.pause');
    expect(markup).toContain('controls.publishHint');
    expect(markup).toContain('Incident surge');
    expect(markup).toContain('aria-pressed="false"');
  });

  it('only exposes valid lifecycle actions for the selected status', () => {
    const locked = renderToStaticMarkup(
      <MissionControlPanel
        missions={[
          {
            briefing: 'Briefing',
            completionPercent: 0,
            missionId: 'mission-1',
            status: 'locked',
            title: 'Mission One',
            version: 1,
          },
        ]}
        translate={translate}
      />,
    );
    expect(locked).toContain('controls.action.open');
    expect(locked).not.toContain('controls.action.pause');

    const closed = renderToStaticMarkup(
      <MissionControlPanel
        missions={[
          {
            briefing: 'Briefing',
            completionPercent: 100,
            missionId: 'mission-1',
            status: 'closed',
            title: 'Mission One',
            version: 4,
          },
        ]}
        translate={translate}
      />,
    );
    expect(closed).not.toContain('controls.action.open');
    expect(closed).toContain('disabled=""');
  });
});
