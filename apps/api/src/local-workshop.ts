import { randomBytes, timingSafeEqual } from 'node:crypto';

import {
  AuthenticationError,
  UnitTokenService,
  authorizeInstructor,
  type InstructorAction,
} from '@mission-control/auth';
import {
  connectedCityContent,
  connectedCityValidator,
  groundTruthContent,
  groundTruthValidator,
  lighthouseScoreWeights,
  LighthouseRecovery,
  LighthouseSimulatorInvocationSchema,
  LighthouseSimulatorSession,
  lighthouseSimulatorCatalog,
  restoreTheLighthouseContent,
  restoreTheLighthouseValidator,
  signalInTheStormContent,
  signalInTheStormValidator,
  specialistNetworkContent,
  specialistNetworkValidator,
  type MissionContent,
} from '@mission-control/campaign-operation-lighthouse';
import {
  MissionSubmissionFeedbackSchema,
  PublicPresentationProjectionSchema,
  SimulatorCatalogSchema,
  SimulatorObservationSchema,
  type SimulatorInvocation,
  type MissionSubmissionFeedback,
  type PublicPresentationProjection,
} from '@mission-control/event-contracts';
import {
  EventManagementError,
  EventUnitService,
  InMemoryEventUnitRepository,
  type AuthenticatedUnit,
  type EventSession,
  type JoinEventInput,
  type ReconnectUnitInput,
  type SupportedLocale,
} from '@mission-control/event-management';
import {
  HintService,
  HintSystemError,
  InMemoryHintUsageRepository,
} from '@mission-control/hint-system';
import {
  InMemoryMissionRepository,
  MissionLifecycleService,
  MissionManagementError,
} from '@mission-control/mission-management';
import {
  InMemoryScoreLedgerRepository,
  ScoringEngine,
  scoreDimensions,
} from '@mission-control/scoring';
import {
  InMemoryValidationResultRepository,
  InMemoryValidatorRegistry,
  ValidationWorker,
  type ResolvedValidationContext,
  type VersionedValidator,
} from '@mission-control/validation-worker';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { v7 as uuidV7 } from 'uuid';

import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { LocalRequests, workshopProblem } from './local-requests.js';
import { handleRequestError } from './problems.js';

const catalog: readonly {
  readonly content: MissionContent;
  readonly validator: VersionedValidator;
}[] = [
  { content: signalInTheStormContent, validator: signalInTheStormValidator },
  { content: groundTruthContent, validator: groundTruthValidator },
  { content: connectedCityContent, validator: connectedCityValidator },
  { content: specialistNetworkContent, validator: specialistNetworkValidator },
  {
    content: restoreTheLighthouseContent,
    validator: restoreTheLighthouseValidator,
  },
];

const requiredMission = (missionId: string) => {
  const mission = catalog.find(
    ({ content }) => content.missionId === missionId,
  );
  if (mission === undefined) throw workshopProblem('mission-not-found', 404);
  return mission;
};

const textSchema = { type: 'string', minLength: 1, maxLength: 200 } as const;
const localeSchema = { type: 'string', enum: ['en', 'fr', 'pt-BR'] } as const;
const emptySchema = { type: 'object', additionalProperties: false } as const;
const eventParams = {
  type: 'object',
  required: ['eventSessionId'],
  additionalProperties: false,
  properties: { eventSessionId: textSchema },
} as const;
const missionParams = {
  type: 'object',
  required: ['missionId'],
  additionalProperties: false,
  properties: { missionId: textSchema },
} as const;

interface CreateLocalEvent {
  readonly campaignId: 'operation-lighthouse';
  readonly defaultLocale: SupportedLocale;
  readonly supportedLocales: readonly SupportedLocale[];
}

interface LocalCommand {
  readonly schemaVersion: '1.0';
  readonly commandId: string;
  readonly eventSessionId: string;
  readonly commandType:
    | 'event-session.open-lobby'
    | 'event-session.start'
    | 'event-session.close'
    | 'mission.open'
    | 'mission.pause'
    | 'mission.resume'
    | 'mission.close';
  readonly expectedVersion: number;
  readonly requestedAt: string;
  readonly reason?: string;
  readonly target: { readonly missionId?: string };
  readonly payload: { readonly confirmationPhrase?: string };
}

interface EvidenceEnvelope {
  readonly schemaVersion: '1.0';
  readonly missionId: string;
  readonly evidence: Readonly<Record<string, unknown>>;
}

export interface LocalWorkshopOptions {
  readonly instructorToken: string;
  readonly logger?: boolean;
  readonly port?: number;
}

const safeEvent = (event: EventSession) => ({
  eventSessionId: event.eventSessionId,
  campaignId: event.campaignId,
  campaignVersion: event.campaignVersion,
  defaultLocale: event.defaultLocale,
  supportedLocales: event.supportedLocales,
  status: event.status,
  version: event.version,
});

export function buildLocalWorkshopApp(
  options: LocalWorkshopOptions,
): FastifyInstance {
  if (
    options.instructorToken.length < 32 ||
    options.instructorToken.length > 512 ||
    /\s/u.test(options.instructorToken)
  ) {
    throw new Error(
      'A local instructor token of 32-512 non-whitespace characters is required.',
    );
  }
  const instructorToken = Buffer.from(options.instructorToken);
  const eventRepository = new InMemoryEventUnitRepository();
  const events = new EventUnitService({
    repository: eventRepository,
    unitTokens: new UnitTokenService({
      secret: randomBytes(32),
      issuer: 'mission-control-local',
      audience: 'mission-control-local-participant',
    }),
  });
  const missionRepository = new InMemoryMissionRepository();
  const missions = new MissionLifecycleService({
    repository: missionRepository,
  });
  const scoreRepository = new InMemoryScoreLedgerRepository();
  const scoring = new ScoringEngine({
    repository: scoreRepository,
    policy: {
      version: '1.0.0',
      dimensionWeights: lighthouseScoreWeights,
      level3HintPenaltyPoints: 0,
      excludeUnitStatuses: ['muted', 'withdrawn'],
    },
  });
  const requests = new LocalRequests();
  const cityRecovery = new LighthouseRecovery();
  const submissions = new Map<string, ResolvedValidationContext>();
  const simulatorSessions = new Map<string, LighthouseSimulatorSession>();
  const simulatorKey = (
    eventSessionId: string,
    unitId: string,
    missionId: string,
  ) => `${eventSessionId}:${unitId}:${missionId}`;
  const feedback = new Map<string, MissionSubmissionFeedback>();
  const activity = new Map<string, number>();
  const audit: {
    eventSessionId: string;
    commandId: string;
    commandType: string;
    actorId: string;
    correlationId: string;
    status: 'accepted' | 'rejected';
    recordedAt: string;
  }[] = [];
  const validators = new ValidationWorker({
    registry: new InMemoryValidatorRegistry(
      catalog.map(({ validator }) => validator),
    ),
    repository: new InMemoryValidationResultRepository(),
    contextResolver: {
      resolve(request) {
        const submission = submissions.get(request.submissionId);
        if (submission === undefined)
          throw workshopProblem('submission-not-found', 404);
        return Promise.resolve(submission);
      },
    },
  });
  const requiredEvent = async (id: string) => {
    const event = await eventRepository.getEventSession(id);
    if (event === undefined) throw workshopProblem('event-not-found', 404);
    return event;
  };
  const hints = new HintService({
    repository: new InMemoryHintUsageRepository(),
    contextResolver: {
      async resolve(input) {
        const event = await requiredEvent(input.eventSessionId);
        const unit = await eventRepository.getUnit(
          input.eventSessionId,
          input.unitId,
        );
        const progress = await missionRepository.getUnitProgress(
          input.eventSessionId,
          input.unitId,
          input.missionId,
        );
        if (unit === undefined) throw workshopProblem('unit-not-found', 404);
        return {
          ...input,
          eventStatus: event.status === 'active' ? 'open' : 'closed',
          unitStatus: unit.status,
          missionVersion: requiredMission(input.missionId).content.version,
          missionRunStatus: progress?.status ?? 'locked',
        };
      },
    },
    policyResolver: {
      resolve(missionId, missionVersion) {
        requiredMission(missionId);
        return Promise.resolve({
          missionId,
          missionVersion,
          bonusAdjustments: { level1: 0, level2: 0, level3: 0 },
          hints: ([1, 2, 3] as const).map((level) => ({
            level,
            contentKey: `hint.${missionId}.level-${String(level)}`,
          })),
        });
      },
    },
  });
  const app = buildApp({
    config: loadConfig({
      HOST: '127.0.0.1',
      PORT: String(options.port ?? 3000),
    }),
    logger: options.logger ?? false,
    eventProbes: [{ name: 'local-in-memory-runtime', check: () => 'up' }],
    errorHandler(error, request, reply) {
      if (
        error instanceof AuthenticationError ||
        error instanceof EventManagementError ||
        error instanceof MissionManagementError ||
        error instanceof HintSystemError
      ) {
        const code = error.code;
        const status = code.endsWith('not-found')
          ? 404
          : code === 'unit-token-invalid'
            ? 401
            : code.includes('denied') || error instanceof AuthenticationError
              ? 403
              : 409;
        handleRequestError(workshopProblem(code, status), request, reply);
        return;
      }
      handleRequestError(error, request, reply);
    },
  });

  app.addHook('onRequest', async (request, reply) => {
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.ip)) {
      throw workshopProblem('local-loopback-required', 403);
    }
    void reply.header('cache-control', 'no-store');
  });
  const instructor = (
    request: FastifyRequest,
    action: InstructorAction,
    eventSessionId?: string,
  ) => {
    const header = request.headers.authorization;
    const supplied = Buffer.from(
      header?.startsWith('Bearer ') ? header.slice(7) : '',
    );
    if (
      supplied.length !== instructorToken.length ||
      !timingSafeEqual(supplied, instructorToken)
    ) {
      throw workshopProblem('instructor-authentication-required', 401);
    }
    return authorizeInstructor(
      {
        subject: 'local-instructor',
        tenantId: 'local-rehearsal',
        active: true,
        roles: new Set(['event-admin']),
        eventSessionIds: '*',
      },
      action,
      eventSessionId,
    );
  };
  const participant = async (
    request: FastifyRequest,
  ): Promise<AuthenticatedUnit> => {
    const header = request.headers.authorization;
    if (header === undefined || !header.startsWith('Bearer ')) {
      throw workshopProblem('unit-token-required', 401);
    }
    const authenticated = await events.authenticateUnit(header.slice(7));
    if (['muted', 'withdrawn'].includes(authenticated.unit.status)) {
      throw workshopProblem('unit-scope-denied', 403);
    }
    activity.set(authenticated.unit.unitId, Date.now());
    return authenticated;
  };
  const assertActive = async (eventSessionId: string, missionId: string) => {
    const event = await requiredEvent(eventSessionId);
    if (event.status !== 'active')
      throw workshopProblem('event-session-not-active');
    const mission = await missionRepository.getMission(
      eventSessionId,
      missionId,
    );
    if (mission?.status !== 'open')
      throw workshopProblem('mission-not-available');
    return event;
  };
  const mutateUnit = async (
    request: FastifyRequest,
    operation: (unit: AuthenticatedUnit) => Promise<unknown>,
  ) => {
    const unit = await participant(request);
    return requests.mutate(
      unit.eventSession.eventSessionId,
      [
        unit.eventSession.eventSessionId,
        unit.unit.unitId,
        new URL(request.url, 'http://localhost').pathname,
      ],
      request.headers['idempotency-key'],
      request.body,
      () => operation(unit),
    );
  };
  const eventSnapshot = async (eventSessionId: string) => {
    const event = await requiredEvent(eventSessionId);
    const units = await eventRepository.listUnits(eventSessionId);
    const progress = (
      await Promise.all(
        units.map(({ unitId }) =>
          missionRepository.listUnitProgress(eventSessionId, unitId),
        ),
      )
    ).flat();
    return {
      schemaVersion: '1.0',
      mode: 'local-rehearsal',
      persistence: 'memory',
      eventSession: safeEvent(event),
      registeredUnitCount: units.length,
      missions: (await missionRepository.listMissions(eventSessionId)).map(
        (mission) => {
          const content = requiredMission(mission.missionId).content.content[
            event.defaultLocale
          ];
          const completed = progress.filter(
            (item) =>
              item.missionId === mission.missionId &&
              item.status === 'completed',
          ).length;
          return {
            ...mission,
            title: content.title,
            briefing: content.briefing,
            completionPercent:
              units.length === 0
                ? 0
                : Math.floor((completed * 100) / units.length),
          };
        },
      ),
    };
  };

  app.get('/api/v1/local', () => ({
    mode: 'local-rehearsal',
    persistence: 'memory',
    scoringMode: 'guided',
    transport: 'http-polling',
  }));
  app.post<{ Body: CreateLocalEvent }>(
    '/api/v1/event-sessions',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['campaignId', 'defaultLocale', 'supportedLocales'],
          properties: {
            campaignId: { const: 'operation-lighthouse' },
            defaultLocale: localeSchema,
            supportedLocales: {
              type: 'array',
              minItems: 1,
              uniqueItems: true,
              items: localeSchema,
            },
          },
        },
      },
    },
    async (request, reply) => {
      const actor = instructor(request, 'event.create');
      void reply.code(201);
      return requests.mutate(
        'create-event',
        [actor.actorId, 'create-event'],
        request.headers['idempotency-key'],
        request.body,
        async () => {
          const created = await events.createEventSession(
            {
              ...request.body,
              campaignVersion: '1.0.0',
              scoringPolicyVersion: '1.0.0',
            },
            { instructor: actor },
          );
          await missions.initializeMissions({
            eventSessionId: created.eventSession.eventSessionId,
            missions: catalog.map(({ content }, index) => ({
              id: content.missionId,
              version: content.version,
              prerequisiteMissions: catalog
                .slice(0, index)
                .map((item) => item.content.missionId),
            })),
          });
          return {
            eventSession: safeEvent(created.eventSession),
            eventCode: created.eventCode,
          };
        },
      );
    },
  );
  app.get<{ Params: { eventSessionId: string } }>(
    '/api/v1/event-sessions/:eventSessionId',
    { schema: { params: eventParams } },
    async (request) => {
      instructor(request, 'event.manage-lobby', request.params.eventSessionId);
      return requests.serialize(request.params.eventSessionId, () =>
        eventSnapshot(request.params.eventSessionId),
      );
    },
  );
  app.post<{ Params: { eventSessionId: string }; Body: LocalCommand }>(
    '/api/v1/event-sessions/:eventSessionId/commands',
    {
      schema: {
        params: eventParams,
        body: {
          type: 'object',
          additionalProperties: false,
          required: [
            'schemaVersion',
            'commandId',
            'eventSessionId',
            'commandType',
            'expectedVersion',
            'requestedAt',
            'target',
            'payload',
          ],
          properties: {
            schemaVersion: { const: '1.0' },
            commandId: textSchema,
            eventSessionId: textSchema,
            commandType: {
              enum: [
                'event-session.open-lobby',
                'event-session.start',
                'event-session.close',
                'mission.open',
                'mission.pause',
                'mission.resume',
                'mission.close',
              ],
            },
            expectedVersion: { type: 'integer', minimum: 1 },
            requestedAt: { type: 'string', format: 'date-time' },
            reason: textSchema,
            target: { ...emptySchema, properties: { missionId: textSchema } },
            payload: {
              ...emptySchema,
              properties: { confirmationPhrase: textSchema },
            },
          },
        },
      },
    },
    async (request) => {
      const command = request.body;
      const eventSessionId = request.params.eventSessionId;
      const actor = instructor(
        request,
        command.commandType.startsWith('mission.')
          ? 'event.manage-missions'
          : command.commandType === 'event-session.close'
            ? 'event.close'
            : 'event.manage-lobby',
        eventSessionId,
      );
      if (command.eventSessionId !== eventSessionId)
        throw workshopProblem('event-scope-denied', 403);
      return requests.mutate(
        eventSessionId,
        [eventSessionId, actor.actorId, 'commands'],
        request.headers['idempotency-key'],
        command,
        async () => {
          const entry = {
            eventSessionId,
            commandId: command.commandId,
            commandType: command.commandType,
            actorId: actor.actorId,
            correlationId: request.id,
            recordedAt: new Date().toISOString(),
          };
          try {
            const event = await requiredEvent(eventSessionId);
            const missionId = command.target.missionId;
            if (command.commandType.startsWith('mission.')) {
              if (event.status !== 'active')
                throw workshopProblem('event-session-not-active');
              if (missionId === undefined)
                throw workshopProblem('mission-target-required', 422);
              requiredMission(missionId);
              const operation = {
                'mission.open': missions.openMission.bind(missions),
                'mission.pause': missions.pauseMission.bind(missions),
                'mission.resume': missions.resumeMission.bind(missions),
                'mission.close': missions.closeMission.bind(missions),
              };
              const type = command.commandType;
              if (
                type === 'mission.open' ||
                type === 'mission.pause' ||
                type === 'mission.resume' ||
                type === 'mission.close'
              ) {
                await operation[type](
                  eventSessionId,
                  missionId,
                  command.expectedVersion,
                );
              }
            } else {
              if (missionId !== undefined)
                throw workshopProblem('command-target-invalid', 422);
              if (command.commandType === 'event-session.open-lobby') {
                await events.openLobby(eventSessionId, command.expectedVersion);
              } else if (command.commandType === 'event-session.start') {
                await events.startEvent(
                  eventSessionId,
                  command.expectedVersion,
                );
              } else {
                if (
                  command.payload.confirmationPhrase !== 'CLOSE LOCAL EVENT' ||
                  command.reason === undefined ||
                  command.reason.trim() === ''
                ) {
                  throw workshopProblem('command-confirmation-required', 422);
                }
                await events.closeEvent(
                  eventSessionId,
                  command.expectedVersion,
                );
              }
            }
            audit.push({ ...entry, status: 'accepted' });
            return await eventSnapshot(eventSessionId);
          } catch (error) {
            audit.push({ ...entry, status: 'rejected' });
            throw error;
          }
        },
      );
    },
  );
  app.get<{ Params: { eventSessionId: string } }>(
    '/api/v1/event-sessions/:eventSessionId/audit',
    { schema: { params: eventParams } },
    async (request) => {
      instructor(request, 'event.view-audit', request.params.eventSessionId);
      await requiredEvent(request.params.eventSessionId);
      return {
        entries: audit.filter(
          (entry) => entry.eventSessionId === request.params.eventSessionId,
        ),
      };
    },
  );

  app.post<{ Body: JoinEventInput }>(
    '/api/v1/registrations',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['eventCode', 'displayName', 'locale'],
          properties: {
            eventCode: textSchema,
            displayName: { ...textSchema, maxLength: 80 },
            locale: localeSchema,
          },
        },
      },
    },
    async (request, reply) => {
      void reply.code(201);
      return requests.mutate(
        'registration',
        ['registration'],
        request.headers['idempotency-key'],
        request.body,
        async () => {
          const joined = await events.joinEvent(request.body);
          activity.set(joined.unit.unitId, Date.now());
          return {
            eventSession: safeEvent(joined.eventSession),
            unit: { unitId: joined.unit.unitId },
            unitToken: joined.unitToken,
            reconnectSecret: joined.reconnectSecret,
          };
        },
      );
    },
  );
  app.post<{ Body: ReconnectUnitInput }>(
    '/api/v1/auth/refresh',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['eventCode', 'unitId', 'reconnectSecret'],
          properties: {
            eventCode: textSchema,
            unitId: textSchema,
            reconnectSecret: textSchema,
          },
        },
      },
    },
    async (request) =>
      requests.mutate(
        'registration',
        ['refresh', request.body.unitId],
        request.headers['idempotency-key'],
        request.body,
        async () => {
          const refreshed = await events.reconnectUnit(request.body);
          activity.set(refreshed.unit.unitId, Date.now());
          return {
            eventSession: safeEvent(refreshed.eventSession),
            unit: { unitId: refreshed.unit.unitId },
            unitToken: refreshed.unitToken,
          };
        },
      ),
  );
  app.get('/api/v1/event-session', async (request) =>
    safeEvent((await participant(request)).eventSession),
  );
  app.get('/api/v1/unit', async (request) => {
    const { unit } = await participant(request);
    return {
      unitId: unit.unitId,
      eventSessionId: unit.eventSessionId,
      displayName: unit.displayName,
      locale: unit.locale,
      status: unit.status,
    };
  });
  app.get(
    '/api/v1/missions',
    { schema: { querystring: emptySchema } },
    async (request) => {
      const { unit } = await participant(request);
      return requests.serialize(unit.eventSessionId, async () => ({
        missions: await Promise.all(
          (await missionRepository.listMissions(unit.eventSessionId)).map(
            async (mission) => ({
              ...mission,
              title: requiredMission(mission.missionId).content.content[
                unit.locale
              ].title,
              progress:
                (await missionRepository.getUnitProgress(
                  unit.eventSessionId,
                  unit.unitId,
                  mission.missionId,
                )) ?? null,
            }),
          ),
        ),
      }));
    },
  );
  app.post<{ Params: { missionId: string } }>(
    '/api/v1/missions/:missionId/start',
    { schema: { params: missionParams, body: emptySchema } },
    async (request) =>
      mutateUnit(request, async ({ unit }) => {
        requiredMission(request.params.missionId);
        await assertActive(unit.eventSessionId, request.params.missionId);
        return missions.startMission(
          unit.eventSessionId,
          unit.unitId,
          request.params.missionId,
        );
      }),
  );
  app.get<{ Params: { missionId: string } }>(
    '/api/v1/missions/:missionId/tools',
    {
      schema: {
        params: missionParams,
        response: { 200: SimulatorCatalogSchema },
      },
    },
    async (request) => {
      await participant(request);
      requiredMission(request.params.missionId);
      return lighthouseSimulatorCatalog(request.params.missionId);
    },
  );
  app.post<{ Params: { missionId: string }; Body: SimulatorInvocation }>(
    '/api/v1/missions/:missionId/tools',
    {
      bodyLimit: 65_536,
      schema: {
        params: missionParams,
        body: LighthouseSimulatorInvocationSchema,
        response: { 200: SimulatorObservationSchema },
      },
    },
    async (request) =>
      mutateUnit(request, async ({ unit }) => {
        const { missionId } = request.params;
        requiredMission(missionId);
        await assertActive(unit.eventSessionId, missionId);
        const progress = await missionRepository.getUnitProgress(
          unit.eventSessionId,
          unit.unitId,
          missionId,
        );
        if (progress === undefined)
          throw workshopProblem('mission-not-started');
        if (
          !lighthouseSimulatorCatalog(missionId).tools.some(
            ({ tool, operation }) =>
              tool === request.body.tool &&
              operation === request.body.operation,
          )
        )
          throw workshopProblem('simulator-operation-not-available', 422);
        const key = simulatorKey(unit.eventSessionId, unit.unitId, missionId);
        let session = simulatorSessions.get(key);
        if (session === undefined) {
          session = new LighthouseSimulatorSession({
            eventSessionId: unit.eventSessionId,
            unitId: unit.unitId,
            missionId,
          });
          simulatorSessions.set(key, session);
        }
        return session.invoke(request.body, uuidV7(), new Date().toISOString());
      }),
  );
  app.post<{ Params: { missionId: string }; Body: EvidenceEnvelope }>(
    '/api/v1/missions/:missionId/submissions',
    {
      bodyLimit: 1_048_576,
      schema: {
        params: missionParams,
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['schemaVersion', 'missionId', 'evidence'],
          properties: {
            schemaVersion: { const: '1.0' },
            missionId: textSchema,
            evidence: { type: 'object' },
          },
        },
      },
    },
    async (request, reply) => {
      void reply.code(201);
      return mutateUnit(request, async ({ unit }) => {
        const missionId = request.params.missionId;
        const { content } = requiredMission(missionId);
        if (request.body.missionId !== missionId)
          throw workshopProblem('mission-binding-invalid', 422);
        const event = await assertActive(unit.eventSessionId, missionId);
        const progress = await missionRepository.getUnitProgress(
          unit.eventSessionId,
          unit.unitId,
          missionId,
        );
        if (progress === undefined)
          throw workshopProblem('mission-not-started');
        const submissionId = uuidV7();
        const context: ResolvedValidationContext = {
          submissionId,
          eventSessionId: unit.eventSessionId,
          unitId: unit.unitId,
          missionId,
          missionVersion: content.version,
          submission: structuredClone(request.body.evidence),
          observedEvidence:
            simulatorSessions
              .get(simulatorKey(unit.eventSessionId, unit.unitId, missionId))
              ?.observations() ?? [],
        };
        submissions.set(submissionId, context);
        const requestedAt = new Date();
        const result = await validators.run({
          schemaVersion: '1.0',
          submissionId,
          validationRequestId: uuidV7(),
          eventSessionId: unit.eventSessionId,
          unitId: unit.unitId,
          missionId,
          missionVersion: content.version,
          validatorId: content.validatorId,
          validatorVersion: content.validatorVersion,
          scoringPolicyVersion: event.scoringPolicyVersion,
          scenarioSeed: event.scenarioSeed,
          requestedAt: requestedAt.toISOString(),
          deadlineAt: new Date(requestedAt.getTime() + 5_000).toISOString(),
        });
        const ledger = await scoreRepository.list(
          unit.eventSessionId,
          unit.unitId,
        );
        const improvement = (dimension: (typeof scoreDimensions)[number]) => {
          const awarded = ledger
            .filter(
              (entry) =>
                entry.missionId === missionId && entry.dimension === dimension,
            )
            .reduce((sum, entry) => sum + entry.points, 0);
          const earned = Math.floor(result.dimensionScores[dimension] / 10);
          return Math.max(0, earned - awarded) * 10;
        };
        const entries = await scoring.awardValidation({
          eventSessionId: unit.eventSessionId,
          unitId: unit.unitId,
          missionId,
          sourceId: result.validationResultId,
          outcome: result.outcome,
          maximumPoints: 1000,
          advancedBonusPoints: 0,
          level3Hints: 0,
          dimensionScores: {
            requiredOutcome: improvement('requiredOutcome'),
            evidenceAndGrounding: improvement('evidenceAndGrounding'),
            reliability: improvement('reliability'),
            explainability: improvement('explainability'),
            efficiency: improvement('efficiency'),
          },
        });
        if (result.outcome === 'passed' && progress.status !== 'completed') {
          await missions.completeMission(
            unit.eventSessionId,
            unit.unitId,
            missionId,
            progress.version,
          );
        }
        const score = await scoring.project(unit.eventSessionId, unit.unitId);
        const recovery = cityRecovery.recordValidation(context, result.outcome);
        feedback.set(submissionId, {
          schemaVersion: '1.0',
          submissionId,
          missionId,
          status: 'evaluated',
          outcome: result.outcome,
          rules: result.rules.map(
            ({ ruleId, status, severity, messageKey }) => ({
              ruleId,
              status,
              severity,
              messageKey,
            }),
          ),
          score: {
            missionPoints: score.byMission[missionId] ?? 0,
            totalPoints: score.totalPoints,
            awardedPoints: entries.reduce(
              (sum, entry) => sum + entry.points,
              0,
            ),
          },
          recovery: {
            ...recovery,
            districtIds: [...recovery.districtIds],
          },
          evaluatedAt: result.trace.completedAt,
        });
        return { submissionId, status: 'evaluated' };
      });
    },
  );
  app.get<{ Params: { submissionId: string } }>(
    '/api/v1/submissions/:submissionId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['submissionId'],
          properties: { submissionId: textSchema },
        },
        response: { 200: MissionSubmissionFeedbackSchema },
      },
    },
    async (request) => {
      const { unit } = await participant(request);
      const submission = submissions.get(request.params.submissionId);
      if (
        submission?.unitId !== unit.unitId ||
        submission.eventSessionId !== unit.eventSessionId
      ) {
        throw workshopProblem('submission-not-found', 404);
      }
      return requests.serialize(unit.eventSessionId, () => {
        const result = feedback.get(request.params.submissionId);
        if (result === undefined)
          throw workshopProblem('submission-not-evaluated', 503);
        return Promise.resolve(result);
      });
    },
  );
  app.post<{ Params: { missionId: string } }>(
    '/api/v1/missions/:missionId/hints',
    { schema: { params: missionParams, body: emptySchema } },
    async (request) =>
      mutateUnit(request, async ({ unit }) => {
        await assertActive(unit.eventSessionId, request.params.missionId);
        const idempotencyKey = request.headers['idempotency-key'];
        if (typeof idempotencyKey !== 'string')
          throw workshopProblem('idempotency-key-required', 422);
        const hint = await hints.requestNext({
          eventSessionId: unit.eventSessionId,
          unitId: unit.unitId,
          missionId: request.params.missionId,
          idempotencyKey,
        });
        return {
          ...hint,
          content: requiredMission(hint.missionId).content.content[unit.locale]
            .hints[hint.level - 1],
        };
      }),
  );
  app.get<{ Querystring: { eventSessionId: string } }>(
    '/api/v1/public/event-session',
    {
      schema: {
        querystring: eventParams,
        response: { 200: PublicPresentationProjectionSchema },
      },
    },
    async (request) =>
      requests.serialize(
        request.query.eventSessionId,
        async (): Promise<PublicPresentationProjection> => {
          const snapshot = await eventSnapshot(request.query.eventSessionId);
          const units = await eventRepository.listUnits(
            request.query.eventSessionId,
          );
          const ranked = scoring.rank(
            await Promise.all(
              units.map(async (unit) => ({
                unitId: unit.unitId,
                unitStatus: unit.status,
                level3Hints: 0,
                projection: await scoring.project(
                  unit.eventSessionId,
                  unit.unitId,
                ),
              })),
            ),
          );
          const active =
            snapshot.eventSession.status === 'active'
              ? snapshot.missions.find(
                  (mission) =>
                    mission.status === 'open' || mission.status === 'paused',
                )
              : undefined;
          const districtNames = {
            harbor: 'Harbor',
            'old-town': 'Old Town',
            'north-hills': 'North Hills',
            'east-bank': 'East Bank',
            'civic-center': 'Civic Center',
          };
          const recovery = cityRecovery.project(
            request.query.eventSessionId,
            ranked.map(({ unitId }) => unitId),
          );
          return {
            schemaVersion: '1.0',
            eventSessionId: request.query.eventSessionId,
            source: 'local-event',
            eventName: 'Operation Lighthouse',
            updatedAt: new Date().toISOString(),
            registeredUnitCount: units.length,
            activityWindowSeconds: 90,
            connectedUnitCount: units.filter(
              (unit) => (activity.get(unit.unitId) ?? 0) >= Date.now() - 90_000,
            ).length,
            activeMission:
              active === undefined
                ? {
                    title: 'No open mission',
                    phase: snapshot.eventSession.status,
                    progressPercent: 0,
                  }
                : {
                    title: active.title,
                    phase: active.status,
                    progressPercent: active.completionPercent,
                  },
            recoverySource: recovery.source,
            recovery: {
              policyVersion: recovery.policyVersion,
              baselinePercent: recovery.baselinePercent,
              eligibleUnitCount: recovery.eligibleUnitCount,
              contributionCount: recovery.contributionCount,
              finaleThreshold: recovery.finaleThreshold,
              finaleUnlocked: recovery.finaleUnlocked,
            },
            collectiveRecoveryPercent: recovery.collectiveRecoveryPercent,
            districts: recovery.districts.map((district) => ({
              districtId: district.districtId,
              displayName: districtNames[district.districtId],
              recoveryPercent: district.recoveryPercent,
              baselinePercent: district.baselinePercent,
              contributionCount: district.contributionCount,
              status: district.status,
            })),
            rankings: ranked
              .filter(({ projection }) => projection.totalPoints > 0)
              .map((candidate) => ({
                rank: candidate.rank,
                moderatedUnitName: `Unit ${String(units.findIndex((unit) => unit.unitId === candidate.unitId) + 1).padStart(3, '0')}`,
                score: candidate.projection.totalPoints,
              })),
            recognitions: [],
          };
        },
      ),
  );
  return app;
}
