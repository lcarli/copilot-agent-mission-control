import { describe, expect, it } from 'vitest';

import { IncidentIntakeSimulator } from '../src/index.js';

describe('IncidentIntakeSimulator', () => {
  it('provides reports in all supported campaign languages', () => {
    const simulator = new IncidentIntakeSimulator();
    const result = simulator.getReports();

    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.value.map(({ locale }) => locale)).toEqual([
        'en',
        'fr',
        'pt-BR',
      ]);
    }
  });

  it('exposes probable duplicates without merging their evidence', () => {
    const simulator = new IncidentIntakeSimulator();

    expect(simulator.getDuplicateGroup('incident-001')).toMatchObject({
      ok: true,
      value: [
        { reportId: 'incident-001', locale: 'en' },
        { reportId: 'incident-002', locale: 'fr' },
      ],
    });
  });

  it('preserves explicit missing-data markers and supports filtering', () => {
    const simulator = new IncidentIntakeSimulator();

    expect(simulator.getReports({ locale: 'pt-BR' })).toMatchObject({
      ok: true,
      value: [
        {
          reportId: 'incident-003',
          missingFields: ['location', 'people-affected', 'current-hazard'],
        },
      ],
    });
    expect(
      simulator.getReports({ locale: 'pt-BR', includeIncomplete: false }),
    ).toEqual({ ok: true, value: [] });
  });

  it('releases contradictory reports in a deterministic later batch', () => {
    const simulator = new IncidentIntakeSimulator();

    expect(simulator.getContradictions('incident-004')).toMatchObject({
      ok: false,
      error: { code: 'not-found' },
    });
    expect(simulator.advance()).toEqual({ ok: true, value: { batch: 1 } });
    expect(simulator.getContradictions('incident-004')).toMatchObject({
      ok: true,
      value: [{ reportId: 'incident-005' }],
    });
  });

  it('isolates progression and returns immutable report batches', () => {
    const first = new IncidentIntakeSimulator();
    const second = new IncidentIntakeSimulator();
    first.advance();

    const firstReports = first.getReports();
    const secondReports = second.getReports();
    expect(firstReports).not.toEqual(secondReports);
    expect(firstReports.ok && Object.isFrozen(firstReports.value)).toBe(true);
  });
});
