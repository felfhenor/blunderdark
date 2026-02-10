import type {
  Floor,
  InhabitantDefinition,
  InhabitantInstance,
  IsContentItem,
  PlacedRoom,
} from '@interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mocks ---

const mockFloors: Floor[] = [];
const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  getEntry: (id: string) => mockContent.get(id) ?? undefined,
}));

vi.mock('@helpers/state-game', () => ({
  gamestate: () => ({ world: { floors: mockFloors } }),
}));

const {
  THRONE_ROOM_TYPE_ID,
  findThroneRoom,
  getSeatedRulerInstance,
  getActiveRulerBonuses,
  getRulerBonusValue,
} = await import('@helpers/throne-room');

// --- Test helpers ---

function createPlacedRoom(overrides: Partial<PlacedRoom> = {}): PlacedRoom {
  return {
    id: 'room-001',
    roomTypeId: THRONE_ROOM_TYPE_ID,
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
    assignedRoomId: null,
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
    ...overrides,
  } as InhabitantDefinition & IsContentItem;
}

function createFloor(overrides: Partial<Floor> = {}): Floor {
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

describe('findThroneRoom', () => {
  it('should return null when no floors exist', () => {
    expect(findThroneRoom([])).toBeNull();
  });

  it('should return null when Throne Room is not placed', () => {
    const floor = createFloor({
      rooms: [
        createPlacedRoom({
          id: 'room-other',
          roomTypeId: 'some-other-room-type',
        }),
      ],
    });
    expect(findThroneRoom([floor])).toBeNull();
  });

  it('should find Throne Room on the first floor', () => {
    const throneRoom = createPlacedRoom();
    const floor = createFloor({ rooms: [throneRoom] });
    const result = findThroneRoom([floor]);
    expect(result).not.toBeNull();
    expect(result!.room.id).toBe('room-001');
    expect(result!.floor.id).toBe('floor-1');
  });

  it('should find Throne Room on a deeper floor', () => {
    const floor1 = createFloor({ id: 'floor-1', rooms: [] });
    const throneRoom = createPlacedRoom();
    const floor2 = createFloor({
      id: 'floor-2',
      depth: 2,
      rooms: [throneRoom],
    });
    const result = findThroneRoom([floor1, floor2]);
    expect(result).not.toBeNull();
    expect(result!.floor.id).toBe('floor-2');
  });
});

describe('getSeatedRulerInstance', () => {
  it('should return null when no inhabitants are assigned', () => {
    const floor = createFloor({ inhabitants: [] });
    expect(getSeatedRulerInstance(floor, 'room-001')).toBeNull();
  });

  it('should return null when no inhabitant is assigned to the throne room', () => {
    const floor = createFloor({
      inhabitants: [
        createInhabitantInstance({ assignedRoomId: 'other-room' }),
      ],
    });
    expect(getSeatedRulerInstance(floor, 'room-001')).toBeNull();
  });

  it('should return the seated ruler', () => {
    const ruler = createInhabitantInstance({ assignedRoomId: 'room-001' });
    const floor = createFloor({ inhabitants: [ruler] });
    const result = getSeatedRulerInstance(floor, 'room-001');
    expect(result).not.toBeNull();
    expect(result!.instanceId).toBe('ruler-001');
  });
});

describe('getActiveRulerBonuses', () => {
  beforeEach(() => {
    mockContent.clear();
  });

  it('should return empty bonuses when no Throne Room exists', () => {
    const bonuses = getActiveRulerBonuses([createFloor()]);
    expect(bonuses).toEqual({});
  });

  it('should return empty bonuses when Throne Room is empty', () => {
    const floor = createFloor({
      rooms: [createPlacedRoom()],
      inhabitants: [],
    });
    const bonuses = getActiveRulerBonuses([floor]);
    expect(bonuses).toEqual({});
  });

  it('should return Dragon ruler bonuses', () => {
    const dragonDef = createInhabitantDef({
      id: 'def-dragon',
      rulerBonuses: { attack: 0.1, fear: 0.05 },
    });
    mockContent.set('def-dragon', dragonDef);

    const floor = createFloor({
      rooms: [createPlacedRoom()],
      inhabitants: [
        createInhabitantInstance({
          definitionId: 'def-dragon',
          assignedRoomId: 'room-001',
        }),
      ],
    });

    const bonuses = getActiveRulerBonuses([floor]);
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

    const floor = createFloor({
      rooms: [createPlacedRoom()],
      inhabitants: [
        createInhabitantInstance({
          instanceId: 'ruler-lich',
          definitionId: 'def-lich',
          name: 'Lich',
          assignedRoomId: 'room-001',
        }),
      ],
    });

    const bonuses = getActiveRulerBonuses([floor]);
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

    const floor = createFloor({
      rooms: [createPlacedRoom()],
      inhabitants: [
        createInhabitantInstance({
          instanceId: 'ruler-demon',
          definitionId: 'def-demon',
          name: 'Demon Lord',
          assignedRoomId: 'room-001',
        }),
      ],
    });

    const bonuses = getActiveRulerBonuses([floor]);
    expect(bonuses['corruptionGeneration']).toBe(0.25);
    expect(bonuses['fear']).toBe(0.1);
    expect(bonuses['invaderMorale']).toBe(-0.1);
  });

  it('should return empty bonuses when ruler is removed (unassigned)', () => {
    const dragonDef = createInhabitantDef();
    mockContent.set('def-dragon', dragonDef);

    const floor = createFloor({
      rooms: [createPlacedRoom()],
      inhabitants: [
        createInhabitantInstance({ assignedRoomId: null }),
      ],
    });

    const bonuses = getActiveRulerBonuses([floor]);
    expect(bonuses).toEqual({});
  });

  it('should return empty bonuses when ruler definition is unknown', () => {
    const floor = createFloor({
      rooms: [createPlacedRoom()],
      inhabitants: [
        createInhabitantInstance({
          definitionId: 'nonexistent-def',
          assignedRoomId: 'room-001',
        }),
      ],
    });

    const bonuses = getActiveRulerBonuses([floor]);
    expect(bonuses).toEqual({});
  });
});

describe('getRulerBonusValue', () => {
  beforeEach(() => {
    mockContent.clear();
  });

  it('should return 0 for a bonus type when no ruler is seated', () => {
    expect(getRulerBonusValue([createFloor()], 'attack')).toBe(0);
  });

  it('should return the correct bonus value for a specific type', () => {
    const dragonDef = createInhabitantDef({
      rulerBonuses: { attack: 0.1, fear: 0.05 },
    });
    mockContent.set('def-dragon', dragonDef);

    const floor = createFloor({
      rooms: [createPlacedRoom()],
      inhabitants: [
        createInhabitantInstance({
          definitionId: 'def-dragon',
          assignedRoomId: 'room-001',
        }),
      ],
    });

    expect(getRulerBonusValue([floor], 'attack')).toBe(0.1);
    expect(getRulerBonusValue([floor], 'fear')).toBe(0.05);
    expect(getRulerBonusValue([floor], 'researchSpeed')).toBe(0);
  });
});
