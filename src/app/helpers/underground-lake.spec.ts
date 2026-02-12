import type {
  Floor,
  InhabitantInstance,
  IsContentItem,
  PlacedRoom,
  RoomDefinition,
  RoomUpgradePath,
} from '@interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Constants ---

const UNDERGROUND_LAKE_ID = 'room-underground-lake';
const MUSHROOM_GROVE_ID = 'room-mushroom-grove';
const SOUL_WELL_ID = 'room-soul-well';

// --- Upgrade paths ---

const deepFishingPath: RoomUpgradePath = {
  id: 'upgrade-deep-fishing',
  name: 'Deep Fishing',
  description: 'Deep-water techniques increase the food catch.',
  cost: { gold: 80, crystals: 30 },
  effects: [{ type: 'productionMultiplier', value: 1.6, resource: 'food' }],
};

const expandedLakePath: RoomUpgradePath = {
  id: 'upgrade-expanded-lake',
  name: 'Expanded Lake',
  description: 'Excavate additional chambers for more fishers.',
  cost: { gold: 70, crystals: 25 },
  effects: [{ type: 'maxInhabitantBonus', value: 2 }],
};

const darkWatersPath: RoomUpgradePath = {
  id: 'upgrade-dark-waters',
  name: 'Dark Waters',
  description: 'Strange creatures provide food and an unsettling presence.',
  cost: { gold: 90, crystals: 40, essence: 15 },
  effects: [
    { type: 'productionMultiplier', value: 1.5, resource: 'food' },
    { type: 'fearIncrease', value: 1 },
    { type: 'secondaryProduction', value: 0.1, resource: 'essence' },
  ],
};

// --- Mock content ---

const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  getEntry: (id: string) => mockContent.get(id) ?? undefined,
  getEntriesByType: vi.fn(() => []),
  getEntries: vi.fn(),
  allIdsByName: vi.fn(() => new Map()),
}));

const undergroundLakeRoom: RoomDefinition & IsContentItem = {
  id: UNDERGROUND_LAKE_ID,
  name: 'Underground Lake',
  __type: 'room',
  description: 'A vast subterranean lake fed by hidden aquifers.',
  shapeId: 'shape-t',
  cost: { gold: 60, crystals: 20 },
  production: { food: 1.0 },
  requiresWorkers: true,
  adjacencyBonuses: [
    { adjacentRoomType: MUSHROOM_GROVE_ID, bonus: 0.3, description: '' },
    { adjacentRoomType: SOUL_WELL_ID, bonus: 0.15, description: '' },
    { adjacentRoomType: UNDERGROUND_LAKE_ID, bonus: 0.2, description: '' },
  ],
  isUnique: false,
  removable: true,
  maxInhabitants: 3,
  inhabitantRestriction: null,
  fearLevel: 0,
  fearReductionAura: 0,
  upgradePaths: [deepFishingPath, expandedLakePath, darkWatersPath],
  autoPlace: false,
};

const mushroomGroveRoom: RoomDefinition & IsContentItem = {
  id: MUSHROOM_GROVE_ID,
  name: 'Mushroom Grove',
  __type: 'room',
  description: '',
  shapeId: 'shape-t',
  cost: {},
  production: { food: 1.6 },
  requiresWorkers: true,
  adjacencyBonuses: [],
  isUnique: false,
  removable: true,
  maxInhabitants: 3,
  inhabitantRestriction: null,
  fearLevel: 1,
  fearReductionAura: 0,
  upgradePaths: [],
  autoPlace: false,
};

const soulWellRoom: RoomDefinition & IsContentItem = {
  id: SOUL_WELL_ID,
  name: 'Soul Well',
  __type: 'room',
  description: '',
  shapeId: 'shape-t',
  cost: {},
  production: { essence: 0.3 },
  requiresWorkers: false,
  adjacencyBonuses: [],
  isUnique: false,
  removable: true,
  maxInhabitants: 2,
  inhabitantRestriction: null,
  fearLevel: 3,
  fearReductionAura: 0,
  upgradePaths: [],
  autoPlace: false,
};

mockContent.set('shape-t', {
  id: 'shape-t',
  name: 'T-Shape',
  __type: 'roomshape',
  width: 3,
  height: 2,
  tiles: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 1, y: 1 },
  ],
});

mockContent.set('def-goblin', {
  id: 'def-goblin',
  name: 'Goblin',
  __type: 'inhabitant',
  type: 'creature',
  tier: 1,
  description: '',
  cost: {},
  stats: {
    hp: 30,
    attack: 10,
    defense: 8,
    speed: 12,
    workerEfficiency: 1.0,
  },
  traits: [],
});

// --- Imports after mocks ---

import {
  calculateAdjacencyBonus,
  calculateSingleRoomProduction,
  calculateTotalProduction,
  getBaseProduction,
  productionPerMinute,
} from '@helpers/production';
import {
  canApplyUpgrade,
  getEffectiveMaxInhabitants,
  getUpgradePaths,
} from '@helpers/room-upgrades';

// --- Helpers ---

function makeFloor(
  rooms: PlacedRoom[],
  inhabitants: InhabitantInstance[] = [],
): Floor {
  return {
    id: 'floor-1',
    name: 'Floor 1',
    depth: 1,
    biome: 'neutral',
    grid: { tiles: [] } as unknown as Floor['grid'],
    rooms,
    hallways: [],
    inhabitants,
    connections: [],
    traps: [],
  };
}

function createPlacedLake(overrides: Partial<PlacedRoom> = {}): PlacedRoom {
  return {
    id: 'placed-lake-1',
    roomTypeId: UNDERGROUND_LAKE_ID,
    shapeId: 'shape-t',
    anchorX: 0,
    anchorY: 0,
    ...overrides,
  };
}

// --- Tests ---

beforeEach(() => {
  mockContent.set(UNDERGROUND_LAKE_ID, undergroundLakeRoom);
  mockContent.set(MUSHROOM_GROVE_ID, mushroomGroveRoom);
  mockContent.set(SOUL_WELL_ID, soulWellRoom);
});

describe('Underground Lake: definition', () => {
  it('should use the T-shape', () => {
    expect(undergroundLakeRoom.shapeId).toBe('shape-t');
  });

  it('should have no fear (0)', () => {
    expect(undergroundLakeRoom.fearLevel).toBe(0);
  });

  it('should have base capacity of 3 inhabitants', () => {
    expect(undergroundLakeRoom.maxInhabitants).toBe(3);
  });

  it('should require workers', () => {
    expect(undergroundLakeRoom.requiresWorkers).toBe(true);
  });

  it('should have 3 upgrade paths', () => {
    expect(undergroundLakeRoom.upgradePaths).toHaveLength(3);
  });

  it('should have 3 adjacency bonuses', () => {
    expect(undergroundLakeRoom.adjacencyBonuses).toHaveLength(3);
  });
});

describe('Underground Lake: base production', () => {
  it('should have base production of 1.0 food/tick (5 food/min)', () => {
    const production = getBaseProduction(UNDERGROUND_LAKE_ID);
    expect(production).toEqual({ food: 1.0 });
    expect(productionPerMinute(production['food']!)).toBeCloseTo(5.0);
  });

  it('should produce 0 food when no workers are assigned', () => {
    const lake = createPlacedLake();
    const floor = makeFloor([lake]);
    const production = calculateTotalProduction([floor]);
    expect(production).toEqual({});
  });

  it('should produce food when a worker is assigned', () => {
    const lake = createPlacedLake();
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-goblin',
        name: 'Goblin 1',
        state: 'normal',
        assignedRoomId: 'placed-lake-1',
      },
    ];
    const floor = makeFloor([lake], inhabitants);
    const production = calculateTotalProduction([floor]);
    // Base 1.0 * (1 + 0 goblin no traits) * 1.0 = 1.0
    expect(production['food']).toBeCloseTo(1.0);
  });
});

describe('Underground Lake: adjacency bonuses', () => {
  it('should apply +30% when adjacent to Mushroom Grove', () => {
    const lake = createPlacedLake({ anchorX: 0, anchorY: 0 });
    const grove: PlacedRoom = {
      id: 'placed-grove-1',
      roomTypeId: MUSHROOM_GROVE_ID,
      shapeId: 'shape-t',
      anchorX: 3,
      anchorY: 0,
    };
    const allRooms = [lake, grove];
    const bonus = calculateAdjacencyBonus(
      lake,
      ['placed-grove-1'],
      allRooms,
    );
    expect(bonus).toBeCloseTo(0.3);
  });

  it('should apply +15% when adjacent to Soul Well', () => {
    const lake = createPlacedLake({ anchorX: 0, anchorY: 0 });
    const well: PlacedRoom = {
      id: 'placed-well-1',
      roomTypeId: SOUL_WELL_ID,
      shapeId: 'shape-t',
      anchorX: 3,
      anchorY: 0,
    };
    const allRooms = [lake, well];
    const bonus = calculateAdjacencyBonus(
      lake,
      ['placed-well-1'],
      allRooms,
    );
    expect(bonus).toBeCloseTo(0.15);
  });

  it('should apply +20% when adjacent to another Underground Lake', () => {
    const lake1 = createPlacedLake({ anchorX: 0, anchorY: 0 });
    const lake2: PlacedRoom = {
      id: 'placed-lake-2',
      roomTypeId: UNDERGROUND_LAKE_ID,
      shapeId: 'shape-t',
      anchorX: 3,
      anchorY: 0,
    };
    const allRooms = [lake1, lake2];
    const bonus = calculateAdjacencyBonus(
      lake1,
      ['placed-lake-2'],
      allRooms,
    );
    expect(bonus).toBeCloseTo(0.2);
  });

  it('should combine multiple adjacency bonuses', () => {
    const lake = createPlacedLake({ anchorX: 0, anchorY: 0 });
    const grove: PlacedRoom = {
      id: 'placed-grove-1',
      roomTypeId: MUSHROOM_GROVE_ID,
      shapeId: 'shape-t',
      anchorX: 3,
      anchorY: 0,
    };
    const well: PlacedRoom = {
      id: 'placed-well-1',
      roomTypeId: SOUL_WELL_ID,
      shapeId: 'shape-t',
      anchorX: 0,
      anchorY: 2,
    };
    const allRooms = [lake, grove, well];
    const bonus = calculateAdjacencyBonus(
      lake,
      ['placed-grove-1', 'placed-well-1'],
      allRooms,
    );
    // 0.3 (Mushroom Grove) + 0.15 (Soul Well) = 0.45
    expect(bonus).toBeCloseTo(0.45);
  });
});

describe('Underground Lake: Deep Fishing upgrade', () => {
  it('should have productionMultiplier 1.6 for food', () => {
    const paths = getUpgradePaths(UNDERGROUND_LAKE_ID);
    const deep = paths.find((p) => p.name === 'Deep Fishing');
    expect(deep).toBeDefined();
    expect(deep!.effects).toHaveLength(1);
    expect(deep!.effects[0].type).toBe('productionMultiplier');
    expect(deep!.effects[0].value).toBe(1.6);
    expect(deep!.effects[0].resource).toBe('food');
  });
});

describe('Underground Lake: Expanded Lake upgrade', () => {
  it('should change capacity from 3 to 5', () => {
    const room = createPlacedLake({
      appliedUpgradePathId: 'upgrade-expanded-lake',
    });
    const effective = getEffectiveMaxInhabitants(room, undergroundLakeRoom);
    expect(effective).toBe(5);
  });

  it('should keep capacity at 3 without upgrade', () => {
    const room = createPlacedLake();
    const effective = getEffectiveMaxInhabitants(room, undergroundLakeRoom);
    expect(effective).toBe(3);
  });
});

describe('Underground Lake: Dark Waters upgrade', () => {
  it('should have productionMultiplier, fearIncrease, and secondaryProduction', () => {
    const paths = getUpgradePaths(UNDERGROUND_LAKE_ID);
    const dark = paths.find((p) => p.name === 'Dark Waters');
    expect(dark).toBeDefined();
    expect(dark!.effects).toHaveLength(3);

    const prodEffect = dark!.effects.find(
      (e) => e.type === 'productionMultiplier',
    );
    expect(prodEffect!.value).toBe(1.5);
    expect(prodEffect!.resource).toBe('food');

    const fearEffect = dark!.effects.find((e) => e.type === 'fearIncrease');
    expect(fearEffect!.value).toBe(1);

    const secEffect = dark!.effects.find(
      (e) => e.type === 'secondaryProduction',
    );
    expect(secEffect!.value).toBe(0.1);
    expect(secEffect!.resource).toBe('essence');
  });
});

describe('Underground Lake: upgrade mutual exclusivity', () => {
  it('should prevent applying a second upgrade', () => {
    const room = createPlacedLake({
      appliedUpgradePathId: 'upgrade-deep-fishing',
    });
    const result = canApplyUpgrade(room, 'upgrade-expanded-lake');
    expect(result.valid).toBe(false);
  });

  it('should allow applying an upgrade to an un-upgraded room', () => {
    const room = createPlacedLake();
    const result = canApplyUpgrade(room, 'upgrade-deep-fishing');
    expect(result.valid).toBe(true);
  });
});

describe('Underground Lake: full production with adjacency', () => {
  it('should apply adjacency bonus to food production with worker', () => {
    const lake = createPlacedLake({ anchorX: 0, anchorY: 0 });
    const grove: PlacedRoom = {
      id: 'placed-grove-1',
      roomTypeId: MUSHROOM_GROVE_ID,
      shapeId: 'shape-t',
      anchorX: 3,
      anchorY: 0,
    };
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-goblin',
        name: 'Goblin 1',
        state: 'normal',
        assignedRoomId: 'placed-lake-1',
      },
    ];
    const floor = makeFloor([lake, grove], inhabitants);
    const production = calculateSingleRoomProduction(lake, floor);
    // Base 1.0 * (1 + 0 goblin + 0.3 adjacency) * 1.0 = 1.0 * 1.3 = 1.3
    expect(production['food']).toBeCloseTo(1.3);
  });
});
