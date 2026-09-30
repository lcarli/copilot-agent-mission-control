import type { PublicPresentationProjection } from '@mission-control/event-contracts';
import { Value } from '@sinclair/typebox/value';

import { documentSchemas, type DocumentBackend } from './documents.js';
import { StateConflict, stateProblem } from './values.js';

export class PublicationWorker {
  #timer: ReturnType<typeof setTimeout> | undefined;
  #running: Promise<void> | undefined;
  #stopped = true;

  constructor(
    private readonly backend: DocumentBackend,
    private readonly publish: (
      id: string,
      projection: PublicPresentationProjection,
    ) => Promise<void>,
  ) {}

  async flush(
    projection: (id: string) => Promise<PublicPresentationProjection>,
    onError: () => void,
    shouldStop: () => boolean = () => false,
  ) {
    const pending = await this.backend.query('publication', undefined, [
      { field: 'pending', value: true },
    ]);
    for (const { document, etag } of pending) {
      if (shouldStop()) return;
      try {
        if (
          document.kind !== 'publication' ||
          document.id !== 'publication' ||
          !Value.Check(documentSchemas.publication, document.value)
        )
          throw stateProblem('publication-record-invalid', 500);
        const value = await projection(document.eventSessionId);
        if (
          value.revision === undefined ||
          value.revision < document.value.revision
        )
          throw stateProblem('publication-snapshot-behind');
        await this.publish(document.eventSessionId, value);
        await this.backend.batch(document.eventSessionId, [
          {
            operation: 'replace',
            etag,
            document: {
              ...document,
              value: { revision: document.value.revision, pending: false },
            },
          },
        ]);
      } catch (error) {
        // A newer mutation must keep its pending publication, even after this send succeeded.
        if (!(error instanceof StateConflict)) onError();
      }
    }
  }

  start(
    projection: (id: string) => Promise<PublicPresentationProjection>,
    onError: () => void,
  ) {
    if (!this.#stopped) throw new Error('Publication worker already started.');
    this.#stopped = false;
    const tick = () => {
      if (this.#stopped) return;
      this.#running = this.flush(projection, onError, () => this.#stopped)
        .catch(onError)
        .finally(() => {
          this.#running = undefined;
          if (!this.#stopped) this.#timer = setTimeout(tick, 2_000);
        });
    };
    tick();
  }

  async stop() {
    this.#stopped = true;
    clearTimeout(this.#timer);
    await this.#running;
  }
}
