import type {
  Floor,
  FloorId,
  GameId,
  GameState,
  GridState,
  InhabitantId,
  InhabitantInstance,
  InhabitantInstanceId,
  PlacedRoom,
  PlacedRoomId,
  RoomContent,
  RoomId,
  RoomShapeId,
  RoomUpgradeContent,
  RoomUpgradeId,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Constants ---

const SPAWNING_POOL_ID = 'aa100001-0001-0001-0001-000000000099';
const GOBLIN_DEF_ID = 'aa200001-0001-0001-0001-000000000001';
const SKELETON_DEF_ID = 'aa200001-0001-0001-0001-000000000002';
const KOBOLD_DEF_ID = 'aa200001-0001-0001-0001-000000000003';
const IMP_DEF_ID = 'aa200001-0001-0001-0001-000000000004';
const POOL_ROOM_ID = 'pool-1' as PlacedRoomId;

// --- Upgrade paths ---

const rapidSpawningPath: RoomUpgradeContent = {
  id: 'upgrade-rapid-spawning' as RoomUpgradeId,
  __type: 'roomupgrade',
  name: 'Rapid Spawning',
  description: 'Faster spawns and higher capacity.',
  cost: { gold: 100, crystals: 50 },
  effects: [
    { type: 'spawnRateReduction', value: 10 },
    { type: 'spawnCapacityBonus', value: 5 },
    { type: 'maxInhabitantBonus', value: 2 },
  ],
};

const darkSpawningPath: RoomUpgradeContent = {
  id: 'upgrade-dark-spawning' as RoomUpgradeId,
  __type: 'roomupgrade',
  name: 'Dark Spawning',
  description: 'Spawn Skeletons instead.',
  cost: { gold: 120, crystals: 60, essence: 20 },
  effects: [
    { type: 'spawnTypeChange', value: 1 },
    { type: 'fearIncrease', value: 2 },
  ],
};

// --- Mock content ---

const mockContent = new Map<string, unknown>();
let mockMaxInhabitantCount = 999;

vi.mock('@helpers/content', () => ({
  contentGetEntry: (id: string) => mockContent.get(id) ?? undefined,
  contentGetEntriesByType: () => mockContent.get('__allInhabitants') ?? [],
  getEntries: vi.fn(),
  contentAllIdsByName: vi.fn(() => new Map()),
}));

vi.mock('@helpers/room-roles', () => ({
  roomRoleFindById: vi.fn((role: string) => {
    if (role === 'spawningPool') return SPAWNING_POOL_ID;
    return undefined;
  }),
  roomRoleResetCache: vi.fn(),
}));

vi.mock('@helpers/rng', () => ({
  rngChoice: vi.fn((arr: unknown[]) => arr[0]),
  rngUuid: vi.fn(() => 'mock-uuid-0001'),
}));

vi.mock('@helpers/inhabitant-names', () => ({
  generateInhabitantName: () => 'Test Fantasy Name',
}));

vi.mock('@helpers/recruitment', () => ({
  recruitmentMaxInhabitantCount: vi.fn(() => mockMaxInhabitantCount),
}));

// --- Definitions ---

const goblinDef: InhabitantContent = {
  id: GOBLIN_DEF_ID as InhabitantId,
  name: 'Goblin',
  __type: 'inhabitant',
  type: 'minion',
  tier: 1,
  description: 'A small goblin.',
  cost: {},
  stats: { hp: 10, attack: 3, defense: 2, speed: 4, workerEfficiency: 1.0 },
  traits: [],
  restrictionTags: [],
  rulerBonuses: {},
  rulerFearLevel: 0,
  fearModifier: 0,
  fearPropagationDistance: 1,
  foodConsumptionRate: 1,
  corruptionGeneration: 0,
};

const koboldDef: InhabitantContent = {
  id: KOBOLD_DEF_ID as InhabitantId,
  name: 'Kobold',
  __type: 'inhabitant',
  type: 'minion',
  tier: 1,
  description: 'A sneaky kobold.',
  cost: {},
  stats: { hp: 8, attack: 2, defense: 1, speed: 5, workerEfficiency: 1.2 },
  traits: [],
  restrictionTags: [],
  rulerBonuses: {},
  rulerFearLevel: 0,
  fearModifier: 0,
  fearPropagationDistance: 1,
  foodConsumptionRate: 1,
  corruptionGeneration: 0,
};

const impDef: InhabitantContent = {
  id: IMP_DEF_ID as InhabitantId,
  name: 'Imp',
  __type: 'inhabitant',
  type: 'minion',
  tier: 2,
  description: 'A mischievous imp.',
  cost: {},
  stats: { hp: 12, attack: 5, defense: 3, speed: 6, workerEfficiency: 0.9 },
  traits: [],
  restrictionTags: [],
  rulerBonuses: {},
  rulerFearLevel: 0,
  fearModifier: 0,
  fearPropagationDistance: 1,
  foodConsumptionRate: 1,
  corruptionGeneration: 0,
};

const skeletonDef: InhabitantContent = {
  id: SKELETON_DEF_ID as InhabitantId,
  name: 'Skeleton',
  __type: 'inhabitant',
  type: 'undead',
  tier: 1,
  description: 'An undead skeleton.',
  cost: {},
  stats: { hp: 15, attack: 4, defense: 3, speed: 2, workerEfficiency: 0.8 },
  traits: [],
  restrictionTags: [],
  rulerBonuses: {},
  rulerFearLevel: 0,
  fearModifier: 0,
  fearPropagationDistance: 1,
  foodConsumptionRate: 0,
  corruptionGeneration: 1,
};

const spawningPoolDef: RoomContent = {
  id: SPAWNING_POOL_ID as RoomId,
  name: 'Spawning Pool',
  __type: 'room',
  description: 'A bubbling pool of ooze.',
  shapeId: 'shape-2x2' as RoomShapeId,
  cost: { gold: 80, crystals: 30 },
  production: {},
  requiresWorkers: false,
  maxInhabitants: 2,
  inhabitantRestriction: undefined,
  fearLevel: 1,
  fearReductionAura: 0,
  adjacencyBonuses: [],
  isUnique: false,
  removable: true,
  autoPlace: false,
  roomUpgradeIds: [
    'upgrade-rapid-spawning' as RoomUpgradeId,
    'upgrade-dark-spawning' as RoomUpgradeId,
  ],
  role: 'spawningPool',
  spawnRate: 25,
  spawnCapacity: 10,
};

// --- Helpers ---

function makeRoom(overrides: Partial<PlacedRoom> = {}): PlacedRoom {
  return {
    id: POOL_ROOM_ID,
    roomTypeId: SPAWNING_POOL_ID as RoomId,
    shapeId: 'shape-2x2' as RoomShapeId,
    anchorX: 0,
    anchorY: 0,
    ...overrides,
  };
}

function makeInhabitant(
  overrides: Partial<InhabitantInstance> = {},
): InhabitantInstance {
  return {
    instanceId: 'inh-1' as InhabitantInstanceId,
    definitionId: GOBLIN_DEF_ID as InhabitantId,
    name: 'Goblin the Bold',
    state: 'normal',
    assignedRoomId: undefined,
    hungerTicksWithoutFood: 0,
    ...overrides,
  };
}

function makeWorker(
  id: string,
  roomId: PlacedRoomId = POOL_ROOM_ID,
): InhabitantInstance {
  return makeInhabitant({
    instanceId: id as InhabitantInstanceId,
    assignedRoomId: roomId,
  });
}

function makeFloor(
  rooms: PlacedRoom[] = [],
  inhabitants: InhabitantInstance[] = [],
): Floor {
  return {
    id: 'floor-1' as FloorId,
    name: 'Floor 1',
    depth: 1,
    biome: 'neutral',
    grid: { tiles: [] } as unknown as GridState,
    rooms,
    hallways: [],
    inhabitants,
    connections: [],
    traps: [],
  };
}

function makeGameState(overrides: {
  floors?: Floor[];
  inhabitants?: InhabitantInstance[];
}): GameState {
  const inhabitants = overrides.inhabitants ?? [];
  return {
    meta: { version: 1, isSetup: true, isPaused: false, createdAt: 0 },
    gameId: 'test-game' as GameId,
    clock: { numTicks: 0, lastSaveTick: 0, day: 1, hour: 0, minute: 0 },
    world: {
      grid: [] as unknown as GridState,
      resources: {
        crystals: { current: 100, max: 500 },
        food: { current: 100, max: 500 },
        gold: { current: 200, max: 1000 },
        flux: { current: 50, max: 200 },
        research: { current: 0, max: 300 },
        essence: { current: 50, max: 200 },
        corruption: { current: 0, max: 100 },
      },
      inhabitants,
      hallways: [],
      season: {
        currentSeason: 'growth',
        dayInSeason: 1,
        totalSeasonCycles: 0,
      },
      research: {
        completedNodes: [],
        activeResearch: undefined,
        activeResearchProgress: 0,
        activeResearchStartTick: 0,
        unlockedContent: {
          rooms: [],
          inhabitants: [],
          abilities: [],
          upgrades: [],
          passiveBonuses: [],
        },
      },
      reputation: { terror: 0, wealth: 0, knowledge: 0, harmony: 0, chaos: 0 },
      floors: overrides.floors ?? [makeFloor()],
      currentFloorIndex: 0,
      trapInventory: [],
      forgeInventory: [],
      alchemyConversions: [],
      prisoners: [],
      traitRunes: [],
      interrogationBuffs: [],
      invasionSchedule: {
        nextInvasionDay: undefined,
        nextInvasionVariance: 0,
        gracePeriodEnd: 10,
        invasionHistory: [],
        pendingSpecialInvasions: [],
        warningActive: false,
        warningDismissed: false,
      },
      corruptionEffects: {
        firedOneTimeEffects: [],
        lastIntervalValues: {},
        lastTriggerTimes: {},
        retriggeredEffects: {},
      },
      stairs: [],
      elevators: [],
      portals: [],
      victoryProgress: {
        consecutivePeacefulDays: 0,
        lastPeacefulCheckDay: 0,
        consecutiveZeroCorruptionDays: 0,
        lastZeroCorruptionCheckDay: 0,
        totalInvasionDefenseWins: 0,
      },
      merchant: {
        isPresent: false,
        arrivalDay: 0,
        departureDayRemaining: 0,
        inventory: [],
      },
    },
  };
}

// --- Import after mocks ---

import {
  SPAWNING_POOL_DEFAULT_CAPACITY,
  SPAWNING_POOL_DEFAULT_RATE,
  spawningPoolCountUnassigned,
  spawningPoolCreateInhabitant,
  spawningPoolGetEffectiveCapacity,
  spawningPoolGetEffectiveRate,
  spawningPoolGetWorkerCount,
  spawningPoolPickSpawnDefinition,
  spawningPoolProcess,
} from '@helpers/spawning-pool';

// --- Setup ---

beforeEach(() => {
  mockContent.clear();
  mockContent.set(SPAWNING_POOL_ID, spawningPoolDef);
  mockContent.set('Goblin', goblinDef);
  mockContent.set('Skeleton', skeletonDef);
  mockContent.set(rapidSpawningPath.id, rapidSpawningPath);
  mockContent.set(darkSpawningPath.id, darkSpawningPath);
  // Default tier-1 non-undead pool for random selection
  mockContent.set('__allInhabitants', [goblinDef, koboldDef, impDef, skeletonDef]);
  mockMaxInhabitantCount = 999;
});

// --- Tests ---

describe('Spawning Pool Room Definition', () => {
  it('should have correct definition properties', () => {
    expect(spawningPoolDef.spawnRate).toBe(25);
    expect(spawningPoolDef.spawnCapacity).toBe(10);
    expect(spawningPoolDef.maxInhabitants).toBe(2);
    expect(spawningPoolDef.shapeId).toBe('shape-2x2');
    expect(spawningPoolDef.role).toBe('spawningPool');
  });
});

describe('spawningPoolGetEffectiveRate', () => {
  it('should return base rate when no upgrade applied', () => {
    const room = makeRoom();
    expect(spawningPoolGetEffectiveRate(room, 25)).toBe(25);
  });

  it('should reduce rate with Rapid Spawning upgrade', () => {
    const room = makeRoom({
      appliedUpgradePathId: 'upgrade-rapid-spawning' as RoomUpgradeId,
    });
    // base 25 - spawnRateReduction 10 = 15
    expect(spawningPoolGetEffectiveRate(room, 25)).toBe(15);
  });

  it('should clamp rate to minimum of 1', () => {
    const room = makeRoom({
      appliedUpgradePathId: 'upgrade-rapid-spawning' as RoomUpgradeId,
    });
    // base 5 - reduction 10 = -5, clamped to 1
    expect(spawningPoolGetEffectiveRate(room, 5)).toBe(1);
  });
});

describe('spawningPoolGetEffectiveCapacity', () => {
  it('should return base capacity when no upgrade applied', () => {
    const room = makeRoom();
    expect(spawningPoolGetEffectiveCapacity(room, 10)).toBe(10);
  });

  it('should increase capacity with Rapid Spawning upgrade', () => {
    const room = makeRoom({
      appliedUpgradePathId: 'upgrade-rapid-spawning' as RoomUpgradeId,
    });
    // base 10 + spawnCapacityBonus 5 = 15
    expect(spawningPoolGetEffectiveCapacity(room, 10)).toBe(15);
  });
});

describe('spawningPoolPickSpawnDefinition', () => {
  it('should return a tier-1 non-undead creature by default', () => {
    const room = makeRoom();
    const def = spawningPoolPickSpawnDefinition(room);
    expect(def).toBeDefined();
    expect(def!.tier).toBe(1);
    expect(def!.type).not.toBe('undead');
  });

  it('should return Skeleton with Dark Spawning upgrade', () => {
    const room = makeRoom({
      appliedUpgradePathId: 'upgrade-dark-spawning' as RoomUpgradeId,
    });
    const def = spawningPoolPickSpawnDefinition(room);
    expect(def).toBeDefined();
    expect(def!.name).toBe('Skeleton');
  });

  it('should not include tier-2 creatures in pool', () => {
    // impDef is tier 2, should be excluded
    const room = makeRoom();
    const def = spawningPoolPickSpawnDefinition(room);
    expect(def!.tier).toBe(1);
  });

  it('should not include undead creatures in pool', () => {
    // skeletonDef is undead, should be excluded from non-Dark-Pool picks
    const room = makeRoom();
    const def = spawningPoolPickSpawnDefinition(room);
    expect(def!.type).not.toBe('undead');
  });

  it('should return undefined when no tier-1 non-undead creatures exist', () => {
    mockContent.set('__allInhabitants', [skeletonDef, impDef]);
    const room = makeRoom();
    const def = spawningPoolPickSpawnDefinition(room);
    expect(def).toBeUndefined();
  });
});

describe('spawningPoolGetWorkerCount', () => {
  it('should return 0 when no inhabitants are assigned', () => {
    expect(spawningPoolGetWorkerCount(POOL_ROOM_ID, [])).toBe(0);
  });

  it('should count inhabitants assigned to the room', () => {
    const inhabitants = [
      makeWorker('w1'),
      makeWorker('w2'),
      makeInhabitant({ instanceId: 'other' as InhabitantInstanceId }),
    ];
    expect(spawningPoolGetWorkerCount(POOL_ROOM_ID, inhabitants)).toBe(2);
  });

  it('should exclude inhabitants still traveling', () => {
    const inhabitants = [
      makeWorker('w1'),
      makeInhabitant({
        instanceId: 'w2' as InhabitantInstanceId,
        assignedRoomId: POOL_ROOM_ID,
        travelTicksRemaining: 50,
      }),
    ];
    expect(spawningPoolGetWorkerCount(POOL_ROOM_ID, inhabitants)).toBe(1);
  });

  it('should count inhabitants with zero travelTicksRemaining', () => {
    const inhabitants = [
      makeInhabitant({
        instanceId: 'w1' as InhabitantInstanceId,
        assignedRoomId: POOL_ROOM_ID,
        travelTicksRemaining: 0,
      }),
    ];
    expect(spawningPoolGetWorkerCount(POOL_ROOM_ID, inhabitants)).toBe(1);
  });
});

describe('spawningPoolCountUnassigned', () => {
  it('should return 0 for empty list', () => {
    expect(spawningPoolCountUnassigned([])).toBe(0);
  });

  it('should count only unassigned inhabitants', () => {
    const inhabitants = [
      makeInhabitant({
        instanceId: 'a' as InhabitantInstanceId,
        assignedRoomId: undefined,
      }),
      makeInhabitant({
        instanceId: 'b' as InhabitantInstanceId,
        assignedRoomId: 'room-1' as PlacedRoomId,
      }),
      makeInhabitant({
        instanceId: 'c' as InhabitantInstanceId,
        assignedRoomId: undefined,
      }),
    ];
    expect(spawningPoolCountUnassigned(inhabitants)).toBe(2);
  });

  it('should return 0 when all assigned', () => {
    const inhabitants = [
      makeInhabitant({
        instanceId: 'a' as InhabitantInstanceId,
        assignedRoomId: 'room-1' as PlacedRoomId,
      }),
      makeInhabitant({
        instanceId: 'b' as InhabitantInstanceId,
        assignedRoomId: 'room-2' as PlacedRoomId,
      }),
    ];
    expect(spawningPoolCountUnassigned(inhabitants)).toBe(0);
  });
});

describe('spawningPoolCreateInhabitant', () => {
  it('should create inhabitant with correct definition id', () => {
    const inhabitant = spawningPoolCreateInhabitant(goblinDef);
    expect(inhabitant.definitionId).toBe(GOBLIN_DEF_ID);
  });

  it('should generate a unique instance id', () => {
    const inhabitant = spawningPoolCreateInhabitant(goblinDef);
    expect(inhabitant.instanceId).toBe('mock-uuid-0001');
  });

  it('should create a fantasy name', () => {
    const inhabitant = spawningPoolCreateInhabitant(goblinDef);
    expect(inhabitant.name).toBe('Test Fantasy Name');
  });

  it('should start in normal state with no assignment', () => {
    const inhabitant = spawningPoolCreateInhabitant(goblinDef);
    expect(inhabitant.state).toBe('normal');
    expect(inhabitant.assignedRoomId).toBeUndefined();
  });

  it('should start with no training traits or progress', () => {
    const inhabitant = spawningPoolCreateInhabitant(goblinDef);
    expect(inhabitant.instanceTraitIds).toBeUndefined();
    expect(inhabitant.trainingProgress).toBeUndefined();
  });

  it('should start with zero hunger ticks', () => {
    const inhabitant = spawningPoolCreateInhabitant(goblinDef);
    expect(inhabitant.hungerTicksWithoutFood).toBe(0);
  });
});

describe('spawningPoolProcess', () => {
  it('should initialize spawn timer on first tick', () => {
    const room = makeRoom({ spawnTicksRemaining: undefined });
    const worker = makeWorker('w1');
    const floor = makeFloor([room], [worker]);
    const state = makeGameState({ floors: [floor], inhabitants: [worker] });

    spawningPoolProcess(state);

    // Timer initialized to effective rate (25/1 worker = 25), then decremented by 1 = 24
    expect(state.world.floors[0].rooms[0].spawnTicksRemaining).toBe(24);
  });

  it('should decrement spawn timer each tick', () => {
    const room = makeRoom({ spawnTicksRemaining: 20 });
    const worker = makeWorker('w1');
    const floor = makeFloor([room], [worker]);
    const state = makeGameState({ floors: [floor], inhabitants: [worker] });

    spawningPoolProcess(state);

    expect(state.world.floors[0].rooms[0].spawnTicksRemaining).toBe(19);
  });

  it('should spawn inhabitant when timer reaches 0', () => {
    const room = makeRoom({ spawnTicksRemaining: 1 });
    const worker = makeWorker('w1');
    const floor = makeFloor([room], [worker]);
    const state = makeGameState({ floors: [floor], inhabitants: [worker] });

    spawningPoolProcess(state);

    // 1 original worker + 1 spawned
    expect(state.world.inhabitants).toHaveLength(2);
    expect(state.world.inhabitants[1].definitionId).toBe(GOBLIN_DEF_ID);
    expect(state.world.inhabitants[1].name).toBe('Test Fantasy Name');
  });

  it('should reset timer after spawning', () => {
    const room = makeRoom({ spawnTicksRemaining: 1 });
    const worker = makeWorker('w1');
    const floor = makeFloor([room], [worker]);
    const state = makeGameState({ floors: [floor], inhabitants: [worker] });

    spawningPoolProcess(state);

    // Timer reset to effective rate (25)
    expect(state.world.floors[0].rooms[0].spawnTicksRemaining).toBe(25);
  });

  it('should not spawn when unassigned count reaches capacity', () => {
    const room = makeRoom({ spawnTicksRemaining: 1 });
    const worker = makeWorker('w1');
    // Fill with 10 unassigned inhabitants (capacity = 10)
    const unassigned = Array.from({ length: 10 }, (_, i) =>
      makeInhabitant({
        instanceId: `inh-${i}` as InhabitantInstanceId,
        assignedRoomId: undefined,
      }),
    );
    const inhabitants = [worker, ...unassigned];
    const floor = makeFloor([room], inhabitants);
    const state = makeGameState({ floors: [floor], inhabitants });

    spawningPoolProcess(state);

    // Still 11 (1 worker + 10 unassigned) - no new spawn
    expect(state.world.inhabitants).toHaveLength(11);
  });

  it('should spawn when assigned inhabitants do not count against capacity', () => {
    const room = makeRoom({ spawnTicksRemaining: 1 });
    const worker = makeWorker('w1');
    // 9 unassigned + 5 assigned elsewhere = 14 total, but only 9 unassigned < 10 capacity
    const unassigned = Array.from({ length: 9 }, (_, i) =>
      makeInhabitant({
        instanceId: `un-${i}` as InhabitantInstanceId,
        assignedRoomId: undefined,
      }),
    );
    const assigned = Array.from({ length: 5 }, (_, i) =>
      makeInhabitant({
        instanceId: `as-${i}` as InhabitantInstanceId,
        assignedRoomId: 'some-room' as PlacedRoomId,
      }),
    );
    const inhabitants = [worker, ...unassigned, ...assigned];
    const floor = makeFloor([room], inhabitants);
    const state = makeGameState({ floors: [floor], inhabitants });

    spawningPoolProcess(state);

    // 1 worker + 9 unassigned + 5 assigned + 1 spawned = 16
    expect(state.world.inhabitants).toHaveLength(16);
  });

  it('should sync floor inhabitants after spawning', () => {
    const room = makeRoom({ spawnTicksRemaining: 1 });
    const worker = makeWorker('w1');
    const floor = makeFloor([room], [worker]);
    const state = makeGameState({ floors: [floor], inhabitants: [worker] });

    spawningPoolProcess(state);

    // Floor inhabitants should be synced with world inhabitants
    expect(state.world.floors[0].inhabitants).toEqual(state.world.inhabitants);
  });

  it('should not process rooms that are not spawning pools', () => {
    const otherRoom: PlacedRoom = {
      id: 'other-room' as PlacedRoomId,
      roomTypeId: 'other-type' as RoomId,
      shapeId: 'shape-2x2' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
      spawnTicksRemaining: 1,
    };
    const worker = makeWorker('w1', 'other-room' as PlacedRoomId);
    const floor = makeFloor([otherRoom], [worker]);
    const state = makeGameState({ floors: [floor], inhabitants: [worker] });

    spawningPoolProcess(state);

    expect(state.world.inhabitants).toHaveLength(1);
  });

  it('should process multiple spawning pools across floors', () => {
    const pool1 = makeRoom({
      id: 'pool-1' as PlacedRoomId,
      spawnTicksRemaining: 1,
    });
    const pool2 = makeRoom({
      id: 'pool-2' as PlacedRoomId,
      spawnTicksRemaining: 1,
    });
    const worker1 = makeWorker('w1', 'pool-1' as PlacedRoomId);
    const worker2 = makeWorker('w2', 'pool-2' as PlacedRoomId);
    const floor1 = makeFloor([pool1], [worker1]);
    const floor2 = makeFloor([pool2], [worker2]);
    floor2.id = 'floor-2' as FloorId;
    const state = makeGameState({
      floors: [floor1, floor2],
      inhabitants: [worker1, worker2],
    });

    spawningPoolProcess(state);

    // Both pools should spawn (2 workers + 2 spawned = 4)
    expect(state.world.inhabitants).toHaveLength(4);
  });

  it('should use reduced spawn rate with Rapid Spawning upgrade', () => {
    const room = makeRoom({
      spawnTicksRemaining: undefined,
      appliedUpgradePathId: 'upgrade-rapid-spawning' as RoomUpgradeId,
    });
    const worker = makeWorker('w1');
    const floor = makeFloor([room], [worker]);
    const state = makeGameState({ floors: [floor], inhabitants: [worker] });

    spawningPoolProcess(state);

    // Effective rate: 25 - 10 = 15, initialized and decremented: 14
    expect(state.world.floors[0].rooms[0].spawnTicksRemaining).toBe(14);
  });

  it('should use increased capacity with Rapid Spawning upgrade', () => {
    const room = makeRoom({
      spawnTicksRemaining: 1,
      appliedUpgradePathId: 'upgrade-rapid-spawning' as RoomUpgradeId,
    });
    const worker = makeWorker('w1');
    // 10 unassigned - at base capacity but below upgraded capacity (15)
    const unassigned = Array.from({ length: 10 }, (_, i) =>
      makeInhabitant({
        instanceId: `inh-${i}` as InhabitantInstanceId,
        assignedRoomId: undefined,
      }),
    );
    const inhabitants = [worker, ...unassigned];
    const floor = makeFloor([room], inhabitants);
    const state = makeGameState({ floors: [floor], inhabitants });

    spawningPoolProcess(state);

    // Should spawn since 10 < 15 (upgraded capacity): 1 worker + 10 + 1 = 12
    expect(state.world.inhabitants).toHaveLength(12);
  });

  it('should spawn Skeletons with Dark Spawning upgrade', () => {
    const room = makeRoom({
      spawnTicksRemaining: 1,
      appliedUpgradePathId: 'upgrade-dark-spawning' as RoomUpgradeId,
    });
    const worker = makeWorker('w1');
    const floor = makeFloor([room], [worker]);
    const state = makeGameState({ floors: [floor], inhabitants: [worker] });

    spawningPoolProcess(state);

    // 1 worker + 1 spawned
    expect(state.world.inhabitants).toHaveLength(2);
    expect(state.world.inhabitants[1].definitionId).toBe(SKELETON_DEF_ID);
    expect(state.world.inhabitants[1].name).toBe('Test Fantasy Name');
  });

  it('should use default rate when room def has no spawnRate', () => {
    // Override content with a room def missing spawnRate
    const defNoRate = { ...spawningPoolDef, spawnRate: undefined };
    mockContent.set(SPAWNING_POOL_ID, defNoRate);

    const room = makeRoom({ spawnTicksRemaining: undefined });
    const worker = makeWorker('w1');
    const floor = makeFloor([room], [worker]);
    const state = makeGameState({ floors: [floor], inhabitants: [worker] });

    spawningPoolProcess(state);

    // Default rate: GAME_TIME_TICKS_PER_MINUTE * 5 = 5, decremented = 4
    expect(state.world.floors[0].rooms[0].spawnTicksRemaining).toBe(
      SPAWNING_POOL_DEFAULT_RATE - 1,
    );
  });

  it('should use default capacity when room def has no spawnCapacity', () => {
    const defNoCap = { ...spawningPoolDef, spawnCapacity: undefined };
    mockContent.set(SPAWNING_POOL_ID, defNoCap);

    const room = makeRoom({ spawnTicksRemaining: 1 });
    const worker = makeWorker('w1');
    // Fill to default capacity (10)
    const unassigned = Array.from({ length: 10 }, (_, i) =>
      makeInhabitant({
        instanceId: `inh-${i}` as InhabitantInstanceId,
        assignedRoomId: undefined,
      }),
    );
    const inhabitants = [worker, ...unassigned];
    const floor = makeFloor([room], inhabitants);
    const state = makeGameState({ floors: [floor], inhabitants });

    spawningPoolProcess(state);

    // Default capacity = 10, unassigned = 10, should NOT spawn
    expect(state.world.inhabitants).toHaveLength(11);
  });

  it('should reset timer even when capacity is full', () => {
    const room = makeRoom({ spawnTicksRemaining: 1 });
    const worker = makeWorker('w1');
    const unassigned = Array.from({ length: 10 }, (_, i) =>
      makeInhabitant({
        instanceId: `inh-${i}` as InhabitantInstanceId,
        assignedRoomId: undefined,
      }),
    );
    const inhabitants = [worker, ...unassigned];
    const floor = makeFloor([room], inhabitants);
    const state = makeGameState({ floors: [floor], inhabitants });

    spawningPoolProcess(state);

    // Timer should still reset even though no spawn occurred
    expect(state.world.floors[0].rooms[0].spawnTicksRemaining).toBe(25);
  });

  describe('worker requirement', () => {
    it('should not spawn with 0 workers assigned', () => {
      const room = makeRoom({ spawnTicksRemaining: 1 });
      const floor = makeFloor([room]);
      const state = makeGameState({ floors: [floor] });

      spawningPoolProcess(state);

      expect(state.world.inhabitants).toHaveLength(0);
    });

    it('should reset timer to undefined with 0 workers', () => {
      const room = makeRoom({ spawnTicksRemaining: 10 });
      const floor = makeFloor([room]);
      const state = makeGameState({ floors: [floor] });

      spawningPoolProcess(state);

      expect(state.world.floors[0].rooms[0].spawnTicksRemaining).toBeUndefined();
    });

    it('should not count traveling workers', () => {
      const room = makeRoom({ spawnTicksRemaining: 1 });
      const travelingWorker = makeInhabitant({
        instanceId: 'tw1' as InhabitantInstanceId,
        assignedRoomId: POOL_ROOM_ID,
        travelTicksRemaining: 50,
      });
      const floor = makeFloor([room], [travelingWorker]);
      const state = makeGameState({
        floors: [floor],
        inhabitants: [travelingWorker],
      });

      spawningPoolProcess(state);

      // Timer reset because no arrived workers
      expect(state.world.floors[0].rooms[0].spawnTicksRemaining).toBeUndefined();
      // No spawn
      expect(state.world.inhabitants).toHaveLength(1);
    });

    it('should spawn with 1 worker assigned', () => {
      const room = makeRoom({ spawnTicksRemaining: 1 });
      const worker = makeWorker('w1');
      const floor = makeFloor([room], [worker]);
      const state = makeGameState({ floors: [floor], inhabitants: [worker] });

      spawningPoolProcess(state);

      expect(state.world.inhabitants).toHaveLength(2);
    });
  });

  describe('worker speed scaling', () => {
    it('should halve rate with 2 workers', () => {
      const room = makeRoom({ spawnTicksRemaining: undefined });
      const workers = [makeWorker('w1'), makeWorker('w2')];
      const floor = makeFloor([room], workers);
      const state = makeGameState({ floors: [floor], inhabitants: workers });

      spawningPoolProcess(state);

      // base 25 / 2 workers = 13 (rounded), decremented = 12
      expect(state.world.floors[0].rooms[0].spawnTicksRemaining).toBe(12);
    });

    it('should clamp scaled rate to minimum of 1', () => {
      const room = makeRoom({
        spawnTicksRemaining: undefined,
        appliedUpgradePathId: 'upgrade-rapid-spawning' as RoomUpgradeId,
      });
      // Many workers with reduced rate: (25-10=15) / 100 = 0.15 → clamped to 1
      const workers = Array.from({ length: 100 }, (_, i) =>
        makeWorker(`w${i}`),
      );
      const floor = makeFloor([room], workers);
      const state = makeGameState({ floors: [floor], inhabitants: workers });

      spawningPoolProcess(state);

      // Rate should be clamped to 1, then decremented → timer fires immediately (0)
      // After firing, reset to 1
      expect(state.world.floors[0].rooms[0].spawnTicksRemaining).toBe(1);
    });
  });

  describe('global roster cap', () => {
    it('should not spawn when at global roster cap', () => {
      mockMaxInhabitantCount = 2;
      const room = makeRoom({ spawnTicksRemaining: 1 });
      const workers = [makeWorker('w1'), makeWorker('w2')];
      const floor = makeFloor([room], workers);
      const state = makeGameState({ floors: [floor], inhabitants: workers });

      spawningPoolProcess(state);

      // 2 inhabitants = cap of 2, no spawn
      expect(state.world.inhabitants).toHaveLength(2);
    });

    it('should spawn when below global roster cap', () => {
      mockMaxInhabitantCount = 10;
      const room = makeRoom({ spawnTicksRemaining: 1 });
      const worker = makeWorker('w1');
      const floor = makeFloor([room], [worker]);
      const state = makeGameState({ floors: [floor], inhabitants: [worker] });

      spawningPoolProcess(state);

      expect(state.world.inhabitants).toHaveLength(2);
    });

    it('should reset timer even when at roster cap', () => {
      mockMaxInhabitantCount = 1;
      const room = makeRoom({ spawnTicksRemaining: 1 });
      const worker = makeWorker('w1');
      const floor = makeFloor([room], [worker]);
      const state = makeGameState({ floors: [floor], inhabitants: [worker] });

      spawningPoolProcess(state);

      // Timer should still reset
      expect(state.world.floors[0].rooms[0].spawnTicksRemaining).toBe(25);
      // But no new inhabitant
      expect(state.world.inhabitants).toHaveLength(1);
    });
  });
});

describe('Constants', () => {
  it('should have default rate of 5 ticks (5 game-minutes)', () => {
    expect(SPAWNING_POOL_DEFAULT_RATE).toBe(5);
  });

  it('should have default capacity of 10', () => {
    expect(SPAWNING_POOL_DEFAULT_CAPACITY).toBe(10);
  });
});
