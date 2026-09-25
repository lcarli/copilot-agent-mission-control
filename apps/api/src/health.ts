export type HealthStatus = 'up' | 'down';

export interface HealthCheckResult {
  readonly name: string;
  readonly status: HealthStatus;
}

export interface HealthProbe {
  readonly name: string;
  readonly check: () => HealthStatus | Promise<HealthStatus>;
}

export async function runHealthProbes(
  probes: readonly HealthProbe[],
): Promise<readonly HealthCheckResult[]> {
  return Promise.all(
    probes.map(async ({ check, name }) => {
      try {
        return {
          name,
          status: await check(),
        };
      } catch {
        return {
          name,
          status: 'down' as const,
        };
      }
    }),
  );
}
