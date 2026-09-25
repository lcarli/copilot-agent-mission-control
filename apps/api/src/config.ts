export const supportedLogLevels = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
] as const;

export type LogLevel = (typeof supportedLogLevels)[number];

export interface ApiConfig {
  readonly apiVersion: 'v1';
  readonly host: string;
  readonly logLevel: LogLevel;
  readonly port: number;
  readonly serviceName: string;
  readonly serviceVersion: string;
  readonly supportedLocales: readonly ['en', 'fr', 'pt-BR'];
}

export class ConfigurationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

function readPort(value: string | undefined): number {
  if (value === undefined) {
    return 3000;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new ConfigurationError(
      'PORT must be an integer between 1 and 65535.',
    );
  }

  return port;
}

function readLogLevel(value: string | undefined): LogLevel {
  if (value === undefined) {
    return 'info';
  }
  if (!supportedLogLevels.includes(value as LogLevel)) {
    throw new ConfigurationError(
      `LOG_LEVEL must be one of: ${supportedLogLevels.join(', ')}.`,
    );
  }

  return value as LogLevel;
}

function readNonEmpty(
  name: string,
  value: string | undefined,
  fallback: string,
): string {
  const resolved = value ?? fallback;
  if (resolved.trim().length === 0) {
    throw new ConfigurationError(`${name} must not be empty.`);
  }

  return resolved;
}

export function loadConfig(
  environment: NodeJS.ProcessEnv = process.env,
): ApiConfig {
  return {
    apiVersion: 'v1',
    host: readNonEmpty('HOST', environment.HOST, '0.0.0.0'),
    logLevel: readLogLevel(environment.LOG_LEVEL),
    port: readPort(environment.PORT),
    serviceName: '@mission-control/api',
    serviceVersion: readNonEmpty(
      'SERVICE_VERSION',
      environment.SERVICE_VERSION,
      '0.0.0',
    ),
    supportedLocales: ['en', 'fr', 'pt-BR'],
  };
}
