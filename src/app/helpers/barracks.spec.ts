import type {
  Floor,
  FloorId,
  InhabitantId,
  InhabitantInstance,
  InhabitantInstanceId,
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

const BARRACKS_ID = 'room-barracks';
const DARK_FORGE_ID = 'room-dark-forge';
const THRONE_ROOM_ID = 'room-throne-room';

// --- Upgrade paths ---

const fortifiedBarracksPath: RoomUpgradePath = {
  id: 'upgrade-fortified-barracks' as UpgradePathId,
  name: 'Fortified Barracks',
  description: 'Reinforce walls and expand sleeping quarters.',
  cost: { gold: 100, crystals: 40 },
  effects: [{ type: 'maxInhabitantBonus', value: 4 }],
};

const comfortableQuartersPath: RoomUpgradePath = {
  id: 'upgrade-comfortable-quarters' as UpgradePathId,
  name: 'Comfortable Quarters',
  description: 'Replace crude bunks with proper beds.',
  cost: { gold: 80, crystals: 20 },
  effects: [{ type: 'fearReduction', value: 1 }],
};

const warRoomPath: RoomUpgradePath = {
  id: 'upgrade-war-room' as UpgradePathId,
  name: 'War Room',
  description: 'Add strategic planning tables.',
  cost: { gold: 120, crystals: 60, essence: 20 },
  effects: [{ type: 'fearIncrease', value: 1 }],
};

// --- Mock content ---

const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  contentGetEntry: (id: string) => mockContent.get(id) ?? undefined,
  contentGetEntriesByType: vi.fn(() => []),
  getEntries: vi.fn(),
  contentAllIdsByName: vi.fn(() => new Map()),
}));

const barracksRoom: RoomContent = {
  id: BARRACKS_ID as RoomId,
  name: 'Barracks',
  __type: 'room',
  description: 'Houses and trains your fighters.',
  shapeId: 'shape-i' as RoomShapeId,
  cost: { gold: 70 },
  production: {},
  requiresWorkers: false,
  adjacencyBonuses: [
    { adjacentRoomId: DARK_FORGE_ID, bonus: 0.15, description: '' },
    { adjacentRoomId: THRONE_ROOM_ID, bonus: 0.2, description: '' },
    { adjacentRoomId: BARRACKS_ID, bonus: 0.1, description: '' },
  ],
  isUnique: false,
  removable: true,
  maxInhabitants: 6,
  inhabitantRestriction: undefined,
  fearLevel: 1,
  fearReductionAura: 0,
  upgradePaths: [fortifiedBarracksPath, comfortableQuartersPath, warRoomPath],
  autoPlace: false,
};

const darkForgeRoom: RoomContent = {
  id: DARK_FORGE_ID as RoomId,
  name: 'Dark Forge',
  __type: 'room',
  description: '',
  shapeId: 'shape-3x3' as RoomShapeId,
  cost: {},
  production: { gold: 1.2 },
  requiresWorkers: true,
  adjacencyBonuses: [],
  isUnique: false,
  removable: true,
  maxInhabitants: 2,
  inhabitantRestriction: undefined,
  fearLevel: 0,
  fearReductionAura: 0,
  upgradePaths: [],
  autoPlace: false,
};

const throneRoom: RoomContent = {
  id: THRONE_ROOM_ID as RoomId,
  name: 'Throne Room',
  __type: 'room',
  description: '',
  shapeId: 'shape-4x4' as RoomShapeId,
  cost: {},
  production: {},
  requiresWorkers: false,
  adjacencyBonuses: [],
  isUnique: true,
  removable: true,
  maxInhabitants: 1,
  inhabitantRestriction: 'unique',
  fearLevel: 0,
  fearReductionAura: 0,
  upgradePaths: [],
  autoPlace: false,
};

mockContent.set('shape-i', {
  id: 'shape-i',
  name: 'I-Shape',
  __type: 'roomshape',
  width: 1,
  height: 4,
  tiles: [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: 2 },
    { x: 0, y: 3 },
  ],
});

mockContent.set('shape-3x3', {
  id: 'shape-3x3',
  name: 'Square 3x3',
  __type: 'roomshape',
  width: 3,
  height: 3,
  tiles: [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
    { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
    { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 },
  ],
});

mockContent.set('shape-4x4', {
  id: 'shape-4x4',
  name: 'Square 4x4',
  __type: 'roomshape',
  width: 4,
  height: 4,
  tiles: [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 },
    { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 },
    { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 },
    { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 },
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
  productionCalculateAdjacencyBonus,
  productionCalculateTotal,
  productionGetBase,
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

function createPlacedBarracks(overrides: Partial<PlacedRoom> = {}): PlacedRoom {
  return {
    id: 'placed-barracks-1' as PlacedRoomId,
    roomTypeId: BARRACKS_ID as RoomId,
    shapeId: 'shape-i' as RoomShapeId,
    anchorX: 0,
    anchorY: 0,
    ...overrides,
  };
}

// --- Tests ---

beforeEach(() => {
  mockContent.set(BARRACKS_ID, barracksRoom);
  mockContent.set(DARK_FORGE_ID, darkForgeRoom);
  mockContent.set(THRONE_ROOM_ID, throneRoom);
});

describe('Barracks: definition', () => {
  it('should use the I-shape', () => {
    expect(barracksRoom.shapeId).toBe('shape-i');
  });

  it('should have low fear level (1)', () => {
    expect(barracksRoom.fearLevel).toBe(1);
  });

  it('should have base capacity of 6 inhabitants', () => {
    expect(barracksRoom.maxInhabitants).toBe(6);
  });

  it('should not require workers (housing room)', () => {
    expect(barracksRoom.requiresWorkers).toBe(false);
  });

  it('should have no production', () => {
    expect(barracksRoom.production).toEqual({});
  });

  it('should have 3 upgrade paths', () => {
    expect(barracksRoom.upgradePaths).toHaveLength(3);
  });

  it('should have 3 adjacency bonuses', () => {
    expect(barracksRoom.adjacencyBonuses).toHaveLength(3);
  });
});

describe('Barracks: no production', () => {
  it('should have no base production', () => {
    const production = productionGetBase(BARRACKS_ID as RoomId);
    expect(production).toEqual({});
  });

  it('should produce nothing even with inhabitants', () => {
    const barracks = createPlacedBarracks();
    const inhabitants: InhabitantInstance[] = [
      {
        instanceId: 'inst-1' as InhabitantInstanceId,
        definitionId: 'def-goblin' as InhabitantId,
        name: 'Goblin 1',
        state: 'normal',
        assignedRoomId: 'placed-barracks-1' as PlacedRoomId,
      },
    ];
    const floor = makeFloor([barracks], inhabitants);
    const production = productionCalculateTotal([floor]);
    expect(production).toEqual({});
  });
});

describe('Barracks: adjacency bonuses', () => {
  it('should apply +15% when adjacent to Dark Forge', () => {
    const barracks = createPlacedBarracks({ anchorX: 0, anchorY: 0 });
    const forge: PlacedRoom = {
      id: 'placed-forge-1' as PlacedRoomId,
      roomTypeId: DARK_FORGE_ID as RoomId,
      shapeId: 'shape-3x3' as RoomShapeId,
      anchorX: 1,
      anchorY: 0,
    };
    const allRooms = [barracks, forge];
    const bonus = productionCalculateAdjacencyBonus(
      barracks,
      ['placed-forge-1' as PlacedRoomId],
      allRooms,
    );
    expect(bonus).toBeCloseTo(0.15);
  });

  it('should apply +20% when adjacent to Throne Room', () => {
    const barracks = createPlacedBarracks({ anchorX: 0, anchorY: 0 });
    const throne: PlacedRoom = {
      id: 'placed-throne-1' as PlacedRoomId,
      roomTypeId: THRONE_ROOM_ID as RoomId,
      shapeId: 'shape-4x4' as RoomShapeId,
      anchorX: 1,
      anchorY: 0,
    };
    const allRooms = [barracks, throne];
    const bonus = productionCalculateAdjacencyBonus(
      barracks,
      ['placed-throne-1' as PlacedRoomId],
      allRooms,
    );
    expect(bonus).toBeCloseTo(0.2);
  });

  it('should apply +10% when adjacent to another Barracks', () => {
    const barracks1 = createPlacedBarracks({ anchorX: 0, anchorY: 0 });
    const barracks2: PlacedRoom = {
      id: 'placed-barracks-2' as PlacedRoomId,
      roomTypeId: BARRACKS_ID as RoomId,
      shapeId: 'shape-i' as RoomShapeId,
      anchorX: 1,
      anchorY: 0,
    };
    const allRooms = [barracks1, barracks2];
    const bonus = productionCalculateAdjacencyBonus(
      barracks1,
      ['placed-barracks-2' as PlacedRoomId],
      allRooms,
    );
    expect(bonus).toBeCloseTo(0.1);
  });

  it('should combine multiple adjacency bonuses', () => {
    const barracks = createPlacedBarracks({ anchorX: 0, anchorY: 0 });
    const forge: PlacedRoom = {
      id: 'placed-forge-1' as PlacedRoomId,
      roomTypeId: DARK_FORGE_ID as RoomId,
      shapeId: 'shape-3x3' as RoomShapeId,
      anchorX: 1,
      anchorY: 0,
    };
    const throne: PlacedRoom = {
      id: 'placed-throne-1' as PlacedRoomId,
      roomTypeId: THRONE_ROOM_ID as RoomId,
      shapeId: 'shape-4x4' as RoomShapeId,
      anchorX: 1,
      anchorY: 3,
    };
    const allRooms = [barracks, forge, throne];
    const bonus = productionCalculateAdjacencyBonus(
      barracks,
      ['placed-forge-1' as PlacedRoomId, 'placed-throne-1' as PlacedRoomId],
      allRooms,
    );
    // 0.15 (Dark Forge) + 0.2 (Throne Room) = 0.35
    expect(bonus).toBeCloseTo(0.35);
  });
});

describe('Barracks: Fortified Barracks upgrade', () => {
  it('should have maxInhabitantBonus of 4', () => {
    const paths = roomUpgradeGetPaths(BARRACKS_ID as RoomId);
    const fortified = paths.find((p) => p.name === 'Fortified Barracks');
    expect(fortified).toBeDefined();
    expect(fortified!.effects).toHaveLength(1);
    expect(fortified!.effects[0].type).toBe('maxInhabitantBonus');
    expect(fortified!.effects[0].value).toBe(4);
  });

  it('should change capacity from 6 to 10', () => {
    const room = createPlacedBarracks({
      appliedUpgradePathId: 'upgrade-fortified-barracks' as UpgradePathId,
    });
    const effective = roomUpgradeGetEffectiveMaxInhabitants(room, barracksRoom);
    expect(effective).toBe(10);
  });

  it('should keep capacity at 6 without upgrade', () => {
    const room = createPlacedBarracks();
    const effective = roomUpgradeGetEffectiveMaxInhabitants(room, barracksRoom);
    expect(effective).toBe(6);
  });
});

describe('Barracks: Comfortable Quarters upgrade', () => {
  it('should have fearReduction of 1', () => {
    const paths = roomUpgradeGetPaths(BARRACKS_ID as RoomId);
    const comfortable = paths.find((p) => p.name === 'Comfortable Quarters');
    expect(comfortable).toBeDefined();
    expect(comfortable!.effects).toHaveLength(1);
    expect(comfortable!.effects[0].type).toBe('fearReduction');
    expect(comfortable!.effects[0].value).toBe(1);
  });
});

describe('Barracks: War Room upgrade', () => {
  it('should have fearIncrease of 1', () => {
    const paths = roomUpgradeGetPaths(BARRACKS_ID as RoomId);
    const warRoom = paths.find((p) => p.name === 'War Room');
    expect(warRoom).toBeDefined();
    expect(warRoom!.effects).toHaveLength(1);
    expect(warRoom!.effects[0].type).toBe('fearIncrease');
    expect(warRoom!.effects[0].value).toBe(1);
  });
});

describe('Barracks: upgrade mutual exclusivity', () => {
  it('should prevent applying a second upgrade', () => {
    const room = createPlacedBarracks({
      appliedUpgradePathId: 'upgrade-fortified-barracks' as UpgradePathId,
    });
    const result = roomUpgradeCanApply(room, 'upgrade-comfortable-quarters');
    expect(result.valid).toBe(false);
  });

  it('should allow applying an upgrade to an un-upgraded room', () => {
    const room = createPlacedBarracks();
    const result = roomUpgradeCanApply(room, 'upgrade-fortified-barracks');
    expect(result.valid).toBe(true);
  });
});
