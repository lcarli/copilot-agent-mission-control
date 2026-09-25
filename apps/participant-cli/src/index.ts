export {
  ParticipantAuthenticationError,
  ParticipantAuthSession,
  createEnvironmentTokenSource,
  createMutableTokenSource,
  type MutableParticipantTokenSource,
  type ParticipantTokenClaims,
  type ParticipantTokenSource,
} from './auth.js';
export {
  FileParticipantConfigRepository,
  ParticipantConfigError,
  defaultParticipantConfigPath,
  validateParticipantConfig,
  type ParticipantCliConfig,
  type ParticipantConfigRepository,
} from './config.js';
export {
  FileParticipantCredentialRepository,
  ParticipantCredentialError,
  defaultParticipantCredentialPath,
  type ParticipantCredentialRepository,
  type ParticipantCredentials,
} from './credentials.js';
export {
  runParticipantDiagnostics,
  type DiagnosticResult,
  type DiagnosticStatus,
  type ParticipantDiagnosticOptions,
} from './diagnostics.js';
export {
  createParticipantProgram,
  type ParticipantCliDependencies,
} from './program.js';
export {
  HttpParticipantRegistrationClient,
  ParticipantRegistrationError,
  type ConnectivityCheckResult,
  type HttpParticipantRegistrationClientOptions,
  type JoinedEventSummary,
  type JoinEventRequest,
  type ParticipantRegistrationClient,
} from './registration.js';
export { createCliLocalizer } from './translations.js';

export const workspaceName = '@mission-control/participant-cli';
