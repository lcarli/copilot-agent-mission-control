export {
  ParticipantAuthenticationError,
  ParticipantAuthSession,
  createEnvironmentTokenSource,
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
  runParticipantDiagnostics,
  type DiagnosticResult,
  type DiagnosticStatus,
  type ParticipantDiagnosticOptions,
} from './diagnostics.js';
export {
  createParticipantProgram,
  type ParticipantCliDependencies,
} from './program.js';
export { createCliLocalizer } from './translations.js';

export const workspaceName = '@mission-control/participant-cli';
