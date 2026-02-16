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

const SHADOW_LIBRARY_ID = 'room-shadow-library';
const SOUL_WELL_ID = 'room-soul-well';
const CRYSTAL_MINE_ID = 'room-crystal-mine';

// --- Upgrade paths ---

const arcaneFocusPath: RoomUpgradePath = {
  id: 'upgrade-arcane-focus' as UpgradePathId,
  name: 'Arcane Focus',
  description:
    'Enchanted reading lenses and amplified candlelight drastically improve research throughput.',
  cost: { gold: 100, crystals: 60, essence: 20 },
  effects: [{ type: 'productionMultiplier', value: 1.75, resource: 'research' }],
};

const expandedArchivesPath: RoomUpgradePath = {
  id: 'upgrade-expanded-archives' as UpgradePathId,
  name: 'Expanded Archives',
  description:
    'Extend the library with additional reading chambers to accommodate more scholars.',
  cost: { gold: 90, crystals: 40 },
  effects: [{ type: 'maxInhabitantBonus', value: 2 }],
};

const forbiddenKnowledgePath: RoomUpgradePath = {
  id: 'upgrade-forbidden-knowledge' as UpgradePathId,
  name: 'Forbidden Knowledge',
  description:
    'Unlock the darkest tomes. Greatly boosts research but intensifies the fearsome aura.',
  cost: { gold: 120, crystals: 80, essence: 30 },
  effects: [
    { type: 'productionMultiplier', value: 2.0, resource: 'research' },
    { type: 'fearIncrease', value: 2 },
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

const shadowLibraryRoom: RoomContent & IsContentItem = {
  id: SHADOW_LIBRARY_ID as RoomId,
  name: 'Shadow Library',
  __type: 'room',
  description:
    'A repository of forbidden knowledge shrouded in arcane darkness.',
  shapeId: 'shape-small-l' as RoomShapeId,
  cost: { gold: 80, crystals: 30 },
  production: { research: 0.6 },
  requiresWorkers: true,
  adjacencyBonuses: [
    { adjacentRoomType: SOUL_WELL_ID, bonus: 0.15, description: '' },
    { adjacentRoomType: CRYSTAL_MINE_ID, bonus: 0.1, description: '' },
    { adjacentRoomType: SHADOW_LIBRARY_ID, bonus: 0.2, description: '' },
  ],
  isUnique: false,
  removable: true,
  maxInhabitants: 1,
  inhabitantRestriction: undefined,
  fearLevel: 2,
  fearReductionAura: 0,
  upgradePaths: [arcaneFocusPath, expandedArchivesPath, forbiddenKnowledgePath],
  autoPlace: false,
};

const soulWellRoom: RoomContent & IsContentItem = {
  id: SOUL_WELL_ID as RoomId,
  name: 'Soul Well',
  __type: 'room',
  description: '',
  shapeId: 'shape-small-l' as RoomShapeId,
  cost: {},
  production: { essence: 0.3 },
  requiresWorkers: false,
  adjacencyBonuses: [],
  isUnique: false,
  removable: true,
  maxInhabitants: 0,
  inhabitantRestriction: undefined,
  fearLevel: 0,
  fearReductionAura: 0,
  upgradePaths: [],
  autoPlace: false,
};

const crystalMineRoom: RoomContent & IsContentItem = {
  id: CRYSTAL_MINE_ID as RoomId,
  name: 'Crystal Mine',
  __type: 'room',
  description: '',
  shapeId: 'shape-small-l' as RoomShapeId,
  cost: {},
  production: { crystals: 1.0 },
  requiresWorkers: true,
  adjacencyBonuses: [],
  isUnique: false,
  removable: true,
  maxInhabitants: 2,
  inhabitantRestriction: undefined,
  fearLevel: 1,
  fearReductionAura: 0,
  upgradePaths: [],
  autoPlace: false,
};

mockContent.set('shape-small-l', {
  id: 'shape-small-l',
  name: 'Small L-Shape',
  __type: 'roomshape',
  width: 2,
  height: 3,
  tiles: [
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 },
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
  roomUpgradeGetAppliedEffects,
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

function createPlacedLibrary(
  overrides: Partial<PlacedRoom> = {},
): PlacedRoom {
  return {
    id: 'placed-library-1' as PlacedRoomId,
    roomTypeId: SHADOW_LIBRARY_ID as RoomId,
    shapeId: 'shape-small-l' as RoomShapeId,
    anchorX: 0,
    anchorY: 0,
    ...overrides,
  };
}

// --- Tests ---

beforeEach(() => {
  mockContent.set(SHADOW_LIBRARY_ID, shadowLibraryRoom);
  mockContent.set(SOUL_WELL_ID, soulWellRoom);
  mockContent.set(CRYSTAL_MINE_ID, crystalMineRoom);
});

describe('Shadow Library: definition', () => {
  it('should have L-shaped room via Small L-Shape', () => {
    expect(shadowLibraryRoom.shapeId).toBe('shape-small-l');
  });

  it('should have medium fear level (2)', () => {
    expect(shadowLibraryRoom.fearLevel).toBe(2);
  });

  it('should have base capacity of 1 inhabitant', () => {
    expect(shadowLibraryRoom.maxInhabitants).toBe(1);
  });

  it('should require workers', () => {
    expect(shadowLibraryRoom.requiresWorkers).toBe(true);
  });

  it('should have 3 upgrade paths', () => {
    expect(shadowLibraryRoom.upgradePaths).toHaveLength(3);
  });

  it('should have 3 adjacency bonuses', () => {
    expect(shadowLibraryRoom.adjacencyBonuses).toHaveLength(3);
  });
});

describe('Shadow Library: base production', () => {
  it('should have base production of 0.6 research/tick (3 research/min)', () => {
    const production = productionGetBase(SHADOW_LIBRARY_ID as RoomId);
    expect(production).toEqual({ research: 0.6 });
    expect(productionPerMinute(production['research']!)).toBeCloseTo(3.0);
  });

  it('should produce 0 research when no workers are assigned', () => {
    const library = createPlacedLibrary();
    const floor = makeFloor([library]);
    const production = productionCalculateTotal([floor]);
    expect(production).toEqual({});
  });

  it('should produce research when a worker is assigned', () => {
    const library = createPlacedLibrary();
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-skeleton' as InhabitantId,
        name: 'Skeleton 1',
        state: 'normal',
        assignedRoomId: 'placed-library-1' as PlacedRoomId,
      },
    ];
    const floor = makeFloor([library], inhabitants);
    const production = productionCalculateTotal([floor]);
    // Base 0.6 * (1 + (0.7 - 1.0) workerEfficiency) = 0.6 * 0.7 = 0.42
    expect(production['research']).toBeCloseTo(0.42);
  });
});

describe('Shadow Library: adjacency bonuses', () => {
  it('should apply +15% when adjacent to Soul Well', () => {
    const library = createPlacedLibrary({ anchorX: 0, anchorY: 0 });
    const well: PlacedRoom = {
      id: 'placed-well-1' as PlacedRoomId,
      roomTypeId: SOUL_WELL_ID as RoomId,
      shapeId: 'shape-small-l' as RoomShapeId,
      anchorX: 2,
      anchorY: 0,
    };
    const allRooms = [library, well];
    const bonus = productionCalculateAdjacencyBonus(
      library,
      ['placed-well-1'],
      allRooms,
    );
    expect(bonus).toBeCloseTo(0.15);
  });

  it('should apply +10% when adjacent to Crystal Mine', () => {
    const library = createPlacedLibrary({ anchorX: 0, anchorY: 0 });
    const mine: PlacedRoom = {
      id: 'placed-mine-1' as PlacedRoomId,
      roomTypeId: CRYSTAL_MINE_ID as RoomId,
      shapeId: 'shape-small-l' as RoomShapeId,
      anchorX: 2,
      anchorY: 0,
    };
    const allRooms = [library, mine];
    const bonus = productionCalculateAdjacencyBonus(
      library,
      ['placed-mine-1'],
      allRooms,
    );
    expect(bonus).toBeCloseTo(0.1);
  });

  it('should apply +20% when adjacent to another Shadow Library', () => {
    const library1 = createPlacedLibrary({ anchorX: 0, anchorY: 0 });
    const library2: PlacedRoom = {
      id: 'placed-library-2' as PlacedRoomId,
      roomTypeId: SHADOW_LIBRARY_ID as RoomId,
      shapeId: 'shape-small-l' as RoomShapeId,
      anchorX: 2,
      anchorY: 0,
    };
    const allRooms = [library1, library2];
    const bonus = productionCalculateAdjacencyBonus(
      library1,
      ['placed-library-2'],
      allRooms,
    );
    expect(bonus).toBeCloseTo(0.2);
  });

  it('should combine multiple adjacency bonuses', () => {
    const library = createPlacedLibrary({ anchorX: 0, anchorY: 0 });
    const well: PlacedRoom = {
      id: 'placed-well-1' as PlacedRoomId,
      roomTypeId: SOUL_WELL_ID as RoomId,
      shapeId: 'shape-small-l' as RoomShapeId,
      anchorX: 2,
      anchorY: 0,
    };
    const mine: PlacedRoom = {
      id: 'placed-mine-1' as PlacedRoomId,
      roomTypeId: CRYSTAL_MINE_ID as RoomId,
      shapeId: 'shape-small-l' as RoomShapeId,
      anchorX: 0,
      anchorY: 3,
    };
    const allRooms = [library, well, mine];
    const bonus = productionCalculateAdjacencyBonus(
      library,
      ['placed-well-1', 'placed-mine-1'],
      allRooms,
    );
    // 0.15 (Soul Well) + 0.1 (Crystal Mine) = 0.25
    expect(bonus).toBeCloseTo(0.25);
  });
});

describe('Shadow Library: Arcane Focus upgrade', () => {
  it('should have productionMultiplier effect of 1.75 for research', () => {
    const paths = roomUpgradeGetPaths(SHADOW_LIBRARY_ID as RoomId);
    const arcane = paths.find((p) => p.name === 'Arcane Focus');
    expect(arcane).toBeDefined();
    expect(arcane!.effects).toHaveLength(1);
    expect(arcane!.effects[0].type).toBe('productionMultiplier');
    expect(arcane!.effects[0].value).toBe(1.75);
    expect(arcane!.effects[0].resource).toBe('research');
  });

  it('should expose effects when upgrade is applied', () => {
    const room = createPlacedLibrary({
      appliedUpgradePathId: 'upgrade-arcane-focus' as UpgradePathId,
    });
    const effects = roomUpgradeGetAppliedEffects(room);
    expect(effects).toHaveLength(1);
    expect(effects[0].type).toBe('productionMultiplier');
    expect(effects[0].value).toBe(1.75);
  });
});

describe('Shadow Library: Expanded Archives upgrade', () => {
  it('should change capacity from 1 to 3', () => {
    const room = createPlacedLibrary({
      appliedUpgradePathId: 'upgrade-expanded-archives' as UpgradePathId,
    });
    const effective = roomUpgradeGetEffectiveMaxInhabitants(room, shadowLibraryRoom);
    expect(effective).toBe(3);
  });

  it('should keep capacity at 1 without upgrade', () => {
    const room = createPlacedLibrary();
    const effective = roomUpgradeGetEffectiveMaxInhabitants(room, shadowLibraryRoom);
    expect(effective).toBe(1);
  });
});

describe('Shadow Library: Forbidden Knowledge upgrade', () => {
  it('should have productionMultiplier of 2.0 and fearIncrease of 2', () => {
    const paths = roomUpgradeGetPaths(SHADOW_LIBRARY_ID as RoomId);
    const forbidden = paths.find((p) => p.name === 'Forbidden Knowledge');
    expect(forbidden).toBeDefined();
    expect(forbidden!.effects).toHaveLength(2);

    const prodEffect = forbidden!.effects.find(
      (e) => e.type === 'productionMultiplier',
    );
    expect(prodEffect).toBeDefined();
    expect(prodEffect!.value).toBe(2.0);
    expect(prodEffect!.resource).toBe('research');

    const fearEffect = forbidden!.effects.find(
      (e) => e.type === 'fearIncrease',
    );
    expect(fearEffect).toBeDefined();
    expect(fearEffect!.value).toBe(2);
  });

  it('should expose both effects when applied', () => {
    const room = createPlacedLibrary({
      appliedUpgradePathId: 'upgrade-forbidden-knowledge' as UpgradePathId,
    });
    const effects = roomUpgradeGetAppliedEffects(room);
    expect(effects).toHaveLength(2);
  });
});

describe('Shadow Library: upgrade mutual exclusivity', () => {
  it('should prevent applying a second upgrade', () => {
    const room = createPlacedLibrary({
      appliedUpgradePathId: 'upgrade-arcane-focus' as UpgradePathId,
    });
    const result = roomUpgradeCanApply(room, 'upgrade-expanded-archives');
    expect(result.valid).toBe(false);
  });

  it('should allow applying an upgrade to an un-upgraded room', () => {
    const room = createPlacedLibrary();
    const result = roomUpgradeCanApply(room, 'upgrade-arcane-focus');
    expect(result.valid).toBe(true);
  });
});

describe('Shadow Library: full production with adjacency', () => {
  it('should apply adjacency bonus to research production with worker', () => {
    const library = createPlacedLibrary({ anchorX: 0, anchorY: 0 });
    const well: PlacedRoom = {
      id: 'placed-well-1' as PlacedRoomId,
      roomTypeId: SOUL_WELL_ID as RoomId,
      shapeId: 'shape-small-l' as RoomShapeId,
      anchorX: 2,
      anchorY: 0,
    };
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-skeleton' as InhabitantId,
        name: 'Skeleton 1',
        state: 'normal',
        assignedRoomId: 'placed-library-1' as PlacedRoomId,
      },
    ];
    const floor = makeFloor([library, well], inhabitants);
    const production = productionCalculateSingleRoom(library, floor);
    // Base 0.6 * (1 + (0.7-1.0) workerEff + 0.15 adjacency) = 0.6 * 0.85 = 0.51
    expect(production['research']).toBeCloseTo(0.51);
  });
});
