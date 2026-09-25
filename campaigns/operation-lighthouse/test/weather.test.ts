import { describe, expect, it } from 'vitest';

import { WeatherSimulator } from '../src/index.js';

describe('WeatherSimulator', () => {
  it('returns deterministic observations for a scenario and district', () => {
    const first = new WeatherSimulator();
    const second = new WeatherSimulator();

    expect(first.getObservation('harbor')).toEqual(
      second.getObservation('harbor'),
    );
    expect(first.getObservation('harbor')).toMatchObject({
      ok: true,
      value: [
        {
          observationId: 'wx-0800-harbor',
          districtId: 'harbor',
          alert: 'wind-advisory',
        },
      ],
    });
  });

  it('advances through worsening observations and forecasts', () => {
    const simulator = new WeatherSimulator();

    expect(simulator.advance()).toEqual({
      ok: true,
      value: { step: 1, observedAt: '2026-09-25T10:00:00Z' },
    });
    expect(simulator.getObservation('east-bank')).toMatchObject({
      ok: true,
      value: [{ windKph: 77, alert: 'flood-warning' }],
    });
  });

  it('applies deterministic transient forecast failures', () => {
    const simulator = new WeatherSimulator();
    simulator.advance();

    expect(simulator.getForecast()).toMatchObject({
      ok: false,
      error: { code: 'temporarily-unavailable', retryable: true },
    });
    expect(simulator.getForecast()).toMatchObject({
      ok: true,
      value: { forecastId: 'forecast-1000' },
    });
  });

  it('isolates scenario progress and failure budgets by instance', () => {
    const first = new WeatherSimulator('storm-surge');
    const second = new WeatherSimulator('storm-surge');

    expect(first.getObservation()).toMatchObject({ ok: false });
    expect(first.getObservation()).toMatchObject({ ok: true });
    expect(second.getObservation()).toMatchObject({ ok: false });
    expect(second.step).toBe(0);
  });

  it('returns immutable projections and a bounded completion result', () => {
    const simulator = new WeatherSimulator('storm-surge');
    simulator.getObservation();
    const observations = simulator.getObservation();

    expect(observations.ok && Object.isFrozen(observations.value)).toBe(true);
    expect(simulator.advance()).toEqual({
      ok: false,
      error: {
        code: 'scenario-complete',
        message: 'Weather scenario has no later observation.',
        retryable: false,
      },
    });
  });
});
