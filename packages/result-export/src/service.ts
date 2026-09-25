import { createHash } from 'node:crypto';
import { v7 as uuidV7 } from 'uuid';

import { ResultExportError } from './errors.js';
import type { ResultExportRepository } from './repository.js';
import type {
  CreateResultExportInput,
  ResultExportArtifact,
  ResultExportDocument,
  ResultExportSource,
  ResultExportSourceResolver,
} from './types.js';

export interface ResultExportServiceOptions {
  readonly clock?: () => Date;
  readonly repository: ResultExportRepository;
  readonly sourceResolver: ResultExportSourceResolver;
}

export class ResultExportService {
  readonly #clock: () => Date;
  readonly #repository: ResultExportRepository;
  readonly #sourceResolver: ResultExportSourceResolver;

  public constructor(options: ResultExportServiceOptions) {
    this.#clock = options.clock ?? (() => new Date());
    this.#repository = options.repository;
    this.#sourceResolver = options.sourceResolver;
  }

  public async create(
    input: CreateResultExportInput,
  ): Promise<ResultExportArtifact> {
    if (
      input.eventSessionId.trim().length === 0 ||
      input.idempotencyKey.trim().length === 0 ||
      input.idempotencyKey.length > 200
    ) {
      throw new ResultExportError('result-export-request-invalid');
    }
    const replay = await this.#repository.get(
      input.eventSessionId,
      input.idempotencyKey,
    );
    if (replay !== undefined) {
      return replay;
    }

    const source = await this.#sourceResolver.load(input.eventSessionId);
    this.#validateSource(input.eventSessionId, source);
    const exportId = uuidV7();
    const generatedAt = this.#clock().toISOString();
    const document = this.#document(exportId, generatedAt, source);
    const content = `${JSON.stringify(document, undefined, 2)}\n`;
    const artifact: ResultExportArtifact = {
      content,
      eventSessionId: input.eventSessionId,
      exportId,
      fileName: `mission-control-results-${input.eventSessionId}-${exportId}.json`,
      generatedAt,
      idempotencyKey: input.idempotencyKey,
      mediaType: 'application/json',
      sha256: createHash('sha256').update(content, 'utf8').digest('hex'),
    };
    return this.#repository.saveOnce(artifact);
  }

  #document(
    exportId: string,
    generatedAt: string,
    source: ResultExportSource,
  ): ResultExportDocument {
    return {
      event: {
        campaignId: source.event.campaignId,
        campaignVersion: source.event.campaignVersion,
        ...(source.event.closedAt === undefined
          ? {}
          : { closedAt: source.event.closedAt }),
        createdAt: source.event.createdAt,
        eventSessionId: source.event.eventSessionId,
        scoringPolicyVersion: source.event.scoringPolicyVersion,
        snapshotAt: source.event.snapshotAt,
        ...(source.event.startedAt === undefined
          ? {}
          : { startedAt: source.event.startedAt }),
        status: source.event.status,
      },
      exportId,
      generatedAt,
      missions: source.missions
        .map((mission) => ({
          attemptCount: mission.attemptCount,
          ...(mission.completedAt === undefined
            ? {}
            : { completedAt: mission.completedAt }),
          highestHintLevel: mission.highestHintLevel,
          ...(mission.latestValidationOutcome === undefined
            ? {}
            : { latestValidationOutcome: mission.latestValidationOutcome }),
          missionId: mission.missionId,
          missionVersion: mission.missionVersion,
          ...(mission.startedAt === undefined
            ? {}
            : { startedAt: mission.startedAt }),
          status: mission.status,
          unitId: mission.unitId,
        }))
        .toSorted(
          (left, right) =>
            left.unitId.localeCompare(right.unitId) ||
            left.missionId.localeCompare(right.missionId),
        ),
      recognitions: source.recognitions
        .map((recognition) => ({
          awardedAt: recognition.awardedAt,
          categoryId: recognition.categoryId,
          titleKey: recognition.titleKey,
          unitId: recognition.unitId,
        }))
        .toSorted(
          (left, right) =>
            left.categoryId.localeCompare(right.categoryId) ||
            left.unitId.localeCompare(right.unitId),
        ),
      schemaVersion: '1.0',
      scoreAdjustments: source.scoreAdjustments
        .map((adjustment) => ({
          createdAt: adjustment.createdAt,
          explanation: adjustment.explanation,
          ...(adjustment.missionId === undefined
            ? {}
            : { missionId: adjustment.missionId }),
          points: adjustment.points,
          reasonCode: adjustment.reasonCode,
          unitId: adjustment.unitId,
        }))
        .toSorted(
          (left, right) =>
            left.createdAt.localeCompare(right.createdAt) ||
            left.unitId.localeCompare(right.unitId),
        ),
      scores: source.scores
        .map((score) => ({
          adjustmentPoints: score.adjustmentPoints,
          basePoints: score.basePoints,
          bonusPoints: score.bonusPoints,
          efficiency: score.efficiency,
          evidenceAndGrounding: score.evidenceAndGrounding,
          explainability: score.explainability,
          rank: score.rank,
          reliability: score.reliability,
          requiredOutcome: score.requiredOutcome,
          totalPoints: score.totalPoints,
          unitId: score.unitId,
        }))
        .toSorted(
          (left, right) =>
            left.rank - right.rank || left.unitId.localeCompare(right.unitId),
        ),
      units: source.units
        .map((unit) => ({
          createdAt: unit.createdAt,
          displayName: unit.displayName,
          locale: unit.locale,
          status: unit.status,
          unitId: unit.unitId,
        }))
        .toSorted((left, right) => left.unitId.localeCompare(right.unitId)),
    };
  }

  #validateSource(eventSessionId: string, source: ResultExportSource): void {
    const unitIds = new Set(source.units.map(({ unitId }) => unitId));
    if (
      source.event.eventSessionId !== eventSessionId ||
      source.units.some(
        (unit) =>
          unit.unitId.trim().length === 0 ||
          unit.displayName.trim().length === 0,
      ) ||
      source.missions.some(
        (mission) =>
          !unitIds.has(mission.unitId) ||
          !Number.isInteger(mission.attemptCount) ||
          mission.attemptCount < 0 ||
          !Number.isInteger(mission.highestHintLevel) ||
          mission.highestHintLevel < 0 ||
          mission.highestHintLevel > 3,
      ) ||
      source.scores.some(
        (score) =>
          !unitIds.has(score.unitId) ||
          !Number.isInteger(score.rank) ||
          score.rank < 1 ||
          !Number.isInteger(score.totalPoints),
      ) ||
      source.scoreAdjustments.some(
        (adjustment) =>
          !unitIds.has(adjustment.unitId) ||
          !Number.isInteger(adjustment.points) ||
          adjustment.points === 0 ||
          adjustment.reasonCode.trim().length === 0 ||
          adjustment.explanation.trim().length === 0,
      ) ||
      source.recognitions.some(
        (recognition) =>
          !unitIds.has(recognition.unitId) ||
          recognition.categoryId.trim().length === 0 ||
          recognition.titleKey.trim().length === 0,
      )
    ) {
      throw new ResultExportError('result-export-source-invalid');
    }
  }
}
