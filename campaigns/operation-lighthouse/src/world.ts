export const districtIds = [
  'harbor',
  'old-town',
  'north-hills',
  'east-bank',
  'civic-center',
] as const;
export const gridSectorIds = [
  'harbor-loop',
  'central-loop',
  'upland-loop',
  'east-loop',
] as const;
export const serviceIds = [
  'emergency-operations',
  'port-azure-general',
  'water-pumping',
  'transit-control',
  'public-safety-radio',
] as const;
export const shelterIds = [
  'harbor-community-center',
  'old-town-library',
  'north-hills-school',
  'east-bank-arena',
] as const;
export const routeIds = [
  'harbor-old-town',
  'harbor-east-bank',
  'old-town-civic-center',
  'old-town-north-hills',
  'civic-center-east-bank',
  'north-hills-east-bank',
] as const;

export type DistrictId = (typeof districtIds)[number];
export type GridSectorId = (typeof gridSectorIds)[number];
export type ServiceId = (typeof serviceIds)[number];
export type ShelterId = (typeof shelterIds)[number];
export type RouteId = (typeof routeIds)[number];

export interface MapCoordinate {
  readonly x: number;
  readonly y: number;
}

export interface District {
  readonly districtId: DistrictId;
  readonly nameKey: string;
  readonly population: number;
  readonly terrain: 'coastal' | 'historic' | 'upland' | 'riverside' | 'urban';
  readonly stormExposure: 'moderate' | 'high' | 'severe';
  readonly map: MapCoordinate;
}

export interface GridSector {
  readonly gridSectorId: GridSectorId;
  readonly districtIds: readonly DistrictId[];
  readonly generationCapacityMw: number;
  readonly baselineLoadMw: number;
  readonly priorityServiceIds: readonly ServiceId[];
}

export interface CityService {
  readonly serviceId: ServiceId;
  readonly nameKey: string;
  readonly kind:
    'coordination' | 'healthcare' | 'water' | 'transport' | 'communications';
  readonly districtId: DistrictId;
  readonly gridSectorId: GridSectorId;
  readonly criticality: 'essential' | 'critical';
  readonly dependsOnServiceIds: readonly ServiceId[];
}

export interface Shelter {
  readonly shelterId: ShelterId;
  readonly nameKey: string;
  readonly districtId: DistrictId;
  readonly gridSectorId: GridSectorId;
  readonly capacity: number;
  readonly accessibleCapacity: number;
  readonly petCapacity: number;
  readonly backupPowerHours: number;
}

export interface TransportRoute {
  readonly routeId: RouteId;
  readonly nameKey: string;
  readonly fromDistrictId: DistrictId;
  readonly toDistrictId: DistrictId;
  readonly modes: readonly ('bus' | 'emergency' | 'pedestrian')[];
  readonly distanceKm: number;
  readonly baselineMinutes: number;
}

export type OperationalStatus =
  'operational' | 'degraded' | 'offline' | 'recovering';
export type RouteStatus = 'open' | 'constrained' | 'closed';
export type ShelterStatus = 'open' | 'standby' | 'full' | 'closed';
export type GridStatus = 'stable' | 'strained' | 'outage' | 'restoring';

export interface DistrictRecovery {
  readonly districtId: DistrictId;
  readonly recoveryPercent: number;
  readonly status: 'critical' | 'recovering' | 'stable';
}

export interface ServiceRecovery {
  readonly serviceId: ServiceId;
  readonly status: OperationalStatus;
}

export interface ShelterRecovery {
  readonly shelterId: ShelterId;
  readonly status: ShelterStatus;
  readonly occupancy: number;
}

export interface RouteRecovery {
  readonly routeId: RouteId;
  readonly status: RouteStatus;
}

export interface GridRecovery {
  readonly gridSectorId: GridSectorId;
  readonly status: GridStatus;
  readonly availableCapacityMw: number;
}

export interface RecoveryState {
  readonly revision: number;
  readonly observedAt: string;
  readonly overallPercent: number;
  readonly districts: readonly DistrictRecovery[];
  readonly services: readonly ServiceRecovery[];
  readonly shelters: readonly ShelterRecovery[];
  readonly routes: readonly RouteRecovery[];
  readonly gridSectors: readonly GridRecovery[];
}

export interface PortAzureWorldModel {
  readonly schemaVersion: '1.0';
  readonly cityId: 'port-azure';
  readonly nameKey: 'campaign.operationLighthouse.city.portAzure';
  readonly districts: readonly District[];
  readonly services: readonly CityService[];
  readonly shelters: readonly Shelter[];
  readonly routes: readonly TransportRoute[];
  readonly gridSectors: readonly GridSector[];
  readonly recovery: RecoveryState;
}

const seedWorld: PortAzureWorldModel = {
  schemaVersion: '1.0',
  cityId: 'port-azure',
  nameKey: 'campaign.operationLighthouse.city.portAzure',
  districts: [
    {
      districtId: 'harbor',
      nameKey: 'campaign.operationLighthouse.district.harbor',
      population: 18_400,
      terrain: 'coastal',
      stormExposure: 'severe',
      map: { x: 17, y: 63 },
    },
    {
      districtId: 'old-town',
      nameKey: 'campaign.operationLighthouse.district.oldTown',
      population: 24_100,
      terrain: 'historic',
      stormExposure: 'high',
      map: { x: 42, y: 37 },
    },
    {
      districtId: 'north-hills',
      nameKey: 'campaign.operationLighthouse.district.northHills',
      population: 16_700,
      terrain: 'upland',
      stormExposure: 'moderate',
      map: { x: 66, y: 18 },
    },
    {
      districtId: 'east-bank',
      nameKey: 'campaign.operationLighthouse.district.eastBank',
      population: 21_900,
      terrain: 'riverside',
      stormExposure: 'high',
      map: { x: 75, y: 61 },
    },
    {
      districtId: 'civic-center',
      nameKey: 'campaign.operationLighthouse.district.civicCenter',
      population: 12_600,
      terrain: 'urban',
      stormExposure: 'moderate',
      map: { x: 51, y: 55 },
    },
  ],
  gridSectors: [
    {
      gridSectorId: 'harbor-loop',
      districtIds: ['harbor'],
      generationCapacityMw: 42,
      baselineLoadMw: 34,
      priorityServiceIds: ['water-pumping'],
    },
    {
      gridSectorId: 'central-loop',
      districtIds: ['old-town', 'civic-center'],
      generationCapacityMw: 68,
      baselineLoadMw: 53,
      priorityServiceIds: ['emergency-operations', 'public-safety-radio'],
    },
    {
      gridSectorId: 'upland-loop',
      districtIds: ['north-hills'],
      generationCapacityMw: 31,
      baselineLoadMw: 19,
      priorityServiceIds: ['port-azure-general'],
    },
    {
      gridSectorId: 'east-loop',
      districtIds: ['east-bank'],
      generationCapacityMw: 39,
      baselineLoadMw: 30,
      priorityServiceIds: ['transit-control'],
    },
  ],
  services: [
    {
      serviceId: 'emergency-operations',
      nameKey: 'campaign.operationLighthouse.service.emergencyOperations',
      kind: 'coordination',
      districtId: 'civic-center',
      gridSectorId: 'central-loop',
      criticality: 'critical',
      dependsOnServiceIds: ['public-safety-radio'],
    },
    {
      serviceId: 'port-azure-general',
      nameKey: 'campaign.operationLighthouse.service.portAzureGeneral',
      kind: 'healthcare',
      districtId: 'north-hills',
      gridSectorId: 'upland-loop',
      criticality: 'critical',
      dependsOnServiceIds: ['water-pumping', 'public-safety-radio'],
    },
    {
      serviceId: 'water-pumping',
      nameKey: 'campaign.operationLighthouse.service.waterPumping',
      kind: 'water',
      districtId: 'harbor',
      gridSectorId: 'harbor-loop',
      criticality: 'critical',
      dependsOnServiceIds: [],
    },
    {
      serviceId: 'transit-control',
      nameKey: 'campaign.operationLighthouse.service.transitControl',
      kind: 'transport',
      districtId: 'east-bank',
      gridSectorId: 'east-loop',
      criticality: 'essential',
      dependsOnServiceIds: ['public-safety-radio'],
    },
    {
      serviceId: 'public-safety-radio',
      nameKey: 'campaign.operationLighthouse.service.publicSafetyRadio',
      kind: 'communications',
      districtId: 'old-town',
      gridSectorId: 'central-loop',
      criticality: 'critical',
      dependsOnServiceIds: [],
    },
  ],
  shelters: [
    {
      shelterId: 'harbor-community-center',
      nameKey: 'campaign.operationLighthouse.shelter.harborCommunityCenter',
      districtId: 'harbor',
      gridSectorId: 'harbor-loop',
      capacity: 260,
      accessibleCapacity: 48,
      petCapacity: 30,
      backupPowerHours: 8,
    },
    {
      shelterId: 'old-town-library',
      nameKey: 'campaign.operationLighthouse.shelter.oldTownLibrary',
      districtId: 'old-town',
      gridSectorId: 'central-loop',
      capacity: 180,
      accessibleCapacity: 36,
      petCapacity: 0,
      backupPowerHours: 6,
    },
    {
      shelterId: 'north-hills-school',
      nameKey: 'campaign.operationLighthouse.shelter.northHillsSchool',
      districtId: 'north-hills',
      gridSectorId: 'upland-loop',
      capacity: 420,
      accessibleCapacity: 80,
      petCapacity: 64,
      backupPowerHours: 18,
    },
    {
      shelterId: 'east-bank-arena',
      nameKey: 'campaign.operationLighthouse.shelter.eastBankArena',
      districtId: 'east-bank',
      gridSectorId: 'east-loop',
      capacity: 520,
      accessibleCapacity: 96,
      petCapacity: 72,
      backupPowerHours: 12,
    },
  ],
  routes: [
    {
      routeId: 'harbor-old-town',
      nameKey: 'campaign.operationLighthouse.route.harborOldTown',
      fromDistrictId: 'harbor',
      toDistrictId: 'old-town',
      modes: ['bus', 'emergency', 'pedestrian'],
      distanceKm: 4.8,
      baselineMinutes: 14,
    },
    {
      routeId: 'harbor-east-bank',
      nameKey: 'campaign.operationLighthouse.route.harborEastBank',
      fromDistrictId: 'harbor',
      toDistrictId: 'east-bank',
      modes: ['emergency'],
      distanceKm: 7.2,
      baselineMinutes: 19,
    },
    {
      routeId: 'old-town-civic-center',
      nameKey: 'campaign.operationLighthouse.route.oldTownCivicCenter',
      fromDistrictId: 'old-town',
      toDistrictId: 'civic-center',
      modes: ['bus', 'emergency', 'pedestrian'],
      distanceKm: 2.6,
      baselineMinutes: 9,
    },
    {
      routeId: 'old-town-north-hills',
      nameKey: 'campaign.operationLighthouse.route.oldTownNorthHills',
      fromDistrictId: 'old-town',
      toDistrictId: 'north-hills',
      modes: ['bus', 'emergency'],
      distanceKm: 5.1,
      baselineMinutes: 16,
    },
    {
      routeId: 'civic-center-east-bank',
      nameKey: 'campaign.operationLighthouse.route.civicCenterEastBank',
      fromDistrictId: 'civic-center',
      toDistrictId: 'east-bank',
      modes: ['bus', 'emergency', 'pedestrian'],
      distanceKm: 3.9,
      baselineMinutes: 12,
    },
    {
      routeId: 'north-hills-east-bank',
      nameKey: 'campaign.operationLighthouse.route.northHillsEastBank',
      fromDistrictId: 'north-hills',
      toDistrictId: 'east-bank',
      modes: ['bus', 'emergency'],
      distanceKm: 6.4,
      baselineMinutes: 18,
    },
  ],
  recovery: {
    revision: 1,
    observedAt: '2026-09-25T08:00:00Z',
    overallPercent: 58,
    districts: [
      { districtId: 'harbor', recoveryPercent: 32, status: 'critical' },
      { districtId: 'old-town', recoveryPercent: 51, status: 'recovering' },
      { districtId: 'north-hills', recoveryPercent: 86, status: 'stable' },
      { districtId: 'east-bank', recoveryPercent: 48, status: 'recovering' },
      { districtId: 'civic-center', recoveryPercent: 73, status: 'recovering' },
    ],
    services: [
      { serviceId: 'emergency-operations', status: 'operational' },
      { serviceId: 'port-azure-general', status: 'operational' },
      { serviceId: 'water-pumping', status: 'degraded' },
      { serviceId: 'transit-control', status: 'degraded' },
      { serviceId: 'public-safety-radio', status: 'recovering' },
    ],
    shelters: [
      {
        shelterId: 'harbor-community-center',
        status: 'standby',
        occupancy: 0,
      },
      { shelterId: 'old-town-library', status: 'open', occupancy: 74 },
      { shelterId: 'north-hills-school', status: 'open', occupancy: 126 },
      { shelterId: 'east-bank-arena', status: 'open', occupancy: 208 },
    ],
    routes: [
      { routeId: 'harbor-old-town', status: 'constrained' },
      { routeId: 'harbor-east-bank', status: 'closed' },
      { routeId: 'old-town-civic-center', status: 'open' },
      { routeId: 'old-town-north-hills', status: 'open' },
      { routeId: 'civic-center-east-bank', status: 'constrained' },
      { routeId: 'north-hills-east-bank', status: 'open' },
    ],
    gridSectors: [
      {
        gridSectorId: 'harbor-loop',
        status: 'strained',
        availableCapacityMw: 26,
      },
      {
        gridSectorId: 'central-loop',
        status: 'restoring',
        availableCapacityMw: 44,
      },
      {
        gridSectorId: 'upland-loop',
        status: 'stable',
        availableCapacityMw: 31,
      },
      {
        gridSectorId: 'east-loop',
        status: 'strained',
        availableCapacityMw: 27,
      },
    ],
  },
};

const deepFreeze = <T>(value: T): T => {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) {
      deepFreeze(nested);
    }
  }
  return value;
};

export const portAzureWorld = deepFreeze(structuredClone(seedWorld));
