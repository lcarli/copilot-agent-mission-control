interface PendingMutation {
  readonly path: string;
  readonly body: string;
  readonly key: string;
}

export class InstructorRequests {
  #pending: PendingMutation | undefined;
  #sending = false;
  #generation = 0;

  constructor(
    private readonly token: () => Promise<string>,
    private readonly onState: (pending: boolean, sending: boolean) => void,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  reset() {
    this.#generation += 1;
    this.#pending = undefined;
    this.#sending = false;
    this.onState(false, false);
  }

  async #request(path: string, mutation?: PendingMutation): Promise<unknown> {
    const generation = this.#generation;
    const token = await this.token();
    if (generation !== this.#generation)
      throw new Error('Instructor identity changed.');
    const fetcher = this.fetcher;
    const response = await fetcher(`/api/v1/${path}`, {
      method: mutation === undefined ? 'GET' : 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
      headers: {
        authorization: `Bearer ${token}`,
        ...(mutation === undefined
          ? {}
          : {
              'content-type': 'application/json',
              'idempotency-key': mutation.key,
            }),
      },
      ...(mutation === undefined ? {} : { body: mutation.body }),
    });
    if (generation !== this.#generation)
      throw new Error('Instructor identity changed.');
    if (!response.ok) {
      if (
        mutation !== undefined &&
        response.status < 500 &&
        response.status !== 429
      )
        this.#pending = undefined;
      const problem: unknown = await response.json();
      const code =
        typeof problem === 'object' &&
        problem !== null &&
        'code' in problem &&
        typeof problem.code === 'string' &&
        /^[a-z][a-z0-9-]{0,119}$/u.test(problem.code)
          ? ` ${problem.code}`
          : '';
      throw new Error(`HTTP ${String(response.status)}${code}`);
    }
    const value: unknown = await response.json();
    if (generation !== this.#generation)
      throw new Error('Instructor identity changed.');
    return value;
  }

  read(path: string) {
    return this.#request(path);
  }

  async mutate(path: string, body: unknown) {
    if (this.#pending !== undefined)
      throw new Error(
        'Retry the pending action before issuing another mutation.',
      );
    this.#pending = {
      path,
      body: JSON.stringify(body),
      key: crypto.randomUUID(),
    };
    return (await this.retry()).value;
  }

  async retry() {
    const pending = this.#pending;
    if (pending === undefined || this.#sending)
      throw new Error('No retryable action is available.');
    const generation = this.#generation;
    this.#sending = true;
    this.onState(true, true);
    try {
      const value = await this.#request(pending.path, pending);
      if (generation !== this.#generation)
        throw new Error('Instructor identity changed.');
      this.#pending = undefined;
      return { path: pending.path, value };
    } finally {
      if (generation === this.#generation) {
        this.#sending = false;
        this.onState(this.#pending !== undefined, false);
      }
    }
  }
}
