export { AuthenticationError, type AuthenticationErrorCode } from './errors.js';
export {
  createEventCode,
  formatEventCode,
  generateEventCode,
  hashEventCode,
  normalizeEventCode,
  verifyEventCode,
} from './event-code.js';
export {
  authorizeInstructor,
  type InstructorAction,
  type InstructorActor,
  type InstructorPrincipal,
  type InstructorRole,
} from './instructor.js';
export {
  UnitTokenService,
  type IssueUnitTokenInput,
  type UnitTokenClaims,
  type UnitTokenServiceOptions,
  type VerifyUnitTokenOptions,
} from './unit-token.js';
