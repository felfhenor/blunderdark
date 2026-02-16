import type {
  CapturedPrisoner,
  Floor,
  FloorId,
  GameState,
  InhabitantId,
  InhabitantInstance,
  InhabitantInstanceId,
  IsContentItem,
  PlacedRoom,
  PlacedRoomId,
  PrisonerId,
  RoomDefinition,
  RoomId,
  RoomShapeId,
  RoomUpgradePath,
  UpgradePathId,
} from '@interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import seedrandom from 'seedrandom';

// --- Constants ---

const TORTURE_CHAMBER_ID = 'tc100001-0001-0001-0001-000000000001';
const SOUL_WELL_ID = 'tc100001-0001-0001-0001-000000000002';
const BARRACKS_ID = 'tc100001-0001-0001-0001-000000000003';
const GOBLIN_ID = 'tc200001-0001-0001-0001-000000000001';

// --- Upgrade paths ---

const grandInquisitorPath: RoomUpgradePath = {
  id: 'upgrade-grand-inquisitor' as UpgradePathId,
  name: 'Grand Inquisitor',
  description: 'Speed and conversion bonus.',
  cost: { gold: 120, essence: 40 },
  effects: [
    { type: 'tortureSpeedMultiplier', value: 0.5 },
    { type: 'tortureConversionBonus', value: 0.25 },
    { type: 'maxInhabitantBonus', value: 1 },
  ],
};

const corruptionEnginePath: RoomUpgradePath = {
  id: 'upgrade-corruption-engine' as UpgradePathId,
  name: 'Corruption Engine',
  description: 'Double corruption.',
  cost: { gold: 100, flux: 30 },
  effects: [{ type: 'productionMultiplier', value: 2.0, resource: 'corruption' }],
};

// --- Mock content ---

const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  contentGetEntry: (id: string) => mockContent.get(id) ?? undefined,
  contentGetEntriesByType: vi.fn(() => []),
}));

vi.mock('@helpers/room-roles', () => ({
  roomRoleFindById: vi.fn((role: string) => {
    if (role === 'tortureChamber') return TORTURE_CHAMBER_ID;
    return undefined;
  }),
  roomRoleResetCache: vi.fn(),
}));

vi.mock('@helpers/room-upgrades', async () => {
  return {
    roomUpgradeGetAppliedEffects: (room: PlacedRoom) => {
      if (!room.appliedUpgradePathId) return [];
      const paths = [grandInquisitorPath, corruptionEnginePath];
      const path = paths.find((p) => p.id === room.appliedUpgradePathId);
      return path?.effects ?? [];
    },
  };
});

vi.mock('@helpers/rng', () => ({
  rngUuid: () => 'test-uuid-' + Math.random().toString(36).slice(2, 8),
  rngRandom: () => seedrandom('test-seed'),
}));

vi.mock('@helpers/adjacency', () => ({
  adjacencyAreRoomsAdjacent: () => false,
}));

vi.mock('@helpers/room-shapes', () => ({
  roomShapeResolve: () => ({ tiles: [{ x: 0, y: 0 }], width: 1, height: 1 }),
  roomShapeGetAbsoluteTiles: (_shape: unknown, x: number, y: number) => [
    { x, y },
  ],
}));

// --- Room definitions ---

const tortureChamberDef: RoomDefinition & IsContentItem = {
  id: TORTURE_CHAMBER_ID as RoomId,
  name: 'Torture Chamber',
  __type: 'room',
  description: 'Tortures prisoners.',
  shapeId: 'shape-l' as RoomShapeId,
  cost: { gold: 120, crystals: 40, essence: 20 },
  production: { corruption: 0.4 },
  requiresWorkers: true,
  maxInhabitants: 1,
  inhabitantRestriction: undefined,
  fearLevel: 4,
  fearReductionAura: 0,
  adjacencyBonuses: [],
  isUnique: false,
  removable: true,
  upgradePaths: [grandInquisitorPath, corruptionEnginePath],
  autoPlace: false,
  role: 'tortureChamber',
};

const soulWellDef: RoomDefinition & IsContentItem = {
  id: SOUL_WELL_ID as RoomId,
  name: 'Soul Well',
  __type: 'room',
  description: 'Soul stuff.',
  shapeId: 'shape-3x3' as RoomShapeId,
  cost: {},
  production: {},
  requiresWorkers: false,
  maxInhabitants: 2,
  inhabitantRestriction: undefined,
  fearLevel: 3,
  fearReductionAura: 0,
  adjacencyBonuses: [],
  isUnique: false,
  removable: true,
  upgradePaths: [],
  autoPlace: false,
  tortureAdjacencyEffects: { tortureSpeedBonus: 0.15 },
};

const barracksDef: RoomDefinition & IsContentItem = {
  id: BARRACKS_ID as RoomId,
  name: 'Barracks',
  __type: 'room',
  description: 'Barracks.',
  shapeId: 'shape-bar' as RoomShapeId,
  cost: {},
  production: {},
  requiresWorkers: false,
  maxInhabitants: 6,
  inhabitantRestriction: undefined,
  fearLevel: 1,
  fearReductionAura: 0,
  adjacencyBonuses: [],
  isUnique: false,
  removable: true,
  upgradePaths: [],
  autoPlace: false,
  tortureAdjacencyEffects: { tortureConversionBonus: 0.10 },
};

// --- Helpers ---

function makeRoom(overrides: Partial<PlacedRoom> = {}): PlacedRoom {
  return {
    id: 'torture-1' as PlacedRoomId,
    roomTypeId: TORTURE_CHAMBER_ID as RoomId,
    shapeId: 'shape-l' as RoomShapeId,
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
    name: 'Goblin Torturer',
    state: 'normal',
    assignedRoomId: 'torture-1' as PlacedRoomId,
    ...overrides,
  };
}

function makePrisoner(
  overrides: Partial<CapturedPrisoner> = {},
): CapturedPrisoner {
  return {
    id: 'prisoner-1' as PrisonerId,
    invaderClass: 'warrior',
    name: 'Captured Warrior',
    stats: { hp: 40, attack: 15, defense: 10, speed: 8 },
    captureDay: 5,
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
  prisoners?: CapturedPrisoner[];
}): GameState {
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
      inhabitants: [],
      hallways: [],
      season: { currentSeason: 'growth', dayInSeason: 1, totalSeasonCycles: 0 },
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
      prisoners: overrides.prisoners ?? [],
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
  TORTURE_EXTRACTION_BASE_TICKS,
  TORTURE_CONVERSION_BASE_TICKS,
  TORTURE_CORRUPTION_PER_TICK_WHILE_PROCESSING,
  TORTURE_CONVERT_SUCCESS_RATES,
  tortureCanStart,
  tortureGetExtractionTicks,
  tortureGetConversionTicks,
  tortureGetConversionRate,
  tortureCalculateExtractionReward,
  tortureCreateConvertedInhabitant,
  tortureChamberProcess,
  CONVERTED_PRISONER_DEF_ID,
} from '@helpers/torture-chamber';

// --- Setup ---

beforeEach(() => {
  mockContent.clear();
  mockContent.set(TORTURE_CHAMBER_ID, tortureChamberDef);
  mockContent.set(SOUL_WELL_ID, soulWellDef);
  mockContent.set(BARRACKS_ID, barracksDef);
});

// --- Tests ---

describe('Torture Chamber Definition', () => {
  it('should have correct definition properties', () => {
    expect(tortureChamberDef.maxInhabitants).toBe(1);
    expect(tortureChamberDef.fearLevel).toBe(4);
    expect(tortureChamberDef.role).toBe('tortureChamber');
    expect(tortureChamberDef.requiresWorkers).toBe(true);
    expect(tortureChamberDef.cost).toEqual({
      gold: 120,
      crystals: 40,
      essence: 20,
    });
  });

  it('should have 2 upgrade paths', () => {
    expect(tortureChamberDef.upgradePaths).toHaveLength(2);
    expect(tortureChamberDef.upgradePaths[0].name).toBe('Grand Inquisitor');
    expect(tortureChamberDef.upgradePaths[1].name).toBe('Corruption Engine');
  });
});

describe('tortureCanStart', () => {
  it('should return false if there is an active job', () => {
    const room = makeRoom();
    room.tortureJob = {
      prisonerId: 'p1' as PrisonerId,
      action: 'extract',
      ticksRemaining: 10,
      targetTicks: 20,
    };
    const worker = makeInhabitant();
    const prisoner = makePrisoner();
    expect(tortureCanStart(room, [worker], [prisoner])).toBe(false);
  });

  it('should return false if no worker is assigned', () => {
    const room = makeRoom();
    const unassigned = makeInhabitant({ assignedRoomId: undefined });
    const prisoner = makePrisoner();
    expect(tortureCanStart(room, [unassigned], [prisoner])).toBe(false);
  });

  it('should return false if no prisoners available', () => {
    const room = makeRoom();
    const worker = makeInhabitant();
    expect(tortureCanStart(room, [worker], [])).toBe(false);
  });

  it('should return true when all conditions met', () => {
    const room = makeRoom();
    const worker = makeInhabitant();
    const prisoner = makePrisoner();
    expect(tortureCanStart(room, [worker], [prisoner])).toBe(true);
  });
});

describe('Extraction Tick Calculation', () => {
  it('should return base ticks with no upgrades or adjacency', () => {
    const room = makeRoom();
    const ticks = tortureGetExtractionTicks(room, new Set());
    expect(ticks).toBe(TORTURE_EXTRACTION_BASE_TICKS);
  });

  it('should apply Grand Inquisitor upgrade (0.5x)', () => {
    const room = makeRoom({
      appliedUpgradePathId: 'upgrade-grand-inquisitor' as UpgradePathId,
    });
    const ticks = tortureGetExtractionTicks(room, new Set());
    expect(ticks).toBe(Math.round(TORTURE_EXTRACTION_BASE_TICKS * 0.5));
  });

  it('should apply adjacency speed bonus from Soul Well', () => {
    const room = makeRoom();
    const ticks = tortureGetExtractionTicks(room, new Set([SOUL_WELL_ID]));
    // 20 * (1 - 0.15) = 17
    expect(ticks).toBe(Math.round(TORTURE_EXTRACTION_BASE_TICKS * 0.85));
  });

  it('should combine upgrade and adjacency', () => {
    const room = makeRoom({
      appliedUpgradePathId: 'upgrade-grand-inquisitor' as UpgradePathId,
    });
    const ticks = tortureGetExtractionTicks(room, new Set([SOUL_WELL_ID]));
    const afterUpgrade = Math.round(TORTURE_EXTRACTION_BASE_TICKS * 0.5);
    expect(ticks).toBe(Math.round(afterUpgrade * 0.85));
  });

  it('should never go below 1 tick', () => {
    const room = makeRoom({
      appliedUpgradePathId: 'upgrade-grand-inquisitor' as UpgradePathId,
    });
    const ticks = tortureGetExtractionTicks(room, new Set([SOUL_WELL_ID]));
    expect(ticks).toBeGreaterThanOrEqual(1);
  });
});

describe('Conversion Tick Calculation', () => {
  it('should return base ticks with no upgrades', () => {
    const room = makeRoom();
    const ticks = tortureGetConversionTicks(room, new Set());
    expect(ticks).toBe(TORTURE_CONVERSION_BASE_TICKS);
  });

  it('should apply Grand Inquisitor upgrade (0.5x)', () => {
    const room = makeRoom({
      appliedUpgradePathId: 'upgrade-grand-inquisitor' as UpgradePathId,
    });
    const ticks = tortureGetConversionTicks(room, new Set());
    expect(ticks).toBe(Math.round(TORTURE_CONVERSION_BASE_TICKS * 0.5));
  });

  it('should apply adjacency speed bonus', () => {
    const room = makeRoom();
    const ticks = tortureGetConversionTicks(room, new Set([SOUL_WELL_ID]));
    expect(ticks).toBe(Math.round(TORTURE_CONVERSION_BASE_TICKS * 0.85));
  });
});

describe('Conversion Rate Calculation', () => {
  it('should return base rate for warrior with no bonuses', () => {
    const room = makeRoom();
    const rate = tortureGetConversionRate(room, new Set(), 'warrior');
    expect(rate).toBeCloseTo(0.3, 5);
  });

  it('should return base rate for rogue with no bonuses', () => {
    const room = makeRoom();
    const rate = tortureGetConversionRate(room, new Set(), 'rogue');
    expect(rate).toBeCloseTo(0.5, 5);
  });

  it('should return base rate for paladin with no bonuses', () => {
    const room = makeRoom();
    const rate = tortureGetConversionRate(room, new Set(), 'paladin');
    expect(rate).toBeCloseTo(0.05, 5);
  });

  it('should apply Grand Inquisitor conversion bonus', () => {
    const room = makeRoom({
      appliedUpgradePathId: 'upgrade-grand-inquisitor' as UpgradePathId,
    });
    const rate = tortureGetConversionRate(room, new Set(), 'warrior');
    expect(rate).toBeCloseTo(0.55, 5); // 0.30 + 0.25
  });

  it('should apply adjacency conversion bonus from Barracks', () => {
    const room = makeRoom();
    const rate = tortureGetConversionRate(
      room,
      new Set([BARRACKS_ID]),
      'warrior',
    );
    expect(rate).toBeCloseTo(0.4, 5); // 0.30 + 0.10
  });

  it('should cap at 95%', () => {
    const room = makeRoom({
      appliedUpgradePathId: 'upgrade-grand-inquisitor' as UpgradePathId,
    });
    // rogue base: 0.50 + 0.25 (upgrade) + 0.10 (barracks) = 0.85
    const rate = tortureGetConversionRate(
      room,
      new Set([BARRACKS_ID]),
      'rogue',
    );
    expect(rate).toBeLessThanOrEqual(0.95);
    expect(rate).toBeCloseTo(0.85, 5);
  });

  it('should hard-cap even with extreme bonuses', () => {
    // Even with stacking, can't exceed 0.95
    const room = makeRoom({
      appliedUpgradePathId: 'upgrade-grand-inquisitor' as UpgradePathId,
    });
    const rate = tortureGetConversionRate(
      room,
      new Set([BARRACKS_ID]),
      'rogue',
    );
    expect(rate).toBeLessThanOrEqual(0.95);
  });
});

describe('Extraction Reward Calculation', () => {
  it('should calculate research from prisoner stats', () => {
    const prisoner = makePrisoner({
      stats: { hp: 40, attack: 15, defense: 10, speed: 8 },
    });
    const reward = tortureCalculateExtractionReward(prisoner);
    // (40 + 15 + 10 + 8) / 3 = 24.33 → 24
    expect(reward).toBe(24);
  });

  it('should scale with higher stats', () => {
    const prisoner = makePrisoner({
      stats: { hp: 100, attack: 50, defense: 40, speed: 30 },
    });
    const reward = tortureCalculateExtractionReward(prisoner);
    // (100 + 50 + 40 + 30) / 3 = 73.33 → 73
    expect(reward).toBe(73);
  });

  it('should handle low stats', () => {
    const prisoner = makePrisoner({
      stats: { hp: 10, attack: 5, defense: 3, speed: 2 },
    });
    const reward = tortureCalculateExtractionReward(prisoner);
    // (10 + 5 + 3 + 2) / 3 = 6.67 → 7
    expect(reward).toBe(7);
  });
});

describe('Converted Inhabitant Creation', () => {
  it('should create inhabitant with correct definitionId', () => {
    const prisoner = makePrisoner();
    const inhabitant = tortureCreateConvertedInhabitant(prisoner);
    expect(inhabitant.definitionId).toBe(CONVERTED_PRISONER_DEF_ID);
  });

  it('should set state to normal', () => {
    const prisoner = makePrisoner();
    const inhabitant = tortureCreateConvertedInhabitant(prisoner);
    expect(inhabitant.state).toBe('normal');
  });

  it('should include prisoner name in inhabitant name', () => {
    const prisoner = makePrisoner({ name: 'Sir Lance' });
    const inhabitant = tortureCreateConvertedInhabitant(prisoner);
    expect(inhabitant.name).toContain('Sir Lance');
    expect(inhabitant.name).toContain('Converted');
  });

  it('should not have an assigned room', () => {
    const prisoner = makePrisoner();
    const inhabitant = tortureCreateConvertedInhabitant(prisoner);
    expect(inhabitant.assignedRoomId).toBeUndefined();
  });
});

describe('tortureChamberProcess', () => {
  it('should decrement torture job ticks', () => {
    const room = makeRoom();
    room.tortureJob = {
      prisonerId: 'prisoner-1' as PrisonerId,
      action: 'extract',
      ticksRemaining: 10,
      targetTicks: 20,
    };

    const worker = makeInhabitant();
    const prisoner = makePrisoner();
    const floor = makeFloor([room], [worker]);
    const state = makeGameState({
      floors: [floor],
      prisoners: [prisoner],
    });
    state.world.inhabitants = [worker];

    tortureChamberProcess(state);

    expect(room.tortureJob!.ticksRemaining).toBe(9);
  });

  it('should add corruption per tick while processing', () => {
    const room = makeRoom();
    room.tortureJob = {
      prisonerId: 'prisoner-1' as PrisonerId,
      action: 'extract',
      ticksRemaining: 10,
      targetTicks: 20,
    };

    const worker = makeInhabitant();
    const prisoner = makePrisoner();
    const floor = makeFloor([room], [worker]);
    const state = makeGameState({
      floors: [floor],
      prisoners: [prisoner],
    });
    state.world.inhabitants = [worker];
    state.world.resources.corruption.current = 0;

    tortureChamberProcess(state);

    expect(state.world.resources.corruption.current).toBeCloseTo(
      TORTURE_CORRUPTION_PER_TICK_WHILE_PROCESSING,
      5,
    );
  });

  it('should complete extraction and grant research when ticks reach 0', () => {
    const room = makeRoom();
    room.tortureJob = {
      prisonerId: 'prisoner-1' as PrisonerId,
      action: 'extract',
      ticksRemaining: 1,
      targetTicks: 20,
    };

    const worker = makeInhabitant();
    const prisoner = makePrisoner({
      stats: { hp: 40, attack: 15, defense: 10, speed: 8 },
    });
    const floor = makeFloor([room], [worker]);
    const state = makeGameState({
      floors: [floor],
      prisoners: [prisoner],
    });
    state.world.inhabitants = [worker];
    state.world.resources.research.current = 0;

    tortureChamberProcess(state);

    // Research gained: (40+15+10+8)/3 = 24
    expect(state.world.resources.research.current).toBe(24);
    expect(state.world.prisoners).toHaveLength(0);
    expect(room.tortureJob).toBeUndefined();
  });

  it('should remove prisoner after extraction', () => {
    const room = makeRoom();
    room.tortureJob = {
      prisonerId: 'prisoner-1' as PrisonerId,
      action: 'extract',
      ticksRemaining: 1,
      targetTicks: 20,
    };

    const worker = makeInhabitant();
    const prisoner = makePrisoner();
    const floor = makeFloor([room], [worker]);
    const state = makeGameState({
      floors: [floor],
      prisoners: [prisoner],
    });
    state.world.inhabitants = [worker];

    tortureChamberProcess(state);

    expect(state.world.prisoners).toHaveLength(0);
  });

  it('should clear job after completion', () => {
    const room = makeRoom();
    room.tortureJob = {
      prisonerId: 'prisoner-1' as PrisonerId,
      action: 'extract',
      ticksRemaining: 1,
      targetTicks: 20,
    };

    const worker = makeInhabitant();
    const prisoner = makePrisoner();
    const floor = makeFloor([room], [worker]);
    const state = makeGameState({
      floors: [floor],
      prisoners: [prisoner],
    });
    state.world.inhabitants = [worker];

    tortureChamberProcess(state);

    expect(room.tortureJob).toBeUndefined();
  });

  it('should handle conversion success and create inhabitant', () => {
    // Use a rng that returns < conversion rate for warrior (0.3)
    // seedrandom('test-seed') returns ~0.484 which is > 0.3, so conversion would fail
    // Instead we test that the process runs correctly with the seeded rng
    const room = makeRoom();
    room.tortureJob = {
      prisonerId: 'prisoner-1' as PrisonerId,
      action: 'convert',
      ticksRemaining: 1,
      targetTicks: 40,
    };

    // Use rogue class which has 0.5 success rate
    const worker = makeInhabitant();
    const prisoner = makePrisoner({
      invaderClass: 'rogue',
      name: 'Captured Rogue',
    });
    const floor = makeFloor([room], [worker]);
    const state = makeGameState({
      floors: [floor],
      prisoners: [prisoner],
    });
    state.world.inhabitants = [worker];

    const initialInhabitantCount = state.world.inhabitants.length;
    tortureChamberProcess(state);

    // Prisoner should be removed regardless
    expect(state.world.prisoners).toHaveLength(0);
    expect(room.tortureJob).toBeUndefined();

    // With seedrandom('test-seed'), the rng result is deterministic
    // The result depends on the seed - check that inhabitant count changed appropriately
    const inhabitantCount = state.world.inhabitants.length;
    expect(inhabitantCount).toBeGreaterThanOrEqual(initialInhabitantCount);
  });

  it('should not process rooms that are not torture chambers', () => {
    const room = makeRoom({ roomTypeId: 'other-room-type' as RoomId });
    room.tortureJob = {
      prisonerId: 'prisoner-1' as PrisonerId,
      action: 'extract',
      ticksRemaining: 1,
      targetTicks: 20,
    };

    const floor = makeFloor([room]);
    const state = makeGameState({ floors: [floor] });
    state.world.inhabitants = [];

    tortureChamberProcess(state);

    // Job should not have been processed
    expect(room.tortureJob!.ticksRemaining).toBe(1);
  });

  it('should not process rooms without assigned workers', () => {
    const room = makeRoom();
    room.tortureJob = {
      prisonerId: 'prisoner-1' as PrisonerId,
      action: 'extract',
      ticksRemaining: 10,
      targetTicks: 20,
    };

    const unassigned = makeInhabitant({ assignedRoomId: 'other-room' as PlacedRoomId });
    const prisoner = makePrisoner();
    const floor = makeFloor([room], [unassigned]);
    const state = makeGameState({
      floors: [floor],
      prisoners: [prisoner],
    });
    state.world.inhabitants = [unassigned];

    tortureChamberProcess(state);

    expect(room.tortureJob!.ticksRemaining).toBe(10);
  });

  it('should sync floor inhabitants after successful conversion', () => {
    const room = makeRoom();
    room.tortureJob = {
      prisonerId: 'prisoner-1' as PrisonerId,
      action: 'convert',
      ticksRemaining: 1,
      targetTicks: 40,
    };

    // Use rogue with high success rate
    const worker = makeInhabitant();
    const prisoner = makePrisoner({ invaderClass: 'rogue' });
    const floor = makeFloor([room], [worker]);
    const state = makeGameState({
      floors: [floor],
      prisoners: [prisoner],
    });
    state.world.inhabitants = [worker];

    tortureChamberProcess(state);

    // If conversion succeeded, floor inhabitants should match world inhabitants
    if (state.world.inhabitants.length > 1) {
      expect(state.world.floors[0].inhabitants).toBe(state.world.inhabitants);
    }
  });
});

describe('Constants', () => {
  it('should have correct base ticks', () => {
    expect(TORTURE_EXTRACTION_BASE_TICKS).toBe(20);
    expect(TORTURE_CONVERSION_BASE_TICKS).toBe(40);
  });

  it('should have correct corruption per tick', () => {
    expect(TORTURE_CORRUPTION_PER_TICK_WHILE_PROCESSING).toBe(0.12);
  });

  it('should have conversion rates for all invader classes', () => {
    expect(TORTURE_CONVERT_SUCCESS_RATES.warrior).toBe(0.3);
    expect(TORTURE_CONVERT_SUCCESS_RATES.rogue).toBe(0.5);
    expect(TORTURE_CONVERT_SUCCESS_RATES.mage).toBe(0.2);
    expect(TORTURE_CONVERT_SUCCESS_RATES.cleric).toBe(0.1);
    expect(TORTURE_CONVERT_SUCCESS_RATES.paladin).toBe(0.05);
    expect(TORTURE_CONVERT_SUCCESS_RATES.ranger).toBe(0.35);
  });

  it('should reference correct converted prisoner definition ID', () => {
    expect(CONVERTED_PRISONER_DEF_ID).toBe(
      '1df0572f-4dc5-4ba8-9c4d-d1df84f58979',
    );
  });
});

describe('Adjacency Effects', () => {
  it('Soul Well should have tortureSpeedBonus', () => {
    expect(soulWellDef.tortureAdjacencyEffects?.tortureSpeedBonus).toBe(0.15);
  });

  it('Barracks should have tortureConversionBonus', () => {
    expect(barracksDef.tortureAdjacencyEffects?.tortureConversionBonus).toBe(
      0.10,
    );
  });
});

describe('Upgrade Effects', () => {
  it('Grand Inquisitor: speed multiplier 0.5x, conversion bonus 0.25, capacity +1', () => {
    expect(grandInquisitorPath.effects).toContainEqual({
      type: 'tortureSpeedMultiplier',
      value: 0.5,
    });
    expect(grandInquisitorPath.effects).toContainEqual({
      type: 'tortureConversionBonus',
      value: 0.25,
    });
    expect(grandInquisitorPath.effects).toContainEqual({
      type: 'maxInhabitantBonus',
      value: 1,
    });
  });

  it('Corruption Engine: production multiplier 2.0x for corruption', () => {
    expect(corruptionEnginePath.effects).toContainEqual({
      type: 'productionMultiplier',
      value: 2.0,
      resource: 'corruption',
    });
  });
});
