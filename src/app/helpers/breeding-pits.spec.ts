import type {
  BreedingRecipeContent,
  BreedingRecipeId,
  Floor,
  FloorId,
  GameState,
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
  UpgradePathId,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import seedrandom from 'seedrandom';

// --- Constants ---

const BREEDING_PITS_ID = 'bb100001-0001-0001-0001-000000000001';
const SPAWNING_POOL_ID = 'bb100001-0001-0001-0001-000000000002';
const SOUL_WELL_ID = 'bb100001-0001-0001-0001-000000000003';
const GOBLIN_ID = 'bb200001-0001-0001-0001-000000000001';
const KOBOLD_ID = 'bb200001-0001-0001-0001-000000000002';
const SKELETON_ID = 'bb200001-0001-0001-0001-000000000003';
const RECIPE_GOBLIN_KOBOLD_ID = 'bb300001-0001-0001-0001-000000000001';

// --- Upgrade paths ---

const enhancedIncubatorsPath: RoomUpgradePath = {
  id: 'upgrade-enhanced-incubators' as UpgradePathId,
  name: 'Enhanced Incubators',
  description: 'Reduce breeding time.',
  cost: { gold: 150, crystals: 80, essence: 40 },
  effects: [
    { type: 'breedingTimeMultiplier', value: 0.7 },
    { type: 'maxInhabitantBonus', value: 2 },
  ],
};

const mutationAmplifierPath: RoomUpgradePath = {
  id: 'upgrade-mutation-amplifier' as UpgradePathId,
  name: 'Mutation Amplifier',
  description: 'Better mutation odds.',
  cost: { gold: 130, crystals: 70, essence: 50 },
  effects: [
    { type: 'mutationOddsBonus', value: 0.15 },
    { type: 'mutationStatBonus', value: 0.25 },
  ],
};

// --- Mock content ---

const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  contentGetEntry: (id: string) => mockContent.get(id) ?? undefined,
  contentGetEntriesByType: vi.fn((type: string) => {
    if (type === 'breedingrecipe') {
      return [...mockContent.values()].filter(
        (v) => (v as { __type?: string }).__type === 'breedingrecipe',
      );
    }
    return [];
  }),
}));

vi.mock('@helpers/room-roles', () => ({
  roomRoleFindById: vi.fn((role: string) => {
    if (role === 'breedingPits') return BREEDING_PITS_ID;
    return undefined;
  }),
  roomRoleResetCache: vi.fn(),
}));

vi.mock('@helpers/room-upgrades', async () => {
  return {
    roomUpgradeGetAppliedEffects: (room: PlacedRoom) => {
      if (!room.appliedUpgradePathId) return [];
      const paths = [enhancedIncubatorsPath, mutationAmplifierPath];
      const path = paths.find((p) => p.id === room.appliedUpgradePathId);
      return path?.effects ?? [];
    },
  };
});

vi.mock('@helpers/rng', () => ({
  rngChoice: (choices: unknown[]) => choices[0],
  rngUuid: () => 'test-uuid-' + Math.random().toString(36).slice(2, 8),
  rngRandom: () => seedrandom('test-seed'),
}));

vi.mock('@helpers/adjacency', () => ({
  adjacencyAreRoomsAdjacent: () => false,
}));

vi.mock('@helpers/room-shapes', () => ({
  roomShapeResolve: () => ({ tiles: [{ x: 0, y: 0 }], width: 1, height: 1 }),
  roomShapeGetAbsoluteTiles: (_shape: unknown, x: number, y: number) => [{ x, y }],
}));

// --- Inhabitant definitions ---

const goblinDef: InhabitantContent = {
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

const koboldDef: InhabitantContent = {
  id: KOBOLD_ID as InhabitantId,
  name: 'Kobold',
  __type: 'inhabitant',
  type: 'creature',
  tier: 1,
  description: 'A kobold.',
  cost: { gold: 40 },
  stats: { hp: 20, attack: 8, defense: 5, speed: 18, workerEfficiency: 0.9 },
  traits: [],
  restrictionTags: [],
  rulerBonuses: {},
  rulerFearLevel: 0,
};

const skeletonDef: InhabitantContent = {
  id: SKELETON_ID as InhabitantId,
  name: 'Skeleton',
  __type: 'inhabitant',
  type: 'undead',
  tier: 1,
  description: 'A skeleton.',
  cost: { gold: 60 },
  stats: { hp: 40, attack: 12, defense: 15, speed: 6, workerEfficiency: 0.7 },
  traits: [],
  restrictionTags: [],
  rulerBonuses: {},
  rulerFearLevel: 0,
};

// --- Recipe definitions ---

const goblinKoboldRecipe: BreedingRecipeContent & IsContentItem = {
  id: RECIPE_GOBLIN_KOBOLD_ID as BreedingRecipeContent['id'],
  name: 'Goblin Trapper',
  __type: 'breedingrecipe',
  description: 'A hybrid.',
  parentInhabitantAId: GOBLIN_ID as InhabitantId,
  parentInhabitantBId: KOBOLD_ID as InhabitantId,
  resultName: 'Goblin Trapper',
  statBonuses: { speed: 3, attack: 2 },
  timeMultiplier: 1.0,
};

// --- Room definitions ---

const breedingPitsDef: RoomDefinition & IsContentItem = {
  id: BREEDING_PITS_ID as RoomId,
  name: 'Breeding Pits',
  __type: 'room',
  description: 'Breeds creatures.',
  shapeId: 'shape-3x3' as RoomShapeId,
  cost: { gold: 120, crystals: 60, essence: 30 },
  production: {},
  requiresWorkers: false,
  maxInhabitants: 4,
  inhabitantRestriction: undefined,
  fearLevel: 4,
  fearReductionAura: 0,
  adjacencyBonuses: [],
  isUnique: false,
  removable: true,
  upgradePaths: [enhancedIncubatorsPath, mutationAmplifierPath],
  autoPlace: false,
  role: 'breedingPits',
};

const spawningPoolDef: RoomDefinition & IsContentItem = {
  id: SPAWNING_POOL_ID as RoomId,
  name: 'Spawning Pool',
  __type: 'room',
  description: 'Spawns creatures.',
  shapeId: 'shape-2x2' as RoomShapeId,
  cost: {},
  production: {},
  requiresWorkers: false,
  maxInhabitants: 2,
  inhabitantRestriction: undefined,
  fearLevel: 1,
  fearReductionAura: 0,
  adjacencyBonuses: [],
  isUnique: false,
  removable: true,
  upgradePaths: [],
  autoPlace: false,
  breedingAdjacencyEffects: { hybridTimeReduction: 0.25 },
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
  breedingAdjacencyEffects: { mutationOddsBonus: 0.10 },
};

// --- Helpers ---

function makeRoom(overrides: Partial<PlacedRoom> = {}): PlacedRoom {
  return {
    id: 'breeding-1' as PlacedRoomId,
    roomTypeId: BREEDING_PITS_ID as RoomId,
    shapeId: 'shape-3x3' as RoomShapeId,
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
    assignedRoomId: 'breeding-1' as PlacedRoomId,
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
  BREEDING_BASE_TICKS,
  MUTATION_POSITIVE_CHANCE,
  breedingApplyMutation,
  breedingCalculateHybridStats,
  breedingCreateHybrid,
  breedingFindRecipe,
  breedingGetAvailableRecipes,
  breedingGetHybridTicks,
  breedingGetMutatableInhabitants,
  breedingGetMutationOdds,
  breedingPitsProcess,
  breedingRollMutationOutcome,
} from '@helpers/breeding-pits';

// --- Setup ---

beforeEach(() => {
  mockContent.clear();
  mockContent.set(BREEDING_PITS_ID, breedingPitsDef);
  mockContent.set(SPAWNING_POOL_ID, spawningPoolDef);
  mockContent.set(SOUL_WELL_ID, soulWellDef);
  mockContent.set(GOBLIN_ID, goblinDef);
  mockContent.set(KOBOLD_ID, koboldDef);
  mockContent.set(SKELETON_ID, skeletonDef);
  mockContent.set(RECIPE_GOBLIN_KOBOLD_ID, goblinKoboldRecipe);
});

// --- Tests ---

describe('Breeding Pits Room Definition', () => {
  it('should have correct definition properties', () => {
    expect(breedingPitsDef.maxInhabitants).toBe(4);
    expect(breedingPitsDef.fearLevel).toBe(4);
    expect(breedingPitsDef.role).toBe('breedingPits');
    expect(breedingPitsDef.requiresWorkers).toBe(false);
    expect(breedingPitsDef.cost).toEqual({ gold: 120, crystals: 60, essence: 30 });
  });

  it('should have 2 upgrade paths', () => {
    expect(breedingPitsDef.upgradePaths).toHaveLength(2);
    expect(breedingPitsDef.upgradePaths[0].name).toBe('Enhanced Incubators');
    expect(breedingPitsDef.upgradePaths[1].name).toBe('Mutation Amplifier');
  });
});

describe('Recipe Matching', () => {
  it('should find recipe for Goblin + Kobold', () => {
    const recipe = breedingFindRecipe(GOBLIN_ID, KOBOLD_ID);
    expect(recipe).toBeDefined();
    expect(recipe!.resultName).toBe('Goblin Trapper');
  });

  it('should find recipe in reverse order (Kobold + Goblin)', () => {
    const recipe = breedingFindRecipe(KOBOLD_ID, GOBLIN_ID);
    expect(recipe).toBeDefined();
    expect(recipe!.resultName).toBe('Goblin Trapper');
  });

  it('should return undefined for invalid pair', () => {
    const recipe = breedingFindRecipe(GOBLIN_ID, SKELETON_ID);
    expect(recipe).toBeUndefined();
  });
});

describe('Available Recipes', () => {
  it('should find available recipes from assigned inhabitants', () => {
    const goblin = makeInhabitant({ instanceId: 'g1' as InhabitantInstanceId, definitionId: GOBLIN_ID as InhabitantId });
    const kobold = makeInhabitant({ instanceId: 'k1' as InhabitantInstanceId, definitionId: KOBOLD_ID as InhabitantId });

    const recipes = breedingGetAvailableRecipes([goblin, kobold]);
    expect(recipes).toHaveLength(1);
    expect(recipes[0].recipe.resultName).toBe('Goblin Trapper');
  });

  it('should return empty when no valid pairs exist', () => {
    const goblin = makeInhabitant({ instanceId: 'g1' as InhabitantInstanceId, definitionId: GOBLIN_ID as InhabitantId });
    const skeleton = makeInhabitant({ instanceId: 's1' as InhabitantInstanceId, definitionId: SKELETON_ID as InhabitantId });

    const recipes = breedingGetAvailableRecipes([goblin, skeleton]);
    expect(recipes).toHaveLength(0);
  });

  it('should return empty for single inhabitant', () => {
    const goblin = makeInhabitant({ instanceId: 'g1' as InhabitantInstanceId, definitionId: GOBLIN_ID as InhabitantId });
    const recipes = breedingGetAvailableRecipes([goblin]);
    expect(recipes).toHaveLength(0);
  });
});

describe('Mutatable Inhabitants', () => {
  it('should return inhabitants that are not mutated', () => {
    const normal = makeInhabitant({ instanceId: 'n1' as InhabitantInstanceId, mutated: false });
    const mutated = makeInhabitant({ instanceId: 'm1' as InhabitantInstanceId, mutated: true });

    const result = breedingGetMutatableInhabitants([normal, mutated]);
    expect(result).toHaveLength(1);
    expect(result[0].instanceId).toBe('n1');
  });

  it('should return all if none are mutated', () => {
    const a = makeInhabitant({ instanceId: 'a' as InhabitantInstanceId, mutated: false });
    const b = makeInhabitant({ instanceId: 'b' as InhabitantInstanceId });

    const result = breedingGetMutatableInhabitants([a, b]);
    expect(result).toHaveLength(2);
  });
});

describe('Hybrid Tick Calculation', () => {
  it('should return base ticks with multiplier 1.0 and no upgrades', () => {
    const room = makeRoom();
    const ticks = breedingGetHybridTicks(room, new Set(), 1.0);
    expect(ticks).toBe(BREEDING_BASE_TICKS);
  });

  it('should apply recipe time multiplier', () => {
    const room = makeRoom();
    const ticks = breedingGetHybridTicks(room, new Set(), 1.5);
    expect(ticks).toBe(Math.round(BREEDING_BASE_TICKS * 1.5));
  });

  it('should apply Enhanced Incubators upgrade (0.7x)', () => {
    const room = makeRoom({ appliedUpgradePathId: 'upgrade-enhanced-incubators' as UpgradePathId });
    const ticks = breedingGetHybridTicks(room, new Set(), 1.0);
    expect(ticks).toBe(Math.round(BREEDING_BASE_TICKS * 0.7));
  });

  it('should apply adjacency hybridTimeReduction', () => {
    const room = makeRoom();
    const ticks = breedingGetHybridTicks(room, new Set([SPAWNING_POOL_ID]), 1.0);
    // 25 * (1 - 0.25) = 18.75 → 19
    expect(ticks).toBe(Math.round(BREEDING_BASE_TICKS * 0.75));
  });

  it('should combine upgrade and adjacency', () => {
    const room = makeRoom({ appliedUpgradePathId: 'upgrade-enhanced-incubators' as UpgradePathId });
    const ticks = breedingGetHybridTicks(room, new Set([SPAWNING_POOL_ID]), 1.0);
    // 25 * 0.7 = 17.5 → 18, then 18 * 0.75 = 13.5 → 14
    const afterUpgrade = Math.round(BREEDING_BASE_TICKS * 0.7);
    expect(ticks).toBe(Math.round(afterUpgrade * 0.75));
  });

  it('should never go below 1 tick', () => {
    const room = makeRoom({ appliedUpgradePathId: 'upgrade-enhanced-incubators' as UpgradePathId });
    const ticks = breedingGetHybridTicks(room, new Set([SPAWNING_POOL_ID]), 0.01);
    expect(ticks).toBeGreaterThanOrEqual(1);
  });
});

describe('Hybrid Stat Calculation', () => {
  it('should average parent stats and add recipe bonuses', () => {
    const stats = breedingCalculateHybridStats(goblinDef, koboldDef, goblinKoboldRecipe);
    // hp: avg(30, 20) = 25, attack: avg(10, 8) + 2 = 11
    // defense: avg(8, 5) = 7 (rounds), speed: avg(12, 18) + 3 = 18
    // workerEfficiency: (1.0 + 0.9) / 2 = 0.95
    expect(stats.hp).toBe(25);
    expect(stats.attack).toBe(11);
    expect(stats.defense).toBe(7);
    expect(stats.speed).toBe(18);
    expect(stats.workerEfficiency).toBe(0.95);
  });

  it('should apply statBonusMultiplier to recipe bonuses', () => {
    const stats = breedingCalculateHybridStats(goblinDef, koboldDef, goblinKoboldRecipe, 2.0);
    // speed: avg(12, 18) + 3*2 = 15 + 6 = 21
    // attack: avg(10, 8) + 2*2 = 9 + 4 = 13
    expect(stats.speed).toBe(21);
    expect(stats.attack).toBe(13);
  });
});

describe('Mutation Odds', () => {
  it('should return base odds with no upgrades or adjacency', () => {
    const room = makeRoom();
    const odds = breedingGetMutationOdds(room, new Set());
    expect(odds.positive).toBeCloseTo(MUTATION_POSITIVE_CHANCE, 5);
    expect(odds.positive + odds.neutral + odds.negative).toBeCloseTo(1.0, 5);
  });

  it('should increase positive odds with Mutation Amplifier upgrade', () => {
    const room = makeRoom({ appliedUpgradePathId: 'upgrade-mutation-amplifier' as UpgradePathId });
    const odds = breedingGetMutationOdds(room, new Set());
    expect(odds.positive).toBeCloseTo(0.75, 5);
  });

  it('should increase positive odds with Soul Well adjacency', () => {
    const room = makeRoom();
    const odds = breedingGetMutationOdds(room, new Set([SOUL_WELL_ID]));
    expect(odds.positive).toBeCloseTo(0.70, 5);
  });

  it('should cap positive at 0.95', () => {
    const room = makeRoom({ appliedUpgradePathId: 'upgrade-mutation-amplifier' as UpgradePathId });
    // 0.6 + 0.15 (upgrade) + 0.10 (adjacency) + ... would exceed
    // Let's just verify the cap with both
    const odds = breedingGetMutationOdds(room, new Set([SOUL_WELL_ID]));
    expect(odds.positive).toBeLessThanOrEqual(0.95);
    expect(odds.positive + odds.neutral + odds.negative).toBeCloseTo(1.0, 5);
  });
});

describe('Mutation Application', () => {
  it('should set mutated to true for positive outcome', () => {
    const inhabitant = makeInhabitant();
    const rng = seedrandom('fixed-seed');
    const result = breedingApplyMutation(inhabitant, 'positive', rng);
    expect(result.mutated).toBe(true);
  });

  it('should set mutated to true for neutral outcome', () => {
    const inhabitant = makeInhabitant();
    const rng = seedrandom('fixed-seed');
    const result = breedingApplyMutation(inhabitant, 'neutral', rng);
    expect(result.mutated).toBe(true);
  });

  it('should set mutated to true for negative outcome', () => {
    const inhabitant = makeInhabitant();
    const rng = seedrandom('fixed-seed');
    const result = breedingApplyMutation(inhabitant, 'negative', rng);
    expect(result.mutated).toBe(true);
  });

  it('should add positive bonus for positive outcome', () => {
    const inhabitant = makeInhabitant({ mutationBonuses: {} });
    const rng = seedrandom('fixed-seed');
    const result = breedingApplyMutation(inhabitant, 'positive', rng);
    const bonuses = result.mutationBonuses ?? {};
    const hasPositive = Object.values(bonuses).some((v) => v !== undefined && v > 0);
    expect(hasPositive).toBe(true);
  });

  it('should add negative bonus for negative outcome', () => {
    const inhabitant = makeInhabitant({ mutationBonuses: {} });
    const rng = seedrandom('fixed-seed');
    const result = breedingApplyMutation(inhabitant, 'negative', rng);
    const bonuses = result.mutationBonuses ?? {};
    const hasNegative = Object.values(bonuses).some((v) => v !== undefined && v < 0);
    expect(hasNegative).toBe(true);
  });

  it('should not change stats for neutral outcome', () => {
    const inhabitant = makeInhabitant({ mutationBonuses: {} });
    const rng = seedrandom('fixed-seed');
    const result = breedingApplyMutation(inhabitant, 'neutral', rng);
    const bonuses = result.mutationBonuses ?? {};
    // Neutral adds 0 to the targeted stat
    const allZero = Object.values(bonuses).every((v) => v === undefined || v === 0);
    expect(allZero).toBe(true);
  });
});

describe('Mutation Outcome Roll', () => {
  it('should return positive for low roll', () => {
    const rng = () => 0.1; // 10% — well below 60% positive threshold
    const outcome = breedingRollMutationOutcome(
      { positive: 0.6, neutral: 0.25, negative: 0.15 },
      rng as seedrandom.PRNG,
    );
    expect(outcome).toBe('positive');
  });

  it('should return neutral for mid roll', () => {
    const rng = () => 0.7; // 70% — above 60%, below 85%
    const outcome = breedingRollMutationOutcome(
      { positive: 0.6, neutral: 0.25, negative: 0.15 },
      rng as seedrandom.PRNG,
    );
    expect(outcome).toBe('neutral');
  });

  it('should return negative for high roll', () => {
    const rng = () => 0.9; // 90% — above 85%
    const outcome = breedingRollMutationOutcome(
      { positive: 0.6, neutral: 0.25, negative: 0.15 },
      rng as seedrandom.PRNG,
    );
    expect(outcome).toBe('negative');
  });
});

describe('breedingPitsProcess', () => {
  it('should decrement breeding job ticks', () => {
    const room = makeRoom();
    room.breedingJob = {
      parentAInstanceId: 'g1' as InhabitantInstanceId,
      parentBInstanceId: 'k1' as InhabitantInstanceId,
      recipeId: RECIPE_GOBLIN_KOBOLD_ID as BreedingRecipeId,
      ticksRemaining: 10,
      targetTicks: 25,
    };

    const goblin = makeInhabitant({ instanceId: 'g1' as InhabitantInstanceId, definitionId: GOBLIN_ID as InhabitantId, assignedRoomId: room.id });
    const kobold = makeInhabitant({ instanceId: 'k1' as InhabitantInstanceId, definitionId: KOBOLD_ID as InhabitantId, assignedRoomId: room.id });
    const floor = makeFloor([room], [goblin, kobold]);
    const state = makeGameState({ floors: [floor] });
    state.world.inhabitants = [goblin, kobold];

    breedingPitsProcess(state);

    expect(room.breedingJob!.ticksRemaining).toBe(9);
  });

  it('should complete breeding job when ticks reach 0', () => {
    const room = makeRoom();
    room.breedingJob = {
      parentAInstanceId: 'g1' as InhabitantInstanceId,
      parentBInstanceId: 'k1' as InhabitantInstanceId,
      recipeId: RECIPE_GOBLIN_KOBOLD_ID as BreedingRecipeId,
      ticksRemaining: 1,
      targetTicks: 25,
    };

    const goblin = makeInhabitant({ instanceId: 'g1' as InhabitantInstanceId, definitionId: GOBLIN_ID as InhabitantId, assignedRoomId: room.id });
    const kobold = makeInhabitant({ instanceId: 'k1' as InhabitantInstanceId, definitionId: KOBOLD_ID as InhabitantId, assignedRoomId: room.id });
    const floor = makeFloor([room], [goblin, kobold]);
    const state = makeGameState({ floors: [floor] });
    state.world.inhabitants = [goblin, kobold];

    breedingPitsProcess(state);

    // Parents removed, hybrid added
    expect(state.world.inhabitants).toHaveLength(1);
    expect(state.world.inhabitants[0].isHybrid).toBe(true);
    expect(state.world.inhabitants[0].name).toContain('Goblin Trapper');
    expect(room.breedingJob).toBeUndefined();
  });

  it('should remove both parents on breeding completion', () => {
    const room = makeRoom();
    room.breedingJob = {
      parentAInstanceId: 'g1' as InhabitantInstanceId,
      parentBInstanceId: 'k1' as InhabitantInstanceId,
      recipeId: RECIPE_GOBLIN_KOBOLD_ID as BreedingRecipeId,
      ticksRemaining: 1,
      targetTicks: 25,
    };

    const goblin = makeInhabitant({ instanceId: 'g1' as InhabitantInstanceId, definitionId: GOBLIN_ID as InhabitantId });
    const kobold = makeInhabitant({ instanceId: 'k1' as InhabitantInstanceId, definitionId: KOBOLD_ID as InhabitantId });
    const bystander = makeInhabitant({ instanceId: 'b1' as InhabitantInstanceId, definitionId: GOBLIN_ID as InhabitantId, assignedRoomId: undefined });
    const floor = makeFloor([room], [goblin, kobold, bystander]);
    const state = makeGameState({ floors: [floor] });
    state.world.inhabitants = [goblin, kobold, bystander];

    breedingPitsProcess(state);

    // Bystander kept, parents removed, hybrid added
    expect(state.world.inhabitants).toHaveLength(2);
    const ids = state.world.inhabitants.map((i) => i.instanceId);
    expect(ids).toContain('b1');
    expect(ids).not.toContain('g1');
    expect(ids).not.toContain('k1');
  });

  it('should sync floor inhabitants after breeding completion', () => {
    const room = makeRoom();
    room.breedingJob = {
      parentAInstanceId: 'g1' as InhabitantInstanceId,
      parentBInstanceId: 'k1' as InhabitantInstanceId,
      recipeId: RECIPE_GOBLIN_KOBOLD_ID as BreedingRecipeId,
      ticksRemaining: 1,
      targetTicks: 25,
    };

    const goblin = makeInhabitant({ instanceId: 'g1' as InhabitantInstanceId, definitionId: GOBLIN_ID as InhabitantId });
    const kobold = makeInhabitant({ instanceId: 'k1' as InhabitantInstanceId, definitionId: KOBOLD_ID as InhabitantId });
    const floor = makeFloor([room], [goblin, kobold]);
    const state = makeGameState({ floors: [floor] });
    state.world.inhabitants = [goblin, kobold];

    breedingPitsProcess(state);

    // Floor inhabitants should be synced
    expect(state.world.floors[0].inhabitants).toBe(state.world.inhabitants);
  });

  it('should decrement mutation job ticks', () => {
    const room = makeRoom();
    room.mutationJob = {
      targetInstanceId: 'g1' as InhabitantInstanceId,
      ticksRemaining: 10,
      targetTicks: 15,
    };

    const goblin = makeInhabitant({ instanceId: 'g1' as InhabitantInstanceId, definitionId: GOBLIN_ID as InhabitantId });
    const floor = makeFloor([room], [goblin]);
    const state = makeGameState({ floors: [floor] });
    state.world.inhabitants = [goblin];

    breedingPitsProcess(state);

    expect(room.mutationJob!.ticksRemaining).toBe(9);
  });

  it('should complete mutation job when ticks reach 0', () => {
    const room = makeRoom();
    room.mutationJob = {
      targetInstanceId: 'g1' as InhabitantInstanceId,
      ticksRemaining: 1,
      targetTicks: 15,
    };

    const goblin = makeInhabitant({ instanceId: 'g1' as InhabitantInstanceId, definitionId: GOBLIN_ID as InhabitantId, mutated: false });
    const floor = makeFloor([room], [goblin]);
    const state = makeGameState({ floors: [floor] });
    state.world.inhabitants = [goblin];

    breedingPitsProcess(state);

    expect(state.world.inhabitants[0].mutated).toBe(true);
    expect(room.mutationJob).toBeUndefined();
  });

  it('should not process rooms that are not breeding pits', () => {
    const room = makeRoom({ roomTypeId: 'other-room-type' as RoomId });
    room.breedingJob = {
      parentAInstanceId: 'g1' as InhabitantInstanceId,
      parentBInstanceId: 'k1' as InhabitantInstanceId,
      recipeId: RECIPE_GOBLIN_KOBOLD_ID as BreedingRecipeId,
      ticksRemaining: 1,
      targetTicks: 25,
    };

    const floor = makeFloor([room]);
    const state = makeGameState({ floors: [floor] });
    state.world.inhabitants = [];

    breedingPitsProcess(state);

    // Job should not have been processed
    expect(room.breedingJob!.ticksRemaining).toBe(1);
  });

  it('should process multiple breeding pits across floors', () => {
    const room1 = makeRoom({ id: 'bp-1' as PlacedRoomId });
    room1.breedingJob = {
      parentAInstanceId: 'g1' as InhabitantInstanceId,
      parentBInstanceId: 'k1' as InhabitantInstanceId,
      recipeId: RECIPE_GOBLIN_KOBOLD_ID as BreedingRecipeId,
      ticksRemaining: 5,
      targetTicks: 25,
    };

    const room2 = makeRoom({ id: 'bp-2' as PlacedRoomId });
    room2.mutationJob = {
      targetInstanceId: 'g2' as InhabitantInstanceId,
      ticksRemaining: 3,
      targetTicks: 15,
    };

    const g1 = makeInhabitant({ instanceId: 'g1' as InhabitantInstanceId, definitionId: GOBLIN_ID as InhabitantId, assignedRoomId: 'bp-1' as PlacedRoomId });
    const k1 = makeInhabitant({ instanceId: 'k1' as InhabitantInstanceId, definitionId: KOBOLD_ID as InhabitantId, assignedRoomId: 'bp-1' as PlacedRoomId });
    const g2 = makeInhabitant({ instanceId: 'g2' as InhabitantInstanceId, definitionId: GOBLIN_ID as InhabitantId, assignedRoomId: 'bp-2' as PlacedRoomId });

    const floor1 = makeFloor([room1], [g1, k1]);
    const floor2 = makeFloor([room2], [g2]);
    floor2.id = 'floor-2' as FloorId;

    const state = makeGameState({ floors: [floor1, floor2] });
    state.world.inhabitants = [g1, k1, g2];

    breedingPitsProcess(state);

    expect(room1.breedingJob!.ticksRemaining).toBe(4);
    expect(room2.mutationJob!.ticksRemaining).toBe(2);
  });
});

describe('Hybrid Creation', () => {
  it('should create a hybrid with correct properties', () => {
    const goblin = makeInhabitant({ instanceId: 'g1' as InhabitantInstanceId, definitionId: GOBLIN_ID as InhabitantId });
    const kobold = makeInhabitant({ instanceId: 'k1' as InhabitantInstanceId, definitionId: KOBOLD_ID as InhabitantId });

    const hybrid = breedingCreateHybrid(goblin, kobold, goblinKoboldRecipe);

    expect(hybrid.isHybrid).toBe(true);
    expect(hybrid.hybridParentIds).toEqual([GOBLIN_ID, KOBOLD_ID]);
    expect(hybrid.name).toContain('Goblin Trapper');
    expect(hybrid.assignedRoomId).toBeUndefined();
    expect(hybrid.state).toBe('normal');
    expect(hybrid.definitionId).toBe(GOBLIN_ID);
  });

  it('should store stat differences in mutationBonuses', () => {
    const goblin = makeInhabitant({ instanceId: 'g1' as InhabitantInstanceId, definitionId: GOBLIN_ID as InhabitantId });
    const kobold = makeInhabitant({ instanceId: 'k1' as InhabitantInstanceId, definitionId: KOBOLD_ID as InhabitantId });

    const hybrid = breedingCreateHybrid(goblin, kobold, goblinKoboldRecipe);

    // mutationBonuses stores the diff from parentA's base stats
    expect(hybrid.mutationBonuses).toBeDefined();
  });
});

describe('Upgrade Effects', () => {
  it('Enhanced Incubators: reduces time by 0.7x and adds capacity', () => {
    expect(enhancedIncubatorsPath.effects).toContainEqual({
      type: 'breedingTimeMultiplier',
      value: 0.7,
    });
    expect(enhancedIncubatorsPath.effects).toContainEqual({
      type: 'maxInhabitantBonus',
      value: 2,
    });
  });

  it('Mutation Amplifier: increases mutation odds and stat bonuses', () => {
    expect(mutationAmplifierPath.effects).toContainEqual({
      type: 'mutationOddsBonus',
      value: 0.15,
    });
    expect(mutationAmplifierPath.effects).toContainEqual({
      type: 'mutationStatBonus',
      value: 0.25,
    });
  });
});

describe('Adjacency Effects', () => {
  it('Spawning Pool should have hybridTimeReduction', () => {
    expect(spawningPoolDef.breedingAdjacencyEffects?.hybridTimeReduction).toBe(0.25);
  });

  it('Soul Well should have mutationOddsBonus', () => {
    expect(soulWellDef.breedingAdjacencyEffects?.mutationOddsBonus).toBe(0.10);
  });
});
