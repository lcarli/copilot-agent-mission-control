import type { InstructorActor, UnitTokenClaims } from '@mission-control/auth';

export type EventSessionStatus =
  'draft' | 'lobby' | 'active' | 'paused' | 'closed' | 'archived';

export type UnitStatus =
  | 'registered'
  | 'ready'
  | 'active'
  | 'disconnected'
  | 'muted'
  | 'withdrawn'
  | 'completed';

export type SupportedLocale = 'en' | 'fr' | 'pt-BR';

export interface EventSession {
  readonly eventSessionId: string;
  readonly campaignId: string;
  readonly campaignVersion: string;
  readonly defaultLocale: SupportedLocale;
  readonly supportedLocales: readonly SupportedLocale[];
  readonly status: EventSessionStatus;
  readonly registrationEnabled: boolean;
  readonly eventCodeVerifier: string;
  readonly scenarioSeed: string;
  readonly scoringPolicyVersion: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
}

export interface Unit {
  readonly unitId: string;
  readonly eventSessionId: string;
  readonly displayName: string;
  readonly normalizedDisplayName: string;
  readonly locale: SupportedLocale;
  readonly status: UnitStatus;
  readonly tokenVersion: number;
  readonly reconnectVerifier: string;
  readonly connectedAt: string;
  readonly lastSeenAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
}

export interface CreateEventSessionInput {
  readonly campaignId: string;
  readonly campaignVersion: string;
  readonly defaultLocale: SupportedLocale;
  readonly supportedLocales: readonly SupportedLocale[];
  readonly scoringPolicyVersion: string;
}

export interface CreatedEventSession {
  readonly eventSession: EventSession;
  readonly eventCode: string;
}

export interface JoinEventInput {
  readonly eventCode: string;
  readonly displayName: string;
  readonly locale: SupportedLocale;
}

export interface JoinedUnit {
  readonly eventSession: EventSession;
  readonly unit: Unit;
  readonly unitToken: string;
  readonly reconnectSecret: string;
}

export interface ReconnectUnitInput {
  readonly eventCode: string;
  readonly unitId: string;
  readonly reconnectSecret: string;
}

export interface ReconnectedUnit {
  readonly eventSession: EventSession;
  readonly unit: Unit;
  readonly unitToken: string;
}

export interface AuthenticatedUnit {
  readonly claims: UnitTokenClaims;
  readonly eventSession: EventSession;
  readonly unit: Unit;
}

export interface EventManagementActor {
  readonly instructor: InstructorActor;
}
