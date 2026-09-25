import { describe, expect, it } from 'vitest';

import { TransportSimulator } from '../src/index.js';

describe('TransportSimulator', () => {
  it('publishes deterministic route status and travel constraints', () => {
    const simulator = new TransportSimulator();

    expect(simulator.getRoutes('harbor')).toMatchObject({
      ok: true,
      value: [
        {
          routeId: 'harbor-east-bank',
          status: 'closed',
          allowedModes: [],
        },
        {
          routeId: 'harbor-old-town',
          status: 'constrained',
          allowedModes: ['emergency', 'pedestrian'],
          travelMinutes: 22,
        },
      ],
    });
  });

  it('plans the fastest available route for the selected mode', () => {
    const simulator = new TransportSimulator();

    expect(simulator.planJourney('harbor', 'east-bank', 'emergency')).toEqual({
      ok: true,
      value: {
        originDistrictId: 'harbor',
        destinationDistrictId: 'east-bank',
        mode: 'emergency',
        routeIds: [
          'harbor-old-town',
          'old-town-civic-center',
          'civic-center-east-bank',
        ],
        districtIds: ['harbor', 'old-town', 'civic-center', 'east-bank'],
        totalMinutes: 51,
      },
    });
  });

  it('replans after controlled closures and route updates', () => {
    const simulator = new TransportSimulator();
    simulator.updateRoute({
      routeId: 'civic-center-east-bank',
      status: 'closed',
      delayMinutes: 0,
      allowedModes: [],
      restrictionReason: 'flooded-underpass',
    });

    expect(
      simulator.planJourney('harbor', 'east-bank', 'emergency'),
    ).toMatchObject({
      ok: true,
      value: {
        routeIds: [
          'harbor-old-town',
          'old-town-north-hills',
          'north-hills-east-bank',
        ],
        totalMinutes: 56,
      },
    });
  });

  it('rejects modes unsupported by the route definition', () => {
    const simulator = new TransportSimulator();

    expect(
      simulator.updateRoute({
        routeId: 'harbor-east-bank',
        status: 'open',
        delayMinutes: 0,
        allowedModes: ['bus'],
      }),
    ).toMatchObject({
      ok: false,
      error: { code: 'constraint-violation' },
    });
  });

  it('isolates updates and returns immutable route projections', () => {
    const first = new TransportSimulator();
    const second = new TransportSimulator();
    first.updateRoute({
      routeId: 'old-town-north-hills',
      status: 'closed',
      delayMinutes: 0,
      allowedModes: [],
    });

    expect(first.getRoutes('north-hills')).not.toEqual(
      second.getRoutes('north-hills'),
    );
    const result = first.getRoutes();
    expect(result.ok && Object.isFrozen(result.value)).toBe(true);
  });
});
