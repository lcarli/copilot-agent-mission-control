import { createHmac, hkdfSync } from 'node:crypto';

import { UnitTokenService } from '@mission-control/auth';

import type { DocumentBackend } from './documents.js';
import {
  DurableEventRepository,
  DurableHintRepository,
  DurableMissionRepository,
  DurableScoreRepository,
  DurableValidationRepository,
} from './repositories.js';
import { DurableWorkshopStore } from './store.js';
import { DurableWorkshopState } from './workshop-state.js';

export function createDurableWorkshopData(
  backend: DocumentBackend,
  signingKey: Uint8Array,
) {
  const store = new DurableWorkshopStore(backend, signingKey);
  const lookupKey = Buffer.from(
    hkdfSync('sha256', signingKey, '', 'mission-control-event-code-v1', 32),
  );
  return {
    unitTokens: new UnitTokenService({
      secret: signingKey,
      issuer: 'mission-control-hosted',
      audience: 'mission-control-participant',
    }),
    requests: store,
    state: new DurableWorkshopState(store),
    eventRepository: new DurableEventRepository(store),
    missionRepository: new DurableMissionRepository(store),
    scoreRepository: new DurableScoreRepository(store),
    validationRepository: new DurableValidationRepository(store),
    hintRepository: new DurableHintRepository(store),
    newEventSessionId: () => store.partition(),
    eventCodeLookup: (normalizedCode: string) =>
      createHmac('sha256', lookupKey).update(normalizedCode).digest('hex'),
  };
}
