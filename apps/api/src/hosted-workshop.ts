import { ConfigurationError } from './config.js';
import { buildWorkshopApp, type WorkshopOptions } from './workshop.js';

export function buildHostedWorkshopApp(options: WorkshopOptions) {
  if (
    options.runtime.profile.mode !== 'hosted' ||
    options.runtime.readinessProbes.length === 0 ||
    options.runtime.eventProbes.length === 0
  ) {
    throw new ConfigurationError(
      'Hosted workshop requires durable runtime dependencies and dependency health probes.',
    );
  }
  return buildWorkshopApp(options);
}
