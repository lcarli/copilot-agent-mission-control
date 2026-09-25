import { randomBytes, randomInt, scrypt, timingSafeEqual } from 'node:crypto';

import { AuthenticationError } from './errors.js';

const EVENT_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const EVENT_CODE_LENGTH = 10;
const EVENT_CODE_PATTERN = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{10}$/u;
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_KEY_LENGTH = 32;

const deriveKey = (
  eventCode: string,
  salt: Buffer,
  keyLength: number,
  cost: number,
  blockSize: number,
  parallelization: number,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(
      eventCode,
      salt,
      keyLength,
      {
        N: cost,
        r: blockSize,
        p: parallelization,
        maxmem: 64 * 1024 * 1024,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
        } else {
          resolve(derivedKey);
        }
      },
    );
  });

export const normalizeEventCode = (eventCode: string): string =>
  eventCode.replaceAll(/[\s-]/gu, '').toUpperCase();

export const formatEventCode = (eventCode: string): string => {
  const normalized = normalizeEventCode(eventCode);
  return `${normalized.slice(0, 5)}-${normalized.slice(5)}`;
};

export const generateEventCode = (): string => {
  let eventCode = '';
  for (let index = 0; index < EVENT_CODE_LENGTH; index += 1) {
    const character =
      EVENT_CODE_ALPHABET[randomInt(EVENT_CODE_ALPHABET.length)];
    if (!character) {
      throw new AuthenticationError('event-code-invalid');
    }
    eventCode += character;
  }
  return formatEventCode(eventCode);
};

export const hashEventCode = async (eventCode: string): Promise<string> => {
  const normalized = normalizeEventCode(eventCode);
  if (!EVENT_CODE_PATTERN.test(normalized)) {
    throw new AuthenticationError('event-code-invalid');
  }
  const salt = randomBytes(16);
  const derivedKey = await deriveKey(
    normalized,
    salt,
    SCRYPT_KEY_LENGTH,
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
  );
  return [
    'scrypt-v1',
    String(SCRYPT_COST),
    String(SCRYPT_BLOCK_SIZE),
    String(SCRYPT_PARALLELIZATION),
    salt.toString('base64url'),
    derivedKey.toString('base64url'),
  ].join('$');
};

export const verifyEventCode = async (
  eventCode: string,
  verifier: string,
): Promise<boolean> => {
  const parts = verifier.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt-v1') {
    return false;
  }
  const cost = Number(parts[1]);
  const blockSize = Number(parts[2]);
  const parallelization = Number(parts[3]);
  const saltValue = parts[4];
  const hashValue = parts[5];
  if (
    !Number.isSafeInteger(cost) ||
    !Number.isSafeInteger(blockSize) ||
    !Number.isSafeInteger(parallelization) ||
    !saltValue ||
    !hashValue
  ) {
    return false;
  }
  try {
    const expected = Buffer.from(hashValue, 'base64url');
    const actual = await deriveKey(
      normalizeEventCode(eventCode),
      Buffer.from(saltValue, 'base64url'),
      expected.length,
      cost,
      blockSize,
      parallelization,
    );
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  } catch {
    return false;
  }
};

export const createEventCode = async (): Promise<{
  readonly eventCode: string;
  readonly verifier: string;
}> => {
  const eventCode = generateEventCode();
  return {
    eventCode,
    verifier: await hashEventCode(eventCode),
  };
};
