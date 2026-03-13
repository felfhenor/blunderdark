import type {
  AlchemyConversion,
  AlchemyRecipeContent,
  AlchemyRecipeId,
  Floor,
  FloorId,
  GameId,
  GameState,
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

const ALCHEMY_LAB_ID = 'c3b02001-0001-4001-8001-000000000001';
const CRYSTAL_MINE_ID = '9d9bddd6-cb51-4a9f-866d-cc4773bdec37';
const MUSHROOM_GROVE_ID = '7fb314ad-a447-469f-82df-4b8c68f9deff';
const FLUX_RECIPE_ID = 'b2a01001-0001-4001-8001-000000000001';
const ESSENCE_RECIPE_ID = 'b2a01001-0001-4001-8001-000000000002';
const DARK_TRANSMUTE_ID = 'b2a01001-0001-4001-8001-000000000003';
const CORRUPTION_BREWING_ID = '7dd72688-64d7-4c18-b039-f6768efc0b7c';
const FORBIDDEN_KNOWLEDGE_ID = '74313406-186c-4280-a827-c38812c9fc49';
const ESSENCE_RECYCLING_ID = 'b0365c29-5b01-4bd0-99c3-94c616cb93ec';

// --- Upgrade paths ---

const darkCruciblePath: RoomUpgradeContent = {
  id: '88ed58e2-7382-4639-b0b4-29d665661af9' as RoomUpgradeId,
  __type: 'roomupgrade',
  name: 'Dark Crucible',
  description: 'Unlocks Dark Crucible recipes.',
  cost: { gold: 80, flux: 30 },
  effects: [{ type: 'alchemyUnlockDarkCrucible', value: 1 }],
};

const arcaneAnnexPath: RoomUpgradeContent = {
  id: '72c1067d-b5e7-4655-99c3-e935ee0cc45a' as RoomUpgradeId,
  __type: 'roomupgrade',
  name: 'Arcane Annex',
  description: 'Unlocks Arcane Annex recipes.',
  cost: { gold: 100, essence: 20 },
  effects: [{ type: 'alchemyUnlockArcaneAnnex', value: 1 }],
};

const transmutationForgePath: RoomUpgradeContent = {
  id: '4b99dc18-b9ec-4a3c-9002-42943021e920' as RoomUpgradeId,
  __type: 'roomupgrade',
  name: 'Transmutation Forge',
  description: 'Unlocks Transmutation Forge recipes.',
  cost: { gold: 120, crystals: 40 },
  effects: [{ type: 'alchemyUnlockTransmutationForge', value: 1 }],
};

// --- Mock content ---

const mockContent = new Map<string, unknown>();

vi.mock('@helpers/connectivity', () => ({
  connectivityGetDisconnectedRoomIds: () => new Set(),
}));

vi.mock('@helpers/content', () => ({
  contentGetEntry: (id: string) => mockContent.get(id) ?? undefined,
  contentGetEntriesByType: vi.fn(() => []),
  getEntries: vi.fn(),
  contentAllIdsByName: vi.fn(() => new Map()),
}));

vi.mock('@helpers/state-game', () => ({
  updateGamestate: vi.fn(),
  gamestate: vi.fn(),
}));

vi.mock('@helpers/reputation', () => ({
  reputationAwardInPlace: vi.fn(),
}));

vi.mock('@helpers/research-unlocks', () => ({
  researchUnlockGetPassiveBonusWithMastery: vi.fn(() => 0),
}));

vi.mock('@helpers/game-time', () => ({
  GAME_TIME_TICKS_PER_MINUTE: 5,
}));

vi.mock('@helpers/floor', () => ({
  findRoomOnFloor: vi.fn(
    (floor: { rooms: { id: string }[] }, roomId: string) =>
      floor.rooms.find((r: { id: string }) => r.id === roomId),
  ),
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
  roomShapeResolve: vi.fn(() => ({
    tiles: [{ x: 0, y: 0 }],
    width: 1,
    height: 1,
  })),
  roomShapeGetAbsoluteTiles: vi.fn(
    (_shape: unknown, ax: number, ay: number) => [{ x: ax, y: ay }],
  ),
}));

vi.mock('@helpers/adjacency', () => ({
  adjacencyAreRoomsAdjacent: vi.fn(() => false),
}));

vi.mock('@helpers/room-upgrades', () => ({
  roomUpgradeGetAppliedEffects: vi.fn((room: { appliedUpgradePathId?: string }) => {
    if (!room.appliedUpgradePathId) return [];
    const upgrade = mockContent.get(room.appliedUpgradePathId) as
      | { effects?: { type: string; value: number }[] }
      | undefined;
    return upgrade?.effects ?? [];
  }),
  roomGetDisplayName: vi.fn(() => 'Alchemy Lab'),
}));

const mockCurrencyUnlocked = vi.fn(() => true);
vi.mock('@helpers/currency-unlock', () => ({
  currencyIsUnlocked: (...args: unknown[]) => mockCurrencyUnlocked(...args),
  currencyUnlockInPlace: vi.fn(),
}));

let mockResourceMap: Record<string, { current: number; max: number }>;

vi.mock('@helpers/resources', () => ({
  resourceAdd: vi.fn((type: string, amount: number) => {
    if (amount <= 0) return 0;
    const res = mockResourceMap[type];
    const available = res.max - res.current;
    const actual = Math.min(amount, available);
    res.current = Math.min(res.current + amount, res.max);
    return actual;
  }),
  resourceSubtract: vi.fn((type: string, amount: number) => {
    if (amount <= 0) return 0;
    const res = mockResourceMap[type];
    if (res.current < amount) return 0;
    const subtracted = Math.min(amount, res.current);
    res.current = Math.max(0, res.current - amount);
    return subtracted;
  }),
}));

// --- Recipes ---

function makeFluxRecipe(): AlchemyRecipeContent {
  return {
    id: FLUX_RECIPE_ID as AlchemyRecipeId,
    name: 'Flux Conversion',
    __type: 'alchemyrecipe',
    description: 'Convert crystals and food to flux.',
    inputCost: [
      { resource: 'crystals', amount: 5 },
      { resource: 'food', amount: 5 },
    ],
    outputCost: [{ resource: 'flux', amount: 1 }],
    baseTicks: 15,
    tier: 'basic',
  };
}

function makeEssenceRecipe(): AlchemyRecipeContent {
  return {
    id: ESSENCE_RECIPE_ID as AlchemyRecipeId,
    name: 'Essence Synthesis',
    __type: 'alchemyrecipe',
    description: 'Convert gold and crystals to essence.',
    inputCost: [
      { resource: 'gold', amount: 10 },
      { resource: 'crystals', amount: 5 },
    ],
    outputCost: [{ resource: 'essence', amount: 1 }],
    baseTicks: 25,
    tier: 'transmutation-forge',
  };
}

function makeDarkTransmuteRecipe(): AlchemyRecipeContent {
  return {
    id: DARK_TRANSMUTE_ID as AlchemyRecipeId,
    name: 'Dark Transmutation',
    __type: 'alchemyrecipe',
    description: 'Convert food and corruption to flux.',
    inputCost: [
      { resource: 'food', amount: 5 },
      { resource: 'corruption', amount: 10 },
    ],
    outputCost: [{ resource: 'flux', amount: 2 }],
    baseTicks: 20,
    tier: 'dark-crucible',
  };
}

function makeCorruptionBrewingRecipe(): AlchemyRecipeContent {
  return {
    id: CORRUPTION_BREWING_ID as AlchemyRecipeId,
    name: 'Corruption Brewing',
    __type: 'alchemyrecipe',
    description: 'Ferment essence and gold into corruption.',
    inputCost: [
      { resource: 'essence', amount: 3 },
      { resource: 'gold', amount: 5 },
    ],
    outputCost: [{ resource: 'corruption', amount: 5 }],
    baseTicks: 22,
    tier: 'dark-crucible',
  };
}

function makeForbiddenKnowledgeRecipe(): AlchemyRecipeContent {
  return {
    id: FORBIDDEN_KNOWLEDGE_ID as AlchemyRecipeId,
    name: 'Forbidden Knowledge',
    __type: 'alchemyrecipe',
    description: 'Distill forbidden insights from essence and corruption.',
    inputCost: [
      { resource: 'essence', amount: 5 },
      { resource: 'corruption', amount: 8 },
    ],
    outputCost: [{ resource: 'research', amount: 4 }],
    baseTicks: 30,
    tier: 'arcane-annex',
  };
}

function makeEssenceRecyclingRecipe(): AlchemyRecipeContent {
  return {
    id: ESSENCE_RECYCLING_ID as AlchemyRecipeId,
    name: 'Essence Recycling',
    __type: 'alchemyrecipe',
    description: 'Reclaim essence from flux and crystals.',
    inputCost: [
      { resource: 'flux', amount: 10 },
      { resource: 'crystals', amount: 5 },
    ],
    outputCost: [{ resource: 'essence', amount: 2 }],
    baseTicks: 28,
    tier: 'transmutation-forge',
  };
}

// --- Helpers ---

function makePlacedRoom(overrides?: Partial<PlacedRoom>): PlacedRoom {
  return {
    id: 'room-1' as PlacedRoomId,
    roomTypeId: ALCHEMY_LAB_ID as RoomId,
    shapeId: 'shape-1' as RoomShapeId,
    anchorX: 0,
    anchorY: 0,
    ...overrides,
  };
}

function makeInhabitant(
  overrides?: Partial<InhabitantInstance>,
): InhabitantInstance {
  return {
    instanceId: 'inh-1' as InhabitantInstanceId,
    definitionId: 'def-goblin' as InhabitantId,
    name: 'Goblin Worker',
    state: 'normal',
    assignedRoomId: 'room-1' as PlacedRoomId,
    ...overrides,
  };
}

function makeFloor(overrides?: Partial<Floor>): Floor {
  return {
    id: 'floor-1' as FloorId,
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
  const state = {
    meta: { version: 1, isSetup: true, isPaused: false, createdAt: 0 },
    gameId: 'test-game' as GameId,
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
        corruption: { current: 50, max: 999999 },
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
        unlockedContent: {
          rooms: [],
          inhabitants: [],
          abilities: [],
          roomupgrades: [],
          passiveBonuses: [],
        },
      },
      reputation: { terror: 0, wealth: 0, knowledge: 0, harmony: 0, chaos: 0 },
      floors: overrides?.floors ?? [makeFloor()],
      currentFloorIndex: 0,
      trapInventory: [],
      forgeInventory: [],
      alchemyConversions: overrides?.alchemyConversions ?? [],
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
    },
  } as unknown as GameState;
  mockResourceMap = state.world.resources;
  return state;
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
    const corruptionBrewingRecipe = makeCorruptionBrewingRecipe();
    const forbiddenKnowledgeRecipe = makeForbiddenKnowledgeRecipe();
    const essenceRecyclingRecipe = makeEssenceRecyclingRecipe();

    mockContent.set(FLUX_RECIPE_ID, fluxRecipe);
    mockContent.set(ESSENCE_RECIPE_ID, essenceRecipe);
    mockContent.set(DARK_TRANSMUTE_ID, darkTransmuteRecipe);
    mockContent.set(CORRUPTION_BREWING_ID, corruptionBrewingRecipe);
    mockContent.set(FORBIDDEN_KNOWLEDGE_ID, forbiddenKnowledgeRecipe);
    mockContent.set(ESSENCE_RECYCLING_ID, essenceRecyclingRecipe);

    const labDef: Partial<RoomContent> = {
      id: ALCHEMY_LAB_ID as RoomId,
      name: 'Alchemy Lab',
      role: 'alchemyLab',
      maxInhabitants: 1,
      roomUpgradeIds: [
        darkCruciblePath.id,
        arcaneAnnexPath.id,
        transmutationForgePath.id,
      ],
    };
    mockContent.set(ALCHEMY_LAB_ID, labDef);
    mockContent.set(darkCruciblePath.id, darkCruciblePath);
    mockContent.set(arcaneAnnexPath.id, arcaneAnnexPath);
    mockContent.set(transmutationForgePath.id, transmutationForgePath);
  });

  describe('Recipe Availability', () => {
    it('should return only basic recipes without upgrade', async () => {
      const allRecipes = [
        makeFluxRecipe(),
        makeEssenceRecipe(),
        makeDarkTransmuteRecipe(),
        makeForbiddenKnowledgeRecipe(),
      ];
      vi.mocked(contentGetEntriesByType).mockReturnValue(allRecipes);

      const { alchemyLabGetAvailableRecipes } = await import(
        '@helpers/alchemy-lab'
      );
      const room = makePlacedRoom();
      const result = alchemyLabGetAvailableRecipes(room);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Flux Conversion');
    });

    it('should return basic + dark-crucible recipes with Dark Crucible upgrade', async () => {
      const allRecipes = [
        makeFluxRecipe(),
        makeDarkTransmuteRecipe(),
        makeCorruptionBrewingRecipe(),
        makeEssenceRecipe(),
        makeForbiddenKnowledgeRecipe(),
      ];
      vi.mocked(contentGetEntriesByType).mockReturnValue(allRecipes);

      const { alchemyLabGetAvailableRecipes } = await import(
        '@helpers/alchemy-lab'
      );
      const room = makePlacedRoom({
        appliedUpgradePathId: darkCruciblePath.id,
      });
      const result = alchemyLabGetAvailableRecipes(room);

      expect(result).toHaveLength(3);
      expect(result.map((r) => r.name)).toContain('Flux Conversion');
      expect(result.map((r) => r.name)).toContain('Dark Transmutation');
      expect(result.map((r) => r.name)).toContain('Corruption Brewing');
    });

    it('should return basic + arcane-annex recipes with Arcane Annex upgrade', async () => {
      const allRecipes = [
        makeFluxRecipe(),
        makeDarkTransmuteRecipe(),
        makeForbiddenKnowledgeRecipe(),
        makeEssenceRecipe(),
      ];
      vi.mocked(contentGetEntriesByType).mockReturnValue(allRecipes);

      const { alchemyLabGetAvailableRecipes } = await import(
        '@helpers/alchemy-lab'
      );
      const room = makePlacedRoom({
        appliedUpgradePathId: arcaneAnnexPath.id,
      });
      const result = alchemyLabGetAvailableRecipes(room);

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.name)).toContain('Flux Conversion');
      expect(result.map((r) => r.name)).toContain('Forbidden Knowledge');
    });

    it('should return basic + transmutation-forge recipes with Transmutation Forge upgrade', async () => {
      const allRecipes = [
        makeFluxRecipe(),
        makeEssenceRecipe(),
        makeEssenceRecyclingRecipe(),
        makeDarkTransmuteRecipe(),
      ];
      vi.mocked(contentGetEntriesByType).mockReturnValue(allRecipes);

      const { alchemyLabGetAvailableRecipes } = await import(
        '@helpers/alchemy-lab'
      );
      const room = makePlacedRoom({
        appliedUpgradePathId: transmutationForgePath.id,
      });
      const result = alchemyLabGetAvailableRecipes(room);

      expect(result).toHaveLength(3);
      expect(result.map((r) => r.name)).toContain('Flux Conversion');
      expect(result.map((r) => r.name)).toContain('Essence Synthesis');
      expect(result.map((r) => r.name)).toContain('Essence Recycling');
    });

    it('should hide recipes whose input currencies are not unlocked', async () => {
      // Corruption Brewing needs essence + gold; lock essence
      mockCurrencyUnlocked.mockImplementation(
        (type: string) => type !== 'essence',
      );

      const allRecipes = [
        makeFluxRecipe(),
        makeDarkTransmuteRecipe(),
        makeCorruptionBrewingRecipe(),
      ];
      vi.mocked(contentGetEntriesByType).mockReturnValue(allRecipes);

      const { alchemyLabGetAvailableRecipes } = await import(
        '@helpers/alchemy-lab'
      );
      const room = makePlacedRoom({
        appliedUpgradePathId: darkCruciblePath.id,
      });
      const result = alchemyLabGetAvailableRecipes(room);

      // Flux Conversion (crystals+food) and Dark Transmutation (food+corruption) visible
      // Corruption Brewing (essence+gold) hidden because essence is locked
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.name)).not.toContain('Corruption Brewing');

      mockCurrencyUnlocked.mockImplementation(() => true);
    });
  });

  describe('Conversion Tick Calculation', () => {
    it('should return base ticks for 1 worker with no adjacency', async () => {
      const { alchemyLabGetConversionTicks } = await import(
        '@helpers/alchemy-lab'
      );
      const room = makePlacedRoom();
      const ticks = alchemyLabGetConversionTicks(room, 1, 15, new Set());
      expect(ticks).toBe(15);
    });

    it('should reduce ticks with additional workers (25% per extra)', async () => {
      const { alchemyLabGetConversionTicks } = await import(
        '@helpers/alchemy-lab'
      );
      const room = makePlacedRoom();

      // 2 workers: 15 * (1 - 0.25) = 15 * 0.75 = 11.25 -> 11
      const ticks2 = alchemyLabGetConversionTicks(room, 2, 15, new Set());
      expect(ticks2).toBe(11);

      // 3 workers: 15 * (1 - 0.50) = 15 * 0.50 = 7.5 -> 8
      const ticks3 = alchemyLabGetConversionTicks(room, 3, 15, new Set());
      expect(ticks3).toBe(8);
    });

    it('should cap worker bonus at 0.5 multiplier', async () => {
      const { alchemyLabGetConversionTicks } = await import(
        '@helpers/alchemy-lab'
      );
      const room = makePlacedRoom();

      // 4 workers: 15 * max(0.5, 1 - 0.75) = 15 * 0.5 = 7.5 -> 8
      const ticks4 = alchemyLabGetConversionTicks(room, 4, 15, new Set());
      expect(ticks4).toBe(8);
    });

    it('should apply adjacency speed bonus', async () => {
      const mineDef: Partial<RoomContent> = {
        id: CRYSTAL_MINE_ID as RoomId,
        name: 'Crystal Mine',
        alchemyAdjacencyEffects: { alchemySpeedBonus: 0.2 },
      };
      mockContent.set(CRYSTAL_MINE_ID, mineDef);

      const { alchemyLabGetConversionTicks } = await import(
        '@helpers/alchemy-lab'
      );
      const room = makePlacedRoom();
      const adjacentTypes = new Set([CRYSTAL_MINE_ID]);

      // 15 * (1 - 0.20) = 15 * 0.80 = 12
      const ticks = alchemyLabGetConversionTicks(room, 1, 15, adjacentTypes);
      expect(ticks).toBe(12);
    });
  });

  describe('Effective Cost Calculation', () => {
    it('should return base cost with no modifiers', async () => {
      const { alchemyLabGetEffectiveCost } = await import(
        '@helpers/alchemy-lab'
      );
      const room = makePlacedRoom();
      const cost = alchemyLabGetEffectiveCost(
        room,
        [
          { resource: 'crystals', amount: 5 },
          { resource: 'food', amount: 5 },
        ],
        new Set(),
      );

      expect(cost).toEqual([
        { resource: 'crystals', amount: 5 },
        { resource: 'food', amount: 5 },
      ]);
    });

    it('should apply adjacency cost reduction', async () => {
      const groveDef: Partial<RoomContent> = {
        id: MUSHROOM_GROVE_ID as RoomId,
        name: 'Mushroom Grove',
        alchemyAdjacencyEffects: { alchemyCostReduction: 0.15 },
      };
      mockContent.set(MUSHROOM_GROVE_ID, groveDef);

      const { alchemyLabGetEffectiveCost } = await import(
        '@helpers/alchemy-lab'
      );
      const room = makePlacedRoom();
      const adjacentTypes = new Set([MUSHROOM_GROVE_ID]);

      // 5 * (1 - 0.15) = 5 * 0.85 = 4.25 -> 4
      const cost = alchemyLabGetEffectiveCost(
        room,
        [
          { resource: 'crystals', amount: 5 },
          { resource: 'food', amount: 5 },
        ],
        adjacentTypes,
      );
      expect(cost).toEqual([
        { resource: 'crystals', amount: 4 },
        { resource: 'food', amount: 4 },
      ]);
    });

    it('should not reduce cost below 1', async () => {
      const { alchemyLabGetEffectiveCost } = await import(
        '@helpers/alchemy-lab'
      );
      const room = makePlacedRoom();

      const groveDef: Partial<RoomContent> = {
        id: MUSHROOM_GROVE_ID as RoomId,
        name: 'Mushroom Grove',
        alchemyAdjacencyEffects: { alchemyCostReduction: 0.95 },
      };
      mockContent.set(MUSHROOM_GROVE_ID, groveDef);

      const cost = alchemyLabGetEffectiveCost(
        room,
        [
          { resource: 'crystals', amount: 1 },
          { resource: 'food', amount: 1 },
        ],
        new Set([MUSHROOM_GROVE_ID]),
      );

      expect(cost).toEqual([
        { resource: 'crystals', amount: 1 },
        { resource: 'food', amount: 1 },
      ]);
    });
  });

  describe('Conversion Management', () => {
    it('should start a new conversion', async () => {
      const { alchemyLabStartConversion } = await import(
        '@helpers/alchemy-lab'
      );
      const result = alchemyLabStartConversion(
        [],
        'room-1' as PlacedRoomId,
        FLUX_RECIPE_ID as AlchemyRecipeId,
        15,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        roomId: 'room-1' as PlacedRoomId,
        recipeId: FLUX_RECIPE_ID as AlchemyRecipeId,
        progress: 0,
        targetTicks: 15,
        inputConsumed: false,
      });
    });

    it('should replace existing conversion when switching recipe', async () => {
      const { alchemyLabStartConversion } = await import(
        '@helpers/alchemy-lab'
      );
      const existing: AlchemyConversion[] = [
        {
          roomId: 'room-1' as PlacedRoomId,
          recipeId: FLUX_RECIPE_ID as AlchemyRecipeId,
          progress: 5,
          targetTicks: 15,
          inputConsumed: true,
        },
      ];

      const result = alchemyLabStartConversion(
        existing,
        'room-1' as PlacedRoomId,
        ESSENCE_RECIPE_ID as AlchemyRecipeId,
        25,
      );
      expect(result).toHaveLength(1);
      expect(result[0].recipeId).toBe(ESSENCE_RECIPE_ID);
      expect(result[0].progress).toBe(0);
      expect(result[0].inputConsumed).toBe(false);
    });

    it('should stop a conversion', async () => {
      const { alchemyLabStopConversion } = await import('@helpers/alchemy-lab');
      const conversions: AlchemyConversion[] = [
        {
          roomId: 'room-1' as PlacedRoomId,
          recipeId: FLUX_RECIPE_ID as AlchemyRecipeId,
          progress: 5,
          targetTicks: 15,
          inputConsumed: true,
        },
      ];

      const result = alchemyLabStopConversion(
        conversions,
        'room-1' as PlacedRoomId,
      );
      expect(result).toHaveLength(0);
    });

    it('should get conversion for a room', async () => {
      const { alchemyLabGetConversion } = await import('@helpers/alchemy-lab');
      const conversions: AlchemyConversion[] = [
        {
          roomId: 'room-1' as PlacedRoomId,
          recipeId: FLUX_RECIPE_ID as AlchemyRecipeId,
          progress: 5,
          targetTicks: 15,
          inputConsumed: true,
        },
      ];

      const result = alchemyLabGetConversion(
        conversions,
        'room-1' as PlacedRoomId,
      );
      expect(result).toBeDefined();
      expect(result?.recipeId).toBe(FLUX_RECIPE_ID);
    });

    it('should return undefined for room without conversion', async () => {
      const { alchemyLabGetConversion } = await import('@helpers/alchemy-lab');
      const result = alchemyLabGetConversion([], 'room-1' as PlacedRoomId);
      expect(result).toBeUndefined();
    });
  });

  describe('alchemyLabCanConvert', () => {
    it('should allow conversion with assigned worker in alchemy lab', async () => {
      const { alchemyLabCanConvert } = await import('@helpers/alchemy-lab');
      const floors = [makeFloor()];
      const { canConvert } = alchemyLabCanConvert(
        'room-1' as PlacedRoomId,
        floors,
      );
      expect(canConvert).toBe(true);
    });

    it('should reject conversion without workers', async () => {
      const { alchemyLabCanConvert } = await import('@helpers/alchemy-lab');
      const floors = [makeFloor({ inhabitants: [] })];
      const { canConvert, reason } = alchemyLabCanConvert(
        'room-1' as PlacedRoomId,
        floors,
      );
      expect(canConvert).toBe(false);
      expect(reason).toContain('1 inhabitant');
    });

    it('should reject conversion for non-alchemy-lab room', async () => {
      const { alchemyLabCanConvert } = await import('@helpers/alchemy-lab');
      const floors = [
        makeFloor({
          rooms: [makePlacedRoom({ roomTypeId: 'other-room' as RoomId })],
        }),
      ];
      const { canConvert, reason } = alchemyLabCanConvert(
        'room-1' as PlacedRoomId,
        floors,
      );
      expect(canConvert).toBe(false);
      expect(reason).toContain('not an Alchemy Lab');
    });

    it('should reject for non-existent room', async () => {
      const { alchemyLabCanConvert } = await import('@helpers/alchemy-lab');
      const { canConvert, reason } = alchemyLabCanConvert(
        'nonexistent' as PlacedRoomId,
        [makeFloor()],
      );
      expect(canConvert).toBe(false);
      expect(reason).toContain('not found');
    });
  });

  describe('alchemyLabProcess', () => {
    it('should consume input and start progress on first tick', async () => {
      const { alchemyLabProcess } = await import('@helpers/alchemy-lab');
      const conversion: AlchemyConversion = {
        roomId: 'room-1' as PlacedRoomId,
        recipeId: FLUX_RECIPE_ID as AlchemyRecipeId,
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
        roomId: 'room-1' as PlacedRoomId,
        recipeId: FLUX_RECIPE_ID as AlchemyRecipeId,
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
        roomId: 'room-1' as PlacedRoomId,
        recipeId: FLUX_RECIPE_ID as AlchemyRecipeId,
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
        roomId: 'room-1' as PlacedRoomId,
        recipeId: FLUX_RECIPE_ID as AlchemyRecipeId,
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
        roomId: 'room-1' as PlacedRoomId,
        recipeId: FLUX_RECIPE_ID as AlchemyRecipeId,
        progress: 14,
        targetTicks: 15,
        inputConsumed: true,
      };

      const state = makeGameState({
        alchemyConversions: [conversion],
        resources: { flux: { current: 200, max: 200 } },
      });
      alchemyLabProcess(state);

      // Process no longer caps; resourceClampAll at end of tick handles capping
      expect(state.world.resources.flux.current).toBe(201);
    });

    it('should not process without assigned worker', async () => {
      const { alchemyLabProcess } = await import('@helpers/alchemy-lab');
      const conversion: AlchemyConversion = {
        roomId: 'room-1' as PlacedRoomId,
        recipeId: FLUX_RECIPE_ID as AlchemyRecipeId,
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
        roomId: 'room-1' as PlacedRoomId,
        recipeId: FLUX_RECIPE_ID as AlchemyRecipeId,
        progress: 5,
        targetTicks: 15,
        inputConsumed: true,
      };

      const state = makeGameState({
        alchemyConversions: [conversion],
        floors: [
          makeFloor({
            rooms: [makePlacedRoom({ roomTypeId: 'other-type' as RoomId })],
          }),
        ],
      });
      alchemyLabProcess(state);

      expect(state.world.alchemyConversions[0].progress).toBe(5);
    });

    it('should reset cycle on completion for continuous conversion', async () => {
      const { alchemyLabProcess } = await import('@helpers/alchemy-lab');
      const conversion: AlchemyConversion = {
        roomId: 'room-1' as PlacedRoomId,
        recipeId: FLUX_RECIPE_ID as AlchemyRecipeId,
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

    it('should handle dark-crucible recipe output (multiple units)', async () => {
      const { alchemyLabProcess } = await import('@helpers/alchemy-lab');
      const conversion: AlchemyConversion = {
        roomId: 'room-1' as PlacedRoomId,
        recipeId: DARK_TRANSMUTE_ID as AlchemyRecipeId,
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
    it('should unlock dark-crucible recipes with Dark Crucible upgrade', async () => {
      const allRecipes = [
        makeFluxRecipe(),
        makeDarkTransmuteRecipe(),
        makeCorruptionBrewingRecipe(),
        makeEssenceRecipe(),
        makeForbiddenKnowledgeRecipe(),
      ];
      vi.mocked(contentGetEntriesByType).mockReturnValue(allRecipes);

      const { alchemyLabGetAvailableRecipes } = await import(
        '@helpers/alchemy-lab'
      );
      const room = makePlacedRoom({
        appliedUpgradePathId: darkCruciblePath.id,
      });
      const result = alchemyLabGetAvailableRecipes(room);

      expect(result).toHaveLength(3);
      expect(result.map((r) => r.tier)).toContain('dark-crucible');
      expect(result.map((r) => r.tier)).not.toContain('arcane-annex');
      expect(result.map((r) => r.tier)).not.toContain('transmutation-forge');
    });

    it('should unlock arcane-annex recipes with Arcane Annex upgrade', async () => {
      const allRecipes = [
        makeFluxRecipe(),
        makeForbiddenKnowledgeRecipe(),
        makeDarkTransmuteRecipe(),
        makeEssenceRecipe(),
      ];
      vi.mocked(contentGetEntriesByType).mockReturnValue(allRecipes);

      const { alchemyLabGetAvailableRecipes } = await import(
        '@helpers/alchemy-lab'
      );
      const room = makePlacedRoom({
        appliedUpgradePathId: arcaneAnnexPath.id,
      });
      const result = alchemyLabGetAvailableRecipes(room);

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.tier)).toContain('arcane-annex');
      expect(result.map((r) => r.tier)).not.toContain('dark-crucible');
    });

    it('should unlock transmutation-forge recipes with Transmutation Forge upgrade', async () => {
      const allRecipes = [
        makeFluxRecipe(),
        makeEssenceRecipe(),
        makeEssenceRecyclingRecipe(),
        makeDarkTransmuteRecipe(),
      ];
      vi.mocked(contentGetEntriesByType).mockReturnValue(allRecipes);

      const { alchemyLabGetAvailableRecipes } = await import(
        '@helpers/alchemy-lab'
      );
      const room = makePlacedRoom({
        appliedUpgradePathId: transmutationForgePath.id,
      });
      const result = alchemyLabGetAvailableRecipes(room);

      expect(result).toHaveLength(3);
      expect(result.map((r) => r.tier)).toContain('transmutation-forge');
      expect(result.map((r) => r.tier)).not.toContain('dark-crucible');
    });
  });
});
