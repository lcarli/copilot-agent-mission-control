import { randomBytes, timingSafeEqual } from 'node:crypto';

import { authorizeInstructor, UnitTokenService } from '@mission-control/auth';
import { InMemoryEventUnitRepository } from '@mission-control/event-management';
import { InMemoryHintUsageRepository } from '@mission-control/hint-system';
import { InMemoryMissionRepository } from '@mission-control/mission-management';
import { InMemoryScoreLedgerRepository } from '@mission-control/scoring';
import { InMemoryValidationResultRepository } from '@mission-control/validation-worker';

import { loadConfig } from './config.js';
import { LocalRequests, workshopProblem } from './local-requests.js';
import { MemoryWorkshopState } from './memory-workshop-state.js';
import { buildWorkshopApp } from './workshop.js';
import type { WorkshopRuntime } from './workshop-runtime.js';

export interface LocalWorkshopOptions {
  readonly instructorToken: string;
  readonly logger?: boolean;
  readonly port?: number;
}

export function createLocalWorkshopRuntime(
  instructorToken: string,
): WorkshopRuntime {
  if (
    instructorToken.length < 32 ||
    instructorToken.length > 512 ||
    /\s/u.test(instructorToken)
  ) {
    throw new Error(
      'A local instructor token of 32-512 non-whitespace characters is required.',
    );
  }
  const expected = Buffer.from(instructorToken);
  return {
    profile: {
      mode: 'local-rehearsal',
      persistence: 'memory',
      transport: 'http-polling',
      source: 'local-event',
      closeConfirmationPhrase: 'CLOSE LOCAL EVENT',
    },
    eventRepository: new InMemoryEventUnitRepository(),
    missionRepository: new InMemoryMissionRepository(),
    scoreRepository: new InMemoryScoreLedgerRepository(),
    validationRepository: new InMemoryValidationResultRepository(),
    hintRepository: new InMemoryHintUsageRepository(),
    unitTokens: new UnitTokenService({
      secret: randomBytes(32),
      issuer: 'mission-control-local',
      audience: 'mission-control-local-participant',
    }),
    requests: new LocalRequests(),
    state: new MemoryWorkshopState(),
    readinessProbes: [],
    eventProbes: [{ name: 'local-in-memory-runtime', check: () => 'up' }],
    authorizeInstructor(authorization, action, eventSessionId) {
      const supplied = Buffer.from(
        authorization?.startsWith('Bearer ') ? authorization.slice(7) : '',
      );
      if (
        supplied.length !== expected.length ||
        !timingSafeEqual(supplied, expected)
      )
        throw workshopProblem('instructor-authentication-required', 401);
      return Promise.resolve(
        authorizeInstructor(
          {
            subject: 'local-instructor',
            tenantId: 'local-rehearsal',
            active: true,
            roles: new Set(['event-admin']),
            eventSessionIds: '*',
          },
          action,
          eventSessionId,
        ),
      );
    },
    close: () => Promise.resolve(),
  };
}

export function buildLocalWorkshopApp(options: LocalWorkshopOptions) {
  return buildWorkshopApp({
    runtime: createLocalWorkshopRuntime(options.instructorToken),
    config: loadConfig({
      HOST: '127.0.0.1',
      PORT: String(options.port ?? 3000),
    }),
    logger: options.logger ?? false,
  });
}
