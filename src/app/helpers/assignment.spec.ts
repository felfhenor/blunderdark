import type {
  GameState,
  InhabitantId,
  InhabitantInstance,
  InhabitantInstanceId,
  PlacedRoom,
  PlacedRoomId,
  RoomContent,
  RoomId,
  RoomShapeId,
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
  contentGetEntry: (id: string) => mockContent.get(id) ?? undefined,
}));

vi.mock('@helpers/room-upgrades', () => ({
  roomUpgradeGetEffectiveMaxInhabitants: (
    _placedRoom: PlacedRoom,
    roomDef: RoomContent,
  ) => {
    if (mockEffectiveMax !== undefined) return mockEffectiveMax;
    return roomDef.maxInhabitants;
  },
}));

const {
  assignmentCanAssignToRoom,
  assignmentGetCount,
  assignmentIsInhabitantAssigned,
  assignmentGetRoomInfo,
} = await import('@helpers/assignment');

function createTestPlacedRoom(
  overrides: Partial<PlacedRoom> = {},
): PlacedRoom {
  return {
    id: 'room-001' as PlacedRoomId,
    roomTypeId: 'room-type-crystal-mine' as RoomId,
    shapeId: 'shape-l' as RoomShapeId,
    anchorX: 5,
    anchorY: 5,
    ...overrides,
  };
}

function createTestRoomDef(
  overrides: Partial<RoomContent> = {},
): RoomContent {
  return {
    id: 'room-type-crystal-mine' as RoomId,
    name: 'Crystal Mine',
    description: 'A mine',
    shapeId: 'shape-l' as RoomShapeId,
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
  } as RoomContent;
}

function createTestInhabitant(
  overrides: Partial<InhabitantInstance> = {},
): InhabitantInstance {
  return {
    instanceId: 'inst-001' as InhabitantInstanceId,
    definitionId: 'def-goblin' as InhabitantId,
    name: 'Goblin Worker',
    state: 'normal',
    assignedRoomId: undefined,
    ...overrides,
  };
}

describe('assignmentCanAssignToRoom', () => {
  beforeEach(() => {
    mockInhabitants = [];
    mockFloors = [];
    mockContent = new Map();
    mockEffectiveMax = undefined;
  });

  it('should return not allowed when room is not found', () => {
    mockFloors = [{ rooms: [], inhabitants: [] }];
    const result = assignmentCanAssignToRoom('nonexistent' as PlacedRoomId);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not found');
  });

  it('should return not allowed when room type is unknown', () => {
    const room = createTestPlacedRoom();
    mockFloors = [{ rooms: [room], inhabitants: [] }];
    // No content registered
    const result = assignmentCanAssignToRoom('room-001' as PlacedRoomId);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Unknown room type');
  });

  it('should return not allowed when room does not accept inhabitants (maxInhabitants=0)', () => {
    const room = createTestPlacedRoom();
    const def = createTestRoomDef({ maxInhabitants: 0 });
    mockFloors = [{ rooms: [room], inhabitants: [] }];
    mockContent.set('room-type-crystal-mine', def);

    const result = assignmentCanAssignToRoom('room-001' as PlacedRoomId);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('does not accept inhabitants');
  });

  it('should allow assignment when room is empty (0 assigned)', () => {
    const room = createTestPlacedRoom();
    const def = createTestRoomDef({ maxInhabitants: 2 });
    mockFloors = [{ rooms: [room], inhabitants: [] }];
    mockContent.set('room-type-crystal-mine', def);
    mockInhabitants = [];

    const result = assignmentCanAssignToRoom('room-001' as PlacedRoomId);
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
      createTestInhabitant({ instanceId: 'inst-001' as InhabitantInstanceId, assignedRoomId: 'room-001' as PlacedRoomId }),
    ];

    const result = assignmentCanAssignToRoom('room-001' as PlacedRoomId);
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
      createTestInhabitant({ instanceId: 'inst-001' as InhabitantInstanceId, assignedRoomId: 'room-001' as PlacedRoomId }),
      createTestInhabitant({ instanceId: 'inst-002' as InhabitantInstanceId, assignedRoomId: 'room-001' as PlacedRoomId }),
    ];

    const result = assignmentCanAssignToRoom('room-001' as PlacedRoomId);
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
        instanceId: `inst-${i}` as InhabitantInstanceId,
        assignedRoomId: 'room-001' as PlacedRoomId,
      }),
    );

    const result = assignmentCanAssignToRoom('room-001' as PlacedRoomId);
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
      createTestInhabitant({ instanceId: 'inst-001' as InhabitantInstanceId, assignedRoomId: 'room-001' as PlacedRoomId }),
      createTestInhabitant({ instanceId: 'inst-002' as InhabitantInstanceId, assignedRoomId: 'room-001' as PlacedRoomId }),
    ];

    const result = assignmentCanAssignToRoom('room-001' as PlacedRoomId);
    expect(result.allowed).toBe(true);
    expect(result.currentCount).toBe(2);
    expect(result.maxCapacity).toBe(4);
  });
});

describe('assignmentGetCount', () => {
  beforeEach(() => {
    mockInhabitants = [];
    mockFloors = [];
    mockContent = new Map();
    mockEffectiveMax = undefined;
  });

  it('should return 0 for empty room', () => {
    mockInhabitants = [];
    expect(assignmentGetCount('room-001' as PlacedRoomId)).toBe(0);
  });

  it('should count only inhabitants assigned to the specified room', () => {
    mockInhabitants = [
      createTestInhabitant({ instanceId: 'inst-001' as InhabitantInstanceId, assignedRoomId: 'room-001' as PlacedRoomId }),
      createTestInhabitant({ instanceId: 'inst-002' as InhabitantInstanceId, assignedRoomId: 'room-002' as PlacedRoomId }),
      createTestInhabitant({ instanceId: 'inst-003' as InhabitantInstanceId, assignedRoomId: 'room-001' as PlacedRoomId }),
      createTestInhabitant({ instanceId: 'inst-004' as InhabitantInstanceId, assignedRoomId: undefined }),
    ];
    expect(assignmentGetCount('room-001' as PlacedRoomId)).toBe(2);
  });
});

describe('assignmentIsInhabitantAssigned', () => {
  beforeEach(() => {
    mockInhabitants = [];
    mockFloors = [];
    mockContent = new Map();
    mockEffectiveMax = undefined;
  });

  it('should return false for non-existent inhabitant', () => {
    mockInhabitants = [];
    expect(assignmentIsInhabitantAssigned('nonexistent')).toBe(false);
  });

  it('should return false for unassigned inhabitant', () => {
    mockInhabitants = [
      createTestInhabitant({ instanceId: 'inst-001' as InhabitantInstanceId, assignedRoomId: undefined }),
    ];
    expect(assignmentIsInhabitantAssigned('inst-001')).toBe(false);
  });

  it('should return true for assigned inhabitant', () => {
    mockInhabitants = [
      createTestInhabitant({ instanceId: 'inst-001' as InhabitantInstanceId, assignedRoomId: 'room-001' as PlacedRoomId }),
    ];
    expect(assignmentIsInhabitantAssigned('inst-001')).toBe(true);
  });
});

describe('assignmentGetRoomInfo', () => {
  beforeEach(() => {
    mockInhabitants = [];
    mockFloors = [];
    mockContent = new Map();
    mockEffectiveMax = undefined;
  });

  it('should return null for non-existent room', () => {
    mockFloors = [{ rooms: [], inhabitants: [] }];
    expect(assignmentGetRoomInfo('nonexistent' as PlacedRoomId)).toBeUndefined();
  });

  it('should return null for room that does not accept inhabitants', () => {
    const room = createTestPlacedRoom();
    const def = createTestRoomDef({ maxInhabitants: 0 });
    mockFloors = [{ rooms: [room], inhabitants: [] }];
    mockContent.set('room-type-crystal-mine', def);
    expect(assignmentGetRoomInfo('room-001' as PlacedRoomId)).toBeUndefined();
  });

  it('should return count and max for a valid room', () => {
    const room = createTestPlacedRoom();
    const def = createTestRoomDef({ maxInhabitants: 3 });
    mockFloors = [{ rooms: [room], inhabitants: [] }];
    mockContent.set('room-type-crystal-mine', def);
    mockInhabitants = [
      createTestInhabitant({ instanceId: 'inst-001' as InhabitantInstanceId, assignedRoomId: 'room-001' as PlacedRoomId }),
    ];

    const info = assignmentGetRoomInfo('room-001' as PlacedRoomId);
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

    const info = assignmentGetRoomInfo('room-001' as PlacedRoomId);
    expect(info).toBeDefined();
    expect(info!.currentCount).toBe(0);
    expect(info!.maxCapacity).toBe(5);
  });
});
