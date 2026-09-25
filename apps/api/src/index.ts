export { buildApp, type BuildAppOptions } from './app.js';
export {
  ConfigurationError,
  loadConfig,
  supportedLogLevels,
  type ApiConfig,
  type LogLevel,
} from './config.js';
export {
  type HealthCheckResult,
  type HealthProbe,
  type HealthStatus,
} from './health.js';
export {
  ApiProblem,
  type ApiProblemOptions,
  type ProblemDetails,
  type ProblemFieldError,
} from './problems.js';

export const workspaceName = '@mission-control/api';
