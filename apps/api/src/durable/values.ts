import {
  createCipheriv,
  createDecipheriv,
  createHash,
  hkdfSync,
  randomBytes,
} from 'node:crypto';

import { isRecord } from '@mission-control/campaign-operation-lighthouse';

import { ApiProblem } from '../problems.js';
import type { Json } from './documents.js';

export const stateProblem = (code: string, status = 503) =>
  new ApiProblem({
    code,
    status,
    title: code.replaceAll('-', ' '),
    messageKey: `errors.workshop.${code}`,
    ...(status === 503 ? { retryAfterSeconds: 1 } : {}),
  });

export class StateConflict extends Error {
  constructor() {
    super('Durable state changed before the transaction committed.');
    this.name = 'StateConflict';
  }
}

const plainRecord = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) &&
  (Object.getPrototypeOf(value) === Object.prototype ||
    Object.getPrototypeOf(value) === null);

export function jsonValue(value: unknown): Json {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return (value as unknown[]).map(jsonValue);
  if (plainRecord(value))
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, jsonValue(item)]),
    );
  throw stateProblem('state-value-invalid', 500);
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value))
    return `[${(value as unknown[]).map(canonicalJson).join(',')}]`;
  if (plainRecord(value))
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  return JSON.stringify(jsonValue(value));
}

export const digest = (value: unknown): string =>
  createHash('sha256').update(canonicalJson(value)).digest('hex');

export class ReplayCipher {
  readonly #key: Buffer;

  constructor(secret: Uint8Array) {
    if (secret.byteLength < 32) throw stateProblem('signing-key-invalid', 500);
    this.#key = Buffer.from(
      hkdfSync('sha256', secret, '', 'mission-control-replay-v1', 32),
    );
  }

  seal(value: unknown, associatedData: string): string {
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.#key, nonce);
    cipher.setAAD(Buffer.from(associatedData));
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(jsonValue(value)), 'utf8'),
      cipher.final(),
    ]);
    return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]).toString(
      'base64url',
    );
  }

  open(sealed: string, associatedData: string): unknown {
    const data = Buffer.from(sealed, 'base64url');
    if (data.length < 29) throw stateProblem('state-replay-invalid', 500);
    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.#key,
        data.subarray(0, 12),
      );
      decipher.setAAD(Buffer.from(associatedData));
      decipher.setAuthTag(data.subarray(12, 28));
      const plaintext = Buffer.concat([
        decipher.update(data.subarray(28)),
        decipher.final(),
      ]).toString('utf8');
      return JSON.parse(plaintext) as unknown;
    } catch {
      throw stateProblem('state-replay-invalid', 500);
    }
  }
}
