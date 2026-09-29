import { isDeepStrictEqual } from 'node:util';

import { ApiProblem } from './problems.js';

export const workshopProblem = (code: string, status = 409): ApiProblem =>
  new ApiProblem({
    code,
    messageKey: `errors.workshop.${code}`,
    status,
    title: code.replaceAll('-', ' '),
  });

export class LocalRequests {
  readonly #pending = new Map<string, Promise<unknown>>();
  readonly #replays = new Map<
    string,
    {
      readonly body: unknown;
      readonly result: Promise<unknown>;
    }
  >();

  serialize<T>(resource: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.#pending.get(resource) ?? Promise.resolve();
    // A failed request must not prevent the next request from acquiring the lock.
    const result = previous.then(operation, operation);
    this.#pending.set(resource, result);
    const release = () => {
      if (this.#pending.get(resource) === result)
        this.#pending.delete(resource);
    };
    void result.then(release, release);
    return result;
  }

  mutate(
    resource: string,
    scope: readonly string[],
    key: string | string[] | undefined,
    body: unknown,
    operation: () => Promise<unknown>,
  ): Promise<unknown> {
    if (typeof key !== 'string' || !/^[A-Za-z0-9._:-]{1,200}$/u.test(key)) {
      throw workshopProblem('idempotency-key-required', 422);
    }
    const replayKey = JSON.stringify([...scope, key]);
    const replay = this.#replays.get(replayKey);
    if (replay !== undefined) {
      if (!isDeepStrictEqual(replay.body, body)) {
        throw workshopProblem('idempotency-key-reused');
      }
      return replay.result;
    }
    if (this.#replays.size >= 10_000) {
      throw workshopProblem('local-request-capacity-reached', 503);
    }
    const result = this.serialize(resource, operation);
    this.#replays.set(replayKey, { body: structuredClone(body), result });
    return result;
  }
}
