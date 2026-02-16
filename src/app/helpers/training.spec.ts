import type {
  Floor,
  FloorId,
  GameState,
  InhabitantId,
  InhabitantInstance,
  InhabitantInstanceId,
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

const TRAINING_GROUNDS_ID = 'aa100001-0001-0001-0001-000000000012';
const BARRACKS_ID = 'aa100001-0001-0001-0001-000000000007';
const DARK_FORGE_ID = 'aa100001-0001-0001-0001-000000000006';
const ALTAR_ID = 'aa100001-0001-0001-0001-000000000009';

// --- Upgrade paths ---

const eliteTrainingPath: RoomUpgradePath = {
  id: 'upgrade-elite-training' as UpgradePathId,
  name: 'Elite Training',
  description: 'Grants +1 attack, training takes 20% longer.',
  cost: { gold: 100, crystals: 50, essence: 20 },
  effects: [
    { type: 'trainingAttackBonus', value: 1 },
    { type: 'trainingTimeMultiplier', value: 1.2 },
  ],
};

const massTrainingPath: RoomUpgradePath = {
  id: 'upgrade-mass-training' as UpgradePathId,
  name: 'Mass Training',
  description: 'Increases capacity and reduces training time.',
  cost: { gold: 80, crystals: 30 },
  effects: [
    { type: 'maxInhabitantBonus', value: 2 },
    { type: 'trainingTimeMultiplier', value: 0.7 },
  ],
};

const specializedDrillsPath: RoomUpgradePath = {
  id: 'upgrade-specialized-drills' as UpgradePathId,
  name: 'Specialized Drills',
  description: 'Grants an extra +1 defense bonus.',
  cost: { gold: 120, crystals: 60, essence: 30 },
  effects: [{ type: 'trainingDefenseBonus', value: 1 }],
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
    if (role === 'trainingGrounds') return TRAINING_GROUNDS_ID;
    return undefined;
  }),
  roomRoleResetCache: vi.fn(),
}));

const trainingGroundsRoom: RoomContent = {
  id: TRAINING_GROUNDS_ID as RoomId,
  name: 'Training Grounds',
  __type: 'room',
  description: 'A combat training facility.',
  shapeId: 'shape-t' as RoomShapeId,
  cost: { gold: 80, crystals: 30 },
  production: {},
  requiresWorkers: false,
  adjacencyBonuses: [
    { adjacentRoomId: BARRACKS_ID, bonus: 0.2, description: '' },
    { adjacentRoomId: DARK_FORGE_ID, bonus: 0.1, description: '' },
    { adjacentRoomId: ALTAR_ID, bonus: 0.15, description: '' },
  ],
  isUnique: false,
  removable: true,
  maxInhabitants: 4,
  inhabitantRestriction: undefined,
  fearLevel: 1,
  fearReductionAura: 0,
  upgradePaths: [eliteTrainingPath, massTrainingPath, specializedDrillsPath],
  autoPlace: false,
};

const barracksRoom: RoomContent = {
  id: BARRACKS_ID as RoomId,
  name: 'Barracks',
  __type: 'room',
  description: '',
  shapeId: 'shape-i' as RoomShapeId,
  cost: {},
  production: {},
  requiresWorkers: false,
  adjacencyBonuses: [],
  isUnique: false,
  removable: true,
  maxInhabitants: 6,
  inhabitantRestriction: undefined,
  fearLevel: 1,
  fearReductionAura: 0,
  upgradePaths: [],
  autoPlace: false,
  trainingAdjacencyEffects: { timeReduction: 0.20 },
};

const altarRoom: RoomContent = {
  id: ALTAR_ID as RoomId,
  name: 'Altar Room',
  __type: 'room',
  description: '',
  shapeId: 'shape-3x3' as RoomShapeId,
  cost: {},
  production: {},
  requiresWorkers: false,
  adjacencyBonuses: [],
  isUnique: true,
  removable: false,
  maxInhabitants: 0,
  inhabitantRestriction: undefined,
  fearLevel: 0,
  fearReductionAura: 1,
  upgradePaths: [],
  autoPlace: true,
  trainingAdjacencyEffects: { statBonus: 1 },
};

// --- Shape mocks ---

mockContent.set('shape-t', {
  id: 'shape-t',
  name: 'T-Shape',
  __type: 'roomshape',
  width: 3,
  height: 2,
  tiles: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 1, y: 1 },
  ],
});

mockContent.set('shape-i', {
  id: 'shape-i',
  name: 'I-Shape',
  __type: 'roomshape',
  width: 1,
  height: 4,
  tiles: [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: 2 },
    { x: 0, y: 3 },
  ],
});

mockContent.set('shape-3x3', {
  id: 'shape-3x3',
  name: 'Square 3x3',
  __type: 'roomshape',
  width: 3,
  height: 3,
  tiles: [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
    { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
    { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 },
  ],
});

// --- Imports after mocks ---

import {
  productionCalculateAdjacencyBonus,
  productionGetBase,
} from '@helpers/production';
import {
  roomUpgradeCanApply,
  roomUpgradeGetEffectiveMaxInhabitants,
  roomUpgradeGetPaths,
} from '@helpers/room-upgrades';
import {
  TRAINING_BASE_TICKS,
  trainingGetBonusesForRoom,
  trainingGetProgressPercent,
  trainingGetTicksForRoom,
  trainingIsGroundsRoom,
  trainingProcess,
} from '@helpers/training';

// --- Helpers ---

function makeFloor(
  rooms: PlacedRoom[],
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

function createPlacedTrainingGrounds(
  overrides: Partial<PlacedRoom> = {},
): PlacedRoom {
  return {
    id: 'placed-tg-1' as PlacedRoomId,
    roomTypeId: TRAINING_GROUNDS_ID as RoomId,
    shapeId: 'shape-t' as RoomShapeId,
    anchorX: 0,
    anchorY: 0,
    ...overrides,
  };
}

function createInhabitant(
  overrides: Partial<InhabitantInstance> = {},
): InhabitantInstance {
  return {
    instanceId: 'inst-1' as InhabitantInstanceId,
    definitionId: 'def-goblin' as InhabitantId,
    name: 'Goblin 1',
    state: 'normal',
    assignedRoomId: undefined,
    trained: false,
    trainingProgress: 0,
    trainingBonuses: { defense: 0, attack: 0 },
    ...overrides,
  };
}

function makeGameState(
  floors: Floor[],
  inhabitants: InhabitantInstance[],
): GameState {
  return {
    meta: {
      version: 1,
      isSetup: true,
      isPaused: false,
      createdAt: Date.now(),
    },
    gameId: 'test-game' as GameState['gameId'],
    clock: {
      numTicks: 0,
      lastSaveTick: 0,
      day: 1,
      hour: 0,
      minute: 0,
    },
    world: {
      grid: { tiles: [] } as unknown as GameState['world']['grid'],
      resources: {} as GameState['world']['resources'],
      inhabitants,
      hallways: [],
      season: {} as GameState['world']['season'],
      research: {} as GameState['world']['research'],
      reputation: {} as GameState['world']['reputation'],
      floors,
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

// --- Tests ---

beforeEach(() => {
  mockContent.set(TRAINING_GROUNDS_ID, trainingGroundsRoom);
  mockContent.set(BARRACKS_ID, barracksRoom);
  mockContent.set(ALTAR_ID, altarRoom);
});

describe('Training Grounds: definition', () => {
  it('should use the T-shape', () => {
    expect(trainingGroundsRoom.shapeId).toBe('shape-t');
  });

  it('should have low fear level (1)', () => {
    expect(trainingGroundsRoom.fearLevel).toBe(1);
  });

  it('should have base capacity of 4 inhabitants', () => {
    expect(trainingGroundsRoom.maxInhabitants).toBe(4);
  });

  it('should not require workers', () => {
    expect(trainingGroundsRoom.requiresWorkers).toBe(false);
  });

  it('should have no production', () => {
    expect(trainingGroundsRoom.production).toEqual({});
  });

  it('should have 3 upgrade paths', () => {
    expect(trainingGroundsRoom.upgradePaths).toHaveLength(3);
  });

  it('should have 3 adjacency bonuses', () => {
    expect(trainingGroundsRoom.adjacencyBonuses).toHaveLength(3);
  });
});

describe('Training Grounds: trainingIsGroundsRoom', () => {
  it('should return true for Training Grounds type ID', () => {
    expect(trainingIsGroundsRoom(TRAINING_GROUNDS_ID as RoomId)).toBe(true);
  });

  it('should return false for other room types', () => {
    expect(trainingIsGroundsRoom(BARRACKS_ID as RoomId)).toBe(false);
  });
});

describe('Training Grounds: no production', () => {
  it('should have no base production', () => {
    const production = productionGetBase(TRAINING_GROUNDS_ID as RoomId);
    expect(production).toEqual({});
  });
});

describe('Training Grounds: training ticks', () => {
  it('should return base ticks with no adjacency or upgrades', () => {
    const room = createPlacedTrainingGrounds();
    const ticks = trainingGetTicksForRoom(room, new Set());
    expect(ticks).toBe(TRAINING_BASE_TICKS);
  });

  it('should reduce time by 20% when adjacent to Barracks', () => {
    const room = createPlacedTrainingGrounds();
    const adjacentTypes = new Set([BARRACKS_ID]);
    const ticks = trainingGetTicksForRoom(room, adjacentTypes);
    expect(ticks).toBe(Math.round(TRAINING_BASE_TICKS * 0.8));
  });

  it('should apply Mass Training time reduction (0.7x)', () => {
    const room = createPlacedTrainingGrounds({
      appliedUpgradePathId: 'upgrade-mass-training' as UpgradePathId,
    });
    const ticks = trainingGetTicksForRoom(room, new Set());
    expect(ticks).toBe(Math.round(TRAINING_BASE_TICKS * 0.7));
  });

  it('should apply Elite Training time increase (1.2x)', () => {
    const room = createPlacedTrainingGrounds({
      appliedUpgradePathId: 'upgrade-elite-training' as UpgradePathId,
    });
    const ticks = trainingGetTicksForRoom(room, new Set());
    expect(ticks).toBe(Math.round(TRAINING_BASE_TICKS * 1.2));
  });

  it('should combine upgrade and adjacency time modifiers', () => {
    const room = createPlacedTrainingGrounds({
      appliedUpgradePathId: 'upgrade-mass-training' as UpgradePathId,
    });
    const adjacentTypes = new Set([BARRACKS_ID]);
    const ticks = trainingGetTicksForRoom(room, adjacentTypes);
    // Mass Training: 25 * 0.7 = 17.5 → 18, then Barracks: 18 * 0.8 = 14.4 → 14
    const expected = Math.round(Math.round(TRAINING_BASE_TICKS * 0.7) * 0.8);
    expect(ticks).toBe(expected);
  });
});

describe('Training Grounds: training bonuses', () => {
  it('should grant +1 defense by default', () => {
    const room = createPlacedTrainingGrounds();
    const bonuses = trainingGetBonusesForRoom(room, new Set());
    expect(bonuses).toEqual({ defense: 1, attack: 0 });
  });

  it('should grant +1 attack with Elite Training upgrade', () => {
    const room = createPlacedTrainingGrounds({
      appliedUpgradePathId: 'upgrade-elite-training' as UpgradePathId,
    });
    const bonuses = trainingGetBonusesForRoom(room, new Set());
    expect(bonuses).toEqual({ defense: 1, attack: 1 });
  });

  it('should grant +2 defense with Specialized Drills upgrade', () => {
    const room = createPlacedTrainingGrounds({
      appliedUpgradePathId: 'upgrade-specialized-drills' as UpgradePathId,
    });
    const bonuses = trainingGetBonusesForRoom(room, new Set());
    expect(bonuses).toEqual({ defense: 2, attack: 0 });
  });

  it('should grant +1 to all stats when adjacent to Altar', () => {
    const room = createPlacedTrainingGrounds();
    const adjacentTypes = new Set([ALTAR_ID]);
    const bonuses = trainingGetBonusesForRoom(room, adjacentTypes);
    expect(bonuses).toEqual({ defense: 2, attack: 1 });
  });

  it('should combine upgrade and Altar adjacency bonuses', () => {
    const room = createPlacedTrainingGrounds({
      appliedUpgradePathId: 'upgrade-elite-training' as UpgradePathId,
    });
    const adjacentTypes = new Set([ALTAR_ID]);
    const bonuses = trainingGetBonusesForRoom(room, adjacentTypes);
    // Elite: +1 atk, base: +1 def, Altar: +1 all
    expect(bonuses).toEqual({ defense: 2, attack: 2 });
  });
});

describe('Training Grounds: training progress percent', () => {
  it('should return 0 for no progress', () => {
    expect(trainingGetProgressPercent(0, 25)).toBe(0);
  });

  it('should return 50 at halfway', () => {
    expect(trainingGetProgressPercent(12, 25)).toBe(48);
    expect(trainingGetProgressPercent(13, 25)).toBe(52);
  });

  it('should return 100 when complete', () => {
    expect(trainingGetProgressPercent(25, 25)).toBe(100);
  });

  it('should cap at 100 even if over', () => {
    expect(trainingGetProgressPercent(30, 25)).toBe(100);
  });

  it('should return 100 for zero target ticks', () => {
    expect(trainingGetProgressPercent(0, 0)).toBe(100);
  });
});

describe('Training Grounds: trainingProcess', () => {
  it('should increment training progress for untrained inhabitants', () => {
    const tg = createPlacedTrainingGrounds();
    const inhabitant = createInhabitant({
      assignedRoomId: 'placed-tg-1' as PlacedRoomId,
    });
    const floor = makeFloor([tg], [inhabitant]);
    const state = makeGameState([floor], [inhabitant]);

    trainingProcess(state);

    expect(state.world.inhabitants[0].trainingProgress).toBe(1);
    expect(state.world.inhabitants[0].trained).toBe(false);
  });

  it('should not increment progress for trained inhabitants', () => {
    const tg = createPlacedTrainingGrounds();
    const inhabitant = createInhabitant({
      assignedRoomId: 'placed-tg-1' as PlacedRoomId,
      trained: true,
      trainingProgress: 25,
      trainingBonuses: { defense: 1, attack: 0 },
    });
    const floor = makeFloor([tg], [inhabitant]);
    const state = makeGameState([floor], [inhabitant]);

    trainingProcess(state);

    expect(state.world.inhabitants[0].trainingProgress).toBe(25);
  });

  it('should not affect inhabitants in other rooms', () => {
    const tg = createPlacedTrainingGrounds();
    const inhabitant = createInhabitant({
      assignedRoomId: 'other-room' as PlacedRoomId,
    });
    const floor = makeFloor([tg], [inhabitant]);
    const state = makeGameState([floor], [inhabitant]);

    trainingProcess(state);

    expect(state.world.inhabitants[0].trainingProgress).toBe(0);
  });

  it('should mark inhabitant as trained when progress reaches target', () => {
    const tg = createPlacedTrainingGrounds();
    const inhabitant = createInhabitant({
      assignedRoomId: 'placed-tg-1' as PlacedRoomId,
      trainingProgress: TRAINING_BASE_TICKS - 1,
    });
    const floor = makeFloor([tg], [inhabitant]);
    const state = makeGameState([floor], [inhabitant]);

    trainingProcess(state);

    expect(state.world.inhabitants[0].trained).toBe(true);
    expect(state.world.inhabitants[0].trainingBonuses).toEqual({
      defense: 1,
      attack: 0,
    });
  });

  it('should apply Elite Training bonuses when upgrade is active', () => {
    const tg = createPlacedTrainingGrounds({
      appliedUpgradePathId: 'upgrade-elite-training' as UpgradePathId,
    });
    const targetTicks = Math.round(TRAINING_BASE_TICKS * 1.2);
    const inhabitant = createInhabitant({
      assignedRoomId: 'placed-tg-1' as PlacedRoomId,
      trainingProgress: targetTicks - 1,
    });
    const floor = makeFloor([tg], [inhabitant]);
    const state = makeGameState([floor], [inhabitant]);

    trainingProcess(state);

    expect(state.world.inhabitants[0].trained).toBe(true);
    expect(state.world.inhabitants[0].trainingBonuses).toEqual({
      defense: 1,
      attack: 1,
    });
  });

  it('should apply Altar adjacency bonus to training bonuses', () => {
    const tg = createPlacedTrainingGrounds({ anchorX: 0, anchorY: 0 });
    const altar: PlacedRoom = {
      id: 'placed-altar' as PlacedRoomId,
      roomTypeId: ALTAR_ID as RoomId,
      shapeId: 'shape-3x3' as RoomShapeId,
      anchorX: 3, // Adjacent: T-shape at (0,0) has tile at (2,0); altar at (3,0)
      anchorY: 0,
    };
    const inhabitant = createInhabitant({
      assignedRoomId: 'placed-tg-1' as PlacedRoomId,
      trainingProgress: TRAINING_BASE_TICKS - 1,
    });
    const floor = makeFloor([tg, altar], [inhabitant]);
    const state = makeGameState([floor], [inhabitant]);

    trainingProcess(state);

    expect(state.world.inhabitants[0].trained).toBe(true);
    expect(state.world.inhabitants[0].trainingBonuses).toEqual({
      defense: 2, // base 1 + altar 1
      attack: 1, // altar 1
    });
  });

  it('should apply Barracks adjacency to reduce training time', () => {
    const tg = createPlacedTrainingGrounds({ anchorX: 0, anchorY: 0 });
    const barracks: PlacedRoom = {
      id: 'placed-barracks' as PlacedRoomId,
      roomTypeId: BARRACKS_ID as RoomId,
      shapeId: 'shape-i' as RoomShapeId,
      anchorX: 3, // Adjacent: T-shape at (0,0) has tile at (2,0); barracks at (3,0)
      anchorY: 0,
    };
    const reducedTicks = Math.round(TRAINING_BASE_TICKS * 0.8);
    const inhabitant = createInhabitant({
      assignedRoomId: 'placed-tg-1' as PlacedRoomId,
      trainingProgress: reducedTicks - 1,
    });
    const floor = makeFloor([tg, barracks], [inhabitant]);
    const state = makeGameState([floor], [inhabitant]);

    trainingProcess(state);

    expect(state.world.inhabitants[0].trained).toBe(true);
  });

  it('should handle multiple inhabitants training simultaneously', () => {
    const tg = createPlacedTrainingGrounds();
    const inh1 = createInhabitant({
      instanceId: 'inst-1' as InhabitantInstanceId,
      assignedRoomId: 'placed-tg-1' as PlacedRoomId,
      trainingProgress: 1,
    });
    const inh2 = createInhabitant({
      instanceId: 'inst-2' as InhabitantInstanceId,
      name: 'Goblin 2',
      assignedRoomId: 'placed-tg-1' as PlacedRoomId,
      trainingProgress: TRAINING_BASE_TICKS - 1,
    });
    const floor = makeFloor([tg], [inh1, inh2]);
    const state = makeGameState([floor], [inh1, inh2]);

    trainingProcess(state);

    expect(state.world.inhabitants[0].trainingProgress).toBe(2);
    expect(state.world.inhabitants[0].trained).toBe(false);
    expect(state.world.inhabitants[1].trainingProgress).toBe(
      TRAINING_BASE_TICKS,
    );
    expect(state.world.inhabitants[1].trained).toBe(true);
  });

  it('should skip floors with no Training Grounds', () => {
    const barracks: PlacedRoom = {
      id: 'placed-barracks' as PlacedRoomId,
      roomTypeId: BARRACKS_ID as RoomId,
      shapeId: 'shape-i' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };
    const inhabitant = createInhabitant({
      assignedRoomId: 'placed-barracks' as PlacedRoomId,
    });
    const floor = makeFloor([barracks], [inhabitant]);
    const state = makeGameState([floor], [inhabitant]);

    trainingProcess(state);

    expect(state.world.inhabitants[0].trainingProgress).toBe(0);
  });
});

describe('Training Grounds: adjacency bonuses', () => {
  it('should apply +20% bonus when adjacent to Barracks', () => {
    const tg = createPlacedTrainingGrounds({ anchorX: 0, anchorY: 0 });
    const barracks: PlacedRoom = {
      id: 'placed-barracks' as PlacedRoomId,
      roomTypeId: BARRACKS_ID as RoomId,
      shapeId: 'shape-i' as RoomShapeId,
      anchorX: 3,
      anchorY: 0,
    };
    const allRooms = [tg, barracks];
    const bonus = productionCalculateAdjacencyBonus(
      tg,
      ['placed-barracks'],
      allRooms,
    );
    expect(bonus).toBeCloseTo(0.2);
  });

  it('should apply +15% bonus when adjacent to Altar', () => {
    const tg = createPlacedTrainingGrounds({ anchorX: 0, anchorY: 0 });
    const altar: PlacedRoom = {
      id: 'placed-altar' as PlacedRoomId,
      roomTypeId: ALTAR_ID as RoomId,
      shapeId: 'shape-3x3' as RoomShapeId,
      anchorX: 3,
      anchorY: 0,
    };
    const allRooms = [tg, altar];
    const bonus = productionCalculateAdjacencyBonus(
      tg,
      ['placed-altar'],
      allRooms,
    );
    expect(bonus).toBeCloseTo(0.15);
  });
});

describe('Training Grounds: upgrade paths', () => {
  it('should have Elite Training upgrade', () => {
    const paths = roomUpgradeGetPaths(TRAINING_GROUNDS_ID as RoomId);
    const elite = paths.find((p) => p.name === 'Elite Training');
    expect(elite).toBeDefined();
    expect(elite!.effects).toHaveLength(2);
  });

  it('should have Mass Training upgrade with maxInhabitantBonus', () => {
    const paths = roomUpgradeGetPaths(TRAINING_GROUNDS_ID as RoomId);
    const mass = paths.find((p) => p.name === 'Mass Training');
    expect(mass).toBeDefined();
    const capacityEffect = mass!.effects.find(
      (e) => e.type === 'maxInhabitantBonus',
    );
    expect(capacityEffect).toBeDefined();
    expect(capacityEffect!.value).toBe(2);
  });

  it('should increase capacity from 4 to 6 with Mass Training', () => {
    const room = createPlacedTrainingGrounds({
      appliedUpgradePathId: 'upgrade-mass-training' as UpgradePathId,
    });
    const effective = roomUpgradeGetEffectiveMaxInhabitants(room, trainingGroundsRoom);
    expect(effective).toBe(6);
  });

  it('should keep capacity at 4 without upgrade', () => {
    const room = createPlacedTrainingGrounds();
    const effective = roomUpgradeGetEffectiveMaxInhabitants(room, trainingGroundsRoom);
    expect(effective).toBe(4);
  });

  it('should have Specialized Drills with trainingDefenseBonus', () => {
    const paths = roomUpgradeGetPaths(TRAINING_GROUNDS_ID as RoomId);
    const drills = paths.find((p) => p.name === 'Specialized Drills');
    expect(drills).toBeDefined();
    expect(drills!.effects[0].type).toBe('trainingDefenseBonus');
    expect(drills!.effects[0].value).toBe(1);
  });
});

describe('Training Grounds: upgrade mutual exclusivity', () => {
  it('should prevent applying a second upgrade', () => {
    const room = createPlacedTrainingGrounds({
      appliedUpgradePathId: 'upgrade-elite-training' as UpgradePathId,
    });
    const result = roomUpgradeCanApply(room, 'upgrade-mass-training');
    expect(result.valid).toBe(false);
  });

  it('should allow applying an upgrade to an un-upgraded room', () => {
    const room = createPlacedTrainingGrounds();
    const result = roomUpgradeCanApply(room, 'upgrade-elite-training');
    expect(result.valid).toBe(true);
  });
});
