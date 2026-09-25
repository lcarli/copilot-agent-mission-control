import type { DistrictId } from '../world.js';
import {
  cloneFrozen,
  type SimulatorError,
  type SimulatorResult,
} from './shared.js';

export const weatherScenarioIds = [
  'accelerating-storm',
  'storm-surge',
] as const;
export type WeatherScenarioId = (typeof weatherScenarioIds)[number];
export type WeatherAlert =
  'none' | 'wind-advisory' | 'flood-warning' | 'storm-surge-warning';

export interface WeatherObservation {
  readonly observationId: string;
  readonly observedAt: string;
  readonly districtId: DistrictId;
  readonly temperatureCelsius: number;
  readonly windKph: number;
  readonly precipitationMmPerHour: number;
  readonly visibilityKm: number;
  readonly alert: WeatherAlert;
}

export interface WeatherForecastPeriod {
  readonly startsAt: string;
  readonly durationHours: number;
  readonly expectedWindKph: number;
  readonly precipitationProbabilityPercent: number;
  readonly expectedPrecipitationMm: number;
  readonly coastalSurgeMeters: number;
  readonly alert: WeatherAlert;
}

export interface WeatherForecast {
  readonly forecastId: string;
  readonly issuedAt: string;
  readonly scenarioId: WeatherScenarioId;
  readonly periods: readonly WeatherForecastPeriod[];
}

interface WeatherStep {
  readonly observedAt: string;
  readonly observations: readonly WeatherObservation[];
  readonly forecast: WeatherForecast;
  readonly failures?: Readonly<
    Partial<Record<'observations' | 'forecast', number>>
  >;
}

interface WeatherScenario {
  readonly scenarioId: WeatherScenarioId;
  readonly steps: readonly WeatherStep[];
}

const districts: readonly DistrictId[] = [
  'harbor',
  'old-town',
  'north-hills',
  'east-bank',
  'civic-center',
];

const observations = (
  prefix: string,
  observedAt: string,
  windKph: number,
  rain: number,
  alert: WeatherAlert,
): readonly WeatherObservation[] =>
  districts.map((districtId, index) => ({
    observationId: `${prefix}-${districtId}`,
    observedAt,
    districtId,
    temperatureCelsius: 19 - index * 0.4,
    windKph: windKph + index * 2,
    precipitationMmPerHour: rain + index * 0.6,
    visibilityKm: Math.max(1.5, 8 - rain / 3 - index * 0.3),
    alert,
  }));

const scenarios: Readonly<Record<WeatherScenarioId, WeatherScenario>> = {
  'accelerating-storm': {
    scenarioId: 'accelerating-storm',
    steps: [
      {
        observedAt: '2026-09-25T08:00:00Z',
        observations: observations(
          'wx-0800',
          '2026-09-25T08:00:00Z',
          52,
          8,
          'wind-advisory',
        ),
        forecast: {
          forecastId: 'forecast-0800',
          issuedAt: '2026-09-25T08:00:00Z',
          scenarioId: 'accelerating-storm',
          periods: [
            {
              startsAt: '2026-09-25T09:00:00Z',
              durationHours: 2,
              expectedWindKph: 68,
              precipitationProbabilityPercent: 90,
              expectedPrecipitationMm: 24,
              coastalSurgeMeters: 1.1,
              alert: 'flood-warning',
            },
            {
              startsAt: '2026-09-25T11:00:00Z',
              durationHours: 2,
              expectedWindKph: 84,
              precipitationProbabilityPercent: 96,
              expectedPrecipitationMm: 38,
              coastalSurgeMeters: 1.8,
              alert: 'storm-surge-warning',
            },
          ],
        },
      },
      {
        observedAt: '2026-09-25T10:00:00Z',
        observations: observations(
          'wx-1000',
          '2026-09-25T10:00:00Z',
          71,
          14,
          'flood-warning',
        ),
        forecast: {
          forecastId: 'forecast-1000',
          issuedAt: '2026-09-25T10:00:00Z',
          scenarioId: 'accelerating-storm',
          periods: [
            {
              startsAt: '2026-09-25T11:00:00Z',
              durationHours: 2,
              expectedWindKph: 91,
              precipitationProbabilityPercent: 98,
              expectedPrecipitationMm: 45,
              coastalSurgeMeters: 2.2,
              alert: 'storm-surge-warning',
            },
          ],
        },
        failures: { forecast: 1 },
      },
      {
        observedAt: '2026-09-25T12:00:00Z',
        observations: observations(
          'wx-1200',
          '2026-09-25T12:00:00Z',
          88,
          21,
          'storm-surge-warning',
        ),
        forecast: {
          forecastId: 'forecast-1200',
          issuedAt: '2026-09-25T12:00:00Z',
          scenarioId: 'accelerating-storm',
          periods: [
            {
              startsAt: '2026-09-25T13:00:00Z',
              durationHours: 3,
              expectedWindKph: 76,
              precipitationProbabilityPercent: 82,
              expectedPrecipitationMm: 29,
              coastalSurgeMeters: 1.6,
              alert: 'flood-warning',
            },
          ],
        },
      },
    ],
  },
  'storm-surge': {
    scenarioId: 'storm-surge',
    steps: [
      {
        observedAt: '2026-09-25T12:00:00Z',
        observations: observations(
          'surge-1200',
          '2026-09-25T12:00:00Z',
          94,
          25,
          'storm-surge-warning',
        ),
        forecast: {
          forecastId: 'surge-forecast-1200',
          issuedAt: '2026-09-25T12:00:00Z',
          scenarioId: 'storm-surge',
          periods: [
            {
              startsAt: '2026-09-25T13:00:00Z',
              durationHours: 2,
              expectedWindKph: 102,
              precipitationProbabilityPercent: 100,
              expectedPrecipitationMm: 51,
              coastalSurgeMeters: 2.8,
              alert: 'storm-surge-warning',
            },
          ],
        },
        failures: { observations: 1 },
      },
    ],
  },
};

const failure = (operation: string): SimulatorResult<never> => ({
  ok: false,
  error: {
    code: 'temporarily-unavailable',
    message: `Weather ${operation} is temporarily unavailable.`,
    retryable: true,
  },
});

export class WeatherSimulator {
  readonly #scenario: WeatherScenario;
  readonly #remainingFailures = new Map<string, number>();
  #stepIndex = 0;

  public constructor(scenarioId: WeatherScenarioId = 'accelerating-storm') {
    this.#scenario = scenarios[scenarioId];
    this.#loadFailures();
  }

  public get scenarioId(): WeatherScenarioId {
    return this.#scenario.scenarioId;
  }

  public get step(): number {
    return this.#stepIndex;
  }

  public getObservation(
    districtId?: DistrictId,
  ): SimulatorResult<readonly WeatherObservation[]> {
    if (this.#consumeFailure('observations')) {
      return failure('observations');
    }
    const observations = this.#currentStep().observations.filter(
      (observation) =>
        districtId === undefined || observation.districtId === districtId,
    );
    if (observations.length === 0) {
      const error: SimulatorError = {
        code: 'not-found',
        message: `No weather observation exists for district ${String(districtId)}.`,
        retryable: false,
      };
      return { ok: false, error };
    }
    return { ok: true, value: cloneFrozen(observations) };
  }

  public getForecast(): SimulatorResult<WeatherForecast> {
    if (this.#consumeFailure('forecast')) {
      return failure('forecast');
    }
    return { ok: true, value: cloneFrozen(this.#currentStep().forecast) };
  }

  public advance(): SimulatorResult<{
    readonly step: number;
    readonly observedAt: string;
  }> {
    if (this.#stepIndex >= this.#scenario.steps.length - 1) {
      return {
        ok: false,
        error: {
          code: 'scenario-complete',
          message: 'Weather scenario has no later observation.',
          retryable: false,
        },
      };
    }
    this.#stepIndex += 1;
    this.#loadFailures();
    return {
      ok: true,
      value: {
        step: this.#stepIndex,
        observedAt: this.#currentStep().observedAt,
      },
    };
  }

  #consumeFailure(operation: 'observations' | 'forecast'): boolean {
    const remaining = this.#remainingFailures.get(operation) ?? 0;
    if (remaining === 0) {
      return false;
    }
    this.#remainingFailures.set(operation, remaining - 1);
    return true;
  }

  #currentStep(): WeatherStep {
    const step = this.#scenario.steps[this.#stepIndex];
    if (step === undefined) {
      throw new Error('Weather scenario step is unavailable.');
    }
    return step;
  }

  #loadFailures(): void {
    this.#remainingFailures.clear();
    for (const [operation, count] of Object.entries(
      this.#currentStep().failures ?? {},
    )) {
      this.#remainingFailures.set(operation, count);
    }
  }
}
