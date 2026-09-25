import type { DistrictId, PortAzureWorldModel, ServiceId } from './world.js';

export interface WorldModelIssue {
  readonly code:
    | 'duplicate-id'
    | 'invalid-reference'
    | 'invalid-value'
    | 'missing-recovery'
    | 'inconsistent-recovery';
  readonly path: string;
  readonly message: string;
}

export interface WorldModelValidation {
  readonly valid: boolean;
  readonly issues: readonly WorldModelIssue[];
}

const addDuplicateIssues = (
  issues: WorldModelIssue[],
  path: string,
  values: readonly string[],
): void => {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      issues.push({
        code: 'duplicate-id',
        path,
        message: `Duplicate identifier: ${value}`,
      });
    }
    seen.add(value);
  }
};

const validateRecoveryCoverage = (
  issues: WorldModelIssue[],
  path: string,
  expected: readonly string[],
  actual: readonly string[],
): void => {
  addDuplicateIssues(issues, path, actual);
  const actualIds = new Set(actual);
  for (const id of expected) {
    if (!actualIds.has(id)) {
      issues.push({
        code: 'missing-recovery',
        path,
        message: `Missing recovery entry: ${id}`,
      });
    }
  }
  for (const id of actualIds) {
    if (!expected.includes(id)) {
      issues.push({
        code: 'invalid-reference',
        path,
        message: `Unknown recovery identifier: ${id}`,
      });
    }
  }
};

export const validatePortAzureWorld = (
  world: PortAzureWorldModel,
): WorldModelValidation => {
  const issues: WorldModelIssue[] = [];
  const districtIds = world.districts.map(({ districtId }) => districtId);
  const gridSectorIds = world.gridSectors.map(
    ({ gridSectorId }) => gridSectorId,
  );
  const serviceIds = world.services.map(({ serviceId }) => serviceId);
  const shelterIds = world.shelters.map(({ shelterId }) => shelterId);
  const routeIds = world.routes.map(({ routeId }) => routeId);
  const districtSet = new Set<DistrictId>(districtIds);
  const gridSectorSet = new Set(gridSectorIds);
  const serviceSet = new Set<ServiceId>(serviceIds);

  addDuplicateIssues(issues, 'districts', districtIds);
  addDuplicateIssues(issues, 'gridSectors', gridSectorIds);
  addDuplicateIssues(issues, 'services', serviceIds);
  addDuplicateIssues(issues, 'shelters', shelterIds);
  addDuplicateIssues(issues, 'routes', routeIds);

  for (const district of world.districts) {
    if (
      district.population <= 0 ||
      district.map.x < 0 ||
      district.map.x > 100 ||
      district.map.y < 0 ||
      district.map.y > 100
    ) {
      issues.push({
        code: 'invalid-value',
        path: `districts.${district.districtId}`,
        message:
          'Population must be positive and map coordinates must be 0-100.',
      });
    }
  }

  for (const sector of world.gridSectors) {
    if (
      sector.generationCapacityMw <= 0 ||
      sector.baselineLoadMw < 0 ||
      sector.baselineLoadMw > sector.generationCapacityMw
    ) {
      issues.push({
        code: 'invalid-value',
        path: `gridSectors.${sector.gridSectorId}`,
        message: 'Grid capacity and baseline load are inconsistent.',
      });
    }
    for (const districtId of sector.districtIds) {
      if (!districtSet.has(districtId)) {
        issues.push({
          code: 'invalid-reference',
          path: `gridSectors.${sector.gridSectorId}.districtIds`,
          message: `Unknown district: ${districtId}`,
        });
      }
    }
    for (const serviceId of sector.priorityServiceIds) {
      if (!serviceSet.has(serviceId)) {
        issues.push({
          code: 'invalid-reference',
          path: `gridSectors.${sector.gridSectorId}.priorityServiceIds`,
          message: `Unknown service: ${serviceId}`,
        });
      }
    }
  }

  for (const service of world.services) {
    if (
      !districtSet.has(service.districtId) ||
      !gridSectorSet.has(service.gridSectorId)
    ) {
      issues.push({
        code: 'invalid-reference',
        path: `services.${service.serviceId}`,
        message: 'Service references an unknown district or grid sector.',
      });
    }
    for (const dependencyId of service.dependsOnServiceIds) {
      if (dependencyId === service.serviceId || !serviceSet.has(dependencyId)) {
        issues.push({
          code: 'invalid-reference',
          path: `services.${service.serviceId}.dependsOnServiceIds`,
          message: `Invalid service dependency: ${dependencyId}`,
        });
      }
    }
  }

  for (const shelter of world.shelters) {
    if (
      !districtSet.has(shelter.districtId) ||
      !gridSectorSet.has(shelter.gridSectorId)
    ) {
      issues.push({
        code: 'invalid-reference',
        path: `shelters.${shelter.shelterId}`,
        message: 'Shelter references an unknown district or grid sector.',
      });
    }
    if (
      shelter.capacity <= 0 ||
      shelter.accessibleCapacity < 0 ||
      shelter.petCapacity < 0 ||
      shelter.accessibleCapacity > shelter.capacity ||
      shelter.petCapacity > shelter.capacity ||
      shelter.backupPowerHours < 0
    ) {
      issues.push({
        code: 'invalid-value',
        path: `shelters.${shelter.shelterId}`,
        message: 'Shelter capacities or backup power are inconsistent.',
      });
    }
  }

  for (const route of world.routes) {
    if (
      !districtSet.has(route.fromDistrictId) ||
      !districtSet.has(route.toDistrictId) ||
      route.fromDistrictId === route.toDistrictId
    ) {
      issues.push({
        code: 'invalid-reference',
        path: `routes.${route.routeId}`,
        message: 'Route endpoints must reference two known districts.',
      });
    }
    if (
      route.modes.length === 0 ||
      route.distanceKm <= 0 ||
      route.baselineMinutes <= 0
    ) {
      issues.push({
        code: 'invalid-value',
        path: `routes.${route.routeId}`,
        message: 'Route modes, distance, and travel time must be positive.',
      });
    }
  }

  validateRecoveryCoverage(
    issues,
    'recovery.districts',
    districtIds,
    world.recovery.districts.map(({ districtId }) => districtId),
  );
  validateRecoveryCoverage(
    issues,
    'recovery.services',
    serviceIds,
    world.recovery.services.map(({ serviceId }) => serviceId),
  );
  validateRecoveryCoverage(
    issues,
    'recovery.shelters',
    shelterIds,
    world.recovery.shelters.map(({ shelterId }) => shelterId),
  );
  validateRecoveryCoverage(
    issues,
    'recovery.routes',
    routeIds,
    world.recovery.routes.map(({ routeId }) => routeId),
  );
  validateRecoveryCoverage(
    issues,
    'recovery.gridSectors',
    gridSectorIds,
    world.recovery.gridSectors.map(({ gridSectorId }) => gridSectorId),
  );

  for (const recovery of world.recovery.districts) {
    if (recovery.recoveryPercent < 0 || recovery.recoveryPercent > 100) {
      issues.push({
        code: 'invalid-value',
        path: `recovery.districts.${recovery.districtId}`,
        message: 'District recovery must be between 0 and 100.',
      });
    }
  }
  for (const recovery of world.recovery.shelters) {
    const shelter = world.shelters.find(
      ({ shelterId }) => shelterId === recovery.shelterId,
    );
    if (shelter !== undefined && recovery.occupancy > shelter.capacity) {
      issues.push({
        code: 'inconsistent-recovery',
        path: `recovery.shelters.${recovery.shelterId}`,
        message: 'Shelter occupancy exceeds capacity.',
      });
    }
  }
  for (const recovery of world.recovery.gridSectors) {
    const sector = world.gridSectors.find(
      ({ gridSectorId }) => gridSectorId === recovery.gridSectorId,
    );
    if (
      recovery.availableCapacityMw < 0 ||
      (sector !== undefined &&
        recovery.availableCapacityMw > sector.generationCapacityMw)
    ) {
      issues.push({
        code: 'inconsistent-recovery',
        path: `recovery.gridSectors.${recovery.gridSectorId}`,
        message: 'Available grid capacity is outside sector limits.',
      });
    }
  }

  const computedOverall = Math.round(
    world.recovery.districts.reduce(
      (total, district) => total + district.recoveryPercent,
      0,
    ) / Math.max(1, world.recovery.districts.length),
  );
  if (world.recovery.overallPercent !== computedOverall) {
    issues.push({
      code: 'inconsistent-recovery',
      path: 'recovery.overallPercent',
      message: `Overall recovery must equal district average ${String(computedOverall)}.`,
    });
  }
  if (
    world.recovery.revision < 1 ||
    Number.isNaN(Date.parse(world.recovery.observedAt))
  ) {
    issues.push({
      code: 'invalid-value',
      path: 'recovery',
      message: 'Recovery requires a positive revision and valid timestamp.',
    });
  }

  return { valid: issues.length === 0, issues };
};

export class InvalidWorldModelError extends Error {
  public constructor(public readonly issues: readonly WorldModelIssue[]) {
    super('Port Azure world model is invalid.');
    this.name = 'InvalidWorldModelError';
  }
}

export const assertValidPortAzureWorld = (world: PortAzureWorldModel): void => {
  const result = validatePortAzureWorld(world);
  if (!result.valid) {
    throw new InvalidWorldModelError(result.issues);
  }
};
