import {
  AuthenticationError,
  UnitTokenService,
  createEventCode,
  verifyEventCode,
} from '@mission-control/auth';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { v7 as uuidV7 } from 'uuid';

import { EventManagementError } from './errors.js';
import type { EventUnitRepository } from './repository.js';
import type {
  AuthenticatedUnit,
  CreateEventSessionInput,
  CreatedEventSession,
  EventManagementActor,
  EventSession,
  JoinEventInput,
  JoinedUnit,
  ReconnectedUnit,
  ReconnectUnitInput,
  Unit,
} from './types.js';

export interface EventUnitServiceOptions {
  readonly repository: EventUnitRepository;
  readonly unitTokens: UnitTokenService;
  readonly now?: () => Date;
}

const reconnectDigest = (secret: string): Buffer =>
  createHash('sha256').update(secret, 'utf8').digest();

const verifyReconnectSecret = (secret: string, verifier: string): boolean => {
  const actual = reconnectDigest(secret);
  const expected = Buffer.from(verifier, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

const normalizeDisplayName = (displayName: string): string =>
  displayName.trim().replaceAll(/\s+/gu, ' ').toLocaleLowerCase('en-US');

const validateDisplayName = (displayName: string): string => {
  const trimmed = displayName.trim().replaceAll(/\s+/gu, ' ');
  if (
    trimmed.length < 1 ||
    trimmed.length > 80 ||
    /[\p{Cc}\p{Cf}]/u.test(trimmed)
  ) {
    throw new EventManagementError('display-name-invalid');
  }
  return trimmed;
};

export class EventUnitService {
  readonly #repository: EventUnitRepository;
  readonly #unitTokens: UnitTokenService;
  readonly #now: () => Date;

  public constructor(options: EventUnitServiceOptions) {
    this.#repository = options.repository;
    this.#unitTokens = options.unitTokens;
    this.#now = options.now ?? (() => new Date());
  }

  public async createEventSession(
    input: CreateEventSessionInput,
    actor: EventManagementActor,
  ): Promise<CreatedEventSession> {
    if (
      !input.supportedLocales.includes(input.defaultLocale) ||
      input.supportedLocales.length === 0
    ) {
      throw new EventManagementError('locale-not-supported');
    }
    const { eventCode, verifier } = await createEventCode();
    const now = this.#now().toISOString();
    const eventSession: EventSession = {
      eventSessionId: uuidV7(),
      campaignId: input.campaignId,
      campaignVersion: input.campaignVersion,
      defaultLocale: input.defaultLocale,
      supportedLocales: [...new Set(input.supportedLocales)],
      status: 'draft',
      registrationEnabled: false,
      eventCodeVerifier: verifier,
      scenarioSeed: randomBytes(32).toString('base64url'),
      scoringPolicyVersion: input.scoringPolicyVersion,
      createdBy: actor.instructor.actorId,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    await this.#repository.createEventSession(eventSession);
    return { eventSession, eventCode };
  }

  public async openLobby(
    eventSessionId: string,
    expectedVersion: number,
  ): Promise<EventSession> {
    return this.#transitionEvent(
      eventSessionId,
      expectedVersion,
      ['draft'],
      'lobby',
      true,
    );
  }

  public async startEvent(
    eventSessionId: string,
    expectedVersion: number,
  ): Promise<EventSession> {
    return this.#transitionEvent(
      eventSessionId,
      expectedVersion,
      ['lobby'],
      'active',
      true,
    );
  }

  public async closeEvent(
    eventSessionId: string,
    expectedVersion: number,
  ): Promise<EventSession> {
    return this.#transitionEvent(
      eventSessionId,
      expectedVersion,
      ['lobby', 'active', 'paused'],
      'closed',
      false,
    );
  }

  public async joinEvent(input: JoinEventInput): Promise<JoinedUnit> {
    const eventSession = await this.#findEventByCode(input.eventCode);
    if (
      !eventSession.registrationEnabled ||
      (eventSession.status !== 'lobby' && eventSession.status !== 'active')
    ) {
      throw new EventManagementError('registration-closed');
    }
    if (!eventSession.supportedLocales.includes(input.locale)) {
      throw new EventManagementError('locale-not-supported');
    }
    const displayName = validateDisplayName(input.displayName);
    const reconnectSecret = randomBytes(32).toString('base64url');
    const now = this.#now().toISOString();
    const unit: Unit = {
      unitId: uuidV7(),
      eventSessionId: eventSession.eventSessionId,
      displayName,
      normalizedDisplayName: normalizeDisplayName(displayName),
      locale: input.locale,
      status: 'registered',
      tokenVersion: 1,
      reconnectVerifier: reconnectDigest(reconnectSecret).toString('hex'),
      connectedAt: now,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    await this.#repository.createUnit(unit);
    const unitToken = await this.#unitTokens.issue({
      eventSessionId: eventSession.eventSessionId,
      unitId: unit.unitId,
      tokenVersion: unit.tokenVersion,
      locale: unit.locale,
    });
    return { eventSession, unit, unitToken, reconnectSecret };
  }

  public async reconnectUnit(
    input: ReconnectUnitInput,
  ): Promise<ReconnectedUnit> {
    const eventSession = await this.#findEventByCode(input.eventCode);
    if (
      eventSession.status !== 'lobby' &&
      eventSession.status !== 'active' &&
      eventSession.status !== 'paused'
    ) {
      throw new EventManagementError('unit-reconnect-denied');
    }
    const unit = await this.#repository.getUnit(
      eventSession.eventSessionId,
      input.unitId,
    );
    if (
      !unit ||
      unit.status === 'withdrawn' ||
      unit.status === 'completed' ||
      !verifyReconnectSecret(input.reconnectSecret, unit.reconnectVerifier)
    ) {
      throw new EventManagementError('unit-reconnect-denied');
    }
    const now = this.#now().toISOString();
    const reconnected: Unit = {
      ...unit,
      status: unit.status === 'disconnected' ? 'active' : unit.status,
      connectedAt: now,
      lastSeenAt: now,
      updatedAt: now,
      version: unit.version + 1,
    };
    await this.#repository.updateUnit(reconnected, unit.version);
    const unitToken = await this.#unitTokens.issue({
      eventSessionId: reconnected.eventSessionId,
      unitId: reconnected.unitId,
      tokenVersion: reconnected.tokenVersion,
      locale: reconnected.locale,
    });
    return { eventSession, unit: reconnected, unitToken };
  }

  public async authenticateUnit(
    unitToken: string,
    requestedUnitId?: string,
  ): Promise<AuthenticatedUnit> {
    try {
      const claims = await this.#unitTokens.verify(unitToken);
      if (requestedUnitId && requestedUnitId !== claims.unitId) {
        throw new EventManagementError('unit-scope-denied');
      }
      const [eventSession, unit] = await Promise.all([
        this.#repository.getEventSession(claims.eventSessionId),
        this.#repository.getUnit(claims.eventSessionId, claims.unitId),
      ]);
      if (!eventSession || !unit) {
        throw new EventManagementError('unit-token-invalid');
      }
      if (unit.tokenVersion !== claims.tokenVersion) {
        throw new EventManagementError('unit-token-invalid');
      }
      return { claims, eventSession, unit };
    } catch (error) {
      if (error instanceof EventManagementError) {
        throw error;
      }
      if (error instanceof AuthenticationError) {
        throw new EventManagementError('unit-token-invalid', error);
      }
      throw error;
    }
  }

  async #findEventByCode(eventCode: string): Promise<EventSession> {
    const eventSessions = await this.#repository.listEventSessions();
    const matches = await Promise.all(
      eventSessions.map(async (eventSession) => ({
        eventSession,
        matches: await verifyEventCode(
          eventCode,
          eventSession.eventCodeVerifier,
        ),
      })),
    );
    const match = matches.find((candidate) => candidate.matches);
    if (!match) {
      throw new EventManagementError('event-code-invalid');
    }
    return match.eventSession;
  }

  async #transitionEvent(
    eventSessionId: string,
    expectedVersion: number,
    allowedStatuses: readonly EventSession['status'][],
    status: EventSession['status'],
    registrationEnabled: boolean,
  ): Promise<EventSession> {
    const eventSession = await this.#repository.getEventSession(eventSessionId);
    if (!eventSession) {
      throw new EventManagementError('event-not-found');
    }
    if (
      eventSession.version !== expectedVersion ||
      !allowedStatuses.includes(eventSession.status)
    ) {
      throw new EventManagementError(
        eventSession.version !== expectedVersion
          ? 'event-version-conflict'
          : 'event-state-invalid',
      );
    }
    const updated: EventSession = {
      ...eventSession,
      status,
      registrationEnabled,
      updatedAt: this.#now().toISOString(),
      version: eventSession.version + 1,
    };
    await this.#repository.updateEventSession(updated, expectedVersion);
    return updated;
  }
}
