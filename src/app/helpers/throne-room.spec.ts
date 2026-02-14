import type {
  Floor,
  InhabitantDefinition,
  InhabitantInstance,
  IsContentItem,
  PlacedRoom,
  PlacedRoomId,
  RoomId,
  RoomShape,
} from '@interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Constants (test-local) ---

const THRONE_ROOM_TYPE_ID = 'test-throne-room-type';
const TREASURE_VAULT_TYPE_ID = 'test-vault-type';
const VAULT_ADJACENCY_GOLD_BONUS = 0.05;

// --- Mocks ---

const mockFloors: Floor[] = [];
const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  contentGetEntry: (id: string) => mockContent.get(id) ?? undefined,
}));

vi.mock('@helpers/state-game', () => ({
  gamestate: () => ({ world: { floors: mockFloors } }),
}));

vi.mock('@helpers/room-roles', () => ({
  roomRoleFindById: vi.fn((role: string) => {
    if (role === 'throne') return THRONE_ROOM_TYPE_ID;
    return undefined;
  }),
  roomRoleResetCache: vi.fn(),
}));

const {
  THRONE_ROOM_EMPTY_FEAR_LEVEL,
  THRONE_ROOM_CENTRALITY_THRESHOLD,
  THRONE_ROOM_CENTRALITY_RULER_BONUS_MULTIPLIER,
  throneRoomFind,
  throneRoomGetSeatedRulerInstance,
  throneRoomGetActiveRulerBonuses,
  throneRoomGetRulerBonusValue,
  throneRoomGetFearLevel,
  throneRoomIsRoomCentral,
  throneRoomGetPositionalBonuses,
} = await import('@helpers/throne-room');

// --- Test helpers ---

function createPlacedRoom(overrides: Partial<PlacedRoom> = {}): PlacedRoom {
  return {
    id: 'room-001' as PlacedRoomId,
    roomTypeId: THRONE_ROOM_TYPE_ID as RoomId,
    shapeId: 'shape-4x4',
    anchorX: 5,
    anchorY: 5,
    ...overrides,
  };
}

function createInhabitantInstance(
  overrides: Partial<InhabitantInstance> = {},
): InhabitantInstance {
  return {
    instanceId: 'ruler-001',
    definitionId: 'def-dragon',
    name: 'Dragon',
    state: 'normal',
    assignedRoomId: undefined,
    ...overrides,
  };
}

function createInhabitantDef(
  overrides: Partial<InhabitantDefinition> = {},
): InhabitantDefinition & IsContentItem {
  return {
    id: 'def-dragon',
    name: 'Dragon',
    __type: 'inhabitant',
    type: 'dragon',
    tier: 4,
    description: 'A powerful dragon',
    cost: {},
    stats: {
      hp: 500,
      attack: 80,
      defense: 60,
      speed: 20,
      workerEfficiency: 1.0,
    },
    traits: [],
    restrictionTags: ['unique'],
    rulerBonuses: { attack: 0.1, fear: 0.05 },
    rulerFearLevel: 4,
    ...overrides,
  } as InhabitantDefinition & IsContentItem;
}

function floorCreate(overrides: Partial<Floor> = {}): Floor {
  return {
    id: 'floor-1',
    name: 'Floor 1',
    depth: 1,
    biome: 'cavern',
    grid: [],
    rooms: [],
    hallways: [],
    inhabitants: [],
    connections: [],
    ...overrides,
  } as Floor;
}

// --- Tests ---

describe('throneRoomFind', () => {
  it('should return undefined when no floors exist', () => {
    expect(throneRoomFind([])).toBeUndefined();
  });

  it('should return undefined when Throne Room is not placed', () => {
    const floor = floorCreate({
      rooms: [
        createPlacedRoom({
          id: 'room-other' as PlacedRoomId,
          roomTypeId: 'some-other-room-type' as RoomId,
        }),
      ],
    });
    expect(throneRoomFind([floor])).toBeUndefined();
  });

  it('should find Throne Room on the first floor', () => {
    const throneRoom = createPlacedRoom();
    const floor = floorCreate({ rooms: [throneRoom] });
    const result = throneRoomFind([floor]);
    expect(result).toBeDefined();
    expect(result!.room.id).toBe('room-001');
    expect(result!.floor.id).toBe('floor-1');
  });

  it('should find Throne Room on a deeper floor', () => {
    const floor1 = floorCreate({ id: 'floor-1', rooms: [] });
    const throneRoom = createPlacedRoom();
    const floor2 = floorCreate({
      id: 'floor-2',
      depth: 2,
      rooms: [throneRoom],
    });
    const result = throneRoomFind([floor1, floor2]);
    expect(result).toBeDefined();
    expect(result!.floor.id).toBe('floor-2');
  });
});

describe('throneRoomGetSeatedRulerInstance', () => {
  it('should return undefined when no inhabitants are assigned', () => {
    const floor = floorCreate({ inhabitants: [] });
    expect(throneRoomGetSeatedRulerInstance(floor, 'room-001' as PlacedRoomId)).toBeUndefined();
  });

  it('should return undefined when no inhabitant is assigned to the throne room', () => {
    const floor = floorCreate({
      inhabitants: [
        createInhabitantInstance({ assignedRoomId: 'other-room' as PlacedRoomId }),
      ],
    });
    expect(throneRoomGetSeatedRulerInstance(floor, 'room-001' as PlacedRoomId)).toBeUndefined();
  });

  it('should return the seated ruler', () => {
    const ruler = createInhabitantInstance({ assignedRoomId: 'room-001' as PlacedRoomId });
    const floor = floorCreate({ inhabitants: [ruler] });
    const result = throneRoomGetSeatedRulerInstance(floor, 'room-001' as PlacedRoomId);
    expect(result).toBeDefined();
    expect(result!.instanceId).toBe('ruler-001');
  });
});

describe('throneRoomGetActiveRulerBonuses', () => {
  beforeEach(() => {
    mockContent.clear();
  });

  it('should return empty bonuses when no Throne Room exists', () => {
    const bonuses = throneRoomGetActiveRulerBonuses([floorCreate()]);
    expect(bonuses).toEqual({});
  });

  it('should return empty bonuses when Throne Room is empty', () => {
    const floor = floorCreate({
      rooms: [createPlacedRoom()],
      inhabitants: [],
    });
    const bonuses = throneRoomGetActiveRulerBonuses([floor]);
    expect(bonuses).toEqual({});
  });

  it('should return Dragon ruler bonuses', () => {
    const dragonDef = createInhabitantDef({
      id: 'def-dragon',
      rulerBonuses: { attack: 0.1, fear: 0.05 },
    });
    mockContent.set('def-dragon', dragonDef);

    const floor = floorCreate({
      rooms: [createPlacedRoom()],
      inhabitants: [
        createInhabitantInstance({
          definitionId: 'def-dragon',
          assignedRoomId: 'room-001' as PlacedRoomId,
        }),
      ],
    });

    const bonuses = throneRoomGetActiveRulerBonuses([floor]);
    expect(bonuses['attack']).toBe(0.1);
    expect(bonuses['fear']).toBe(0.05);
  });

  it('should return Lich ruler bonuses', () => {
    const lichDef = createInhabitantDef({
      id: 'def-lich',
      name: 'Lich',
      rulerBonuses: { researchSpeed: 0.2, fluxProduction: 0.15 },
    });
    mockContent.set('def-lich', lichDef);

    const floor = floorCreate({
      rooms: [createPlacedRoom()],
      inhabitants: [
        createInhabitantInstance({
          instanceId: 'ruler-lich',
          definitionId: 'def-lich',
          name: 'Lich',
          assignedRoomId: 'room-001' as PlacedRoomId,
        }),
      ],
    });

    const bonuses = throneRoomGetActiveRulerBonuses([floor]);
    expect(bonuses['researchSpeed']).toBe(0.2);
    expect(bonuses['fluxProduction']).toBe(0.15);
  });

  it('should return Demon Lord ruler bonuses', () => {
    const demonDef = createInhabitantDef({
      id: 'def-demon',
      name: 'Demon Lord',
      rulerBonuses: { corruptionGeneration: 0.25, fear: 0.1, invaderMorale: -0.1 },
    });
    mockContent.set('def-demon', demonDef);

    const floor = floorCreate({
      rooms: [createPlacedRoom()],
      inhabitants: [
        createInhabitantInstance({
          instanceId: 'ruler-demon',
          definitionId: 'def-demon',
          name: 'Demon Lord',
          assignedRoomId: 'room-001' as PlacedRoomId,
        }),
      ],
    });

    const bonuses = throneRoomGetActiveRulerBonuses([floor]);
    expect(bonuses['corruptionGeneration']).toBe(0.25);
    expect(bonuses['fear']).toBe(0.1);
    expect(bonuses['invaderMorale']).toBe(-0.1);
  });

  it('should return empty bonuses when ruler is removed (unassigned)', () => {
    const dragonDef = createInhabitantDef();
    mockContent.set('def-dragon', dragonDef);

    const floor = floorCreate({
      rooms: [createPlacedRoom()],
      inhabitants: [
        createInhabitantInstance({ assignedRoomId: undefined }),
      ],
    });

    const bonuses = throneRoomGetActiveRulerBonuses([floor]);
    expect(bonuses).toEqual({});
  });

  it('should return empty bonuses when ruler definition is unknown', () => {
    const floor = floorCreate({
      rooms: [createPlacedRoom()],
      inhabitants: [
        createInhabitantInstance({
          definitionId: 'nonexistent-def',
          assignedRoomId: 'room-001' as PlacedRoomId,
        }),
      ],
    });

    const bonuses = throneRoomGetActiveRulerBonuses([floor]);
    expect(bonuses).toEqual({});
  });
});

describe('throneRoomGetRulerBonusValue', () => {
  beforeEach(() => {
    mockContent.clear();
  });

  it('should return 0 for a bonus type when no ruler is seated', () => {
    expect(throneRoomGetRulerBonusValue([floorCreate()], 'attack')).toBe(0);
  });

  it('should return the correct bonus value for a specific type', () => {
    const dragonDef = createInhabitantDef({
      rulerBonuses: { attack: 0.1, fear: 0.05 },
    });
    mockContent.set('def-dragon', dragonDef);

    const floor = floorCreate({
      rooms: [createPlacedRoom()],
      inhabitants: [
        createInhabitantInstance({
          definitionId: 'def-dragon',
          assignedRoomId: 'room-001' as PlacedRoomId,
        }),
      ],
    });

    expect(throneRoomGetRulerBonusValue([floor], 'attack')).toBe(0.1);
    expect(throneRoomGetRulerBonusValue([floor], 'fear')).toBe(0.05);
    expect(throneRoomGetRulerBonusValue([floor], 'researchSpeed')).toBe(0);
  });
});

describe('throneRoomGetFearLevel', () => {
  beforeEach(() => {
    mockContent.clear();
  });

  it('should return undefined when no Throne Room exists', () => {
    expect(throneRoomGetFearLevel([floorCreate()])).toBeUndefined();
  });

  it('should return THRONE_ROOM_EMPTY_FEAR_LEVEL when Throne Room has no ruler', () => {
    const floor = floorCreate({
      rooms: [createPlacedRoom()],
      inhabitants: [],
    });
    expect(throneRoomGetFearLevel([floor])).toBe(THRONE_ROOM_EMPTY_FEAR_LEVEL);
    expect(THRONE_ROOM_EMPTY_FEAR_LEVEL).toBe(1);
  });

  it('should return fear level 4 for Dragon ruler', () => {
    const dragonDef = createInhabitantDef({
      id: 'def-dragon',
      rulerFearLevel: 4,
    });
    mockContent.set('def-dragon', dragonDef);

    const floor = floorCreate({
      rooms: [createPlacedRoom()],
      inhabitants: [
        createInhabitantInstance({
          definitionId: 'def-dragon',
          assignedRoomId: 'room-001' as PlacedRoomId,
        }),
      ],
    });

    expect(throneRoomGetFearLevel([floor])).toBe(4);
  });

  it('should return fear level 3 for Lich ruler', () => {
    const lichDef = createInhabitantDef({
      id: 'def-lich',
      name: 'Lich',
      rulerFearLevel: 3,
    });
    mockContent.set('def-lich', lichDef);

    const floor = floorCreate({
      rooms: [createPlacedRoom()],
      inhabitants: [
        createInhabitantInstance({
          instanceId: 'ruler-lich',
          definitionId: 'def-lich',
          assignedRoomId: 'room-001' as PlacedRoomId,
        }),
      ],
    });

    expect(throneRoomGetFearLevel([floor])).toBe(3);
  });

  it('should return fear level 5 for Demon Lord ruler', () => {
    const demonDef = createInhabitantDef({
      id: 'def-demon',
      name: 'Demon Lord',
      rulerFearLevel: 5,
    });
    mockContent.set('def-demon', demonDef);

    const floor = floorCreate({
      rooms: [createPlacedRoom()],
      inhabitants: [
        createInhabitantInstance({
          instanceId: 'ruler-demon',
          definitionId: 'def-demon',
          assignedRoomId: 'room-001' as PlacedRoomId,
        }),
      ],
    });

    expect(throneRoomGetFearLevel([floor])).toBe(5);
  });

  it('should return THRONE_ROOM_EMPTY_FEAR_LEVEL when ruler definition is unknown', () => {
    const floor = floorCreate({
      rooms: [createPlacedRoom()],
      inhabitants: [
        createInhabitantInstance({
          definitionId: 'nonexistent-def',
          assignedRoomId: 'room-001' as PlacedRoomId,
        }),
      ],
    });

    expect(throneRoomGetFearLevel([floor])).toBe(THRONE_ROOM_EMPTY_FEAR_LEVEL);
  });

  it('should return THRONE_ROOM_EMPTY_FEAR_LEVEL when ruler has rulerFearLevel 0', () => {
    const weakDef = createInhabitantDef({
      id: 'def-weak',
      rulerFearLevel: 0,
    });
    mockContent.set('def-weak', weakDef);

    const floor = floorCreate({
      rooms: [createPlacedRoom()],
      inhabitants: [
        createInhabitantInstance({
          definitionId: 'def-weak',
          assignedRoomId: 'room-001' as PlacedRoomId,
        }),
      ],
    });

    expect(throneRoomGetFearLevel([floor])).toBe(THRONE_ROOM_EMPTY_FEAR_LEVEL);
  });
});

// --- Room shape helpers for adjacency tests ---

function createRoomShape(
  overrides: Partial<RoomShape & IsContentItem> = {},
): RoomShape & IsContentItem {
  return {
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
    ...overrides,
  } as RoomShape & IsContentItem;
}

function createVaultShape(): RoomShape & IsContentItem {
  return createRoomShape({
    id: 'shape-3x3',
    name: 'Square 3x3',
    width: 3,
    height: 3,
    tiles: [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
      { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
      { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 },
    ],
  });
}

function createVaultRoom(overrides: Partial<PlacedRoom> = {}): PlacedRoom {
  return {
    id: 'vault-001' as PlacedRoomId,
    roomTypeId: TREASURE_VAULT_TYPE_ID as RoomId,
    shapeId: 'shape-3x3',
    anchorX: 9,
    anchorY: 5,
    ...overrides,
  };
}

// --- Adjacency & centrality tests ---

describe('throneRoomIsRoomCentral', () => {
  it('should return true when room center is at grid center', () => {
    // 4x4 room at anchor (8,8): center = (10, 10), grid center = (10, 10)
    expect(throneRoomIsRoomCentral(8, 8, 4, 4, 20, THRONE_ROOM_CENTRALITY_THRESHOLD)).toBe(true);
  });

  it('should return true when room center is within threshold', () => {
    // 4x4 room at anchor (6,6): center = (8, 8), distance = 4
    expect(throneRoomIsRoomCentral(6, 6, 4, 4, 20, THRONE_ROOM_CENTRALITY_THRESHOLD)).toBe(true);
  });

  it('should return false when room center is beyond threshold', () => {
    // 4x4 room at anchor (0,0): center = (2, 2), distance = 16
    expect(throneRoomIsRoomCentral(0, 0, 4, 4, 20, THRONE_ROOM_CENTRALITY_THRESHOLD)).toBe(false);
  });

  it('should return true at exactly the threshold distance', () => {
    // 4x4 room at anchor (3,8): center = (5, 10), distance = |5-10| + |10-10| = 5
    expect(throneRoomIsRoomCentral(3, 8, 4, 4, 20, THRONE_ROOM_CENTRALITY_THRESHOLD)).toBe(true);
  });

  it('should return false just beyond the threshold', () => {
    // 4x4 room at anchor (2,8): center = (4, 10), distance = |4-10| + |10-10| = 6
    expect(throneRoomIsRoomCentral(2, 8, 4, 4, 20, THRONE_ROOM_CENTRALITY_THRESHOLD)).toBe(false);
  });
});

describe('throneRoomGetPositionalBonuses', () => {
  beforeEach(() => {
    mockContent.clear();
    mockContent.set(TREASURE_VAULT_TYPE_ID, {
      id: TREASURE_VAULT_TYPE_ID,
      __type: 'room',
      throneAdjacencyEffects: { goldProductionBonus: VAULT_ADJACENCY_GOLD_BONUS },
    });
  });

  it('should return default bonuses when no Throne Room exists', () => {
    const result = throneRoomGetPositionalBonuses([floorCreate()]);
    expect(result.vaultAdjacent).toBe(false);
    expect(result.central).toBe(false);
    expect(result.goldProductionBonus).toBe(0);
    expect(result.rulerBonusMultiplier).toBe(0);
  });

  it('should return default bonuses when throne shape is unknown', () => {
    const floor = floorCreate({
      rooms: [createPlacedRoom({ shapeId: 'nonexistent-shape' })],
    });
    const result = throneRoomGetPositionalBonuses([floor]);
    expect(result.vaultAdjacent).toBe(false);
    expect(result.central).toBe(false);
  });

  it('should detect vault adjacency when vault shares an edge', () => {
    const throneShape = createRoomShape();
    const vaultShape = createVaultShape();
    mockContent.set('shape-4x4', throneShape);
    mockContent.set('shape-3x3', vaultShape);

    // Throne at (5,5), vault at (9,5) — vault left edge touches throne right edge
    const floor = floorCreate({
      rooms: [
        createPlacedRoom({ anchorX: 5, anchorY: 5 }),
        createVaultRoom({ anchorX: 9, anchorY: 5 }),
      ],
    });

    const result = throneRoomGetPositionalBonuses([floor]);
    expect(result.vaultAdjacent).toBe(true);
    expect(result.goldProductionBonus).toBe(VAULT_ADJACENCY_GOLD_BONUS);
  });

  it('should not detect vault adjacency when vault is far away', () => {
    const throneShape = createRoomShape();
    const vaultShape = createVaultShape();
    mockContent.set('shape-4x4', throneShape);
    mockContent.set('shape-3x3', vaultShape);

    // Throne at (5,5), vault at (15,15) — not adjacent
    const floor = floorCreate({
      rooms: [
        createPlacedRoom({ anchorX: 5, anchorY: 5 }),
        createVaultRoom({ anchorX: 15, anchorY: 15 }),
      ],
    });

    const result = throneRoomGetPositionalBonuses([floor]);
    expect(result.vaultAdjacent).toBe(false);
    expect(result.goldProductionBonus).toBe(0);
  });

  it('should not detect adjacency for diagonal-only touching', () => {
    const throneShape = createRoomShape();
    const vaultShape = createVaultShape();
    mockContent.set('shape-4x4', throneShape);
    mockContent.set('shape-3x3', vaultShape);

    // Throne at (5,5) occupies (5,5)-(8,8). Vault at (9,9) — only diagonal
    const floor = floorCreate({
      rooms: [
        createPlacedRoom({ anchorX: 5, anchorY: 5 }),
        createVaultRoom({ anchorX: 9, anchorY: 9 }),
      ],
    });

    const result = throneRoomGetPositionalBonuses([floor]);
    expect(result.vaultAdjacent).toBe(false);
  });

  it('should detect central placement', () => {
    const throneShape = createRoomShape();
    mockContent.set('shape-4x4', throneShape);

    // Throne at (8,8): center = (10,10), distance = 0
    const floor = floorCreate({
      rooms: [createPlacedRoom({ anchorX: 8, anchorY: 8 })],
    });

    const result = throneRoomGetPositionalBonuses([floor]);
    expect(result.central).toBe(true);
    expect(result.rulerBonusMultiplier).toBe(THRONE_ROOM_CENTRALITY_RULER_BONUS_MULTIPLIER);
  });

  it('should not detect central placement when far from center', () => {
    const throneShape = createRoomShape();
    mockContent.set('shape-4x4', throneShape);

    // Throne at (0,0): center = (2,2), distance = 16
    const floor = floorCreate({
      rooms: [createPlacedRoom({ anchorX: 0, anchorY: 0 })],
    });

    const result = throneRoomGetPositionalBonuses([floor]);
    expect(result.central).toBe(false);
    expect(result.rulerBonusMultiplier).toBe(0);
  });

  it('should return both bonuses when adjacent to vault and central', () => {
    const throneShape = createRoomShape();
    const vaultShape = createVaultShape();
    mockContent.set('shape-4x4', throneShape);
    mockContent.set('shape-3x3', vaultShape);

    // Throne at (8,8) is central, vault at (12,8) is adjacent
    const floor = floorCreate({
      rooms: [
        createPlacedRoom({ anchorX: 8, anchorY: 8 }),
        createVaultRoom({ anchorX: 12, anchorY: 8 }),
      ],
    });

    const result = throneRoomGetPositionalBonuses([floor]);
    expect(result.vaultAdjacent).toBe(true);
    expect(result.central).toBe(true);
    expect(result.goldProductionBonus).toBe(VAULT_ADJACENCY_GOLD_BONUS);
    expect(result.rulerBonusMultiplier).toBe(THRONE_ROOM_CENTRALITY_RULER_BONUS_MULTIPLIER);
  });

  it('should ignore non-vault rooms for adjacency', () => {
    const throneShape = createRoomShape();
    const otherShape = createVaultShape();
    mockContent.set('shape-4x4', throneShape);
    mockContent.set('shape-3x3', otherShape);

    // Adjacent room is NOT a vault
    const floor = floorCreate({
      rooms: [
        createPlacedRoom({ anchorX: 5, anchorY: 5 }),
        {
          id: 'other-room' as PlacedRoomId,
          roomTypeId: 'some-other-type' as RoomId,
          shapeId: 'shape-3x3',
          anchorX: 9,
          anchorY: 5,
        },
      ],
    });

    const result = throneRoomGetPositionalBonuses([floor]);
    expect(result.vaultAdjacent).toBe(false);
  });
});
