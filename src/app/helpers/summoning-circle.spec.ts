import type {
  Floor,
  FloorId,
  GameState,
  InhabitantDefinition,
  InhabitantId,
  InhabitantInstance,
  InhabitantInstanceId,
  IsContentItem,
  PlacedRoom,
  PlacedRoomId,
  RoomDefinition,
  RoomId,
  RoomShapeId,
  RoomUpgradePath,
  SummonRecipeContent,
  SummonRecipeId,
  UpgradePathId,
} from '@interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Constants ---

const SUMMONING_CIRCLE_ID = 'sc100001-0001-0001-0001-000000000001';
const LIBRARY_ID = 'sc100001-0001-0001-0001-000000000002';
const SOUL_WELL_ID = 'sc100001-0001-0001-0001-000000000003';
const FIRE_ELEMENTAL_ID = 'sc200001-0001-0001-0001-000000000001';
const SPECTRAL_SERVANT_ID = 'sc200001-0001-0001-0001-000000000002';
const GOBLIN_ID = 'sc200001-0001-0001-0001-000000000003';
const RECIPE_FIRE_ID = 'sc300001-0001-0001-0001-000000000001';
const RECIPE_SPECTRAL_ID = 'sc300001-0001-0001-0001-000000000002';
const RECIPE_ADVANCED_ID = 'sc300001-0001-0001-0001-000000000003';

// --- Upgrade paths ---

const greaterSummoningPath: RoomUpgradePath = {
  id: 'upgrade-greater-summoning' as UpgradePathId,
  name: 'Greater Summoning',
  description: 'Unlock advanced recipes.',
  cost: { gold: 200, essence: 100, flux: 50 },
  effects: [{ type: 'summonTierUnlock', value: 1 }],
};

const dualCirclePath: RoomUpgradePath = {
  id: 'upgrade-dual-circle' as UpgradePathId,
  name: 'Dual Circle',
  description: 'Additional summoner slot.',
  cost: { gold: 150, crystals: 80 },
  effects: [{ type: 'maxInhabitantBonus', value: 1 }],
};

const bindingMasteryPath: RoomUpgradePath = {
  id: 'upgrade-binding-mastery' as UpgradePathId,
  name: 'Binding Mastery',
  description: 'Longer temp, +1 stats.',
  cost: { gold: 180, essence: 60, flux: 40 },
  effects: [
    { type: 'summonDurationMultiplier', value: 1.5 },
    { type: 'summonStatBonus', value: 1 },
  ],
};

// --- Mock content ---

const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  contentGetEntry: (id: string) => mockContent.get(id) ?? undefined,
  contentGetEntriesByType: vi.fn((type: string) => {
    if (type === 'summonrecipe') {
      return [...mockContent.values()].filter(
        (v) => (v as { __type?: string }).__type === 'summonrecipe',
      );
    }
    return [];
  }),
}));

vi.mock('@helpers/room-roles', () => ({
  roomRoleFindById: vi.fn((role: string) => {
    if (role === 'summoningCircle') return SUMMONING_CIRCLE_ID;
    return undefined;
  }),
  roomRoleResetCache: vi.fn(),
}));

vi.mock('@helpers/room-upgrades', async () => {
  return {
    roomUpgradeGetAppliedEffects: (room: PlacedRoom) => {
      if (!room.appliedUpgradePathId) return [];
      const paths = [greaterSummoningPath, dualCirclePath, bindingMasteryPath];
      const path = paths.find((p) => p.id === room.appliedUpgradePathId);
      return path?.effects ?? [];
    },
  };
});

vi.mock('@helpers/rng', () => ({
  rngChoice: (choices: unknown[]) => choices[0],
  rngUuid: () => 'test-uuid-' + Math.random().toString(36).slice(2, 8),
}));

vi.mock('@helpers/adjacency', () => ({
  adjacencyAreRoomsAdjacent: () => false,
}));

vi.mock('@helpers/room-shapes', () => ({
  roomShapeResolve: () => ({ tiles: [{ x: 0, y: 0 }], width: 1, height: 1 }),
  roomShapeGetAbsoluteTiles: (_shape: unknown, x: number, y: number) => [{ x, y }],
}));

// --- Inhabitant definitions ---

const fireElementalDef: InhabitantDefinition & IsContentItem = {
  id: FIRE_ELEMENTAL_ID as InhabitantId,
  name: 'Fire Elemental',
  __type: 'inhabitant',
  type: 'demon',
  tier: 2,
  description: 'A fire elemental.',
  cost: {},
  stats: { hp: 80, attack: 30, defense: 15, speed: 14, workerEfficiency: 0.8 },
  traits: [],
  restrictionTags: ['summoned'],
  rulerBonuses: {},
  rulerFearLevel: 0,
};

const spectralServantDef: InhabitantDefinition & IsContentItem = {
  id: SPECTRAL_SERVANT_ID as InhabitantId,
  name: 'Spectral Servant',
  __type: 'inhabitant',
  type: 'undead',
  tier: 1,
  description: 'A spectral servant.',
  cost: {},
  stats: { hp: 10, attack: 2, defense: 2, speed: 15, workerEfficiency: 1.5 },
  traits: [],
  restrictionTags: ['summoned'],
  rulerBonuses: {},
  rulerFearLevel: 0,
};

const goblinDef: InhabitantDefinition & IsContentItem = {
  id: GOBLIN_ID as InhabitantId,
  name: 'Goblin',
  __type: 'inhabitant',
  type: 'creature',
  tier: 1,
  description: 'A goblin.',
  cost: { gold: 50 },
  stats: { hp: 30, attack: 10, defense: 8, speed: 12, workerEfficiency: 1.0 },
  traits: [],
  restrictionTags: [],
  rulerBonuses: {},
  rulerFearLevel: 0,
};

// --- Recipe definitions ---

const fireRecipe: SummonRecipeContent & IsContentItem = {
  id: RECIPE_FIRE_ID as SummonRecipeContent['id'],
  name: 'Summon Fire Elemental',
  __type: 'summonrecipe',
  description: 'Summon a fire elemental.',
  resultInhabitantId: FIRE_ELEMENTAL_ID as InhabitantId,
  summonType: 'permanent',
  cost: { essence: 100, crystals: 50 },
  timeMultiplier: 1.0,
  statBonuses: { attack: 5 },
  tier: 'rare',
};

const spectralRecipe: SummonRecipeContent & IsContentItem = {
  id: RECIPE_SPECTRAL_ID as SummonRecipeContent['id'],
  name: 'Summon Spectral Servant',
  __type: 'summonrecipe',
  description: 'Summon a temp servant.',
  resultInhabitantId: SPECTRAL_SERVANT_ID as InhabitantId,
  summonType: 'temporary',
  duration: 50,
  cost: { essence: 30 },
  timeMultiplier: 0.5,
  statBonuses: {},
  tier: 'rare',
};

const advancedRecipe: SummonRecipeContent & IsContentItem = {
  id: RECIPE_ADVANCED_ID as SummonRecipeContent['id'],
  name: 'Advanced Summon',
  __type: 'summonrecipe',
  description: 'An advanced recipe.',
  resultInhabitantId: FIRE_ELEMENTAL_ID as InhabitantId,
  summonType: 'permanent',
  cost: { essence: 200 },
  timeMultiplier: 1.5,
  statBonuses: { attack: 10 },
  tier: 'advanced',
};

// --- Room definitions ---

const summoningCircleDef: RoomDefinition & IsContentItem = {
  id: SUMMONING_CIRCLE_ID as RoomId,
  name: 'Summoning Circle',
  __type: 'room',
  description: 'Summons creatures.',
  shapeId: 'shape-l' as RoomShapeId,
  cost: { gold: 150, essence: 80, flux: 40 },
  production: {},
  requiresWorkers: false,
  maxInhabitants: 1,
  inhabitantRestriction: undefined,
  fearLevel: 3,
  fearReductionAura: 0,
  adjacencyBonuses: [],
  isUnique: false,
  removable: true,
  upgradePaths: [greaterSummoningPath, dualCirclePath, bindingMasteryPath],
  autoPlace: false,
  role: 'summoningCircle',
};

const libraryDef: RoomDefinition & IsContentItem = {
  id: LIBRARY_ID as RoomId,
  name: 'Shadow Library',
  __type: 'room',
  description: 'Library.',
  shapeId: 'shape-bar' as RoomShapeId,
  cost: {},
  production: {},
  requiresWorkers: false,
  maxInhabitants: 1,
  inhabitantRestriction: undefined,
  fearLevel: 2,
  fearReductionAura: 0,
  adjacencyBonuses: [],
  isUnique: false,
  removable: true,
  upgradePaths: [],
  autoPlace: false,
  summoningAdjacencyEffects: { summonTimeReduction: 0.25 },
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
  summoningAdjacencyEffects: { summonStatBonus: 2 },
};

// --- Helpers ---

function makeRoom(overrides: Partial<PlacedRoom> = {}): PlacedRoom {
  return {
    id: 'summoning-1' as PlacedRoomId,
    roomTypeId: SUMMONING_CIRCLE_ID as RoomId,
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
    name: 'Goblin the Bold',
    state: 'normal',
    assignedRoomId: 'summoning-1' as PlacedRoomId,
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
        unlockedContent: { rooms: [], inhabitants: [], abilities: [], upgrades: [], passiveBonuses: [] },
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
    },
  };
}

// --- Import after mocks ---

import {
  SUMMONING_BASE_TICKS,
  summoningCanStart,
  summoningCreateInhabitant,
  summoningGetAvailableRecipes,
  summoningGetEffectiveDuration,
  summoningGetEffectiveTicks,
  summoningGetStatBonuses,
  summoningCircleProcess,
} from '@helpers/summoning-circle';

// --- Setup ---

beforeEach(() => {
  mockContent.clear();
  mockContent.set(SUMMONING_CIRCLE_ID, summoningCircleDef);
  mockContent.set(LIBRARY_ID, libraryDef);
  mockContent.set(SOUL_WELL_ID, soulWellDef);
  mockContent.set(FIRE_ELEMENTAL_ID, fireElementalDef);
  mockContent.set(SPECTRAL_SERVANT_ID, spectralServantDef);
  mockContent.set(GOBLIN_ID, goblinDef);
  mockContent.set(RECIPE_FIRE_ID, fireRecipe);
  mockContent.set(RECIPE_SPECTRAL_ID, spectralRecipe);
  mockContent.set(RECIPE_ADVANCED_ID, advancedRecipe);
});

// --- Tests ---

describe('Summoning Circle Room Definition', () => {
  it('should have correct definition properties', () => {
    expect(summoningCircleDef.maxInhabitants).toBe(1);
    expect(summoningCircleDef.fearLevel).toBe(3);
    expect(summoningCircleDef.role).toBe('summoningCircle');
    expect(summoningCircleDef.requiresWorkers).toBe(false);
    expect(summoningCircleDef.cost).toEqual({ gold: 150, essence: 80, flux: 40 });
  });

  it('should have 3 upgrade paths', () => {
    expect(summoningCircleDef.upgradePaths).toHaveLength(3);
    expect(summoningCircleDef.upgradePaths[0].name).toBe('Greater Summoning');
    expect(summoningCircleDef.upgradePaths[1].name).toBe('Dual Circle');
    expect(summoningCircleDef.upgradePaths[2].name).toBe('Binding Mastery');
  });
});

describe('Recipe Availability', () => {
  it('should return only rare recipes without upgrade', () => {
    const room = makeRoom();
    const recipes = summoningGetAvailableRecipes(room);
    expect(recipes).toHaveLength(2); // fire + spectral (both rare)
    expect(recipes.every((r) => r.tier === 'rare')).toBe(true);
  });

  it('should include advanced recipes with Greater Summoning upgrade', () => {
    const room = makeRoom({ appliedUpgradePathId: 'upgrade-greater-summoning' as UpgradePathId });
    const recipes = summoningGetAvailableRecipes(room);
    expect(recipes).toHaveLength(3); // fire + spectral + advanced
    expect(recipes.some((r) => r.tier === 'advanced')).toBe(true);
  });
});

describe('Summon Tick Calculation', () => {
  it('should return base ticks with multiplier 1.0 and no adjacency', () => {
    const room = makeRoom();
    const ticks = summoningGetEffectiveTicks(room, new Set(), 1.0);
    expect(ticks).toBe(SUMMONING_BASE_TICKS);
  });

  it('should apply recipe time multiplier', () => {
    const room = makeRoom();
    const ticks = summoningGetEffectiveTicks(room, new Set(), 0.5);
    expect(ticks).toBe(Math.round(SUMMONING_BASE_TICKS * 0.5));
  });

  it('should apply adjacency time reduction from Library', () => {
    const room = makeRoom();
    const ticks = summoningGetEffectiveTicks(room, new Set([LIBRARY_ID]), 1.0);
    expect(ticks).toBe(Math.round(SUMMONING_BASE_TICKS * 0.75));
  });

  it('should combine recipe multiplier and adjacency reduction', () => {
    const room = makeRoom();
    const ticks = summoningGetEffectiveTicks(room, new Set([LIBRARY_ID]), 0.5);
    const afterRecipe = Math.round(SUMMONING_BASE_TICKS * 0.5);
    expect(ticks).toBe(Math.round(afterRecipe * 0.75));
  });

  it('should never go below 1 tick', () => {
    const room = makeRoom();
    const ticks = summoningGetEffectiveTicks(room, new Set([LIBRARY_ID]), 0.01);
    expect(ticks).toBeGreaterThanOrEqual(1);
  });
});

describe('Stat Bonus Calculation', () => {
  it('should return recipe stat bonuses with no upgrade or adjacency', () => {
    const room = makeRoom();
    const bonuses = summoningGetStatBonuses(room, new Set(), fireRecipe);
    expect(bonuses.attack).toBe(5);
  });

  it('should add Binding Mastery upgrade bonus to all stats', () => {
    const room = makeRoom({ appliedUpgradePathId: 'upgrade-binding-mastery' as UpgradePathId });
    const bonuses = summoningGetStatBonuses(room, new Set(), fireRecipe);
    // attack: 5 (recipe) + 1 (upgrade) = 6
    expect(bonuses.attack).toBe(6);
    // hp/defense/speed: 0 (recipe) + 1 (upgrade) = 1
    expect(bonuses.hp).toBe(1);
    expect(bonuses.defense).toBe(1);
    expect(bonuses.speed).toBe(1);
  });

  it('should add Soul Well adjacency bonus to all stats', () => {
    const room = makeRoom();
    const bonuses = summoningGetStatBonuses(room, new Set([SOUL_WELL_ID]), fireRecipe);
    // attack: 5 (recipe) + 2 (adjacency) = 7
    expect(bonuses.attack).toBe(7);
    expect(bonuses.hp).toBe(2);
    expect(bonuses.defense).toBe(2);
    expect(bonuses.speed).toBe(2);
  });

  it('should combine upgrade and adjacency bonuses', () => {
    const room = makeRoom({ appliedUpgradePathId: 'upgrade-binding-mastery' as UpgradePathId });
    const bonuses = summoningGetStatBonuses(room, new Set([SOUL_WELL_ID]), fireRecipe);
    // attack: 5 (recipe) + 1 (upgrade) + 2 (adjacency) = 8
    expect(bonuses.attack).toBe(8);
    // hp: 0 + 1 + 2 = 3
    expect(bonuses.hp).toBe(3);
  });
});

describe('Duration Calculation', () => {
  it('should return base duration without upgrade', () => {
    const room = makeRoom();
    const duration = summoningGetEffectiveDuration(room, 50);
    expect(duration).toBe(50);
  });

  it('should apply Binding Mastery multiplier', () => {
    const room = makeRoom({ appliedUpgradePathId: 'upgrade-binding-mastery' as UpgradePathId });
    const duration = summoningGetEffectiveDuration(room, 50);
    expect(duration).toBe(75); // 50 * 1.5
  });
});

describe('Summoning Can Start', () => {
  it('should return true when inhabitant is assigned and no active job', () => {
    const room = makeRoom();
    const inhabitants = [makeInhabitant()];
    expect(summoningCanStart(room, inhabitants)).toBe(true);
  });

  it('should return false when no inhabitants are assigned', () => {
    const room = makeRoom();
    const inhabitants = [makeInhabitant({ assignedRoomId: 'other-room' as PlacedRoomId })];
    expect(summoningCanStart(room, inhabitants)).toBe(false);
  });

  it('should return false when there is an active summon job', () => {
    const room = makeRoom();
    room.summonJob = { recipeId: RECIPE_FIRE_ID as SummonRecipeId, ticksRemaining: 10, targetTicks: 20 };
    const inhabitants = [makeInhabitant()];
    expect(summoningCanStart(room, inhabitants)).toBe(false);
  });
});

describe('Inhabitant Creation', () => {
  it('should create a permanent summoned inhabitant', () => {
    const inh = summoningCreateInhabitant(fireElementalDef, fireRecipe, { attack: 5 }, false);
    expect(inh.isSummoned).toBe(true);
    expect(inh.isTemporary).toBeUndefined();
    expect(inh.temporaryTicksRemaining).toBeUndefined();
    expect(inh.definitionId).toBe(FIRE_ELEMENTAL_ID);
    expect(inh.name).toContain('Fire Elemental');
    expect(inh.mutationBonuses?.attack).toBe(5);
  });

  it('should create a temporary summoned inhabitant', () => {
    const inh = summoningCreateInhabitant(spectralServantDef, spectralRecipe, {}, true, 50);
    expect(inh.isSummoned).toBe(true);
    expect(inh.isTemporary).toBe(true);
    expect(inh.temporaryTicksRemaining).toBe(50);
  });

  it('should not set mutationBonuses when empty', () => {
    const inh = summoningCreateInhabitant(spectralServantDef, spectralRecipe, {}, true, 50);
    expect(inh.mutationBonuses).toBeUndefined();
  });
});

describe('summoningCircleProcess', () => {
  it('should decrement summon job ticks', () => {
    const room = makeRoom();
    room.summonJob = {
      recipeId: RECIPE_FIRE_ID as SummonRecipeId,
      ticksRemaining: 10,
      targetTicks: 20,
    };

    const summoner = makeInhabitant();
    const floor = makeFloor([room], [summoner]);
    const state = makeGameState({ floors: [floor] });
    state.world.inhabitants = [summoner];

    summoningCircleProcess(state);

    expect(room.summonJob!.ticksRemaining).toBe(9);
  });

  it('should complete summon job when ticks reach 0', () => {
    const room = makeRoom();
    room.summonJob = {
      recipeId: RECIPE_FIRE_ID as SummonRecipeId,
      ticksRemaining: 1,
      targetTicks: 20,
    };

    const summoner = makeInhabitant();
    const floor = makeFloor([room], [summoner]);
    const state = makeGameState({ floors: [floor] });
    state.world.inhabitants = [summoner];

    summoningCircleProcess(state);

    // Summoner stays, new creature added
    expect(state.world.inhabitants).toHaveLength(2);
    const summoned = state.world.inhabitants[1];
    expect(summoned.isSummoned).toBe(true);
    expect(summoned.name).toContain('Fire Elemental');
    expect(room.summonJob).toBeUndefined();
  });

  it('should create temporary inhabitant with duration for temp recipe', () => {
    const room = makeRoom();
    room.summonJob = {
      recipeId: RECIPE_SPECTRAL_ID as SummonRecipeId,
      ticksRemaining: 1,
      targetTicks: 10,
    };

    const summoner = makeInhabitant();
    const floor = makeFloor([room], [summoner]);
    const state = makeGameState({ floors: [floor] });
    state.world.inhabitants = [summoner];

    summoningCircleProcess(state);

    const summoned = state.world.inhabitants[1];
    expect(summoned.isTemporary).toBe(true);
    expect(summoned.temporaryTicksRemaining).toBe(50);
  });

  it('should decrement temporary inhabitant ticks', () => {
    const room = makeRoom();
    const tempInh = makeInhabitant({
      instanceId: 'temp-1' as InhabitantInstanceId,
      isTemporary: true,
      temporaryTicksRemaining: 10,
      isSummoned: true,
    });
    const floor = makeFloor([room], [tempInh]);
    const state = makeGameState({ floors: [floor] });
    state.world.inhabitants = [tempInh];

    summoningCircleProcess(state);

    expect(state.world.inhabitants[0].temporaryTicksRemaining).toBe(9);
  });

  it('should remove temporary inhabitant when ticks reach 0', () => {
    const room = makeRoom();
    const tempInh = makeInhabitant({
      instanceId: 'temp-1' as InhabitantInstanceId,
      isTemporary: true,
      temporaryTicksRemaining: 1,
      isSummoned: true,
    });
    const floor = makeFloor([room], [tempInh]);
    const state = makeGameState({ floors: [floor] });
    state.world.inhabitants = [tempInh];

    summoningCircleProcess(state);

    expect(state.world.inhabitants).toHaveLength(0);
  });

  it('should sync floor inhabitants after summon completion', () => {
    const room = makeRoom();
    room.summonJob = {
      recipeId: RECIPE_FIRE_ID as SummonRecipeId,
      ticksRemaining: 1,
      targetTicks: 20,
    };

    const summoner = makeInhabitant();
    const floor = makeFloor([room], [summoner]);
    const state = makeGameState({ floors: [floor] });
    state.world.inhabitants = [summoner];

    summoningCircleProcess(state);

    expect(state.world.floors[0].inhabitants).toBe(state.world.inhabitants);
  });

  it('should sync floor inhabitants after temporary expiry', () => {
    const room = makeRoom();
    const tempInh = makeInhabitant({
      instanceId: 'temp-1' as InhabitantInstanceId,
      isTemporary: true,
      temporaryTicksRemaining: 1,
      isSummoned: true,
    });
    const floor = makeFloor([room], [tempInh]);
    const state = makeGameState({ floors: [floor] });
    state.world.inhabitants = [tempInh];

    summoningCircleProcess(state);

    expect(state.world.floors[0].inhabitants).toBe(state.world.inhabitants);
  });

  it('should not process rooms that are not summoning circles', () => {
    const room = makeRoom({ roomTypeId: 'other-room-type' as RoomId });
    room.summonJob = {
      recipeId: RECIPE_FIRE_ID as SummonRecipeId,
      ticksRemaining: 1,
      targetTicks: 20,
    };

    const floor = makeFloor([room]);
    const state = makeGameState({ floors: [floor] });
    state.world.inhabitants = [];

    summoningCircleProcess(state);

    expect(room.summonJob!.ticksRemaining).toBe(1);
  });
});

describe('Upgrade Effects', () => {
  it('Greater Summoning: unlocks advanced tier', () => {
    expect(greaterSummoningPath.effects).toContainEqual({
      type: 'summonTierUnlock',
      value: 1,
    });
  });

  it('Dual Circle: adds capacity', () => {
    expect(dualCirclePath.effects).toContainEqual({
      type: 'maxInhabitantBonus',
      value: 1,
    });
  });

  it('Binding Mastery: duration multiplier and stat bonus', () => {
    expect(bindingMasteryPath.effects).toContainEqual({
      type: 'summonDurationMultiplier',
      value: 1.5,
    });
    expect(bindingMasteryPath.effects).toContainEqual({
      type: 'summonStatBonus',
      value: 1,
    });
  });
});

describe('Adjacency Effects', () => {
  it('Shadow Library should have summonTimeReduction', () => {
    expect(libraryDef.summoningAdjacencyEffects?.summonTimeReduction).toBe(0.25);
  });

  it('Soul Well should have summonStatBonus', () => {
    expect(soulWellDef.summoningAdjacencyEffects?.summonStatBonus).toBe(2);
  });
});
