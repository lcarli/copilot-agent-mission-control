import type { InstructorCommandErrorCode } from './types.js';

export class InstructorCommandError extends Error {
  public readonly code: InstructorCommandErrorCode;

  public constructor(code: InstructorCommandErrorCode) {
    super(code);
    this.name = 'InstructorCommandError';
    this.code = code;
  }
}
