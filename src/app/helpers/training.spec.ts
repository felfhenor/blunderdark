import type {
  Floor,
  FloorId,
  GameId,
  GameState,
  GridState,
  InhabitantId,
  InhabitantInstance,
  InhabitantInstanceId,
  InhabitantTraitContent,
  InhabitantTraitId,
  PlacedRoom,
  PlacedRoomId,
  ReputationState,
  ResearchState,
  ResourceMap,
  RoomContent,
  RoomId,
  RoomShapeId,
  RoomUpgradeContent,
  RoomUpgradeId,
  SeasonState,
} from '@interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Constants ---

const TRAINING_GROUNDS_ID = 'aa100001-0001-0001-0001-000000000012';
const BARRACKS_ID = 'aa100001-0001-0001-0001-000000000007';
const ALTAR_ID = 'aa100001-0001-0001-0001-000000000009';

// --- Training trait IDs ---

const TRAIT_BASIC_ATK_ID = 'trait-basic-atk' as InhabitantTraitId;
const TRAIT_BASIC_DEF_ID = 'trait-basic-def' as InhabitantTraitId;
const TRAIT_ELITE_ATK_ID = 'trait-elite-atk' as InhabitantTraitId;
const TRAIT_ADV_DEF_ID = 'trait-adv-def' as InhabitantTraitId;
const TRAIT_WORK_COND_ID = 'trait-work-cond' as InhabitantTraitId;

// --- Training traits ---

const traitBasicAtk: InhabitantTraitContent = {
  id: TRAIT_BASIC_ATK_ID,
  __type: 'inhabitanttrait',
  name: 'Basic Attack Training',
  description: '+5 attack',
  effects: [{ effectType: 'attack_flat', effectValue: 5 }],
  fusionPassChance: 0,
  isFromTraining: true,
};

const traitBasicDef: InhabitantTraitContent = {
  id: TRAIT_BASIC_DEF_ID,
  __type: 'inhabitanttrait',
  name: 'Basic Defense Training',
  description: '+5 defense',
  effects: [{ effectType: 'defense_flat', effectValue: 5 }],
  fusionPassChance: 0,
  isFromTraining: true,
};

const traitEliteAtk: InhabitantTraitContent = {
  id: TRAIT_ELITE_ATK_ID,
  __type: 'inhabitanttrait',
  name: 'Elite Attack Training',
  description: '+15 attack',
  effects: [{ effectType: 'attack_flat', effectValue: 15 }],
  fusionPassChance: 0,
  isFromTraining: true,
};

const traitAdvDef: InhabitantTraitContent = {
  id: TRAIT_ADV_DEF_ID,
  __type: 'inhabitanttrait',
  name: 'Advanced Defense Training',
  description: '+15 defense',
  effects: [{ effectType: 'defense_flat', effectValue: 15 }],
  fusionPassChance: 0,
  isFromTraining: true,
};

const traitWorkCond: InhabitantTraitContent = {
  id: TRAIT_WORK_COND_ID,
  __type: 'inhabitanttrait',
  name: 'Work Conditioning',
  description: '+50% worker efficiency',
  effects: [{ effectType: 'worker_efficiency_multiplier', effectValue: 0.5 }],
  fusionPassChance: 0,
  isFromTraining: true,
};

// --- Upgrade paths ---

const eliteArenaPath: RoomUpgradeContent = {
  id: 'upgrade-elite-arena' as RoomUpgradeId,
  __type: 'roomupgrade',
  name: 'Elite Arena',
  description: 'Grants elite attack training (+15 attack).',
  cost: { gold: 100, crystals: 50, essence: 20 },
  effects: [{ type: 'trainingTrait', value: 1, resource: 'Elite Attack Training' }],
};

const drillHallPath: RoomUpgradeContent = {
  id: 'upgrade-drill-hall' as RoomUpgradeId,
  __type: 'roomupgrade',
  name: 'Drill Hall',
  description: 'Grants advanced defense training (+15 defense).',
  cost: { gold: 120, crystals: 60, essence: 30 },
  effects: [{ type: 'trainingTrait', value: 1, resource: 'Advanced Defense Training' }],
};

const conditioningYardPath: RoomUpgradeContent = {
  id: 'upgrade-conditioning-yard' as RoomUpgradeId,
  __type: 'roomupgrade',
  name: 'Conditioning Yard',
  description: 'Grants work conditioning (+50% worker efficiency).',
  cost: { gold: 80, crystals: 30 },
  effects: [{ type: 'trainingTrait', value: 1, resource: 'Work Conditioning' }],
};

// --- Mock content ---

const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  contentGetEntry: (id: string) => mockContent.get(id) ?? undefined,
  contentGetEntriesByType: () => [],
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
    { adjacentRoomId: ALTAR_ID, bonus: 0.15, description: '' },
  ],
  isUnique: false,
  removable: true,
  maxInhabitants: 4,
  inhabitantRestriction: undefined,
  fearLevel: 1,
  fearReductionAura: 0,
  autoPlace: false,
  roomUpgradeIds: [
    'upgrade-elite-arena' as RoomUpgradeId,
    'upgrade-drill-hall' as RoomUpgradeId,
    'upgrade-conditioning-yard' as RoomUpgradeId,
  ],
  trainingTraitNames: ['Basic Attack Training', 'Basic Defense Training'],
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
  autoPlace: false,
  trainingAdjacencyEffects: { timeReduction: 0.2 },
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

// --- Imports after mocks ---

import {
  productionCalculateAdjacencyBonus,
  productionGetBase,
} from '@helpers/production';
import {
  roomUpgradeCanApply,
  roomUpgradeGetPaths,
} from '@helpers/room-upgrades';
import {
  TRAINING_BASE_TICKS,
  trainingGetCurrentTraitIds,
  trainingGetProgressPercent,
  trainingGetTicksForRoom,
  trainingGetTraitIdsForRoom,
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
    grid: { tiles: [] } as unknown as GridState,
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
    gameId: 'test-game' as GameId,
    clock: {
      numTicks: 0,
      lastSaveTick: 0,
      day: 1,
      hour: 0,
      minute: 0,
    },
    world: {
      grid: { tiles: [] } as unknown as GridState,
      resources: {} as ResourceMap,
      inhabitants,
      hallways: [],
      season: {} as SeasonState,
      research: {} as ResearchState,
      reputation: {} as ReputationState,
      floors,
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
        gracePeriodEnd: 5,
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

// --- Tests ---

beforeEach(() => {
  mockContent.set(TRAINING_GROUNDS_ID, trainingGroundsRoom);
  mockContent.set(BARRACKS_ID, barracksRoom);
  mockContent.set(eliteArenaPath.id, eliteArenaPath);
  mockContent.set(drillHallPath.id, drillHallPath);
  mockContent.set(conditioningYardPath.id, conditioningYardPath);

  // Register training traits by both ID and name
  for (const trait of [traitBasicAtk, traitBasicDef, traitEliteAtk, traitAdvDef, traitWorkCond]) {
    mockContent.set(trait.id, trait);
    mockContent.set(trait.name, trait);
  }
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

  it('should have base training traits defined', () => {
    expect(trainingGroundsRoom.trainingTraitNames).toEqual([
      'Basic Attack Training',
      'Basic Defense Training',
    ]);
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
  it('should return base ticks with no adjacency', () => {
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
});

describe('Training Grounds: training trait IDs for room', () => {
  it('should return base traits for un-upgraded room', () => {
    const room = createPlacedTrainingGrounds();
    const traitIds = trainingGetTraitIdsForRoom(room);
    expect(traitIds).toEqual([
      TRAIT_BASIC_ATK_ID,
      TRAIT_BASIC_DEF_ID,
    ]);
  });

  it('should return elite attack trait for Elite Arena upgrade', () => {
    const room = createPlacedTrainingGrounds({
      appliedUpgradePathId: 'upgrade-elite-arena' as RoomUpgradeId,
    });
    const traitIds = trainingGetTraitIdsForRoom(room);
    expect(traitIds).toEqual([TRAIT_ELITE_ATK_ID]);
  });

  it('should return advanced defense trait for Drill Hall upgrade', () => {
    const room = createPlacedTrainingGrounds({
      appliedUpgradePathId: 'upgrade-drill-hall' as RoomUpgradeId,
    });
    const traitIds = trainingGetTraitIdsForRoom(room);
    expect(traitIds).toEqual([TRAIT_ADV_DEF_ID]);
  });

  it('should return work conditioning trait for Conditioning Yard upgrade', () => {
    const room = createPlacedTrainingGrounds({
      appliedUpgradePathId: 'upgrade-conditioning-yard' as RoomUpgradeId,
    });
    const traitIds = trainingGetTraitIdsForRoom(room);
    expect(traitIds).toEqual([TRAIT_WORK_COND_ID]);
  });
});

describe('Training Grounds: trainingGetCurrentTraitIds', () => {
  it('should return empty for inhabitant with no traits', () => {
    expect(trainingGetCurrentTraitIds(undefined)).toEqual([]);
    expect(trainingGetCurrentTraitIds([])).toEqual([]);
  });

  it('should return only training traits', () => {
    const ids = [TRAIT_BASIC_ATK_ID as string, 'some-non-training-trait'];
    const result = trainingGetCurrentTraitIds(ids);
    expect(result).toEqual([TRAIT_BASIC_ATK_ID]);
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
    expect(state.world.inhabitants[0].instanceTraitIds).toBeUndefined();
  });

  it('should not increment progress for already-trained inhabitants with matching traits', () => {
    const tg = createPlacedTrainingGrounds();
    const inhabitant = createInhabitant({
      assignedRoomId: 'placed-tg-1' as PlacedRoomId,
      trainingProgress: 0,
      instanceTraitIds: [TRAIT_BASIC_ATK_ID as string, TRAIT_BASIC_DEF_ID as string],
    });
    const floor = makeFloor([tg], [inhabitant]);
    const state = makeGameState([floor], [inhabitant]);

    trainingProcess(state);

    expect(state.world.inhabitants[0].trainingProgress).toBe(0);
    expect(state.world.inhabitants[0].instanceTraitIds).toEqual([
      TRAIT_BASIC_ATK_ID,
      TRAIT_BASIC_DEF_ID,
    ]);
  });

  it('should not affect inhabitants in other rooms', () => {
    const tg = createPlacedTrainingGrounds();
    const inhabitant = createInhabitant({
      assignedRoomId: 'other-room' as PlacedRoomId,
    });
    const floor = makeFloor([tg], [inhabitant]);
    const state = makeGameState([floor], [inhabitant]);

    trainingProcess(state);

    expect(state.world.inhabitants[0].trainingProgress).toBeUndefined();
  });

  it('should grant training traits when progress reaches target', () => {
    const tg = createPlacedTrainingGrounds();
    const inhabitant = createInhabitant({
      assignedRoomId: 'placed-tg-1' as PlacedRoomId,
      trainingProgress: TRAINING_BASE_TICKS - 1,
    });
    const floor = makeFloor([tg], [inhabitant]);
    const state = makeGameState([floor], [inhabitant]);

    trainingProcess(state);

    expect(state.world.inhabitants[0].instanceTraitIds).toEqual([
      TRAIT_BASIC_ATK_ID,
      TRAIT_BASIC_DEF_ID,
    ]);
    expect(state.world.inhabitants[0].trainingProgress).toBe(0);
  });

  it('should grant elite attack trait with Elite Arena upgrade', () => {
    const tg = createPlacedTrainingGrounds({
      appliedUpgradePathId: 'upgrade-elite-arena' as RoomUpgradeId,
    });
    const inhabitant = createInhabitant({
      assignedRoomId: 'placed-tg-1' as PlacedRoomId,
      trainingProgress: TRAINING_BASE_TICKS - 1,
    });
    const floor = makeFloor([tg], [inhabitant]);
    const state = makeGameState([floor], [inhabitant]);

    trainingProcess(state);

    expect(state.world.inhabitants[0].instanceTraitIds).toEqual([TRAIT_ELITE_ATK_ID]);
    expect(state.world.inhabitants[0].trainingProgress).toBe(0);
  });

  it('should apply Barracks adjacency to reduce training time', () => {
    const tg = createPlacedTrainingGrounds({ anchorX: 0, anchorY: 0 });
    const barracks: PlacedRoom = {
      id: 'placed-barracks' as PlacedRoomId,
      roomTypeId: BARRACKS_ID as RoomId,
      shapeId: 'shape-i' as RoomShapeId,
      anchorX: 3,
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

    expect(state.world.inhabitants[0].instanceTraitIds).toEqual([
      TRAIT_BASIC_ATK_ID,
      TRAIT_BASIC_DEF_ID,
    ]);
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
    expect(state.world.inhabitants[0].instanceTraitIds).toBeUndefined();
    expect(state.world.inhabitants[1].instanceTraitIds).toEqual([
      TRAIT_BASIC_ATK_ID,
      TRAIT_BASIC_DEF_ID,
    ]);
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

    expect(state.world.inhabitants[0].trainingProgress).toBeUndefined();
  });
});

describe('Training Grounds: retraining', () => {
  it('should retrain when moved to a room with different upgrade', () => {
    const tg = createPlacedTrainingGrounds({
      appliedUpgradePathId: 'upgrade-elite-arena' as RoomUpgradeId,
    });
    // Inhabitant has base training traits (from an un-upgraded room)
    const inhabitant = createInhabitant({
      assignedRoomId: 'placed-tg-1' as PlacedRoomId,
      instanceTraitIds: [TRAIT_BASIC_ATK_ID as string, TRAIT_BASIC_DEF_ID as string],
      trainingProgress: 0,
    });
    const floor = makeFloor([tg], [inhabitant]);
    const state = makeGameState([floor], [inhabitant]);

    trainingProcess(state);

    // Old traits should be removed, progress should be reset and start from 1
    expect(state.world.inhabitants[0].instanceTraitIds).toEqual([]);
    expect(state.world.inhabitants[0].trainingProgress).toBe(1);
  });

  it('should complete retraining and grant new traits', () => {
    const tg = createPlacedTrainingGrounds({
      appliedUpgradePathId: 'upgrade-drill-hall' as RoomUpgradeId,
    });
    // Inhabitant has base training traits, nearly done retraining
    const inhabitant = createInhabitant({
      assignedRoomId: 'placed-tg-1' as PlacedRoomId,
      trainingProgress: TRAINING_BASE_TICKS - 1,
    });
    const floor = makeFloor([tg], [inhabitant]);
    const state = makeGameState([floor], [inhabitant]);

    trainingProcess(state);

    expect(state.world.inhabitants[0].instanceTraitIds).toEqual([TRAIT_ADV_DEF_ID]);
  });

  it('should preserve non-training instance traits during retraining', () => {
    const tg = createPlacedTrainingGrounds({
      appliedUpgradePathId: 'upgrade-elite-arena' as RoomUpgradeId,
    });
    const nonTrainingTraitId = 'some-breeding-trait';
    const inhabitant = createInhabitant({
      assignedRoomId: 'placed-tg-1' as PlacedRoomId,
      instanceTraitIds: [
        nonTrainingTraitId,
        TRAIT_BASIC_ATK_ID as string,
        TRAIT_BASIC_DEF_ID as string,
      ],
      trainingProgress: 0,
    });
    const floor = makeFloor([tg], [inhabitant]);
    const state = makeGameState([floor], [inhabitant]);

    trainingProcess(state);

    // Non-training trait should be preserved, training traits removed
    expect(state.world.inhabitants[0].instanceTraitIds).toContain(nonTrainingTraitId);
    expect(state.world.inhabitants[0].instanceTraitIds).not.toContain(TRAIT_BASIC_ATK_ID);
    expect(state.world.inhabitants[0].instanceTraitIds).not.toContain(TRAIT_BASIC_DEF_ID);
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
});

describe('Training Grounds: upgrade paths', () => {
  it('should have Elite Arena upgrade with trainingTrait effect', () => {
    const paths = roomUpgradeGetPaths(TRAINING_GROUNDS_ID as RoomId);
    const elite = paths.find((p) => p.name === 'Elite Arena');
    expect(elite).toBeDefined();
    expect(elite!.effects[0].type).toBe('trainingTrait');
    expect(elite!.effects[0].resource).toBe('Elite Attack Training');
  });

  it('should have Drill Hall upgrade with trainingTrait effect', () => {
    const paths = roomUpgradeGetPaths(TRAINING_GROUNDS_ID as RoomId);
    const drills = paths.find((p) => p.name === 'Drill Hall');
    expect(drills).toBeDefined();
    expect(drills!.effects[0].type).toBe('trainingTrait');
    expect(drills!.effects[0].resource).toBe('Advanced Defense Training');
  });

  it('should have Conditioning Yard upgrade with trainingTrait effect', () => {
    const paths = roomUpgradeGetPaths(TRAINING_GROUNDS_ID as RoomId);
    const cond = paths.find((p) => p.name === 'Conditioning Yard');
    expect(cond).toBeDefined();
    expect(cond!.effects[0].type).toBe('trainingTrait');
    expect(cond!.effects[0].resource).toBe('Work Conditioning');
  });
});

describe('Training Grounds: upgrade mutual exclusivity', () => {
  it('should prevent applying a second upgrade', () => {
    const room = createPlacedTrainingGrounds({
      appliedUpgradePathId: 'upgrade-elite-arena' as RoomUpgradeId,
    });
    const result = roomUpgradeCanApply(room, 'upgrade-drill-hall');
    expect(result.valid).toBe(false);
  });

  it('should allow applying an upgrade to an un-upgraded room', () => {
    const room = createPlacedTrainingGrounds();
    const result = roomUpgradeCanApply(room, 'upgrade-elite-arena');
    expect(result.valid).toBe(true);
  });
});
