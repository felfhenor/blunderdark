import type {
  FarplaneSoul,
  FarplaneSoulId,
  Floor,
  FloorId,
  GameId,
  GameState,
  GridState,
  InhabitantContent,
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
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Constants ---

const FARPLANE_ROOM_ID = 'fp100001-0001-0001-0001-000000000001';
const GOBLIN_ID = 'fp200001-0001-0001-0001-000000000001';
const SKELETON_ID = 'fp200001-0001-0001-0001-000000000002';

// --- Upgrade paths ---

const spiritualExpansionPath: RoomUpgradeContent = {
  id: 'upgrade-spiritual-expansion' as RoomUpgradeId,
  __type: 'roomupgrade',
  name: 'Spiritual Expansion',
  description: '+2 soul capacity.',
  cost: { gold: 150, essence: 40 },
  effects: [{ type: 'soulCapacityBonus', value: 2 }],
};

const etherealAmplificationPath: RoomUpgradeContent = {
  id: 'upgrade-ethereal-amplification' as RoomUpgradeId,
  __type: 'roomupgrade',
  name: 'Ethereal Amplification',
  description: '+3 soul capacity.',
  cost: { gold: 300, essence: 80, crystals: 40 },
  effects: [{ type: 'soulCapacityBonus', value: 3 }],
};

// --- Mock content ---

const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  contentGetEntry: (id: string) => mockContent.get(id) ?? undefined,
  contentGetEntriesByType: vi.fn(() => []),
}));

vi.mock('@helpers/room-roles', () => ({
  roomRoleFindById: vi.fn((role: string) => {
    if (role === 'farplane') return FARPLANE_ROOM_ID;
    return undefined;
  }),
  roomRoleResetCache: vi.fn(),
}));

vi.mock('@helpers/room-upgrades', async () => {
  return {
    roomUpgradeGetAppliedEffects: (room: PlacedRoom) => {
      if (!room.appliedUpgradePathId) return [];
      const paths = [spiritualExpansionPath, etherealAmplificationPath];
      const path = paths.find((p) => p.id === room.appliedUpgradePathId);
      return path?.effects ?? [];
    },
  };
});

let mockResearchBonus = 0;
vi.mock('@helpers/research-unlocks', () => ({
  researchUnlockGetPassiveBonusWithMastery: vi.fn(
    () => mockResearchBonus,
  ),
}));

let mockRoomLookupResult: { room: PlacedRoom; floor: Floor } | undefined;
vi.mock('@helpers/room-lookup', () => ({
  findRoomByRole: vi.fn(() => mockRoomLookupResult),
}));

vi.mock('@helpers/rng', () => {
  let counter = 0;
  return {
    rngUuid: () => `test-uuid-${++counter}` as string,
  };
});

let mockCanAfford = true;
let mockPayResult = true;
vi.mock('@helpers/resources', () => ({
  resourceCanAfford: vi.fn(() => mockCanAfford),
  resourcePayCost: vi.fn(async () => mockPayResult),
}));

let mockRosterFull = false;
vi.mock('@helpers/recruitment', () => ({
  recruitmentIsRosterFull: vi.fn(() => mockRosterFull),
  recruitmentMaxInhabitantCount: vi.fn(() => 50),
}));

let inhabitantAddCalls: InhabitantInstance[] = [];
vi.mock('@helpers/inhabitants', () => ({
  inhabitantAdd: vi.fn(async (instance: InhabitantInstance) => {
    inhabitantAddCalls.push(instance);
  }),
}));

let mockGameState: GameState;
let updateGamestateCalls: Array<(s: GameState) => GameState> = [];
vi.mock('@helpers/state-game', () => ({
  gamestate: vi.fn(() => mockGameState),
  updateGamestate: vi.fn(async (fn: (s: GameState) => GameState) => {
    mockGameState = fn(mockGameState);
    updateGamestateCalls.push(fn);
  }),
}));

vi.mock('@helpers/notify', () => ({
  notify: vi.fn(),
}));

vi.mock('@helpers/floor', () => ({
  floorAll: vi.fn(() => mockGameState?.world?.floors ?? []),
}));

// --- Room definitions ---

const farplaneRoomDef: RoomContent = {
  id: FARPLANE_ROOM_ID as RoomId,
  name: 'Farplane',
  __type: 'room',
  description: 'A rift between worlds.',
  shapeId: 'shape-cross' as RoomShapeId,
  cost: { gold: 200, essence: 50, crystals: 30 },
  production: {},
  requiresWorkers: false,
  maxInhabitants: 0,
  inhabitantRestriction: undefined,
  fearLevel: 2,
  fearReductionAura: 0,
  adjacencyBonuses: [],
  isUnique: true,
  removable: false,
  autoPlace: false,
  role: 'farplane',
  roomUpgradeIds: [spiritualExpansionPath.id, etherealAmplificationPath.id],
};

const goblinDef: InhabitantContent = {
  id: GOBLIN_ID as InhabitantId,
  name: 'Goblin',
  __type: 'inhabitant',
  description: 'A small green creature.',
  type: 'goblin',
  tier: 1,
  cost: { gold: 20, food: 10 },
  stats: { hp: 10, attack: 5, defense: 3, speed: 6, workerEfficiency: 1 },
  inhabitantTraitIds: [],
  traits: [],
  restrictionTags: [],
  rulerBonuses: {},
  rulerFearLevel: 0,
};

const skeletonDef: InhabitantContent = {
  id: SKELETON_ID as InhabitantId,
  name: 'Skeleton',
  __type: 'inhabitant',
  description: 'Undead.',
  type: 'undead',
  tier: 2,
  cost: { gold: 30, essence: 10 },
  stats: { hp: 15, attack: 8, defense: 6, speed: 4, workerEfficiency: 0.8 },
  inhabitantTraitIds: [],
  traits: [],
  restrictionTags: [],
  rulerBonuses: {},
  rulerFearLevel: 0,
};

// --- Helpers ---

function makeRoom(overrides: Partial<PlacedRoom> = {}): PlacedRoom {
  return {
    id: 'farplane-1' as PlacedRoomId,
    roomTypeId: FARPLANE_ROOM_ID as RoomId,
    shapeId: 'shape-cross' as RoomShapeId,
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
    definitionId: GOBLIN_ID as InhabitantId,
    name: 'Grubnik',
    state: 'normal',
    assignedRoomId: undefined,
    ...overrides,
  };
}

function makeSoul(overrides: Partial<FarplaneSoul> = {}): FarplaneSoul {
  return {
    soulId: 'soul-1' as FarplaneSoulId,
    definitionId: GOBLIN_ID as InhabitantId,
    instanceName: 'Grubnik',
    capturedAtTick: 100,
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
  farplaneSouls?: FarplaneSoul[];
  inhabitants?: InhabitantInstance[];
}): GameState {
  const inhabitants = overrides.inhabitants ?? [];
  const state = {
    meta: { version: 2, isSetup: true, isPaused: false, createdAt: 0 },
    gameId: 'test-game' as GameId,
    clock: { numTicks: 500, lastSaveTick: 0, day: 5, hour: 0, minute: 0 },
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
          roomupgrades: [],
          passiveBonuses: [],
          featureFlags: [],
          roomfeatures: [],
          biomes: [],
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
      farplaneSouls: overrides.farplaneSouls ?? [],
      invasionSchedule: {
        nextInvasionDay: undefined,
        nextInvasionVariance: 0,
        gracePeriodEnd: 10,
        invasionHistory: [],
        pendingSpecialInvasions: [],
        warningActive: false,
        warningDismissed: false,
      },
      playerThreat: 0,
      corruptionEffects: {
        firedOneTimeEffects: [],
        lastIntervalValues: {},
        lastTriggerTimes: {},
        retriggeredEffects: {},
      },
      victoryProgress: {
        consecutivePeacefulDays: 0,
        lastPeacefulCheckDay: 0,
        consecutiveZeroCorruptionDays: 0,
        lastZeroCorruptionCheckDay: 0,
        totalInvasionDefenseWins: 0,
        lastEvaluationTick: 0,
      },
      merchant: {
        isPresent: false,
        arrivalDay: 0,
        departureDayRemaining: 0,
        inventory: [],
      },
    },
  };
  return state as GameState;
}

// --- Import after mocks ---

import {
  FARPLANE_BASE_SOUL_CAPACITY,
  FARPLANE_COST_MULTIPLIER,
  farplaneCaptureDefenderSouls,
  farplaneGetRecruitCost,
  farplaneGetSoulCapacity,
  farplaneRecruitSoul,
} from '@helpers/farplane';

// --- Setup ---

beforeEach(() => {
  mockContent.clear();
  mockContent.set(FARPLANE_ROOM_ID, farplaneRoomDef);
  mockContent.set(GOBLIN_ID, goblinDef);
  mockContent.set(SKELETON_ID, skeletonDef);
  mockResearchBonus = 0;
  mockCanAfford = true;
  mockPayResult = true;
  mockRosterFull = false;
  inhabitantAddCalls = [];
  updateGamestateCalls = [];

  const room = makeRoom();
  const floor = makeFloor([room]);
  mockRoomLookupResult = { room, floor };
  mockGameState = makeGameState({ floors: [floor] });
});

// --- Tests ---

describe('farplaneGetSoulCapacity', () => {
  it('should return base capacity with no upgrades or research', () => {
    expect(farplaneGetSoulCapacity()).toBe(FARPLANE_BASE_SOUL_CAPACITY);
  });

  it('should add room upgrade soulCapacityBonus', () => {
    const room = makeRoom({
      appliedUpgradePathId: 'upgrade-spiritual-expansion' as RoomUpgradeId,
    });
    const floor = makeFloor([room]);
    mockRoomLookupResult = { room, floor };

    expect(farplaneGetSoulCapacity()).toBe(FARPLANE_BASE_SOUL_CAPACITY + 2);
  });

  it('should add research passive bonus', () => {
    mockResearchBonus = 2;
    expect(farplaneGetSoulCapacity()).toBe(FARPLANE_BASE_SOUL_CAPACITY + 2);
  });

  it('should combine room upgrade and research bonus', () => {
    const room = makeRoom({
      appliedUpgradePathId: 'upgrade-ethereal-amplification' as RoomUpgradeId,
    });
    const floor = makeFloor([room]);
    mockRoomLookupResult = { room, floor };
    mockResearchBonus = 4;

    expect(farplaneGetSoulCapacity()).toBe(FARPLANE_BASE_SOUL_CAPACITY + 3 + 4);
  });
});

describe('farplaneCaptureDefenderSouls', () => {
  it('should capture souls from killed defenders', () => {
    const inh = makeInhabitant({
      instanceId: 'inh-dead' as InhabitantInstanceId,
      name: 'Grubnik the Brave',
      instanceTraitIds: ['trait-training-atk', 'trait-training-def'],
    });
    const room = makeRoom();
    const floor = makeFloor([room], [inh]);
    const state = makeGameState({
      floors: [floor],
      inhabitants: [inh],
      farplaneSouls: [],
    });

    farplaneCaptureDefenderSouls(state, [
      'inh-dead' as InhabitantInstanceId,
    ]);

    expect(state.world.farplaneSouls).toHaveLength(1);
    expect(state.world.farplaneSouls[0].instanceName).toBe(
      'Grubnik the Brave',
    );
    expect(state.world.farplaneSouls[0].instanceTraitIds).toEqual([
      'trait-training-atk',
      'trait-training-def',
    ]);
  });

  it('should preserve all instance fields in soul snapshot', () => {
    const inh = makeInhabitant({
      instanceId: 'inh-mut' as InhabitantInstanceId,
      definitionId: SKELETON_ID as InhabitantId,
      name: 'Bonecrusher',
      instanceStatBonuses: { hp: 5, attack: 2 },
      mutated: true,
      mutationTraitIds: ['trait-1', 'trait-2'],
      instanceTraitIds: ['training-trait-1'],
      isHybrid: true,
      hybridParentIds: [
        'parent-1' as InhabitantInstanceId,
        'parent-2' as InhabitantInstanceId,
      ],
      isSummoned: true,
    });
    const room = makeRoom();
    const floor = makeFloor([room], [inh]);
    const state = makeGameState({
      floors: [floor],
      inhabitants: [inh],
      farplaneSouls: [],
    });

    farplaneCaptureDefenderSouls(state, [
      'inh-mut' as InhabitantInstanceId,
    ]);

    const soul = state.world.farplaneSouls[0];
    expect(soul.definitionId).toBe(SKELETON_ID);
    expect(soul.instanceName).toBe('Bonecrusher');
    expect(soul.instanceStatBonuses).toEqual({ hp: 5, attack: 2 });
    expect(soul.mutated).toBe(true);
    expect(soul.mutationTraitIds).toEqual(['trait-1', 'trait-2']);
    expect(soul.instanceTraitIds).toEqual(['training-trait-1']);
    expect(soul.isHybrid).toBe(true);
    expect(soul.hybridParentIds).toEqual([
      'parent-1',
      'parent-2',
    ]);
    expect(soul.isSummoned).toBe(true);
    expect(soul.capturedAtTick).toBe(500);
  });

  it('should evict oldest souls when over capacity (FIFO)', () => {
    const existingSouls: FarplaneSoul[] = Array.from(
      { length: FARPLANE_BASE_SOUL_CAPACITY },
      (_, i) =>
        makeSoul({
          soulId: `existing-${i}` as FarplaneSoulId,
          instanceName: `Old Soul ${i}`,
          capturedAtTick: 100 + i,
        }),
    );

    const newDefender = makeInhabitant({
      instanceId: 'inh-new' as InhabitantInstanceId,
      name: 'New Defender',
    });
    const room = makeRoom();
    const floor = makeFloor([room], [newDefender]);
    const state = makeGameState({
      floors: [floor],
      inhabitants: [newDefender],
      farplaneSouls: existingSouls,
    });

    farplaneCaptureDefenderSouls(state, [
      'inh-new' as InhabitantInstanceId,
    ]);

    // Adding 1 over base capacity should evict the oldest
    expect(state.world.farplaneSouls).toHaveLength(
      FARPLANE_BASE_SOUL_CAPACITY,
    );
    // The oldest soul (capturedAtTick: 100) should be gone
    expect(
      state.world.farplaneSouls.find((s) => s.soulId === 'existing-0'),
    ).toBeUndefined();
    // The newest soul should be present
    expect(
      state.world.farplaneSouls.find((s) => s.instanceName === 'New Defender'),
    ).toBeDefined();
  });

  it('should not capture when farplane room is not placed', () => {
    const inh = makeInhabitant({
      instanceId: 'inh-dead' as InhabitantInstanceId,
    });
    // No farplane room on any floor
    const floor = makeFloor([], [inh]);
    const state = makeGameState({
      floors: [floor],
      inhabitants: [inh],
      farplaneSouls: [],
    });

    farplaneCaptureDefenderSouls(state, [
      'inh-dead' as InhabitantInstanceId,
    ]);

    expect(state.world.farplaneSouls).toHaveLength(0);
  });

  it('should not capture with empty killedDefenderIds', () => {
    const room = makeRoom();
    const floor = makeFloor([room]);
    const state = makeGameState({ floors: [floor], farplaneSouls: [] });

    farplaneCaptureDefenderSouls(state, []);

    expect(state.world.farplaneSouls).toHaveLength(0);
  });

  it('should skip defenders not found in inhabitants list', () => {
    const room = makeRoom();
    const floor = makeFloor([room]);
    const state = makeGameState({
      floors: [floor],
      inhabitants: [],
      farplaneSouls: [],
    });

    farplaneCaptureDefenderSouls(state, [
      'nonexistent' as InhabitantInstanceId,
    ]);

    expect(state.world.farplaneSouls).toHaveLength(0);
  });
});

describe('farplaneGetRecruitCost', () => {
  it('should halve each resource cost, rounded up', () => {
    const cost = farplaneGetRecruitCost(GOBLIN_ID);
    // Goblin cost: gold: 20, food: 10
    expect(cost.gold).toBe(10); // 20 * 0.5 = 10
    expect(cost.food).toBe(5); // 10 * 0.5 = 5
  });

  it('should round up odd costs', () => {
    // Skeleton cost: gold: 30, essence: 10
    const cost = farplaneGetRecruitCost(SKELETON_ID);
    expect(cost.gold).toBe(15); // 30 * 0.5 = 15
    expect(cost.essence).toBe(5); // 10 * 0.5 = 5
  });

  it('should have a minimum of 1 per resource', () => {
    // Manually test with a mock that has cost of 1
    const cheapDef = {
      ...goblinDef,
      id: 'cheap-id' as InhabitantId,
      cost: { gold: 1 },
    };
    mockContent.set('cheap-id', cheapDef);

    const cost = farplaneGetRecruitCost('cheap-id');
    expect(cost.gold).toBe(1); // Math.max(1, Math.ceil(1 * 0.5)) = 1
  });

  it('should return empty cost for unknown definition', () => {
    const cost = farplaneGetRecruitCost('nonexistent');
    expect(cost).toEqual({});
  });
});

describe('farplaneRecruitSoul', () => {
  it('should create instance with correct fields from soul', async () => {
    const soul = makeSoul({
      definitionId: GOBLIN_ID as InhabitantId,
      instanceName: 'Restored Grubnik',
      instanceTraitIds: ['training-trait-1'],
      mutated: true,
      mutationTraitIds: ['trait-a'],
      isHybrid: false,
      isSummoned: true,
    });
    mockGameState = makeGameState({
      farplaneSouls: [soul],
      floors: [makeFloor([makeRoom()])],
    });

    const result = await farplaneRecruitSoul(soul.soulId);

    expect(result.success).toBe(true);
    expect(inhabitantAddCalls).toHaveLength(1);
    const created = inhabitantAddCalls[0];
    expect(created.name).toBe('Restored Grubnik');
    expect(created.definitionId).toBe(GOBLIN_ID);
    expect(created.state).toBe('normal');
    expect(created.assignedRoomId).toBeUndefined();
    expect(created.instanceTraitIds).toEqual(['training-trait-1']);
    expect(created.mutated).toBe(true);
    expect(created.mutationTraitIds).toEqual(['trait-a']);
    expect(created.isSummoned).toBe(true);
  });

  it('should fail when roster is full', async () => {
    mockRosterFull = true;
    const soul = makeSoul();
    mockGameState = makeGameState({
      farplaneSouls: [soul],
      floors: [makeFloor([makeRoom()])],
    });

    const result = await farplaneRecruitSoul(soul.soulId);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Roster is full');
    expect(inhabitantAddCalls).toHaveLength(0);
  });

  it('should fail when cannot afford', async () => {
    mockCanAfford = false;
    const soul = makeSoul();
    mockGameState = makeGameState({
      farplaneSouls: [soul],
      floors: [makeFloor([makeRoom()])],
    });

    const result = await farplaneRecruitSoul(soul.soulId);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Not enough resources');
  });

  it('should remove soul from farplane after successful recruit', async () => {
    const soul = makeSoul();
    mockGameState = makeGameState({
      farplaneSouls: [soul],
      floors: [makeFloor([makeRoom()])],
    });

    const result = await farplaneRecruitSoul(soul.soulId);

    expect(result.success).toBe(true);
    expect(mockGameState.world.farplaneSouls).toHaveLength(0);
  });

  it('should fail when soul not found', async () => {
    mockGameState = makeGameState({
      farplaneSouls: [],
      floors: [makeFloor([makeRoom()])],
    });

    const result = await farplaneRecruitSoul(
      'nonexistent' as FarplaneSoulId,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Soul not found');
  });
});

describe('Constants', () => {
  it('should have correct base soul capacity', () => {
    expect(FARPLANE_BASE_SOUL_CAPACITY).toBe(5);
  });

  it('should have correct cost multiplier', () => {
    expect(FARPLANE_COST_MULTIPLIER).toBe(0.5);
  });
});
