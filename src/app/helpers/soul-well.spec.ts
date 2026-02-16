import type {
  Floor,
  FloorId,
  InhabitantId,
  InhabitantInstance,
  InhabitantInstanceId,
  IsContentItem,
  PlacedRoom,
  PlacedRoomId,
  RoomContent,
  RoomId,
  RoomShapeId,
  RoomUpgradePath,
  UpgradePathId,
} from '@interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Constants ---

const SOUL_WELL_ID = 'room-soul-well';
const MUSHROOM_GROVE_ID = 'room-mushroom-grove';
const SHADOW_LIBRARY_ID = 'room-shadow-library';

// --- Upgrade paths ---

const necroticEnhancementPath: RoomUpgradePath = {
  id: 'upgrade-necrotic-enhancement' as UpgradePathId,
  name: 'Necrotic Enhancement',
  description:
    'Deepen the well\'s connection to the spirit realm, boosting essence yield.',
  cost: { gold: 120, crystals: 60, essence: 25 },
  effects: [
    { type: 'productionMultiplier', value: 1.5, resource: 'essence' },
    { type: 'maxInhabitantBonus', value: 1 },
  ],
};

const essenceMasteryPath: RoomUpgradePath = {
  id: 'upgrade-essence-mastery' as UpgradePathId,
  name: 'Essence Mastery',
  description:
    'Purify the well\'s output for greater efficiency, reducing fear.',
  cost: { gold: 100, crystals: 80, essence: 40 },
  effects: [
    { type: 'productionMultiplier', value: 1.75, resource: 'essence' },
    { type: 'fearReduction', value: 1 },
  ],
};

// --- Mock content ---

const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  contentGetEntry: (id: string) => mockContent.get(id) ?? undefined,
  contentGetEntriesByType: vi.fn(() => []),
  getEntries: vi.fn(),
  contentAllIdsByName: vi.fn(() => new Map()),
}));

const soulWellRoom: RoomContent & IsContentItem = {
  id: SOUL_WELL_ID as RoomId,
  name: 'Soul Well',
  __type: 'room',
  description:
    'A deep well reaching into the spiritual plane, drawing raw essence from departed souls.',
  shapeId: 'shape-3x3' as RoomShapeId,
  cost: { gold: 100, crystals: 50 },
  production: { essence: 0.3 },
  requiresWorkers: false,
  adjacencyBonuses: [
    { adjacentRoomType: MUSHROOM_GROVE_ID, bonus: 0.2, description: '' },
    { adjacentRoomType: SHADOW_LIBRARY_ID, bonus: 0.15, description: '' },
    { adjacentRoomType: SOUL_WELL_ID, bonus: 0.25, description: '' },
  ],
  isUnique: false,
  removable: true,
  maxInhabitants: 2,
  inhabitantRestriction: undefined,
  fearLevel: 3,
  fearReductionAura: 0,
  upgradePaths: [necroticEnhancementPath, essenceMasteryPath],
  autoPlace: false,
};

const mushroomGroveRoom: RoomContent & IsContentItem = {
  id: MUSHROOM_GROVE_ID as RoomId,
  name: 'Mushroom Grove',
  __type: 'room',
  description: '',
  shapeId: 'shape-3x3' as RoomShapeId,
  cost: {},
  production: { food: 1.6 },
  requiresWorkers: true,
  adjacencyBonuses: [],
  isUnique: false,
  removable: true,
  maxInhabitants: 3,
  inhabitantRestriction: undefined,
  fearLevel: 1,
  fearReductionAura: 0,
  upgradePaths: [],
  autoPlace: false,
};

const shadowLibraryRoom: RoomContent & IsContentItem = {
  id: SHADOW_LIBRARY_ID as RoomId,
  name: 'Shadow Library',
  __type: 'room',
  description: '',
  shapeId: 'shape-3x3' as RoomShapeId,
  cost: {},
  production: { research: 0.6 },
  requiresWorkers: true,
  adjacencyBonuses: [],
  isUnique: false,
  removable: true,
  maxInhabitants: 1,
  inhabitantRestriction: undefined,
  fearLevel: 2,
  fearReductionAura: 0,
  upgradePaths: [],
  autoPlace: false,
};

mockContent.set('shape-3x3', {
  id: 'shape-3x3',
  name: 'Square 3x3',
  __type: 'roomshape',
  width: 3,
  height: 3,
  tiles: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
  ],
});

mockContent.set('def-skeleton', {
  id: 'def-skeleton',
  name: 'Skeleton',
  __type: 'inhabitant',
  type: 'undead',
  tier: 1,
  description: '',
  cost: {},
  stats: {
    hp: 40,
    attack: 12,
    defense: 15,
    speed: 6,
    workerEfficiency: 0.7,
  },
  traits: [],
});

// --- Imports after mocks ---

import {
  productionCalculateAdjacencyBonus,
  productionCalculateSingleRoom,
  productionCalculateTotal,
  productionGetBase,
  productionPerMinute,
} from '@helpers/production';
import {
  roomUpgradeCanApply,
  roomUpgradeGetEffectiveMaxInhabitants,
  roomUpgradeGetPaths,
} from '@helpers/room-upgrades';

// --- Helpers ---

function makeFloor(
  rooms: PlacedRoom[],
  inhabitants: InhabitantInstance[] = [],
): Floor {
  return {
    id: 'floor-1' as FloorId,
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

function createPlacedWell(overrides: Partial<PlacedRoom> = {}): PlacedRoom {
  return {
    id: 'placed-well-1' as PlacedRoomId,
    roomTypeId: SOUL_WELL_ID as RoomId,
    shapeId: 'shape-3x3' as RoomShapeId,
    anchorX: 0,
    anchorY: 0,
    ...overrides,
  };
}

// --- Tests ---

beforeEach(() => {
  mockContent.set(SOUL_WELL_ID, soulWellRoom);
  mockContent.set(MUSHROOM_GROVE_ID, mushroomGroveRoom);
  mockContent.set(SHADOW_LIBRARY_ID, shadowLibraryRoom);
});

describe('Soul Well: definition', () => {
  it('should use the 3x3 square shape', () => {
    expect(soulWellRoom.shapeId).toBe('shape-3x3');
  });

  it('should have high fear level (3)', () => {
    expect(soulWellRoom.fearLevel).toBe(3);
  });

  it('should have base capacity of 2 inhabitants', () => {
    expect(soulWellRoom.maxInhabitants).toBe(2);
  });

  it('should not require workers for passive production', () => {
    expect(soulWellRoom.requiresWorkers).toBe(false);
  });

  it('should have 2 upgrade paths', () => {
    expect(soulWellRoom.upgradePaths).toHaveLength(2);
  });

  it('should have 3 adjacency bonuses', () => {
    expect(soulWellRoom.adjacencyBonuses).toHaveLength(3);
  });
});

describe('Soul Well: base production', () => {
  it('should have base production of 0.3 essence/tick (1.5 essence/min)', () => {
    const production = productionGetBase(SOUL_WELL_ID as RoomId);
    expect(production).toEqual({ essence: 0.3 });
    expect(productionPerMinute(production['essence']!)).toBeCloseTo(1.5);
  });

  it('should produce essence even without workers (passive)', () => {
    const well = createPlacedWell();
    const floor = makeFloor([well]);
    const production = productionCalculateTotal([floor]);
    expect(production['essence']).toBeCloseTo(0.3);
  });
});

describe('Soul Well: adjacency bonuses', () => {
  it('should apply +20% when adjacent to Mushroom Grove', () => {
    const well = createPlacedWell({ anchorX: 0, anchorY: 0 });
    const grove: PlacedRoom = {
      id: 'placed-grove-1' as PlacedRoomId,
      roomTypeId: MUSHROOM_GROVE_ID as RoomId,
      shapeId: 'shape-3x3' as RoomShapeId,
      anchorX: 3,
      anchorY: 0,
    };
    const allRooms = [well, grove];
    const bonus = productionCalculateAdjacencyBonus(
      well,
      ['placed-grove-1'],
      allRooms,
    );
    expect(bonus).toBeCloseTo(0.2);
  });

  it('should apply +15% when adjacent to Shadow Library', () => {
    const well = createPlacedWell({ anchorX: 0, anchorY: 0 });
    const library: PlacedRoom = {
      id: 'placed-library-1' as PlacedRoomId,
      roomTypeId: SHADOW_LIBRARY_ID as RoomId,
      shapeId: 'shape-3x3' as RoomShapeId,
      anchorX: 3,
      anchorY: 0,
    };
    const allRooms = [well, library];
    const bonus = productionCalculateAdjacencyBonus(
      well,
      ['placed-library-1'],
      allRooms,
    );
    expect(bonus).toBeCloseTo(0.15);
  });

  it('should apply +25% when adjacent to another Soul Well', () => {
    const well1 = createPlacedWell({ anchorX: 0, anchorY: 0 });
    const well2: PlacedRoom = {
      id: 'placed-well-2' as PlacedRoomId,
      roomTypeId: SOUL_WELL_ID as RoomId,
      shapeId: 'shape-3x3' as RoomShapeId,
      anchorX: 3,
      anchorY: 0,
    };
    const allRooms = [well1, well2];
    const bonus = productionCalculateAdjacencyBonus(
      well1,
      ['placed-well-2'],
      allRooms,
    );
    expect(bonus).toBeCloseTo(0.25);
  });

  it('should combine multiple adjacency bonuses', () => {
    const well = createPlacedWell({ anchorX: 0, anchorY: 0 });
    const grove: PlacedRoom = {
      id: 'placed-grove-1' as PlacedRoomId,
      roomTypeId: MUSHROOM_GROVE_ID as RoomId,
      shapeId: 'shape-3x3' as RoomShapeId,
      anchorX: 3,
      anchorY: 0,
    };
    const library: PlacedRoom = {
      id: 'placed-library-1' as PlacedRoomId,
      roomTypeId: SHADOW_LIBRARY_ID as RoomId,
      shapeId: 'shape-3x3' as RoomShapeId,
      anchorX: 0,
      anchorY: 3,
    };
    const allRooms = [well, grove, library];
    const bonus = productionCalculateAdjacencyBonus(
      well,
      ['placed-grove-1', 'placed-library-1'],
      allRooms,
    );
    // 0.2 (Mushroom Grove) + 0.15 (Shadow Library) = 0.35
    expect(bonus).toBeCloseTo(0.35);
  });
});

describe('Soul Well: Necrotic Enhancement upgrade', () => {
  it('should have productionMultiplier 1.5 and maxInhabitantBonus 1', () => {
    const paths = roomUpgradeGetPaths(SOUL_WELL_ID as RoomId);
    const necrotic = paths.find((p) => p.name === 'Necrotic Enhancement');
    expect(necrotic).toBeDefined();
    expect(necrotic!.effects).toHaveLength(2);

    const prodEffect = necrotic!.effects.find(
      (e) => e.type === 'productionMultiplier',
    );
    expect(prodEffect).toBeDefined();
    expect(prodEffect!.value).toBe(1.5);
    expect(prodEffect!.resource).toBe('essence');

    const capEffect = necrotic!.effects.find(
      (e) => e.type === 'maxInhabitantBonus',
    );
    expect(capEffect).toBeDefined();
    expect(capEffect!.value).toBe(1);
  });

  it('should change capacity from 2 to 3', () => {
    const room = createPlacedWell({
      appliedUpgradePathId: 'upgrade-necrotic-enhancement' as UpgradePathId,
    });
    const effective = roomUpgradeGetEffectiveMaxInhabitants(room, soulWellRoom);
    expect(effective).toBe(3);
  });
});

describe('Soul Well: Essence Mastery upgrade', () => {
  it('should have productionMultiplier 1.75 and fearReduction 1', () => {
    const paths = roomUpgradeGetPaths(SOUL_WELL_ID as RoomId);
    const mastery = paths.find((p) => p.name === 'Essence Mastery');
    expect(mastery).toBeDefined();
    expect(mastery!.effects).toHaveLength(2);

    const prodEffect = mastery!.effects.find(
      (e) => e.type === 'productionMultiplier',
    );
    expect(prodEffect).toBeDefined();
    expect(prodEffect!.value).toBe(1.75);
    expect(prodEffect!.resource).toBe('essence');

    const fearEffect = mastery!.effects.find(
      (e) => e.type === 'fearReduction',
    );
    expect(fearEffect).toBeDefined();
    expect(fearEffect!.value).toBe(1);
  });

  it('should not change capacity', () => {
    const room = createPlacedWell({
      appliedUpgradePathId: 'upgrade-essence-mastery' as UpgradePathId,
    });
    const effective = roomUpgradeGetEffectiveMaxInhabitants(room, soulWellRoom);
    expect(effective).toBe(2);
  });
});

describe('Soul Well: upgrade mutual exclusivity', () => {
  it('should prevent applying a second upgrade', () => {
    const room = createPlacedWell({
      appliedUpgradePathId: 'upgrade-necrotic-enhancement' as UpgradePathId,
    });
    const result = roomUpgradeCanApply(room, 'upgrade-essence-mastery');
    expect(result.valid).toBe(false);
  });

  it('should allow applying an upgrade to an un-upgraded room', () => {
    const room = createPlacedWell();
    const result = roomUpgradeCanApply(room, 'upgrade-necrotic-enhancement');
    expect(result.valid).toBe(true);
  });
});

describe('Soul Well: full production with adjacency', () => {
  it('should apply adjacency bonus to passive essence production', () => {
    const well = createPlacedWell({ anchorX: 0, anchorY: 0 });
    const grove: PlacedRoom = {
      id: 'placed-grove-1' as PlacedRoomId,
      roomTypeId: MUSHROOM_GROVE_ID as RoomId,
      shapeId: 'shape-3x3' as RoomShapeId,
      anchorX: 3,
      anchorY: 0,
    };
    const floor = makeFloor([well, grove]);
    const production = productionCalculateSingleRoom(well, floor);
    // Base 0.3 * (1 + 0.2 adjacency) * 1.0 = 0.3 * 1.2 = 0.36
    expect(production['essence']).toBeCloseTo(0.36);
  });

  it('should not double-count workers for passive production rooms', () => {
    const well = createPlacedWell();
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-skeleton' as InhabitantId,
        name: 'Skeleton 1',
        state: 'normal',
        assignedRoomId: 'placed-well-1' as PlacedRoomId,
      },
    ];
    const floor = makeFloor([well], inhabitants);
    const production = productionCalculateTotal([floor]);
    // Passive room (requiresWorkers: false) still produces with or without workers
    // Worker efficiency: 0.7 - 1.0 = -0.3 bonus
    // Base 0.3 * (1 + (-0.3)) = 0.3 * 0.7 = 0.21
    expect(production['essence']).toBeCloseTo(0.21);
  });
});
