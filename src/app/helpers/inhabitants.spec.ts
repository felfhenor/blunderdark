import type {
  GameState,
  InhabitantId,
  InhabitantInstance,
  InhabitantInstanceId,
  PlacedRoom,
  PlacedRoomId,
  RoomDefinition,
  RoomId,
  RoomShapeId,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockInhabitants: InhabitantInstance[];
let mockEffectiveMax: number | undefined;

vi.mock('@helpers/state-game', () => {
  return {
    gamestate: () => ({
      world: { inhabitants: mockInhabitants },
    }),
    updateGamestate: vi.fn(async (fn: (state: GameState) => GameState) => {
      const fakeState = {
        world: { inhabitants: mockInhabitants },
      } as GameState;
      const result = fn(fakeState);
      mockInhabitants = result.world.inhabitants;
    }),
  };
});

vi.mock('@helpers/room-upgrades', () => ({
  roomUpgradeGetEffectiveMaxInhabitants: (
    _placedRoom: PlacedRoom,
    roomDef: RoomDefinition,
  ) => {
    if (mockEffectiveMax !== undefined) return mockEffectiveMax;
    return roomDef.maxInhabitants;
  },
}));

const {
  inhabitantAll,
  inhabitantGet,
  inhabitantAdd,
  inhabitantRemove,
  inhabitantSerialize,
  inhabitantDeserialize,
  inhabitantMeetsRestriction,
  inhabitantCanAssignToRoom,
  inhabitantGetEligible,
} = await import('@helpers/inhabitants');

function createTestInhabitant(
  overrides: Partial<InhabitantInstance> = {},
): InhabitantInstance {
  return {
    instanceId: 'inst-001' as InhabitantInstanceId,
    definitionId: '7f716f6e-3742-496b-8277-875c180b0d94' as InhabitantId,
    name: 'Goblin Worker',
    state: 'normal',
    assignedRoomId: undefined,
    trained: false,
    trainingProgress: 0,
    trainingBonuses: { defense: 0, attack: 0 },
    hungerTicksWithoutFood: 0,
    mutationBonuses: undefined,
    mutated: false,
    isHybrid: false,
    hybridParentIds: undefined,
    ...overrides,
  };
}

describe('inhabitant management', () => {
  beforeEach(() => {
    mockInhabitants = [];
    mockEffectiveMax = undefined;
  });

  it('should add an inhabitant', async () => {
    const goblin = createTestInhabitant();
    await inhabitantAdd(goblin);
    expect(mockInhabitants).toHaveLength(1);
    expect(mockInhabitants[0].name).toBe('Goblin Worker');
  });

  it('should remove an inhabitant by instanceId', async () => {
    mockInhabitants = [
      createTestInhabitant({ instanceId: 'inst-001' as InhabitantInstanceId }),
      createTestInhabitant({ instanceId: 'inst-002' as InhabitantInstanceId, name: 'Kobold Scout' }),
    ];
    await inhabitantRemove('inst-001');
    expect(mockInhabitants).toHaveLength(1);
    expect(mockInhabitants[0].instanceId).toBe('inst-002');
  });

  it('should get all inhabitants', () => {
    mockInhabitants = [
      createTestInhabitant({ instanceId: 'inst-001' as InhabitantInstanceId }),
      createTestInhabitant({ instanceId: 'inst-002' as InhabitantInstanceId }),
    ];
    const all = inhabitantAll();
    expect(all()).toHaveLength(2);
  });

  it('should get a specific inhabitant by instanceId', () => {
    mockInhabitants = [
      createTestInhabitant({ instanceId: 'inst-001' as InhabitantInstanceId, name: 'Goblin' }),
    ];
    const found = inhabitantGet('inst-001');
    expect(found()?.name).toBe('Goblin');
  });

  it('should return undefined for non-existent inhabitant', () => {
    mockInhabitants = [];
    const found = inhabitantGet('nonexistent');
    expect(found()).toBeUndefined();
  });
});

describe('inhabitant serialization', () => {
  it('should round-trip an inhabitant with all fields populated', () => {
    const original: InhabitantInstance = {
      instanceId: 'inst-001' as InhabitantInstanceId,
      definitionId: '7f716f6e-3742-496b-8277-875c180b0d94' as InhabitantId,
      name: 'Goblin Miner',
      state: 'scared',
      assignedRoomId: 'room-abc' as PlacedRoomId,
      trained: true,
      trainingProgress: 25,
      trainingBonuses: { defense: 1, attack: 0 },
      hungerTicksWithoutFood: 0,
      mutationBonuses: undefined,
      mutated: false,
      isHybrid: false,
      hybridParentIds: undefined,
    };

    const serialized = inhabitantSerialize([original]);
    const json = JSON.stringify(serialized);
    const parsed = JSON.parse(json) as InhabitantInstance[];
    const deserialized = inhabitantDeserialize(parsed);

    expect(deserialized).toHaveLength(1);
    expect(deserialized[0]).toEqual(original);
  });

  it('should round-trip multiple inhabitants', () => {
    const inhabitants: InhabitantInstance[] = [
      createTestInhabitant({ instanceId: 'inst-001' as InhabitantInstanceId, state: 'normal' }),
      createTestInhabitant({
        instanceId: 'inst-002' as InhabitantInstanceId,
        name: 'Skeleton Guard',
        state: 'hungry',
        assignedRoomId: 'room-xyz' as PlacedRoomId,
      }),
    ];

    const serialized = inhabitantSerialize(inhabitants);
    const json = JSON.stringify(serialized);
    const parsed = JSON.parse(json) as InhabitantInstance[];
    const deserialized = inhabitantDeserialize(parsed);

    expect(deserialized).toEqual(inhabitants);
  });

  it('should handle missing optional fields during deserialization', () => {
    const partial = [
      {
        instanceId: 'inst-001',
        definitionId: 'def-001',
        name: 'Old Goblin',
      },
    ] as unknown as InhabitantInstance[];

    const deserialized = inhabitantDeserialize(partial);

    expect(deserialized[0].state).toBe('normal');
    expect(deserialized[0].assignedRoomId).toBeUndefined();
  });

  it('should not mutate the original array during serialization', () => {
    const original = [createTestInhabitant()];
    const serialized = inhabitantSerialize(original);
    serialized[0].name = 'Modified';
    expect(original[0].name).toBe('Goblin Worker');
  });
});

// --- Test helpers for restriction tests ---

function createTestInhabitantDef(
  overrides: Partial<InhabitantContent> = {},
): InhabitantContent {
  return {
    id: 'def-goblin' as InhabitantId,
    __type: 'inhabitant',
    name: 'Goblin',
    type: 'creature',
    tier: 1,
    description: 'A common goblin',
    cost: {},
    stats: {
      hp: 10,
      attack: 2,
      defense: 1,
      speed: 3,
      workerEfficiency: 1.0,
    },
    traits: [],
    restrictionTags: [],
    rulerBonuses: {},
    rulerFearLevel: 0,
    ...overrides,
  };
}

function createTestRoomDef(
  overrides: Partial<RoomDefinition> = {},
): RoomDefinition {
  return {
    id: 'room-barracks' as RoomId,
    name: 'Barracks',
    description: 'A training room',
    shapeId: 'shape-2x2' as RoomShapeId,
    cost: {},
    production: {},
    requiresWorkers: false,
    adjacencyBonuses: [],
    isUnique: false,
    removable: true,
    maxInhabitants: -1,
    inhabitantRestriction: undefined,
    fearLevel: 0,
    fearReductionAura: 0,
    upgradePaths: [],
    autoPlace: false,
    ...overrides,
  };
}

describe('inhabitantMeetsRestriction', () => {
  it('should allow any inhabitant when restriction is null', () => {
    const def = createTestInhabitantDef();
    expect(inhabitantMeetsRestriction(def, undefined)).toBe(true);
  });

  it('should allow inhabitant with matching restriction tag', () => {
    const def = createTestInhabitantDef({ restrictionTags: ['unique'] });
    expect(inhabitantMeetsRestriction(def, 'unique')).toBe(true);
  });

  it('should reject inhabitant without matching restriction tag', () => {
    const def = createTestInhabitantDef({ restrictionTags: [] });
    expect(inhabitantMeetsRestriction(def, 'unique')).toBe(false);
  });

  it('should reject inhabitant with different restriction tags', () => {
    const def = createTestInhabitantDef({ restrictionTags: ['undead', 'elite'] });
    expect(inhabitantMeetsRestriction(def, 'unique')).toBe(false);
  });

  it('should allow inhabitant with multiple tags including the required one', () => {
    const def = createTestInhabitantDef({
      restrictionTags: ['dragon', 'unique', 'boss'],
    });
    expect(inhabitantMeetsRestriction(def, 'unique')).toBe(true);
  });
});

describe('inhabitantCanAssignToRoom', () => {
  it('should allow assignment to unrestricted room', () => {
    const def = createTestInhabitantDef();
    const room = createTestRoomDef();
    const result = inhabitantCanAssignToRoom(def, room, 0);
    expect(result.allowed).toBe(true);
  });

  it('should reject non-unique inhabitant from Throne Room', () => {
    const def = createTestInhabitantDef({ restrictionTags: [] });
    const room = createTestRoomDef({
      name: 'Throne Room',
      inhabitantRestriction: 'unique',
      maxInhabitants: 1,
    });
    const result = inhabitantCanAssignToRoom(def, room, 0);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('unique');
  });

  it('should allow unique inhabitant in Throne Room', () => {
    const def = createTestInhabitantDef({ restrictionTags: ['unique'] });
    const room = createTestRoomDef({
      name: 'Throne Room',
      inhabitantRestriction: 'unique',
      maxInhabitants: 1,
    });
    const result = inhabitantCanAssignToRoom(def, room, 0);
    expect(result.allowed).toBe(true);
  });

  it('should reject when room is at max capacity', () => {
    const def = createTestInhabitantDef({ restrictionTags: ['unique'] });
    const room = createTestRoomDef({
      inhabitantRestriction: 'unique',
      maxInhabitants: 1,
    });
    const result = inhabitantCanAssignToRoom(def, room, 1);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('maximum capacity');
  });

  it('should allow unlimited inhabitants when maxInhabitants is -1', () => {
    const def = createTestInhabitantDef();
    const room = createTestRoomDef({ maxInhabitants: -1 });
    const result = inhabitantCanAssignToRoom(def, room, 100);
    expect(result.allowed).toBe(true);
  });

  it('should check restriction before capacity', () => {
    const def = createTestInhabitantDef({ restrictionTags: [] });
    const room = createTestRoomDef({
      inhabitantRestriction: 'unique',
      maxInhabitants: 1,
    });
    const result = inhabitantCanAssignToRoom(def, room, 1);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('unique');
  });
});

describe('inhabitantGetEligible', () => {
  it('should return all inhabitants for unrestricted room', () => {
    const defs = [
      createTestInhabitantDef({ id: 'goblin' as InhabitantId }),
      createTestInhabitantDef({ id: 'skeleton' as InhabitantId, restrictionTags: ['unique'] }),
    ];
    const room = createTestRoomDef();
    expect(inhabitantGetEligible(defs, room)).toHaveLength(2);
  });

  it('should filter to only unique inhabitants for Throne Room', () => {
    const defs = [
      createTestInhabitantDef({ id: 'goblin' as InhabitantId, name: 'Goblin' }),
      createTestInhabitantDef({
        id: 'dragon' as InhabitantId,
        name: 'Dragon',
        restrictionTags: ['unique'],
      }),
      createTestInhabitantDef({ id: 'kobold' as InhabitantId, name: 'Kobold' }),
    ];
    const room = createTestRoomDef({ inhabitantRestriction: 'unique' });
    const eligible = inhabitantGetEligible(defs, room);
    expect(eligible).toHaveLength(1);
    expect(eligible[0].name).toBe('Dragon');
  });

  it('should return empty array when no inhabitants meet restriction', () => {
    const defs = [
      createTestInhabitantDef({ id: 'goblin' as InhabitantId }),
      createTestInhabitantDef({ id: 'kobold' as InhabitantId }),
    ];
    const room = createTestRoomDef({ inhabitantRestriction: 'unique' });
    expect(inhabitantGetEligible(defs, room)).toHaveLength(0);
  });

  it('should handle empty inhabitant list', () => {
    const room = createTestRoomDef({ inhabitantRestriction: 'unique' });
    expect(inhabitantGetEligible([], room)).toHaveLength(0);
  });
});

// --- PlacedRoom helpers for upgrade-aware tests ---

function createTestPlacedRoom(
  overrides: Partial<PlacedRoom> = {},
): PlacedRoom {
  return {
    id: 'placed-room-001' as PlacedRoomId,
    roomTypeId: 'room-crystal-mine' as RoomId,
    shapeId: 'shape-l' as RoomShapeId,
    anchorX: 5,
    anchorY: 5,
    ...overrides,
  };
}

describe('inhabitantCanAssignToRoom with PlacedRoom (upgrade-aware)', () => {
  it('should use base capacity when no PlacedRoom is provided', () => {
    const def = createTestInhabitantDef();
    const room = createTestRoomDef({ maxInhabitants: 2 });
    const result = inhabitantCanAssignToRoom(def, room, 2);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('maximum capacity');
  });

  it('should use effective capacity from PlacedRoom when provided', () => {
    mockEffectiveMax = 4;
    const def = createTestInhabitantDef();
    const room = createTestRoomDef({ maxInhabitants: 2 });
    const placed = createTestPlacedRoom();
    const result = inhabitantCanAssignToRoom(def, room, 2, placed);
    expect(result.allowed).toBe(true);
  });

  it('should reject when at effective capacity from upgrade', () => {
    mockEffectiveMax = 4;
    const def = createTestInhabitantDef();
    const room = createTestRoomDef({ maxInhabitants: 2 });
    const placed = createTestPlacedRoom();
    const result = inhabitantCanAssignToRoom(def, room, 4, placed);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('maximum capacity');
  });

  it('should still check restriction before capacity with PlacedRoom', () => {
    mockEffectiveMax = 4;
    const def = createTestInhabitantDef({ restrictionTags: [] });
    const room = createTestRoomDef({
      maxInhabitants: 2,
      inhabitantRestriction: 'unique',
    });
    const placed = createTestPlacedRoom();
    const result = inhabitantCanAssignToRoom(def, room, 0, placed);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('unique');
  });

  it('should allow unlimited with PlacedRoom when effective max is -1', () => {
    mockEffectiveMax = -1;
    const def = createTestInhabitantDef();
    const room = createTestRoomDef({ maxInhabitants: -1 });
    const placed = createTestPlacedRoom();
    const result = inhabitantCanAssignToRoom(def, room, 100, placed);
    expect(result.allowed).toBe(true);
  });
});
