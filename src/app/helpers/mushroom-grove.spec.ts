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

const MUSHROOM_GROVE_ID = 'room-mushroom-grove';
const SOUL_WELL_ID = 'room-soul-well';
const SHADOW_LIBRARY_ID = 'room-shadow-library';
const DARK_FORGE_ID = 'room-dark-forge';

// --- Upgrade paths ---

const bountifulHarvestPath: RoomUpgradePath = {
  id: 'upgrade-bountiful-harvest',
  name: 'Bountiful Harvest',
  description: 'Enhanced fungal cultivation techniques increase food yield by 50%.',
  cost: { gold: 60 },
  effects: [{ type: 'productionMultiplier', value: 1.5, resource: 'food' }],
};

const expandedGrowthPath: RoomUpgradePath = {
  id: 'upgrade-expanded-growth',
  name: 'Expanded Growth',
  description: 'Extend the growing chambers to accommodate more workers.',
  cost: { gold: 50 },
  effects: [{ type: 'maxInhabitantBonus', value: 2 }],
};

const tranquilGardenPath: RoomUpgradePath = {
  id: 'upgrade-tranquil-garden',
  name: 'Tranquil Garden',
  description: 'Calming spores eliminate all fear in the grove.',
  cost: { gold: 45 },
  effects: [{ type: 'fearReduction', value: 1 }],
};

// --- Mock content ---

const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  getEntry: (id: string) => mockContent.get(id) ?? undefined,
  getEntriesByType: vi.fn(() => []),
  getEntries: vi.fn(),
  allIdsByName: vi.fn(() => new Map()),
}));

const mushroomGroveRoom: RoomDefinition & IsContentItem = {
  id: MUSHROOM_GROVE_ID,
  name: 'Mushroom Grove',
  __type: 'room',
  description: 'A T-shaped grove of bioluminescent fungi.',
  shapeId: 'shape-t',
  cost: { gold: 40 },
  production: { food: 1.6 },
  requiresWorkers: true,
  adjacencyBonuses: [
    { adjacentRoomType: SOUL_WELL_ID, bonus: 0.4 },
    { adjacentRoomType: SHADOW_LIBRARY_ID, bonus: 0.15 },
    { adjacentRoomType: DARK_FORGE_ID, bonus: 0.15 },
  ],
  isUnique: false,
  maxInhabitants: 3,
  inhabitantRestriction: null,
  fearLevel: 1,
  upgradePaths: [bountifulHarvestPath, expandedGrowthPath, tranquilGardenPath],
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
  maxInhabitants: 0,
  inhabitantRestriction: null,
  fearLevel: 0,
  upgradePaths: [],
};

const shadowLibraryRoom: RoomDefinition & IsContentItem = {
  id: SHADOW_LIBRARY_ID,
  name: 'Shadow Library',
  __type: 'room',
  description: '',
  shapeId: 'shape-t',
  cost: {},
  production: { research: 0.8 },
  requiresWorkers: true,
  adjacencyBonuses: [],
  isUnique: false,
  maxInhabitants: 2,
  inhabitantRestriction: null,
  fearLevel: 0,
  upgradePaths: [],
};

const darkForgeRoom: RoomDefinition & IsContentItem = {
  id: DARK_FORGE_ID,
  name: 'Dark Forge',
  __type: 'room',
  description: '',
  shapeId: 'shape-t',
  cost: {},
  production: { gold: 1.2 },
  requiresWorkers: true,
  adjacencyBonuses: [],
  isUnique: false,
  maxInhabitants: 2,
  inhabitantRestriction: null,
  fearLevel: 0,
  upgradePaths: [],
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
  traits: [
    {
      id: 'trait-goblin-miner',
      name: 'Miner',
      description: '',
      effectType: 'production_bonus',
      effectValue: 0.2,
    },
  ],
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
  getAppliedUpgradeEffects,
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
  };
}

function createPlacedRoom(overrides: Partial<PlacedRoom> = {}): PlacedRoom {
  return {
    id: 'placed-grove-1',
    roomTypeId: MUSHROOM_GROVE_ID,
    shapeId: 'shape-t',
    anchorX: 0,
    anchorY: 0,
    ...overrides,
  };
}

// --- Tests ---

beforeEach(() => {
  mockContent.set(MUSHROOM_GROVE_ID, mushroomGroveRoom);
  mockContent.set(SOUL_WELL_ID, soulWellRoom);
  mockContent.set(SHADOW_LIBRARY_ID, shadowLibraryRoom);
  mockContent.set(DARK_FORGE_ID, darkForgeRoom);
});

describe('Mushroom Grove: base production', () => {
  it('should have base production of 1.6 food/tick (8 food/min)', () => {
    const production = getBaseProduction(MUSHROOM_GROVE_ID);
    expect(production).toEqual({ food: 1.6 });
    expect(productionPerMinute(production['food']!)).toBeCloseTo(8.0);
  });

  it('should produce 0 food when no workers are assigned', () => {
    const grove = createPlacedRoom();
    const floor = makeFloor([grove]);
    const production = calculateTotalProduction([floor]);
    expect(production).toEqual({});
  });

  it('should produce food when workers are assigned', () => {
    const grove = createPlacedRoom();
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1',
        definitionId: 'def-goblin',
        name: 'Goblin 1',
        state: 'normal',
        assignedRoomId: 'placed-grove-1',
      },
    ];
    const floor = makeFloor([grove], inhabitants);
    const production = calculateTotalProduction([floor]);
    // Base 1.6 * (1 + 0.2 goblin bonus) * 1.0 = 1.92
    expect(production['food']).toBeCloseTo(1.92);
  });
});

describe('Mushroom Grove: Water adjacency bonus', () => {
  it('should apply +40% food production when adjacent to Soul Well', () => {
    const grove = createPlacedRoom({ anchorX: 0, anchorY: 0 });
    const soulWell: PlacedRoom = {
      id: 'placed-well-1',
      roomTypeId: SOUL_WELL_ID,
      shapeId: 'shape-t',
      anchorX: 3,
      anchorY: 0,
    };
    const allRooms = [grove, soulWell];
    const bonus = calculateAdjacencyBonus(
      grove,
      ['placed-well-1'],
      allRooms,
    );
    expect(bonus).toBeCloseTo(0.4);
  });

  it('should stack Water adjacency bonus for multiple Soul Wells', () => {
    const grove = createPlacedRoom();
    const well1: PlacedRoom = {
      id: 'placed-well-1',
      roomTypeId: SOUL_WELL_ID,
      shapeId: 'shape-t',
      anchorX: 3,
      anchorY: 0,
    };
    const well2: PlacedRoom = {
      id: 'placed-well-2',
      roomTypeId: SOUL_WELL_ID,
      shapeId: 'shape-t',
      anchorX: 0,
      anchorY: 2,
    };
    const allRooms = [grove, well1, well2];
    const bonus = calculateAdjacencyBonus(
      grove,
      ['placed-well-1', 'placed-well-2'],
      allRooms,
    );
    expect(bonus).toBeCloseTo(0.8);
  });
});

describe('Mushroom Grove: Dark adjacency bonus', () => {
  it('should apply +15% food production when adjacent to Shadow Library', () => {
    const grove = createPlacedRoom();
    const library: PlacedRoom = {
      id: 'placed-library-1',
      roomTypeId: SHADOW_LIBRARY_ID,
      shapeId: 'shape-t',
      anchorX: 3,
      anchorY: 0,
    };
    const allRooms = [grove, library];
    const bonus = calculateAdjacencyBonus(
      grove,
      ['placed-library-1'],
      allRooms,
    );
    expect(bonus).toBeCloseTo(0.15);
  });

  it('should apply +15% food production when adjacent to Dark Forge', () => {
    const grove = createPlacedRoom();
    const forge: PlacedRoom = {
      id: 'placed-forge-1',
      roomTypeId: DARK_FORGE_ID,
      shapeId: 'shape-t',
      anchorX: 3,
      anchorY: 0,
    };
    const allRooms = [grove, forge];
    const bonus = calculateAdjacencyBonus(
      grove,
      ['placed-forge-1'],
      allRooms,
    );
    expect(bonus).toBeCloseTo(0.15);
  });

  it('should combine Water and Dark adjacency bonuses', () => {
    const grove = createPlacedRoom();
    const well: PlacedRoom = {
      id: 'placed-well-1',
      roomTypeId: SOUL_WELL_ID,
      shapeId: 'shape-t',
      anchorX: 3,
      anchorY: 0,
    };
    const library: PlacedRoom = {
      id: 'placed-library-1',
      roomTypeId: SHADOW_LIBRARY_ID,
      shapeId: 'shape-t',
      anchorX: 0,
      anchorY: 2,
    };
    const allRooms = [grove, well, library];
    const bonus = calculateAdjacencyBonus(
      grove,
      ['placed-well-1', 'placed-library-1'],
      allRooms,
    );
    // 0.4 (Soul Well) + 0.15 (Shadow Library) = 0.55
    expect(bonus).toBeCloseTo(0.55);
  });
});

describe('Mushroom Grove: Bountiful Harvest upgrade', () => {
  it('should have productionMultiplier effect of 1.5 for food', () => {
    const paths = getUpgradePaths(MUSHROOM_GROVE_ID);
    const bountiful = paths.find((p) => p.name === 'Bountiful Harvest');
    expect(bountiful).toBeDefined();
    expect(bountiful!.effects).toHaveLength(1);
    expect(bountiful!.effects[0].type).toBe('productionMultiplier');
    expect(bountiful!.effects[0].value).toBe(1.5);
    expect(bountiful!.effects[0].resource).toBe('food');
  });

  it('should expose effects when upgrade is applied', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-bountiful-harvest',
    });
    const effects = getAppliedUpgradeEffects(room);
    expect(effects).toHaveLength(1);
    expect(effects[0].type).toBe('productionMultiplier');
    expect(effects[0].value).toBe(1.5);
  });
});

describe('Mushroom Grove: Expanded Growth upgrade', () => {
  it('should change capacity from 3 to 5', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-expanded-growth',
    });
    const effective = getEffectiveMaxInhabitants(room, mushroomGroveRoom);
    expect(effective).toBe(5);
  });

  it('should keep capacity at 3 without upgrade', () => {
    const room = createPlacedRoom();
    const effective = getEffectiveMaxInhabitants(room, mushroomGroveRoom);
    expect(effective).toBe(3);
  });
});

describe('Mushroom Grove: Tranquil Garden upgrade', () => {
  it('should have fearReduction effect of 1', () => {
    const paths = getUpgradePaths(MUSHROOM_GROVE_ID);
    const tranquil = paths.find((p) => p.name === 'Tranquil Garden');
    expect(tranquil).toBeDefined();
    expect(tranquil!.effects).toHaveLength(1);
    expect(tranquil!.effects[0].type).toBe('fearReduction');
    expect(tranquil!.effects[0].value).toBe(1);
  });

  it('should expose fearReduction effect when applied', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-tranquil-garden',
    });
    const effects = getAppliedUpgradeEffects(room);
    expect(effects).toHaveLength(1);
    expect(effects[0].type).toBe('fearReduction');
    expect(effects[0].value).toBe(1);
  });

  it('should not change capacity when Tranquil Garden is applied', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-tranquil-garden',
    });
    const effective = getEffectiveMaxInhabitants(room, mushroomGroveRoom);
    expect(effective).toBe(3);
  });
});

describe('Mushroom Grove: upgrade mutual exclusivity', () => {
  it('should prevent applying a second upgrade', () => {
    const room = createPlacedRoom({
      appliedUpgradePathId: 'upgrade-bountiful-harvest',
    });
    const result = canApplyUpgrade(room, 'upgrade-expanded-growth');
    expect(result.valid).toBe(false);
  });

  it('should allow applying an upgrade to an un-upgraded room', () => {
    const room = createPlacedRoom();
    const result = canApplyUpgrade(room, 'upgrade-bountiful-harvest');
    expect(result.valid).toBe(true);
  });
});

describe('Mushroom Grove: full production with adjacency', () => {
  it('should apply adjacency bonus to food production with workers', () => {
    // Grove at (0,0), Soul Well at (3,0) — tiles touch at x=2/x=3
    const grove = createPlacedRoom({ anchorX: 0, anchorY: 0 });
    const well: PlacedRoom = {
      id: 'placed-well-1',
      roomTypeId: SOUL_WELL_ID,
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
        assignedRoomId: 'placed-grove-1',
      },
    ];
    const floor = makeFloor([grove, well], inhabitants);
    const production = calculateSingleRoomProduction(grove, floor);
    // Base 1.6 * (1 + 0.2 goblin + 0.4 adjacency) * 1.0 = 1.6 * 1.6 = 2.56
    expect(production['food']).toBeCloseTo(2.56);
  });
});
