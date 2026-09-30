import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

const problemBaseUrl = 'https://mission-control.example/problems';

export interface ProblemFieldError {
  readonly code: string;
  readonly path: string;
}

export interface ProblemDetails {
  readonly code: string;
  readonly correlationId: string;
  readonly errors: readonly ProblemFieldError[];
  readonly messageArgs: Readonly<Record<string, string>>;
  readonly messageKey: string;
  readonly status: number;
  readonly title: string;
  readonly type: string;
}

export interface ApiProblemOptions {
  readonly code: string;
  readonly messageArgs?: Readonly<Record<string, string>>;
  readonly messageKey: string;
  readonly status: number;
  readonly title: string;
  readonly retryAfterSeconds?: number;
}

export class ApiProblem extends Error {
  public readonly code: string;
  public readonly messageArgs: Readonly<Record<string, string>>;
  public readonly messageKey: string;
  public readonly status: number;
  public readonly title: string;
  public readonly retryAfterSeconds?: number;

  public constructor(options: ApiProblemOptions) {
    super(options.title);
    this.name = 'ApiProblem';
    this.code = options.code;
    this.messageArgs = options.messageArgs ?? {};
    this.messageKey = options.messageKey;
    this.status = options.status;
    this.title = options.title;
    if (options.retryAfterSeconds !== undefined)
      this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

function problemDetails(
  correlationId: string,
  options: ApiProblemOptions,
  errors: readonly ProblemFieldError[] = [],
): ProblemDetails {
  return {
    code: options.code,
    correlationId,
    errors,
    messageArgs: options.messageArgs ?? {},
    messageKey: options.messageKey,
    status: options.status,
    title: options.title,
    type: `${problemBaseUrl}/${options.code}`,
  };
}

function validationErrors(error: FastifyError): readonly ProblemFieldError[] {
  return (error.validation ?? []).slice(0, 20).map((entry) => ({
    code: entry.keyword,
    path: entry.instancePath.length > 0 ? entry.instancePath : '/',
  }));
}

export function sendProblem(
  reply: FastifyReply,
  correlationId: string,
  options: ApiProblemOptions,
  errors: readonly ProblemFieldError[] = [],
): void {
  void reply
    .code(options.status)
    .type('application/problem+json')
    .send(problemDetails(correlationId, options, errors));
}

export function handleRequestError(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  if (error instanceof ApiProblem) {
    if (error.status >= 500)
      request.log.error(
        { correlationId: request.id, code: error.code, status: error.status },
        'Workshop dependency or capacity failure',
      );
    if (error.retryAfterSeconds !== undefined)
      void reply.header('retry-after', String(error.retryAfterSeconds));
    sendProblem(reply, request.id, error);
    return;
  }

  if (error.validation !== undefined) {
    sendProblem(
      reply,
      request.id,
      {
        code: 'validation-failed',
        messageKey: 'errors.validation.failed',
        status: 422,
        title: 'Request validation failed',
      },
      validationErrors(error),
    );
    return;
  }

  if (
    error.statusCode !== undefined &&
    [400, 413, 415].includes(error.statusCode)
  ) {
    sendProblem(reply, request.id, {
      code: error.statusCode === 413 ? 'payload-too-large' : 'request-invalid',
      messageKey: 'errors.validation.failed',
      status: error.statusCode,
      title: 'The request body could not be accepted',
    });
    return;
  }

  request.log.error(
    { correlationId: request.id, err: error },
    'Unhandled request failure',
  );
  sendProblem(reply, request.id, {
    code: 'internal-error',
    messageKey: 'errors.internal',
    status: 500,
    title: 'An internal error occurred',
  });
}
