import { HintSystemError } from './errors.js';
import type { HintUsageRepository } from './repository.js';
import type {
  HintContextResolver,
  HintPolicy,
  HintPolicyResolver,
  HintUsage,
  RequestHintInput,
} from './types.js';

export interface HintServiceOptions {
  readonly clock?: () => Date;
  readonly contextResolver: HintContextResolver;
  readonly policyResolver: HintPolicyResolver;
  readonly repository: HintUsageRepository;
}

export class HintService {
  readonly #clock: () => Date;
  readonly #contextResolver: HintContextResolver;
  readonly #policyResolver: HintPolicyResolver;
  readonly #repository: HintUsageRepository;

  public constructor(options: HintServiceOptions) {
    this.#clock = options.clock ?? (() => new Date());
    this.#contextResolver = options.contextResolver;
    this.#policyResolver = options.policyResolver;
    this.#repository = options.repository;
  }

  public async requestNext(input: RequestHintInput): Promise<HintUsage> {
    this.#validateRequest(input);
    const replay = await this.#repository.getReplay(input);
    if (replay !== undefined) {
      return replay;
    }
    const context = await this.#contextResolver.resolve(input);
    if (
      context.eventSessionId !== input.eventSessionId ||
      context.unitId !== input.unitId ||
      context.missionId !== input.missionId
    ) {
      throw new HintSystemError('hint-scope-mismatch');
    }
    if (context.eventStatus !== 'open') {
      throw new HintSystemError('hint-event-not-open');
    }
    if (
      context.unitStatus === 'muted' ||
      context.unitStatus === 'withdrawn' ||
      context.unitStatus === 'completed'
    ) {
      throw new HintSystemError('hint-unit-not-eligible');
    }
    if (
      context.missionRunStatus !== 'active' &&
      context.missionRunStatus !== 'submitted'
    ) {
      throw new HintSystemError('hint-mission-not-active');
    }

    const policy = await this.#policyResolver.resolve(
      context.missionId,
      context.missionVersion,
    );
    this.#validatePolicy(policy, context.missionId, context.missionVersion);
    return this.#repository.deliverNext(
      input,
      policy,
      this.#clock().toISOString(),
    );
  }

  public listUsage(
    eventSessionId: string,
    unitId: string,
    missionId?: string,
  ): Promise<readonly HintUsage[]> {
    return this.#repository.list(eventSessionId, unitId, missionId);
  }

  #validateRequest(input: RequestHintInput): void {
    if (
      input.eventSessionId.trim().length === 0 ||
      input.unitId.trim().length === 0 ||
      input.missionId.trim().length === 0 ||
      input.idempotencyKey.trim().length === 0 ||
      input.idempotencyKey.length > 200
    ) {
      throw new HintSystemError('hint-request-invalid');
    }
  }

  #validatePolicy(
    policy: HintPolicy,
    missionId: string,
    missionVersion: string,
  ): void {
    const levels = policy.hints.map(({ level }) => level);
    if (
      policy.missionId !== missionId ||
      policy.missionVersion !== missionVersion ||
      levels.length !== 3 ||
      levels.some((level, index) => level !== index + 1) ||
      policy.hints.some(({ contentKey }) => contentKey.trim().length === 0) ||
      Object.values(policy.bonusAdjustments).some(
        (points) => !Number.isInteger(points) || points > 0,
      )
    ) {
      throw new HintSystemError('hint-policy-invalid');
    }
  }
}
