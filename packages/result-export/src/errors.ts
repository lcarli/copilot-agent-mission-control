export type ResultExportErrorCode =
  'result-export-request-invalid' | 'result-export-source-invalid';

export class ResultExportError extends Error {
  public readonly code: ResultExportErrorCode;

  public constructor(code: ResultExportErrorCode) {
    super(code);
    this.name = 'ResultExportError';
    this.code = code;
  }
}
