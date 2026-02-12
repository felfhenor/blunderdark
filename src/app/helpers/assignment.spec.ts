import type {
  GameState,
  InhabitantInstance,
  PlacedRoom,
  RoomDefinition,
} from '@interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockInhabitants: InhabitantInstance[];
let mockFloors: Array<{
  rooms: PlacedRoom[];
  inhabitants: InhabitantInstance[];
}>;
let mockContent: Map<string, unknown>;
let mockEffectiveMax: number | undefined;

vi.mock('@helpers/state-game', () => ({
  gamestate: () => ({
    world: {
      inhabitants: mockInhabitants,
      floors: mockFloors,
    },
  }),
  updateGamestate: vi.fn(async (fn: (state: GameState) => GameState) => {
    const fakeState = {
      world: {
        inhabitants: mockInhabitants,
        floors: mockFloors,
      },
    } as unknown as GameState;
    const result = fn(fakeState);
    mockInhabitants = result.world.inhabitants;
  }),
}));

vi.mock('@helpers/content', () => ({
  getEntry: (id: string) => mockContent.get(id) ?? undefined,
}));

vi.mock('@helpers/room-upgrades', () => ({
  getEffectiveMaxInhabitants: (
    _placedRoom: PlacedRoom,
    roomDef: RoomDefinition,
  ) => {
    if (mockEffectiveMax !== undefined) return mockEffectiveMax;
    return roomDef.maxInhabitants;
  },
}));

const {
  canAssignToRoom,
  getAssignmentCount,
  isInhabitantAssigned,
  getRoomAssignmentInfo,
} = await import('@helpers/assignment');

function createTestPlacedRoom(
  overrides: Partial<PlacedRoom> = {},
): PlacedRoom {
  return {
    id: 'room-001',
    roomTypeId: 'room-type-crystal-mine',
    shapeId: 'shape-l',
    anchorX: 5,
    anchorY: 5,
    ...overrides,
  };
}

function createTestRoomDef(
  overrides: Partial<RoomDefinition> = {},
): RoomDefinition {
  return {
    id: 'room-type-crystal-mine',
    name: 'Crystal Mine',
    description: 'A mine',
    shapeId: 'shape-l',
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
    ...overrides,
  };
}

function createTestInhabitant(
  overrides: Partial<InhabitantInstance> = {},
): InhabitantInstance {
  return {
    instanceId: 'inst-001',
    definitionId: 'def-goblin',
    name: 'Goblin Worker',
    state: 'normal',
    assignedRoomId: undefined,
    ...overrides,
  };
}

describe('canAssignToRoom', () => {
  beforeEach(() => {
    mockInhabitants = [];
    mockFloors = [];
    mockContent = new Map();
    mockEffectiveMax = undefined;
  });

  it('should return not allowed when room is not found', () => {
    mockFloors = [{ rooms: [], inhabitants: [] }];
    const result = canAssignToRoom('nonexistent');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not found');
  });

  it('should return not allowed when room type is unknown', () => {
    const room = createTestPlacedRoom();
    mockFloors = [{ rooms: [room], inhabitants: [] }];
    // No content registered
    const result = canAssignToRoom('room-001');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Unknown room type');
  });

  it('should return not allowed when room does not accept inhabitants (maxInhabitants=0)', () => {
    const room = createTestPlacedRoom();
    const def = createTestRoomDef({ maxInhabitants: 0 });
    mockFloors = [{ rooms: [room], inhabitants: [] }];
    mockContent.set('room-type-crystal-mine', def);

    const result = canAssignToRoom('room-001');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('does not accept inhabitants');
  });

  it('should allow assignment when room is empty (0 assigned)', () => {
    const room = createTestPlacedRoom();
    const def = createTestRoomDef({ maxInhabitants: 2 });
    mockFloors = [{ rooms: [room], inhabitants: [] }];
    mockContent.set('room-type-crystal-mine', def);
    mockInhabitants = [];

    const result = canAssignToRoom('room-001');
    expect(result.allowed).toBe(true);
    expect(result.currentCount).toBe(0);
    expect(result.maxCapacity).toBe(2);
  });

  it('should allow assignment when room is partially filled', () => {
    const room = createTestPlacedRoom();
    const def = createTestRoomDef({ maxInhabitants: 3 });
    mockFloors = [{ rooms: [room], inhabitants: [] }];
    mockContent.set('room-type-crystal-mine', def);
    mockInhabitants = [
      createTestInhabitant({ instanceId: 'inst-001', assignedRoomId: 'room-001' }),
    ];

    const result = canAssignToRoom('room-001');
    expect(result.allowed).toBe(true);
    expect(result.currentCount).toBe(1);
    expect(result.maxCapacity).toBe(3);
  });

  it('should reject when room is at full capacity', () => {
    const room = createTestPlacedRoom();
    const def = createTestRoomDef({ maxInhabitants: 2 });
    mockFloors = [{ rooms: [room], inhabitants: [] }];
    mockContent.set('room-type-crystal-mine', def);
    mockInhabitants = [
      createTestInhabitant({ instanceId: 'inst-001', assignedRoomId: 'room-001' }),
      createTestInhabitant({ instanceId: 'inst-002', assignedRoomId: 'room-001' }),
    ];

    const result = canAssignToRoom('room-001');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('maximum capacity');
    expect(result.currentCount).toBe(2);
    expect(result.maxCapacity).toBe(2);
  });

  it('should allow unlimited inhabitants when maxInhabitants is -1', () => {
    const room = createTestPlacedRoom();
    const def = createTestRoomDef({ maxInhabitants: -1 });
    mockFloors = [{ rooms: [room], inhabitants: [] }];
    mockContent.set('room-type-crystal-mine', def);
    mockInhabitants = Array.from({ length: 50 }, (_, i) =>
      createTestInhabitant({
        instanceId: `inst-${i}`,
        assignedRoomId: 'room-001',
      }),
    );

    const result = canAssignToRoom('room-001');
    expect(result.allowed).toBe(true);
    expect(result.currentCount).toBe(50);
    expect(result.maxCapacity).toBe(-1);
  });

  it('should use effective max from upgrades', () => {
    mockEffectiveMax = 4;
    const room = createTestPlacedRoom();
    const def = createTestRoomDef({ maxInhabitants: 2 });
    mockFloors = [{ rooms: [room], inhabitants: [] }];
    mockContent.set('room-type-crystal-mine', def);
    mockInhabitants = [
      createTestInhabitant({ instanceId: 'inst-001', assignedRoomId: 'room-001' }),
      createTestInhabitant({ instanceId: 'inst-002', assignedRoomId: 'room-001' }),
    ];

    const result = canAssignToRoom('room-001');
    expect(result.allowed).toBe(true);
    expect(result.currentCount).toBe(2);
    expect(result.maxCapacity).toBe(4);
  });
});

describe('getAssignmentCount', () => {
  beforeEach(() => {
    mockInhabitants = [];
    mockFloors = [];
    mockContent = new Map();
    mockEffectiveMax = undefined;
  });

  it('should return 0 for empty room', () => {
    mockInhabitants = [];
    expect(getAssignmentCount('room-001')).toBe(0);
  });

  it('should count only inhabitants assigned to the specified room', () => {
    mockInhabitants = [
      createTestInhabitant({ instanceId: 'inst-001', assignedRoomId: 'room-001' }),
      createTestInhabitant({ instanceId: 'inst-002', assignedRoomId: 'room-002' }),
      createTestInhabitant({ instanceId: 'inst-003', assignedRoomId: 'room-001' }),
      createTestInhabitant({ instanceId: 'inst-004', assignedRoomId: undefined }),
    ];
    expect(getAssignmentCount('room-001')).toBe(2);
  });
});

describe('isInhabitantAssigned', () => {
  beforeEach(() => {
    mockInhabitants = [];
    mockFloors = [];
    mockContent = new Map();
    mockEffectiveMax = undefined;
  });

  it('should return false for non-existent inhabitant', () => {
    mockInhabitants = [];
    expect(isInhabitantAssigned('nonexistent')).toBe(false);
  });

  it('should return false for unassigned inhabitant', () => {
    mockInhabitants = [
      createTestInhabitant({ instanceId: 'inst-001', assignedRoomId: undefined }),
    ];
    expect(isInhabitantAssigned('inst-001')).toBe(false);
  });

  it('should return true for assigned inhabitant', () => {
    mockInhabitants = [
      createTestInhabitant({ instanceId: 'inst-001', assignedRoomId: 'room-001' }),
    ];
    expect(isInhabitantAssigned('inst-001')).toBe(true);
  });
});

describe('getRoomAssignmentInfo', () => {
  beforeEach(() => {
    mockInhabitants = [];
    mockFloors = [];
    mockContent = new Map();
    mockEffectiveMax = undefined;
  });

  it('should return null for non-existent room', () => {
    mockFloors = [{ rooms: [], inhabitants: [] }];
    expect(getRoomAssignmentInfo('nonexistent')).toBeUndefined();
  });

  it('should return null for room that does not accept inhabitants', () => {
    const room = createTestPlacedRoom();
    const def = createTestRoomDef({ maxInhabitants: 0 });
    mockFloors = [{ rooms: [room], inhabitants: [] }];
    mockContent.set('room-type-crystal-mine', def);
    expect(getRoomAssignmentInfo('room-001')).toBeUndefined();
  });

  it('should return count and max for a valid room', () => {
    const room = createTestPlacedRoom();
    const def = createTestRoomDef({ maxInhabitants: 3 });
    mockFloors = [{ rooms: [room], inhabitants: [] }];
    mockContent.set('room-type-crystal-mine', def);
    mockInhabitants = [
      createTestInhabitant({ instanceId: 'inst-001', assignedRoomId: 'room-001' }),
    ];

    const info = getRoomAssignmentInfo('room-001');
    expect(info).toBeDefined();
    expect(info!.currentCount).toBe(1);
    expect(info!.maxCapacity).toBe(3);
  });

  it('should use effective max from upgrades', () => {
    mockEffectiveMax = 5;
    const room = createTestPlacedRoom();
    const def = createTestRoomDef({ maxInhabitants: 2 });
    mockFloors = [{ rooms: [room], inhabitants: [] }];
    mockContent.set('room-type-crystal-mine', def);
    mockInhabitants = [];

    const info = getRoomAssignmentInfo('room-001');
    expect(info).toBeDefined();
    expect(info!.currentCount).toBe(0);
    expect(info!.maxCapacity).toBe(5);
  });
});
