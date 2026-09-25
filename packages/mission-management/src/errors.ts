export type MissionManagementErrorCode =
  | 'mission-not-found'
  | 'mission-version-conflict'
  | 'mission-state-invalid'
  | 'mission-not-available'
  | 'mission-already-started'
  | 'mission-already-completed'
  | 'mission-prerequisite-incomplete'
  | 'unit-mission-not-found';

export class MissionManagementError extends Error {
  public readonly code: MissionManagementErrorCode;

  public constructor(code: MissionManagementErrorCode) {
    super(code);
    this.name = 'MissionManagementError';
    this.code = code;
  }
}
