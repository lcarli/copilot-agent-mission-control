import { v7 as uuidV7 } from 'uuid';

import { HintSystemError } from './errors.js';
import type {
  HintDefinition,
  HintLevel,
  HintPolicy,
  HintUsage,
  RequestHintInput,
} from './types.js';

export interface HintUsageRepository {
  getReplay(input: RequestHintInput): Promise<HintUsage | undefined>;
  deliverNext(
    input: RequestHintInput,
    policy: HintPolicy,
    deliveredAt: string,
  ): Promise<HintUsage>;
  list(
    eventSessionId: string,
    unitId: string,
    missionId?: string,
  ): Promise<readonly HintUsage[]>;
}

const clone = <T>(value: T): T => structuredClone(value);

export class InMemoryHintUsageRepository implements HintUsageRepository {
  readonly #usages: HintUsage[] = [];
  readonly #idempotency = new Map<string, HintUsage>();

  public getReplay(input: RequestHintInput): Promise<HintUsage | undefined> {
    const replay = this.#idempotency.get(this.#idempotencyScope(input));
    return Promise.resolve(replay === undefined ? undefined : clone(replay));
  }

  public deliverNext(
    input: RequestHintInput,
    policy: HintPolicy,
    deliveredAt: string,
  ): Promise<HintUsage> {
    const idempotencyScope = this.#idempotencyScope(input);
    const replay = this.#idempotency.get(idempotencyScope);
    if (replay !== undefined) {
      return Promise.resolve(clone(replay));
    }

    const delivered = this.#usages.filter(
      (usage) =>
        usage.eventSessionId === input.eventSessionId &&
        usage.unitId === input.unitId &&
        usage.missionId === input.missionId,
    );
    const nextLevel = (delivered.length + 1) as HintLevel;
    const definition = policy.hints.find(
      (hint): hint is HintDefinition => hint.level === nextLevel,
    );
    if (definition === undefined) {
      throw new HintSystemError('hint-levels-exhausted');
    }
    const adjustmentKey =
      nextLevel === 1 ? 'level1' : nextLevel === 2 ? 'level2' : 'level3';

    const usage: HintUsage = {
      bonusAdjustmentPoints: policy.bonusAdjustments[adjustmentKey],
      contentKey: definition.contentKey,
      deliveredAt,
      eventSessionId: input.eventSessionId,
      hintUsageId: uuidV7(),
      idempotencyKey: input.idempotencyKey,
      level: nextLevel,
      missionId: input.missionId,
      missionVersion: policy.missionVersion,
      requestedAt: deliveredAt,
      unitId: input.unitId,
    };
    this.#usages.push(usage);
    this.#idempotency.set(idempotencyScope, usage);
    return Promise.resolve(clone(usage));
  }

  public list(
    eventSessionId: string,
    unitId: string,
    missionId?: string,
  ): Promise<readonly HintUsage[]> {
    return Promise.resolve(
      this.#usages
        .filter(
          (usage) =>
            usage.eventSessionId === eventSessionId &&
            usage.unitId === unitId &&
            (missionId === undefined || usage.missionId === missionId),
        )
        .map(clone),
    );
  }

  #idempotencyScope(input: RequestHintInput): string {
    return [
      input.eventSessionId,
      input.unitId,
      input.missionId,
      input.idempotencyKey,
    ].join(':');
  }
}
