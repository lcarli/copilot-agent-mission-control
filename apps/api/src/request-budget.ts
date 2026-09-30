import { ApiProblem } from './problems.js';

export const workshopRequestLimits = Object.freeze({
  windowSeconds: 60,
  requestsPerIp: 12_000,
  authenticationPerIp: 120,
  requestsPerUnit: 240,
  mutationsPerUnit: 120,
  requestsPerEvent: 6_000,
  requestsPerInstructor: 240,
  pendingPerResource: 128,
  pendingTotal: 1_024,
  trackedBudgetScopes: 10_000,
});

export class RequestBudget {
  readonly #buckets = new Map<string, { count: number; expiresAt: number }>();
  #nextCleanup = 0;

  constructor(private readonly now: () => number = Date.now) {}

  consume(scope: readonly string[], maximum: number): void {
    if (!Number.isSafeInteger(maximum) || maximum < 1)
      throw new RangeError(
        'A request budget must have a positive integer limit.',
      );
    const now = this.now();
    const windowMs = workshopRequestLimits.windowSeconds * 1_000;
    if (now >= this.#nextCleanup) {
      for (const [key, bucket] of this.#buckets) {
        if (bucket.expiresAt <= now) this.#buckets.delete(key);
      }
      this.#nextCleanup = now + windowMs;
    }
    const key = JSON.stringify(scope);
    const bucket = this.#buckets.get(key);
    if (bucket !== undefined && bucket.expiresAt > now) {
      if (bucket.count >= maximum) {
        throw new ApiProblem({
          code: 'request-rate-limited',
          status: 429,
          title: 'Request budget exhausted; wait before retrying',
          messageKey: 'errors.workshop.request-rate-limited',
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((bucket.expiresAt - now) / 1_000),
          ),
        });
      }
      bucket.count += 1;
      return;
    }
    if (
      bucket === undefined &&
      this.#buckets.size >= workshopRequestLimits.trackedBudgetScopes
    ) {
      throw new ApiProblem({
        code: 'request-budget-capacity-reached',
        status: 503,
        title: 'Request tracking is temporarily at capacity',
        messageKey: 'errors.workshop.request-budget-capacity-reached',
        retryAfterSeconds: workshopRequestLimits.windowSeconds,
      });
    }
    this.#buckets.set(key, { count: 1, expiresAt: now + windowMs });
  }
}
