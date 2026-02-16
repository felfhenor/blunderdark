import type {
  Floor,
  FloorId,
  GameState,
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
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Constants ---

const SPAWNING_POOL_ID = 'aa100001-0001-0001-0001-000000000099';
const GOBLIN_DEF_ID = 'aa200001-0001-0001-0001-000000000001';
const SKELETON_DEF_ID = 'aa200001-0001-0001-0001-000000000002';

// --- Upgrade paths ---

const rapidSpawningPath: RoomUpgradePath = {
  id: 'upgrade-rapid-spawning' as UpgradePathId,
  name: 'Rapid Spawning',
  description: 'Faster spawns and higher capacity.',
  cost: { gold: 100, crystals: 50 },
  effects: [
    { type: 'spawnRateReduction', value: 10 },
    { type: 'spawnCapacityBonus', value: 5 },
    { type: 'maxInhabitantBonus', value: 2 },
  ],
};

const darkSpawningPath: RoomUpgradePath = {
  id: 'upgrade-dark-spawning' as UpgradePathId,
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

vi.mock('@helpers/content', () => ({
  contentGetEntry: (id: string) => mockContent.get(id) ?? undefined,
  contentGetEntriesByType: vi.fn(() => []),
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
  rngChoice: vi.fn((arr: string[]) => arr[0]),
  rngUuid: vi.fn(() => 'mock-uuid-0001'),
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

const skeletonDef: InhabitantContent = {
  id: SKELETON_DEF_ID as InhabitantId,
  name: 'Skeleton',
  __type: 'inhabitant',
  type: 'minion',
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

const spawningPoolDef: RoomContent & IsContentItem = {
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
  upgradePaths: [rapidSpawningPath, darkSpawningPath],
  autoPlace: false,
  role: 'spawningPool',
  spawnRate: 25,
  spawnType: 'Goblin',
  spawnCapacity: 10,
};

// --- Helpers ---

function makeRoom(overrides: Partial<PlacedRoom> = {}): PlacedRoom {
  return {
    id: 'pool-1' as PlacedRoomId,
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
    trained: false,
    trainingProgress: 0,
    trainingBonuses: { defense: 0, attack: 0 },
    hungerTicksWithoutFood: 0,
    ...overrides,
  };
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
    grid: { tiles: [] } as unknown as Floor['grid'],
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
    gameId: 'test-game' as GameState['gameId'],
    clock: { numTicks: 0, lastSaveTick: 0, day: 1, hour: 0, minute: 0 },
    world: {
      grid: [] as unknown as GameState['world']['grid'],
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
      trapCraftingQueues: [],
      forgeInventory: [],
      forgeCraftingQueues: [],
      alchemyConversions: [],
      prisoners: [],
      invasionSchedule: {
        nextInvasionDay: undefined,
        nextInvasionVariance: 0,
        gracePeriodEnd: 30,
        invasionHistory: [],
        pendingSpecialInvasions: [],
        warningActive: false,
        warningDismissed: false,
      },
      corruptionEffects: {
        darkUpgradeUnlocked: false,
        lastMutationCorruption: undefined,
        lastCrusadeCorruption: undefined,
        warnedThresholds: [],
      },
      stairs: [],
      elevators: [],
      portals: [],
      victoryProgress: { consecutivePeacefulDays: 0, lastPeacefulCheckDay: 0, consecutiveZeroCorruptionDays: 0, lastZeroCorruptionCheckDay: 0, totalInvasionDefenseWins: 0 },
      merchant: { isPresent: false, arrivalDay: 0, departureDayRemaining: 0, inventory: [] },
      seasonalEvent: {
        triggeredEventIds: [],
        activeEffects: [],
        pendingEvent: undefined,
        lastSeasonCycleForReset: 0,
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
  spawningPoolGetSpawnType,
  spawningPoolProcess,
} from '@helpers/spawning-pool';

// --- Setup ---

beforeEach(() => {
  mockContent.clear();
  mockContent.set(SPAWNING_POOL_ID, spawningPoolDef);
  mockContent.set('Goblin', goblinDef);
  mockContent.set('Skeleton', skeletonDef);
});

// --- Tests ---

describe('Spawning Pool Room Definition', () => {
  it('should have correct definition properties', () => {
    expect(spawningPoolDef.spawnRate).toBe(25);
    expect(spawningPoolDef.spawnType).toBe('Goblin');
    expect(spawningPoolDef.spawnCapacity).toBe(10);
    expect(spawningPoolDef.maxInhabitants).toBe(2);
    expect(spawningPoolDef.shapeId).toBe('shape-2x2');
    expect(spawningPoolDef.role).toBe('spawningPool');
  });

  it('should have 2 upgrade paths', () => {
    expect(spawningPoolDef.upgradePaths).toHaveLength(2);
    expect(spawningPoolDef.upgradePaths[0].name).toBe('Rapid Spawning');
    expect(spawningPoolDef.upgradePaths[1].name).toBe('Dark Spawning');
  });
});

describe('spawningPoolGetEffectiveRate', () => {
  it('should return base rate when no upgrade applied', () => {
    const room = makeRoom();
    expect(spawningPoolGetEffectiveRate(room, 25)).toBe(25);
  });

  it('should reduce rate with Rapid Spawning upgrade', () => {
    const room = makeRoom({ appliedUpgradePathId: 'upgrade-rapid-spawning' as UpgradePathId });
    // base 25 - spawnRateReduction 10 = 15
    expect(spawningPoolGetEffectiveRate(room, 25)).toBe(15);
  });

  it('should clamp rate to minimum of 1', () => {
    const room = makeRoom({ appliedUpgradePathId: 'upgrade-rapid-spawning' as UpgradePathId });
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
    const room = makeRoom({ appliedUpgradePathId: 'upgrade-rapid-spawning' as UpgradePathId });
    // base 10 + spawnCapacityBonus 5 = 15
    expect(spawningPoolGetEffectiveCapacity(room, 10)).toBe(15);
  });
});

describe('spawningPoolGetSpawnType', () => {
  it('should return base type when no upgrade applied', () => {
    const room = makeRoom();
    expect(spawningPoolGetSpawnType(room, 'Goblin')).toBe('Goblin');
  });

  it('should return Skeleton with Dark Spawning upgrade', () => {
    const room = makeRoom({ appliedUpgradePathId: 'upgrade-dark-spawning' as UpgradePathId });
    expect(spawningPoolGetSpawnType(room, 'Goblin')).toBe('Skeleton');
  });
});

describe('spawningPoolCountUnassigned', () => {
  it('should return 0 for empty list', () => {
    expect(spawningPoolCountUnassigned([])).toBe(0);
  });

  it('should count only unassigned inhabitants', () => {
    const inhabitants = [
      makeInhabitant({ instanceId: 'a' as InhabitantInstanceId, assignedRoomId: undefined }),
      makeInhabitant({ instanceId: 'b' as InhabitantInstanceId, assignedRoomId: 'room-1' as PlacedRoomId }),
      makeInhabitant({ instanceId: 'c' as InhabitantInstanceId, assignedRoomId: undefined }),
    ];
    expect(spawningPoolCountUnassigned(inhabitants)).toBe(2);
  });

  it('should return 0 when all assigned', () => {
    const inhabitants = [
      makeInhabitant({ instanceId: 'a' as InhabitantInstanceId, assignedRoomId: 'room-1' as PlacedRoomId }),
      makeInhabitant({ instanceId: 'b' as InhabitantInstanceId, assignedRoomId: 'room-2' as PlacedRoomId }),
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

  it('should create a name with suffix', () => {
    const inhabitant = spawningPoolCreateInhabitant(goblinDef);
    // rngChoice is mocked to return first element: 'the Bold'
    expect(inhabitant.name).toBe('Goblin the Bold');
  });

  it('should start in normal state with no assignment', () => {
    const inhabitant = spawningPoolCreateInhabitant(goblinDef);
    expect(inhabitant.state).toBe('normal');
    expect(inhabitant.assignedRoomId).toBeUndefined();
  });

  it('should start untrained with zero training progress', () => {
    const inhabitant = spawningPoolCreateInhabitant(goblinDef);
    expect(inhabitant.trained).toBe(false);
    expect(inhabitant.trainingProgress).toBe(0);
    expect(inhabitant.trainingBonuses).toEqual({ defense: 0, attack: 0 });
  });

  it('should start with zero hunger ticks', () => {
    const inhabitant = spawningPoolCreateInhabitant(goblinDef);
    expect(inhabitant.hungerTicksWithoutFood).toBe(0);
  });
});

describe('spawningPoolProcess', () => {
  it('should initialize spawn timer on first tick', () => {
    const room = makeRoom({ spawnTicksRemaining: undefined });
    const floor = makeFloor([room]);
    const state = makeGameState({ floors: [floor] });

    spawningPoolProcess(state);

    // Timer initialized to effective rate (25), then decremented by 1 = 24
    expect(state.world.floors[0].rooms[0].spawnTicksRemaining).toBe(24);
  });

  it('should decrement spawn timer each tick', () => {
    const room = makeRoom({ spawnTicksRemaining: 20 });
    const floor = makeFloor([room]);
    const state = makeGameState({ floors: [floor] });

    spawningPoolProcess(state);

    expect(state.world.floors[0].rooms[0].spawnTicksRemaining).toBe(19);
  });

  it('should spawn inhabitant when timer reaches 0', () => {
    const room = makeRoom({ spawnTicksRemaining: 1 });
    const floor = makeFloor([room]);
    const state = makeGameState({ floors: [floor] });

    spawningPoolProcess(state);

    expect(state.world.inhabitants).toHaveLength(1);
    expect(state.world.inhabitants[0].definitionId).toBe(GOBLIN_DEF_ID);
    expect(state.world.inhabitants[0].name).toBe('Goblin the Bold');
  });

  it('should reset timer after spawning', () => {
    const room = makeRoom({ spawnTicksRemaining: 1 });
    const floor = makeFloor([room]);
    const state = makeGameState({ floors: [floor] });

    spawningPoolProcess(state);

    // Timer reset to effective rate (25)
    expect(state.world.floors[0].rooms[0].spawnTicksRemaining).toBe(25);
  });

  it('should not spawn when unassigned count reaches capacity', () => {
    const room = makeRoom({ spawnTicksRemaining: 1 });
    const floor = makeFloor([room]);
    // Fill with 10 unassigned inhabitants (capacity = 10)
    const inhabitants = Array.from({ length: 10 }, (_, i) =>
      makeInhabitant({ instanceId: `inh-${i}` as InhabitantInstanceId, assignedRoomId: undefined }),
    );
    const state = makeGameState({ floors: [floor], inhabitants });

    spawningPoolProcess(state);

    // Still 10 - no new spawn
    expect(state.world.inhabitants).toHaveLength(10);
  });

  it('should spawn when assigned inhabitants do not count against capacity', () => {
    const room = makeRoom({ spawnTicksRemaining: 1 });
    const floor = makeFloor([room]);
    // 9 unassigned + 5 assigned = 14 total, but only 9 unassigned < 10 capacity
    const inhabitants = [
      ...Array.from({ length: 9 }, (_, i) =>
        makeInhabitant({ instanceId: `un-${i}` as InhabitantInstanceId, assignedRoomId: undefined }),
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        makeInhabitant({ instanceId: `as-${i}` as InhabitantInstanceId, assignedRoomId: 'some-room' as PlacedRoomId }),
      ),
    ];
    const state = makeGameState({ floors: [floor], inhabitants });

    spawningPoolProcess(state);

    expect(state.world.inhabitants).toHaveLength(15);
  });

  it('should sync floor inhabitants after spawning', () => {
    const room = makeRoom({ spawnTicksRemaining: 1 });
    const floor = makeFloor([room]);
    const state = makeGameState({ floors: [floor] });

    spawningPoolProcess(state);

    // Floor inhabitants should be synced with world inhabitants
    expect(state.world.floors[0].inhabitants).toEqual(
      state.world.inhabitants,
    );
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
    const floor = makeFloor([otherRoom]);
    const state = makeGameState({ floors: [floor] });

    spawningPoolProcess(state);

    expect(state.world.inhabitants).toHaveLength(0);
  });

  it('should process multiple spawning pools across floors', () => {
    const pool1 = makeRoom({ id: 'pool-1' as PlacedRoomId, spawnTicksRemaining: 1 });
    const pool2 = makeRoom({ id: 'pool-2' as PlacedRoomId, spawnTicksRemaining: 1 });
    const floor1 = makeFloor([pool1]);
    const floor2 = makeFloor([pool2]);
    floor2.id = 'floor-2' as FloorId;
    const state = makeGameState({ floors: [floor1, floor2] });

    spawningPoolProcess(state);

    // Both pools should spawn (0 unassigned < 10 capacity for first,
    // then 1 unassigned < 10 capacity for second)
    expect(state.world.inhabitants).toHaveLength(2);
  });

  it('should use reduced spawn rate with Rapid Spawning upgrade', () => {
    const room = makeRoom({
      spawnTicksRemaining: undefined,
      appliedUpgradePathId: 'upgrade-rapid-spawning' as UpgradePathId,
    });
    const floor = makeFloor([room]);
    const state = makeGameState({ floors: [floor] });

    spawningPoolProcess(state);

    // Effective rate: 25 - 10 = 15, initialized and decremented: 14
    expect(state.world.floors[0].rooms[0].spawnTicksRemaining).toBe(14);
  });

  it('should use increased capacity with Rapid Spawning upgrade', () => {
    const room = makeRoom({
      spawnTicksRemaining: 1,
      appliedUpgradePathId: 'upgrade-rapid-spawning' as UpgradePathId,
    });
    const floor = makeFloor([room]);
    // 10 unassigned - at base capacity but below upgraded capacity (15)
    const inhabitants = Array.from({ length: 10 }, (_, i) =>
      makeInhabitant({ instanceId: `inh-${i}` as InhabitantInstanceId, assignedRoomId: undefined }),
    );
    const state = makeGameState({ floors: [floor], inhabitants });

    spawningPoolProcess(state);

    // Should spawn since 10 < 15 (upgraded capacity)
    expect(state.world.inhabitants).toHaveLength(11);
  });

  it('should spawn Skeletons with Dark Spawning upgrade', () => {
    const room = makeRoom({
      spawnTicksRemaining: 1,
      appliedUpgradePathId: 'upgrade-dark-spawning' as UpgradePathId,
    });
    const floor = makeFloor([room]);
    const state = makeGameState({ floors: [floor] });

    spawningPoolProcess(state);

    expect(state.world.inhabitants).toHaveLength(1);
    expect(state.world.inhabitants[0].definitionId).toBe(SKELETON_DEF_ID);
    expect(state.world.inhabitants[0].name).toBe('Skeleton the Bold');
  });

  it('should use default rate when room def has no spawnRate', () => {
    // Override content with a room def missing spawnRate
    const defNoRate = { ...spawningPoolDef, spawnRate: undefined };
    mockContent.set(SPAWNING_POOL_ID, defNoRate);

    const room = makeRoom({ spawnTicksRemaining: undefined });
    const floor = makeFloor([room]);
    const state = makeGameState({ floors: [floor] });

    spawningPoolProcess(state);

    // Default rate: GAME_TIME_TICKS_PER_MINUTE * 5 = 25, decremented = 24
    expect(state.world.floors[0].rooms[0].spawnTicksRemaining).toBe(
      SPAWNING_POOL_DEFAULT_RATE - 1,
    );
  });

  it('should use default capacity when room def has no spawnCapacity', () => {
    const defNoCap = { ...spawningPoolDef, spawnCapacity: undefined };
    mockContent.set(SPAWNING_POOL_ID, defNoCap);

    const room = makeRoom({ spawnTicksRemaining: 1 });
    const floor = makeFloor([room]);
    // Fill to default capacity (10)
    const inhabitants = Array.from({ length: 10 }, (_, i) =>
      makeInhabitant({ instanceId: `inh-${i}` as InhabitantInstanceId, assignedRoomId: undefined }),
    );
    const state = makeGameState({ floors: [floor], inhabitants });

    spawningPoolProcess(state);

    // Default capacity = 10, unassigned = 10, should NOT spawn
    expect(state.world.inhabitants).toHaveLength(10);
  });

  it('should reset timer even when capacity is full', () => {
    const room = makeRoom({ spawnTicksRemaining: 1 });
    const floor = makeFloor([room]);
    const inhabitants = Array.from({ length: 10 }, (_, i) =>
      makeInhabitant({ instanceId: `inh-${i}` as InhabitantInstanceId, assignedRoomId: undefined }),
    );
    const state = makeGameState({ floors: [floor], inhabitants });

    spawningPoolProcess(state);

    // Timer should still reset even though no spawn occurred
    expect(state.world.floors[0].rooms[0].spawnTicksRemaining).toBe(25);
  });
});

describe('Constants', () => {
  it('should have default rate of 25 ticks (5 game-minutes)', () => {
    expect(SPAWNING_POOL_DEFAULT_RATE).toBe(25);
  });

  it('should have default capacity of 10', () => {
    expect(SPAWNING_POOL_DEFAULT_CAPACITY).toBe(10);
  });
});
