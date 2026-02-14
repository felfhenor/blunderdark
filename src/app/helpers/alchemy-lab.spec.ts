import type {
  AlchemyConversion,
  AlchemyRecipeContent,
  Floor,
  GameState,
  InhabitantInstance,
  IsContentItem,
  PlacedRoom,
  RoomDefinition,
  RoomUpgradePath,
} from '@interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Constants ---

const ALCHEMY_LAB_ID = 'c3b02001-0001-4001-8001-000000000001';
const CRYSTAL_MINE_ID = '9d9bddd6-cb51-4a9f-866d-cc4773bdec37';
const MUSHROOM_GROVE_ID = '7fb314ad-a447-469f-82df-4b8c68f9deff';
const FLUX_RECIPE_ID = 'b2a01001-0001-4001-8001-000000000001';
const ESSENCE_RECIPE_ID = 'b2a01001-0001-4001-8001-000000000002';
const DARK_TRANSMUTE_ID = 'b2a01001-0001-4001-8001-000000000003';

// --- Upgrade paths ---

const efficientDistillationPath: RoomUpgradePath = {
  id: 'c3b02001-0002-4001-8001-000000000001',
  name: 'Efficient Distillation',
  description: 'Reduced costs.',
  cost: { gold: 100, crystals: 50 },
  effects: [{ type: 'alchemyCostMultiplier', value: 0.6 }],
};

const advancedAlchemyPath: RoomUpgradePath = {
  id: 'c3b02001-0002-4001-8001-000000000002',
  name: 'Advanced Alchemy',
  description: 'Unlock advanced recipes.',
  cost: { gold: 120, essence: 40, flux: 20 },
  effects: [{ type: 'alchemyTierUnlock', value: 1 }],
};

const expandedCapacityPath: RoomUpgradePath = {
  id: 'c3b02001-0002-4001-8001-000000000003',
  name: 'Expanded Capacity',
  description: 'More workers.',
  cost: { gold: 80, crystals: 40 },
  effects: [{ type: 'maxInhabitantBonus', value: 2 }],
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
    if (role === 'alchemyLab') return ALCHEMY_LAB_ID;
    return undefined;
  }),
  roomRoleResetCache: vi.fn(),
}));

vi.mock('@helpers/rng', () => ({
  rngUuid: vi.fn(() => 'test-uuid'),
  rngRandom: vi.fn(() => () => 0.5),
  rngChoice: vi.fn((arr: string[]) => arr[0]),
}));

vi.mock('@helpers/room-shapes', () => ({
  roomShapeResolve: vi.fn(() => ({ tiles: [{ x: 0, y: 0 }], width: 1, height: 1 })),
  roomShapeGetAbsoluteTiles: vi.fn((_shape: unknown, ax: number, ay: number) => [{ x: ax, y: ay }]),
}));

vi.mock('@helpers/adjacency', () => ({
  adjacencyAreRoomsAdjacent: vi.fn(() => false),
}));

// --- Recipes ---

function makeFluxRecipe(): AlchemyRecipeContent & IsContentItem {
  return {
    id: FLUX_RECIPE_ID as AlchemyRecipeContent['id'],
    name: 'Flux Conversion',
    __type: 'alchemyrecipe',
    description: 'Convert crystals and food to flux.',
    inputCost: { crystals: 5, food: 5 },
    outputResource: 'flux',
    outputAmount: 1,
    baseTicks: 15,
    tier: 'basic',
  };
}

function makeEssenceRecipe(): AlchemyRecipeContent & IsContentItem {
  return {
    id: ESSENCE_RECIPE_ID as AlchemyRecipeContent['id'],
    name: 'Essence Synthesis',
    __type: 'alchemyrecipe',
    description: 'Convert gold and crystals to essence.',
    inputCost: { gold: 10, crystals: 5 },
    outputResource: 'essence',
    outputAmount: 1,
    baseTicks: 25,
    tier: 'advanced',
  };
}

function makeDarkTransmuteRecipe(): AlchemyRecipeContent & IsContentItem {
  return {
    id: DARK_TRANSMUTE_ID as AlchemyRecipeContent['id'],
    name: 'Dark Transmutation',
    __type: 'alchemyrecipe',
    description: 'Convert food and corruption to flux.',
    inputCost: { food: 5, corruption: 10 },
    outputResource: 'flux',
    outputAmount: 2,
    baseTicks: 20,
    tier: 'advanced',
  };
}

// --- Helpers ---

function makePlacedRoom(overrides?: Partial<PlacedRoom>): PlacedRoom {
  return {
    id: 'room-1',
    roomTypeId: ALCHEMY_LAB_ID,
    shapeId: 'shape-1',
    anchorX: 0,
    anchorY: 0,
    ...overrides,
  };
}

function makeInhabitant(overrides?: Partial<InhabitantInstance>): InhabitantInstance {
  return {
    instanceId: 'inh-1',
    definitionId: 'def-goblin',
    name: 'Goblin Worker',
    state: 'normal',
    assignedRoomId: 'room-1',
    ...overrides,
  };
}

function makeFloor(overrides?: Partial<Floor>): Floor {
  return {
    id: 'floor-1',
    name: 'Floor 1',
    depth: 1,
    biome: 'neutral',
    grid: [],
    rooms: [makePlacedRoom()],
    hallways: [],
    inhabitants: [makeInhabitant()],
    connections: [],
    traps: [],
    ...overrides,
  };
}

function makeGameState(overrides?: {
  floors?: Floor[];
  alchemyConversions?: AlchemyConversion[];
  resources?: Partial<Record<string, { current: number; max: number }>>;
}): GameState {
  return {
    meta: { version: 1, isSetup: true, isPaused: false, createdAt: 0 },
    gameId: 'test-game' as GameState['gameId'],
    clock: { numTicks: 100, lastSaveTick: 0, day: 1, hour: 12, minute: 0 },
    world: {
      grid: [],
      resources: {
        crystals: { current: 100, max: 500 },
        food: { current: 100, max: 500 },
        gold: { current: 200, max: 1000 },
        flux: { current: 10, max: 200 },
        research: { current: 0, max: 300 },
        essence: { current: 5, max: 200 },
        corruption: { current: 50, max: Number.MAX_SAFE_INTEGER },
        ...(overrides?.resources ?? {}),
      },
      inhabitants: [makeInhabitant()],
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
      floors: overrides?.floors ?? [makeFloor()],
      currentFloorIndex: 0,
      trapInventory: [],
      trapCraftingQueues: [],
      forgeInventory: [],
      forgeCraftingQueues: [],
      alchemyConversions: overrides?.alchemyConversions ?? [],
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
    },
  } as unknown as GameState;
}

// Import mocked modules for vi.mocked() usage
import { contentGetEntriesByType } from '@helpers/content';

// --- Tests ---

describe('alchemy-lab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContent.clear();

    const fluxRecipe = makeFluxRecipe();
    const essenceRecipe = makeEssenceRecipe();
    const darkTransmuteRecipe = makeDarkTransmuteRecipe();

    mockContent.set(FLUX_RECIPE_ID, fluxRecipe);
    mockContent.set(ESSENCE_RECIPE_ID, essenceRecipe);
    mockContent.set(DARK_TRANSMUTE_ID, darkTransmuteRecipe);

    const labDef: Partial<RoomDefinition> = {
      id: ALCHEMY_LAB_ID,
      name: 'Alchemy Lab',
      role: 'alchemyLab',
      maxInhabitants: 1,
      upgradePaths: [efficientDistillationPath, advancedAlchemyPath, expandedCapacityPath],
    };
    mockContent.set(ALCHEMY_LAB_ID, labDef);
  });

  describe('Recipe Availability', () => {
    it('should return only basic recipes without upgrade', async () => {
      const allRecipes = [makeFluxRecipe(), makeEssenceRecipe(), makeDarkTransmuteRecipe()];
      vi.mocked(contentGetEntriesByType).mockReturnValue(allRecipes);

      const { alchemyLabGetAvailableRecipes } = await import('@helpers/alchemy-lab');
      const room = makePlacedRoom();
      const result = alchemyLabGetAvailableRecipes(room);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Flux Conversion');
    });

    it('should return basic and advanced recipes with Advanced Alchemy upgrade', async () => {
      const allRecipes = [makeFluxRecipe(), makeEssenceRecipe(), makeDarkTransmuteRecipe()];
      vi.mocked(contentGetEntriesByType).mockReturnValue(allRecipes);

      const { alchemyLabGetAvailableRecipes } = await import('@helpers/alchemy-lab');
      const room = makePlacedRoom({ appliedUpgradePathId: advancedAlchemyPath.id });
      const result = alchemyLabGetAvailableRecipes(room);

      expect(result).toHaveLength(3);
    });
  });

  describe('Conversion Tick Calculation', () => {
    it('should return base ticks for 1 worker with no adjacency', async () => {
      const { alchemyLabGetConversionTicks } = await import('@helpers/alchemy-lab');
      const room = makePlacedRoom();
      const ticks = alchemyLabGetConversionTicks(room, 1, 15, new Set());
      expect(ticks).toBe(15);
    });

    it('should reduce ticks with additional workers (25% per extra)', async () => {
      const { alchemyLabGetConversionTicks } = await import('@helpers/alchemy-lab');
      const room = makePlacedRoom();

      // 2 workers: 15 * (1 - 0.25) = 15 * 0.75 = 11.25 → 11
      const ticks2 = alchemyLabGetConversionTicks(room, 2, 15, new Set());
      expect(ticks2).toBe(11);

      // 3 workers: 15 * (1 - 0.50) = 15 * 0.50 = 7.5 → 8
      const ticks3 = alchemyLabGetConversionTicks(room, 3, 15, new Set());
      expect(ticks3).toBe(8);
    });

    it('should cap worker bonus at 0.5 multiplier', async () => {
      const { alchemyLabGetConversionTicks } = await import('@helpers/alchemy-lab');
      const room = makePlacedRoom();

      // 4 workers: 15 * max(0.5, 1 - 0.75) = 15 * 0.5 = 7.5 → 8
      const ticks4 = alchemyLabGetConversionTicks(room, 4, 15, new Set());
      expect(ticks4).toBe(8);
    });

    it('should apply adjacency speed bonus', async () => {
      const mineDef: Partial<RoomDefinition> = {
        id: CRYSTAL_MINE_ID,
        name: 'Crystal Mine',
        alchemyAdjacencyEffects: { alchemySpeedBonus: 0.20 },
      };
      mockContent.set(CRYSTAL_MINE_ID, mineDef);

      const { alchemyLabGetConversionTicks } = await import('@helpers/alchemy-lab');
      const room = makePlacedRoom();
      const adjacentTypes = new Set([CRYSTAL_MINE_ID]);

      // 15 * (1 - 0.20) = 15 * 0.80 = 12
      const ticks = alchemyLabGetConversionTicks(room, 1, 15, adjacentTypes);
      expect(ticks).toBe(12);
    });
  });

  describe('Effective Cost Calculation', () => {
    it('should return base cost with no modifiers', async () => {
      const { alchemyLabGetEffectiveCost } = await import('@helpers/alchemy-lab');
      const room = makePlacedRoom();
      const cost = alchemyLabGetEffectiveCost(room, { crystals: 5, food: 5 }, new Set());

      expect(cost).toEqual({ crystals: 5, food: 5 });
    });

    it('should apply Efficient Distillation cost reduction', async () => {
      const { alchemyLabGetEffectiveCost } = await import('@helpers/alchemy-lab');
      const room = makePlacedRoom({ appliedUpgradePathId: efficientDistillationPath.id });
      const cost = alchemyLabGetEffectiveCost(room, { crystals: 5, food: 5 }, new Set());

      // 5 * 0.6 = 3
      expect(cost).toEqual({ crystals: 3, food: 3 });
    });

    it('should apply adjacency cost reduction', async () => {
      const groveDef: Partial<RoomDefinition> = {
        id: MUSHROOM_GROVE_ID,
        name: 'Mushroom Grove',
        alchemyAdjacencyEffects: { alchemyCostReduction: 0.15 },
      };
      mockContent.set(MUSHROOM_GROVE_ID, groveDef);

      const { alchemyLabGetEffectiveCost } = await import('@helpers/alchemy-lab');
      const room = makePlacedRoom();
      const adjacentTypes = new Set([MUSHROOM_GROVE_ID]);

      // 5 * (1 - 0.15) = 5 * 0.85 = 4.25 → 4
      const cost = alchemyLabGetEffectiveCost(room, { crystals: 5, food: 5 }, adjacentTypes);
      expect(cost).toEqual({ crystals: 4, food: 4 });
    });

    it('should not reduce cost below 1', async () => {
      const { alchemyLabGetEffectiveCost } = await import('@helpers/alchemy-lab');
      const room = makePlacedRoom({ appliedUpgradePathId: efficientDistillationPath.id });
      const cost = alchemyLabGetEffectiveCost(room, { crystals: 1, food: 1 }, new Set());

      expect(cost).toEqual({ crystals: 1, food: 1 });
    });
  });

  describe('Conversion Management', () => {
    it('should start a new conversion', async () => {
      const { alchemyLabStartConversion } = await import('@helpers/alchemy-lab');
      const result = alchemyLabStartConversion([], 'room-1', FLUX_RECIPE_ID, 15);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        roomId: 'room-1',
        recipeId: FLUX_RECIPE_ID,
        progress: 0,
        targetTicks: 15,
        inputConsumed: false,
      });
    });

    it('should replace existing conversion when switching recipe', async () => {
      const { alchemyLabStartConversion } = await import('@helpers/alchemy-lab');
      const existing: AlchemyConversion[] = [{
        roomId: 'room-1',
        recipeId: FLUX_RECIPE_ID,
        progress: 5,
        targetTicks: 15,
        inputConsumed: true,
      }];

      const result = alchemyLabStartConversion(existing, 'room-1', ESSENCE_RECIPE_ID, 25);
      expect(result).toHaveLength(1);
      expect(result[0].recipeId).toBe(ESSENCE_RECIPE_ID);
      expect(result[0].progress).toBe(0);
      expect(result[0].inputConsumed).toBe(false);
    });

    it('should stop a conversion', async () => {
      const { alchemyLabStopConversion } = await import('@helpers/alchemy-lab');
      const conversions: AlchemyConversion[] = [{
        roomId: 'room-1',
        recipeId: FLUX_RECIPE_ID,
        progress: 5,
        targetTicks: 15,
        inputConsumed: true,
      }];

      const result = alchemyLabStopConversion(conversions, 'room-1');
      expect(result).toHaveLength(0);
    });

    it('should get conversion for a room', async () => {
      const { alchemyLabGetConversion } = await import('@helpers/alchemy-lab');
      const conversions: AlchemyConversion[] = [{
        roomId: 'room-1',
        recipeId: FLUX_RECIPE_ID,
        progress: 5,
        targetTicks: 15,
        inputConsumed: true,
      }];

      const result = alchemyLabGetConversion(conversions, 'room-1');
      expect(result).toBeDefined();
      expect(result?.recipeId).toBe(FLUX_RECIPE_ID);
    });

    it('should return undefined for room without conversion', async () => {
      const { alchemyLabGetConversion } = await import('@helpers/alchemy-lab');
      const result = alchemyLabGetConversion([], 'room-1');
      expect(result).toBeUndefined();
    });
  });

  describe('alchemyLabCanConvert', () => {
    it('should allow conversion with assigned worker in alchemy lab', async () => {
      const { alchemyLabCanConvert } = await import('@helpers/alchemy-lab');
      const floors = [makeFloor()];
      const { canConvert } = alchemyLabCanConvert('room-1', floors);
      expect(canConvert).toBe(true);
    });

    it('should reject conversion without workers', async () => {
      const { alchemyLabCanConvert } = await import('@helpers/alchemy-lab');
      const floors = [makeFloor({ inhabitants: [] })];
      const { canConvert, reason } = alchemyLabCanConvert('room-1', floors);
      expect(canConvert).toBe(false);
      expect(reason).toContain('1 inhabitant');
    });

    it('should reject conversion for non-alchemy-lab room', async () => {
      const { alchemyLabCanConvert } = await import('@helpers/alchemy-lab');
      const floors = [makeFloor({
        rooms: [makePlacedRoom({ roomTypeId: 'other-room' })],
      })];
      const { canConvert, reason } = alchemyLabCanConvert('room-1', floors);
      expect(canConvert).toBe(false);
      expect(reason).toContain('not an Alchemy Lab');
    });

    it('should reject for non-existent room', async () => {
      const { alchemyLabCanConvert } = await import('@helpers/alchemy-lab');
      const { canConvert, reason } = alchemyLabCanConvert('nonexistent', [makeFloor()]);
      expect(canConvert).toBe(false);
      expect(reason).toContain('not found');
    });
  });

  describe('alchemyLabProcess', () => {
    it('should consume input and start progress on first tick', async () => {
      const { alchemyLabProcess } = await import('@helpers/alchemy-lab');
      const conversion: AlchemyConversion = {
        roomId: 'room-1',
        recipeId: FLUX_RECIPE_ID,
        progress: 0,
        targetTicks: 15,
        inputConsumed: false,
      };

      const state = makeGameState({ alchemyConversions: [conversion] });
      alchemyLabProcess(state);

      expect(state.world.alchemyConversions[0].inputConsumed).toBe(true);
      expect(state.world.alchemyConversions[0].progress).toBe(1);
      expect(state.world.resources.crystals.current).toBe(95);
      expect(state.world.resources.food.current).toBe(95);
    });

    it('should not consume input if already consumed', async () => {
      const { alchemyLabProcess } = await import('@helpers/alchemy-lab');
      const conversion: AlchemyConversion = {
        roomId: 'room-1',
        recipeId: FLUX_RECIPE_ID,
        progress: 5,
        targetTicks: 15,
        inputConsumed: true,
      };

      const state = makeGameState({ alchemyConversions: [conversion] });
      alchemyLabProcess(state);

      expect(state.world.alchemyConversions[0].progress).toBe(6);
      expect(state.world.resources.crystals.current).toBe(100);
      expect(state.world.resources.food.current).toBe(100);
    });

    it('should not start if resources are insufficient', async () => {
      const { alchemyLabProcess } = await import('@helpers/alchemy-lab');
      const conversion: AlchemyConversion = {
        roomId: 'room-1',
        recipeId: FLUX_RECIPE_ID,
        progress: 0,
        targetTicks: 15,
        inputConsumed: false,
      };

      const state = makeGameState({
        alchemyConversions: [conversion],
        resources: {
          crystals: { current: 2, max: 500 },
          food: { current: 100, max: 500 },
        },
      });
      alchemyLabProcess(state);

      expect(state.world.alchemyConversions[0].inputConsumed).toBe(false);
      expect(state.world.alchemyConversions[0].progress).toBe(0);
    });

    it('should complete conversion and add output resource', async () => {
      const { alchemyLabProcess } = await import('@helpers/alchemy-lab');
      const conversion: AlchemyConversion = {
        roomId: 'room-1',
        recipeId: FLUX_RECIPE_ID,
        progress: 14,
        targetTicks: 15,
        inputConsumed: true,
      };

      const state = makeGameState({ alchemyConversions: [conversion] });
      alchemyLabProcess(state);

      expect(state.world.resources.flux.current).toBe(11);
      expect(state.world.alchemyConversions[0].progress).toBe(0);
      expect(state.world.alchemyConversions[0].inputConsumed).toBe(false);
    });

    it('should cap output at resource max', async () => {
      const { alchemyLabProcess } = await import('@helpers/alchemy-lab');
      const conversion: AlchemyConversion = {
        roomId: 'room-1',
        recipeId: FLUX_RECIPE_ID,
        progress: 14,
        targetTicks: 15,
        inputConsumed: true,
      };

      const state = makeGameState({
        alchemyConversions: [conversion],
        resources: { flux: { current: 200, max: 200 } },
      });
      alchemyLabProcess(state);

      expect(state.world.resources.flux.current).toBe(200);
    });

    it('should not process without assigned worker', async () => {
      const { alchemyLabProcess } = await import('@helpers/alchemy-lab');
      const conversion: AlchemyConversion = {
        roomId: 'room-1',
        recipeId: FLUX_RECIPE_ID,
        progress: 5,
        targetTicks: 15,
        inputConsumed: true,
      };

      const state = makeGameState({
        alchemyConversions: [conversion],
        floors: [makeFloor({ inhabitants: [] })],
      });
      alchemyLabProcess(state);

      expect(state.world.alchemyConversions[0].progress).toBe(5);
    });

    it('should skip rooms that are not alchemy labs', async () => {
      const { alchemyLabProcess } = await import('@helpers/alchemy-lab');
      const conversion: AlchemyConversion = {
        roomId: 'room-1',
        recipeId: FLUX_RECIPE_ID,
        progress: 5,
        targetTicks: 15,
        inputConsumed: true,
      };

      const state = makeGameState({
        alchemyConversions: [conversion],
        floors: [makeFloor({
          rooms: [makePlacedRoom({ roomTypeId: 'other-type' })],
        })],
      });
      alchemyLabProcess(state);

      expect(state.world.alchemyConversions[0].progress).toBe(5);
    });

    it('should reset cycle on completion for continuous conversion', async () => {
      const { alchemyLabProcess } = await import('@helpers/alchemy-lab');
      const conversion: AlchemyConversion = {
        roomId: 'room-1',
        recipeId: FLUX_RECIPE_ID,
        progress: 14,
        targetTicks: 15,
        inputConsumed: true,
      };

      const state = makeGameState({ alchemyConversions: [conversion] });
      alchemyLabProcess(state);

      // After completion, cycle resets for continuous production
      const conv = state.world.alchemyConversions[0];
      expect(conv.progress).toBe(0);
      expect(conv.inputConsumed).toBe(false);
      // Output was added
      expect(state.world.resources.flux.current).toBe(11);
    });

    it('should handle advanced recipe output (multiple units)', async () => {
      const { alchemyLabProcess } = await import('@helpers/alchemy-lab');
      const conversion: AlchemyConversion = {
        roomId: 'room-1',
        recipeId: DARK_TRANSMUTE_ID,
        progress: 19,
        targetTicks: 20,
        inputConsumed: true,
      };

      const state = makeGameState({ alchemyConversions: [conversion] });
      alchemyLabProcess(state);

      // Dark Transmutation outputs 2 flux
      expect(state.world.resources.flux.current).toBe(12);
    });
  });

  describe('Upgrade Effects', () => {
    it('should apply alchemyCostMultiplier from Efficient Distillation', async () => {
      const { alchemyLabGetEffectiveCost } = await import('@helpers/alchemy-lab');
      const room = makePlacedRoom({ appliedUpgradePathId: efficientDistillationPath.id });
      const cost = alchemyLabGetEffectiveCost(room, { crystals: 5, food: 5 }, new Set());

      expect(cost).toEqual({ crystals: 3, food: 3 });
    });

    it('should unlock advanced recipes with alchemyTierUnlock', async () => {
      const allRecipes = [makeFluxRecipe(), makeEssenceRecipe(), makeDarkTransmuteRecipe()];
      vi.mocked(contentGetEntriesByType).mockReturnValue(allRecipes);

      const { alchemyLabGetAvailableRecipes } = await import('@helpers/alchemy-lab');
      const room = makePlacedRoom({ appliedUpgradePathId: advancedAlchemyPath.id });
      const result = alchemyLabGetAvailableRecipes(room);

      expect(result).toHaveLength(3);
      expect(result.map((r) => r.tier)).toContain('advanced');
    });
  });
});
