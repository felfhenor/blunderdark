import type {
  Floor,
  FloorId,
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

const ALTAR_ROOM_ID = 'aa100001-0001-0001-0001-000000000009';
const ALTAR_SHAPE_ID = '60e19fcd-7572-4bf0-a626-415be05f6a03';
const UPGRADE_LEVEL_2_ID = 'aa200001-0001-0001-0001-000000000007';
const UPGRADE_LEVEL_3_ID = 'aa200001-0001-0001-0001-000000000008';
const CRYSTAL_MINE_ID = 'room-crystal-mine';

// --- Upgrade paths ---

const empoweredAltarPath: RoomUpgradePath = {
  id: UPGRADE_LEVEL_2_ID as UpgradePathId,
  name: 'Empowered Altar',
  description: 'Channel deeper magical energies.',
  cost: { gold: 150, crystals: 75, essence: 30 },
  effects: [
    { type: 'fearReductionAura', value: 2 },
    { type: 'secondaryProduction', value: 0.2, resource: 'essence' },
  ],
  upgradeLevel: 2,
};

const ascendantAltarPath: RoomUpgradePath = {
  id: UPGRADE_LEVEL_3_ID as UpgradePathId,
  name: 'Ascendant Altar',
  description: 'Unlock the altar full potential.',
  cost: { gold: 300, crystals: 150, essence: 60 },
  effects: [
    { type: 'fearReductionAura', value: 3 },
    { type: 'secondaryProduction', value: 0.4, resource: 'essence' },
    { type: 'secondaryProduction', value: 0.2, resource: 'flux' },
  ],
  upgradeLevel: 3,
};

// --- Mock content ---

const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  contentGetEntry: (id: string) => mockContent.get(id) ?? undefined,
  contentGetEntriesByType: vi.fn((type: string) => {
    const entries: unknown[] = [];
    for (const [, v] of mockContent) {
      if ((v as { __type?: string }).__type === type) {
        entries.push(v);
      }
    }
    return entries;
  }),
  getEntries: vi.fn(),
  contentAllIdsByName: vi.fn(() => new Map()),
}));

vi.mock('@helpers/room-roles', () => ({
  roomRoleFindById: vi.fn((role: string) => {
    if (role === 'altar') return ALTAR_ROOM_ID;
    return undefined;
  }),
  roomRoleResetCache: vi.fn(),
}));

const altarRoomDef: RoomContent = {
  id: ALTAR_ROOM_ID as RoomId,
  name: 'Altar Room',
  __type: 'room',
  description: 'The dark heart of your dungeon.',
  shapeId: ALTAR_SHAPE_ID as RoomShapeId,
  cost: {},
  production: { essence: 0.2 },
  requiresWorkers: false,
  adjacencyBonuses: [],
  isUnique: true,
  removable: false,
  maxInhabitants: 0,
  inhabitantRestriction: undefined,
  fearLevel: 0,
  fearReductionAura: 1,
  upgradePaths: [empoweredAltarPath, ascendantAltarPath],
  autoPlace: true,
};

const crystalMineRoom: RoomContent = {
  id: CRYSTAL_MINE_ID as RoomId,
  name: 'Crystal Mine',
  __type: 'room',
  description: '',
  shapeId: 'shape-l' as RoomShapeId,
  cost: { gold: 50 },
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

const altarShape = {
  id: ALTAR_SHAPE_ID,
  name: 'Square 3x3',
  __type: 'roomshape',
  width: 3,
  height: 3,
  tiles: [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
    { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
    { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 },
  ],
};

const mineShape = {
  id: 'shape-l',
  name: 'L-Shape',
  __type: 'roomshape',
  width: 3,
  height: 3,
  tiles: [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
  ],
};

// --- Imports after mocks ---

import {
  altarRoomFind,
  altarRoomGetLevel,
  altarRoomGetFearReductionAura,
  altarRoomGetNextUpgrade,
  altarRoomGetEffectiveFearLevel,
  altarRoomIsAdjacent,
} from '@helpers/altar-room';
import { roomPlacementIsRemovable } from '@helpers/room-placement';
import {
  roomUpgradeCanApply,
  roomUpgradeGetAppliedEffects,
  roomUpgradeGetPaths,
} from '@helpers/room-upgrades';

// --- Helpers ---

function makeFloor(rooms: PlacedRoom[]): Floor {
  return {
    id: 'floor-1' as FloorId,
    name: 'Floor 1',
    depth: 1,
    biome: 'neutral',
    grid: { tiles: [] } as unknown as Floor['grid'],
    rooms,
    hallways: [],
    inhabitants: [],
    connections: [],
    traps: [],
  };
}

function createAltarRoom(overrides: Partial<PlacedRoom> = {}): PlacedRoom {
  return {
    id: 'placed-altar-1' as PlacedRoomId,
    roomTypeId: ALTAR_ROOM_ID as RoomId,
    shapeId: ALTAR_SHAPE_ID as RoomShapeId,
    anchorX: 8,
    anchorY: 8,
    ...overrides,
  };
}

function createMineRoom(overrides: Partial<PlacedRoom> = {}): PlacedRoom {
  return {
    id: 'placed-mine-1' as PlacedRoomId,
    roomTypeId: CRYSTAL_MINE_ID as RoomId,
    shapeId: 'shape-l' as RoomShapeId,
    anchorX: 11,
    anchorY: 8,
    ...overrides,
  };
}

// --- Tests ---

beforeEach(() => {
  mockContent.set(ALTAR_ROOM_ID, altarRoomDef);
  mockContent.set(CRYSTAL_MINE_ID, crystalMineRoom);
  mockContent.set(ALTAR_SHAPE_ID, altarShape);
  mockContent.set('shape-l', mineShape);
});

describe('Altar Room: altarRoomFind', () => {
  it('should find the Altar Room on a floor', () => {
    const altar = createAltarRoom();
    const floor = makeFloor([altar]);
    const result = altarRoomFind([floor]);
    expect(result).toBeDefined();
    expect(result!.room.id).toBe('placed-altar-1');
  });

  it('should return undefined when no Altar Room exists', () => {
    const mine = createMineRoom();
    const floor = makeFloor([mine]);
    expect(altarRoomFind([floor])).toBeUndefined();
  });

  it('should return undefined for empty floors', () => {
    expect(altarRoomFind([makeFloor([])])).toBeUndefined();
  });
});

describe('Altar Room: non-removable', () => {
  it('should have removable: false in definition', () => {
    expect(altarRoomDef.removable).toBe(false);
  });

  it('should not be removable via roomPlacementIsRemovable', () => {
    expect(roomPlacementIsRemovable(ALTAR_ROOM_ID as RoomId)).toBe(false);
  });

  it('should allow removal of regular rooms', () => {
    expect(roomPlacementIsRemovable(CRYSTAL_MINE_ID as RoomId)).toBe(true);
  });
});

describe('Altar Room: autoPlace', () => {
  it('should have autoPlace: true in definition', () => {
    expect(altarRoomDef.autoPlace).toBe(true);
  });

  it('should be unique', () => {
    expect(altarRoomDef.isUnique).toBe(true);
  });

  it('should have 0 cost', () => {
    expect(Object.keys(altarRoomDef.cost).length).toBe(0);
  });
});

describe('Altar Room: level system', () => {
  it('should be Level 1 with no upgrade', () => {
    const altar = createAltarRoom();
    const floor = makeFloor([altar]);
    expect(altarRoomGetLevel([floor])).toBe(1);
  });

  it('should be Level 2 with Empowered Altar upgrade', () => {
    const altar = createAltarRoom({ appliedUpgradePathId: UPGRADE_LEVEL_2_ID as UpgradePathId });
    const floor = makeFloor([altar]);
    expect(altarRoomGetLevel([floor])).toBe(2);
  });

  it('should be Level 3 with Ascendant Altar upgrade', () => {
    const altar = createAltarRoom({ appliedUpgradePathId: UPGRADE_LEVEL_3_ID as UpgradePathId });
    const floor = makeFloor([altar]);
    expect(altarRoomGetLevel([floor])).toBe(3);
  });

  it('should return 0 when no Altar exists', () => {
    const floor = makeFloor([]);
    expect(altarRoomGetLevel([floor])).toBe(0);
  });
});

describe('Altar Room: upgrade paths', () => {
  it('should have 2 upgrade paths', () => {
    const paths = roomUpgradeGetPaths(ALTAR_ROOM_ID as RoomId);
    expect(paths).toHaveLength(2);
  });

  it('should return Level 2 as next upgrade at Level 1', () => {
    const altar = createAltarRoom();
    const floor = makeFloor([altar]);
    const next = altarRoomGetNextUpgrade([floor]);
    expect(next).toBeDefined();
    expect(next!.id).toBe(UPGRADE_LEVEL_2_ID);
    expect(next!.name).toBe('Empowered Altar');
  });

  it('should return Level 3 as next upgrade at Level 2', () => {
    const altar = createAltarRoom({ appliedUpgradePathId: UPGRADE_LEVEL_2_ID as UpgradePathId });
    const floor = makeFloor([altar]);
    const next = altarRoomGetNextUpgrade([floor]);
    expect(next).toBeDefined();
    expect(next!.id).toBe(UPGRADE_LEVEL_3_ID);
    expect(next!.name).toBe('Ascendant Altar');
  });

  it('should return undefined when fully upgraded', () => {
    const altar = createAltarRoom({ appliedUpgradePathId: UPGRADE_LEVEL_3_ID as UpgradePathId });
    const floor = makeFloor([altar]);
    expect(altarRoomGetNextUpgrade([floor])).toBeUndefined();
  });

  it('should return undefined when no Altar exists', () => {
    expect(altarRoomGetNextUpgrade([makeFloor([])])).toBeUndefined();
  });
});

describe('Altar Room: fear reduction aura', () => {
  it('should have base fear reduction aura of 1', () => {
    const altar = createAltarRoom();
    const floor = makeFloor([altar]);
    expect(altarRoomGetFearReductionAura([floor])).toBe(1);
  });

  it('should have fear reduction aura of 2 at Level 2', () => {
    const altar = createAltarRoom({ appliedUpgradePathId: UPGRADE_LEVEL_2_ID as UpgradePathId });
    const floor = makeFloor([altar]);
    expect(altarRoomGetFearReductionAura([floor])).toBe(2);
  });

  it('should have fear reduction aura of 3 at Level 3', () => {
    const altar = createAltarRoom({ appliedUpgradePathId: UPGRADE_LEVEL_3_ID as UpgradePathId });
    const floor = makeFloor([altar]);
    expect(altarRoomGetFearReductionAura([floor])).toBe(3);
  });

  it('should return 0 when no Altar exists', () => {
    expect(altarRoomGetFearReductionAura([makeFloor([])])).toBe(0);
  });
});

describe('Altar Room: adjacency detection', () => {
  it('should detect adjacent room (mine at x=11, altar at x=8 with 3x3)', () => {
    // Altar occupies (8,8)-(10,10), mine starts at (11,8) — tiles touch
    const altar = createAltarRoom();
    const mine = createMineRoom({ anchorX: 11, anchorY: 8 });
    const floor = makeFloor([altar, mine]);
    expect(altarRoomIsAdjacent(floor, mine)).toBe(true);
  });

  it('should not detect non-adjacent room', () => {
    const altar = createAltarRoom();
    const mine = createMineRoom({ anchorX: 15, anchorY: 15 });
    const floor = makeFloor([altar, mine]);
    expect(altarRoomIsAdjacent(floor, mine)).toBe(false);
  });

  it('should return false when no Altar on floor', () => {
    const mine = createMineRoom();
    const floor = makeFloor([mine]);
    expect(altarRoomIsAdjacent(floor, mine)).toBe(false);
  });
});

describe('Altar Room: effective fear level', () => {
  it('should reduce fear by 1 for adjacent room at Level 1', () => {
    const altar = createAltarRoom();
    const mine = createMineRoom({ anchorX: 11, anchorY: 8 });
    const floor = makeFloor([altar, mine]);
    // Crystal Mine has fearLevel: 1, Altar aura: 1 → effective: 0
    expect(altarRoomGetEffectiveFearLevel(floor, mine, 1)).toBe(0);
  });

  it('should reduce fear by 2 for adjacent room at Level 2', () => {
    const altar = createAltarRoom({ appliedUpgradePathId: UPGRADE_LEVEL_2_ID as UpgradePathId });
    const mine = createMineRoom({ anchorX: 11, anchorY: 8 });
    const floor = makeFloor([altar, mine]);
    // fearLevel: 2, aura: 2 → effective: 0
    expect(altarRoomGetEffectiveFearLevel(floor, mine, 2)).toBe(0);
  });

  it('should not reduce fear below 0', () => {
    const altar = createAltarRoom({ appliedUpgradePathId: UPGRADE_LEVEL_3_ID as UpgradePathId });
    const mine = createMineRoom({ anchorX: 11, anchorY: 8 });
    const floor = makeFloor([altar, mine]);
    // fearLevel: 1, aura: 3 → clamped to 0
    expect(altarRoomGetEffectiveFearLevel(floor, mine, 1)).toBe(0);
  });

  it('should not reduce fear for non-adjacent rooms', () => {
    const altar = createAltarRoom();
    const mine = createMineRoom({ anchorX: 15, anchorY: 15 });
    const floor = makeFloor([altar, mine]);
    expect(altarRoomGetEffectiveFearLevel(floor, mine, 1)).toBe(1);
  });

  it('should pass through variable fear level unchanged', () => {
    const altar = createAltarRoom();
    const mine = createMineRoom({ anchorX: 11, anchorY: 8 });
    const floor = makeFloor([altar, mine]);
    expect(altarRoomGetEffectiveFearLevel(floor, mine, 'variable')).toBe('variable');
  });

  it('should not reduce fear when no Altar exists', () => {
    const mine = createMineRoom();
    const floor = makeFloor([mine]);
    expect(altarRoomGetEffectiveFearLevel(floor, mine, 1)).toBe(1);
  });
});

describe('Altar Room: upgrade effects', () => {
  it('should expose Level 2 upgrade effects when applied', () => {
    const altar = createAltarRoom({ appliedUpgradePathId: UPGRADE_LEVEL_2_ID as UpgradePathId });
    const effects = roomUpgradeGetAppliedEffects(altar);
    expect(effects).toHaveLength(2);
    expect(effects[0].type).toBe('fearReductionAura');
    expect(effects[0].value).toBe(2);
    expect(effects[1].type).toBe('secondaryProduction');
  });

  it('should expose Level 3 upgrade effects when applied', () => {
    const altar = createAltarRoom({ appliedUpgradePathId: UPGRADE_LEVEL_3_ID as UpgradePathId });
    const effects = roomUpgradeGetAppliedEffects(altar);
    expect(effects).toHaveLength(3);
    expect(effects[0].type).toBe('fearReductionAura');
    expect(effects[0].value).toBe(3);
  });

  it('should have no effects when un-upgraded', () => {
    const altar = createAltarRoom();
    const effects = roomUpgradeGetAppliedEffects(altar);
    expect(effects).toHaveLength(0);
  });
});

describe('Altar Room: upgrade mutual exclusivity', () => {
  it('should prevent applying a second upgrade directly', () => {
    const altar = createAltarRoom({ appliedUpgradePathId: UPGRADE_LEVEL_2_ID as UpgradePathId });
    const result = roomUpgradeCanApply(altar, UPGRADE_LEVEL_3_ID);
    expect(result.valid).toBe(false);
  });

  it('should allow applying first upgrade to un-upgraded altar', () => {
    const altar = createAltarRoom();
    const result = roomUpgradeCanApply(altar, UPGRADE_LEVEL_2_ID);
    expect(result.valid).toBe(true);
  });
});

describe('Altar Room: production', () => {
  it('should have base essence production of 0.2/tick', () => {
    expect(altarRoomDef.production).toEqual({ essence: 0.2 });
  });

  it('should not require workers', () => {
    expect(altarRoomDef.requiresWorkers).toBe(false);
  });
});
