import type { SupportedLocale } from '@mission-control/localization';

import type { DistrictId, ServiceId } from '../world.js';
import { cloneFrozen, type SimulatorResult } from './shared.js';

export type IncidentCategory =
  'flooding' | 'medical' | 'power' | 'transport' | 'communications';
export type IncidentSeverity =
  'unknown' | 'low' | 'moderate' | 'high' | 'critical';

export interface IncidentReport {
  readonly reportId: string;
  readonly receivedAt: string;
  readonly locale: SupportedLocale;
  readonly text: string;
  readonly reporterType: 'resident' | 'field-team' | 'sensor' | 'operator';
  readonly districtId?: DistrictId;
  readonly category?: IncidentCategory;
  readonly severity: IncidentSeverity;
  readonly affectedServiceIds: readonly ServiceId[];
  readonly missingFields: readonly (
    'location' | 'category' | 'people-affected' | 'current-hazard'
  )[];
  readonly duplicateGroupId?: string;
  readonly contradictsReportIds: readonly string[];
}

export interface IncidentQuery {
  readonly locale?: SupportedLocale;
  readonly districtId?: DistrictId;
  readonly includeIncomplete?: boolean;
}

const batches: readonly (readonly IncidentReport[])[] = [
  [
    {
      reportId: 'incident-001',
      receivedAt: '2026-09-25T08:12:00Z',
      locale: 'en',
      text: 'Water is entering homes near Harbor Pier 4. Three residents need assistance.',
      reporterType: 'resident',
      districtId: 'harbor',
      category: 'flooding',
      severity: 'high',
      affectedServiceIds: ['water-pumping'],
      missingFields: ['current-hazard'],
      duplicateGroupId: 'harbor-pier-4-flood',
      contradictsReportIds: [],
    },
    {
      reportId: 'incident-002',
      receivedAt: '2026-09-25T08:14:00Z',
      locale: 'fr',
      text: "L'eau monte près du quai 4 du port. Trois personnes attendent de l'aide.",
      reporterType: 'field-team',
      districtId: 'harbor',
      category: 'flooding',
      severity: 'high',
      affectedServiceIds: ['water-pumping'],
      missingFields: [],
      duplicateGroupId: 'harbor-pier-4-flood',
      contradictsReportIds: [],
    },
    {
      reportId: 'incident-003',
      receivedAt: '2026-09-25T08:18:00Z',
      locale: 'pt-BR',
      text: 'Sem energia. Precisamos de ajuda imediatamente.',
      reporterType: 'resident',
      category: 'power',
      severity: 'unknown',
      affectedServiceIds: [],
      missingFields: ['location', 'people-affected', 'current-hazard'],
      contradictsReportIds: [],
    },
  ],
  [
    {
      reportId: 'incident-004',
      receivedAt: '2026-09-25T09:02:00Z',
      locale: 'en',
      text: 'Transit Control reports the East Bank underpass is closed by flooding.',
      reporterType: 'operator',
      districtId: 'east-bank',
      category: 'transport',
      severity: 'high',
      affectedServiceIds: ['transit-control'],
      missingFields: [],
      contradictsReportIds: ['incident-005'],
    },
    {
      reportId: 'incident-005',
      receivedAt: '2026-09-25T09:04:00Z',
      locale: 'fr',
      text: "Un conducteur affirme que le passage souterrain d'East Bank reste ouvert.",
      reporterType: 'resident',
      districtId: 'east-bank',
      category: 'transport',
      severity: 'moderate',
      affectedServiceIds: ['transit-control'],
      missingFields: ['people-affected'],
      contradictsReportIds: ['incident-004'],
    },
    {
      reportId: 'incident-006',
      receivedAt: '2026-09-25T09:08:00Z',
      locale: 'pt-BR',
      text: 'Hospital Geral de Port Azure opera com energia de emergência.',
      reporterType: 'field-team',
      districtId: 'north-hills',
      category: 'power',
      severity: 'critical',
      affectedServiceIds: ['port-azure-general'],
      missingFields: [],
      contradictsReportIds: [],
    },
  ],
];

export class IncidentIntakeSimulator {
  #batchIndex = 0;

  public getReports(
    query: IncidentQuery = {},
  ): SimulatorResult<readonly IncidentReport[]> {
    const available = batches
      .slice(0, this.#batchIndex + 1)
      .flat()
      .filter(
        (report) =>
          (query.locale === undefined || report.locale === query.locale) &&
          (query.districtId === undefined ||
            report.districtId === query.districtId) &&
          (query.includeIncomplete !== false ||
            report.missingFields.length === 0),
      );
    return { ok: true, value: cloneFrozen(available) };
  }

  public getDuplicateGroup(
    reportId: string,
  ): SimulatorResult<readonly IncidentReport[]> {
    const reports = batches.slice(0, this.#batchIndex + 1).flat();
    const report = reports.find((candidate) => candidate.reportId === reportId);
    if (report === undefined) {
      return this.#notFound(reportId);
    }
    if (report.duplicateGroupId === undefined) {
      return { ok: true, value: cloneFrozen([report]) };
    }
    return {
      ok: true,
      value: cloneFrozen(
        reports.filter(
          ({ duplicateGroupId }) =>
            duplicateGroupId === report.duplicateGroupId,
        ),
      ),
    };
  }

  public getContradictions(
    reportId: string,
  ): SimulatorResult<readonly IncidentReport[]> {
    const reports = batches.slice(0, this.#batchIndex + 1).flat();
    const report = reports.find((candidate) => candidate.reportId === reportId);
    if (report === undefined) {
      return this.#notFound(reportId);
    }
    return {
      ok: true,
      value: cloneFrozen(
        report.contradictsReportIds.flatMap((contradictionId) => {
          const contradiction = reports.find(
            (candidate) => candidate.reportId === contradictionId,
          );
          return contradiction === undefined ? [] : [contradiction];
        }),
      ),
    };
  }

  public advance(): SimulatorResult<{ readonly batch: number }> {
    if (this.#batchIndex >= batches.length - 1) {
      return {
        ok: false,
        error: {
          code: 'scenario-complete',
          message: 'Incident intake has no later report batch.',
          retryable: false,
        },
      };
    }
    this.#batchIndex += 1;
    return { ok: true, value: { batch: this.#batchIndex } };
  }

  #notFound(reportId: string): SimulatorResult<never> {
    return {
      ok: false,
      error: {
        code: 'not-found',
        message: `Unknown incident report: ${reportId}.`,
        retryable: false,
      },
    };
  }
}
