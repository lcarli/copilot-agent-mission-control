import { AuthenticationError } from './errors.js';

export type InstructorRole = 'instructor' | 'event-admin' | 'platform-admin';

export type InstructorAction =
  | 'event.create'
  | 'event.manage-lobby'
  | 'event.manage-missions'
  | 'event.manage-hints'
  | 'event.manage-incidents'
  | 'event.adjust-scores'
  | 'event.manage-units'
  | 'event.close'
  | 'event.export-results'
  | 'event.view-audit';

export interface InstructorPrincipal {
  readonly subject: string;
  readonly tenantId: string;
  readonly displayName?: string;
  readonly active: boolean;
  readonly roles: ReadonlySet<InstructorRole>;
  readonly eventSessionIds: '*' | ReadonlySet<string>;
}

export interface InstructorActor {
  readonly actorType: 'instructor';
  readonly actorId: string;
  readonly role: InstructorRole;
  readonly tenantId: string;
}

const instructorActions = new Set<InstructorAction>([
  'event.manage-lobby',
  'event.manage-missions',
  'event.manage-hints',
  'event.manage-incidents',
  'event.adjust-scores',
  'event.manage-units',
  'event.close',
  'event.export-results',
  'event.view-audit',
]);

const eventAdminActions = new Set<InstructorAction>([
  'event.create',
  ...instructorActions,
]);

const roleActions: Readonly<
  Record<InstructorRole, ReadonlySet<InstructorAction>>
> = {
  instructor: instructorActions,
  'event-admin': eventAdminActions,
  'platform-admin': eventAdminActions,
};

const rolePriority: readonly InstructorRole[] = [
  'platform-admin',
  'event-admin',
  'instructor',
];

export const authorizeInstructor = (
  principal: InstructorPrincipal,
  action: InstructorAction,
  eventSessionId?: string,
): InstructorActor => {
  if (!principal.active) {
    throw new AuthenticationError('instructor-inactive');
  }
  const role = rolePriority.find(
    (candidate) =>
      principal.roles.has(candidate) && roleActions[candidate].has(action),
  );
  if (!role) {
    if (principal.roles.size === 0) {
      throw new AuthenticationError('instructor-role-required');
    }
    throw new AuthenticationError('instructor-action-denied');
  }
  if (
    role !== 'platform-admin' &&
    eventSessionId !== undefined &&
    principal.eventSessionIds !== '*' &&
    !principal.eventSessionIds.has(eventSessionId)
  ) {
    throw new AuthenticationError('instructor-scope-denied');
  }
  return {
    actorType: 'instructor',
    actorId: principal.subject,
    role,
    tenantId: principal.tenantId,
  };
};
