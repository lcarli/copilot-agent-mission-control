export class ParticipantHttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly serverCode: string,
    readonly correlationId?: string,
    options?: ErrorOptions,
  ) {
    super(
      `HTTP ${String(statusCode)} ${serverCode}${correlationId === undefined ? '' : ` (${correlationId})`}`,
      options,
    );
    this.name = 'ParticipantHttpError';
  }
}

export async function assertHttpSuccess(response: Response): Promise<void> {
  if (response.ok) return;
  let value: unknown;
  try {
    value = await response.json();
  } catch (error) {
    throw new ParticipantHttpError(
      response.status,
      'invalid-error-response',
      undefined,
      { cause: error },
    );
  }
  if (
    typeof value !== 'object' ||
    value === null ||
    !('code' in value) ||
    typeof value.code !== 'string' ||
    !/^[a-z][a-z0-9-]{0,119}$/u.test(value.code)
  ) {
    throw new ParticipantHttpError(response.status, 'invalid-error-response');
  }
  const correlationId =
    'correlationId' in value &&
    typeof value.correlationId === 'string' &&
    /^[0-9a-f-]{36}$/iu.test(value.correlationId)
      ? value.correlationId
      : undefined;
  throw new ParticipantHttpError(response.status, value.code, correlationId);
}
