import { AuthenticationError } from '@mission-control/auth';
import { EventManagementError } from '@mission-control/event-management';
import { HintSystemError } from '@mission-control/hint-system';
import { MissionManagementError } from '@mission-control/mission-management';

import { workshopProblem } from './local-requests.js';
import { ApiProblem } from './problems.js';

export function knownWorkshopProblem(error: unknown): ApiProblem | undefined {
  if (error instanceof ApiProblem) return error;
  if (
    error instanceof AuthenticationError ||
    error instanceof EventManagementError ||
    error instanceof MissionManagementError ||
    error instanceof HintSystemError
  ) {
    const code = error.code;
    const status = code.endsWith('not-found')
      ? 404
      : code === 'unit-token-invalid'
        ? 401
        : code.includes('denied') || error instanceof AuthenticationError
          ? 403
          : 409;
    return workshopProblem(code, status);
  }
  return undefined;
}
