import type {
  Floor,
  FloorId,
  ForgeCraftingJob,
  ForgeInventoryEntry,
  ForgeRecipeContent,
  ForgeRecipeId,
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
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Constants ---

const DARK_FORGE_ID = 'ae673803-b514-4da9-a0d4-df448aa412a4';
const CRYSTAL_MINE_ID = '9d9bddd6-cb51-4a9f-866d-cc4773bdec37';
const TRAINING_GROUNDS_ID = '46b5aa14-f6c5-48db-a9dd-d1d070dfde56';
const IRON_SWORD_ID = 'a1f01001-0001-4001-8001-000000000001' as ForgeRecipeId;
const DARK_SHIELD_ID = 'a1f01001-0001-4001-8001-000000000002' as ForgeRecipeId;
const INFERNAL_BLADE_ID =
  'a1f01001-0001-4001-8001-000000000006' as ForgeRecipeId;

// --- Upgrade paths ---

const masterForgePath: RoomUpgradeContent = {
  id: 'e1f02001-0001-4001-8001-000000000001' as RoomUpgradeId,
  __type: 'roomupgrade',
  name: 'Master Forge',
  description: 'Expand forge capacity and speed.',
  cost: { gold: 120, crystals: 60 },
  effects: [
    { type: 'maxInhabitantBonus', value: 2 },
    { type: 'forgingSpeedMultiplier', value: 0.75 },
  ],
};

const infernalForgePath: RoomUpgradeContent = {
  id: 'e1f02001-0001-4001-8001-000000000002' as RoomUpgradeId,
  __type: 'roomupgrade',
  name: 'Infernal Forge',
  description: 'Unlock advanced recipes.',
  cost: { gold: 150, essence: 40, flux: 30 },
  effects: [
    { type: 'forgingTierUnlock', value: 1 },
    { type: 'forgingStatBonus', value: 2 },
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
    if (role === 'darkForge') return DARK_FORGE_ID;
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

vi.mock('@helpers/connectivity', () => ({
  connectivityGetConnectedRoomIds: (floor: {
    rooms: Array<{ id: string }>;
  }) => {
    const ids = new Set<string>();
    for (const room of floor.rooms) {
      ids.add(room.id);
    }
    return ids;
  },
  connectivityGetDisconnectedRoomIds: () => new Set<string>(),
  connectivityIsRoomConnected: () => true,
  connectivityUnassignDisconnectedInhabitants: vi.fn(async () => {}),
}));

// --- Recipe definitions ---

const ironSwordRecipe: ForgeRecipeContent = {
  id: IRON_SWORD_ID as ForgeRecipeId,
  name: 'Iron Sword',
  __type: 'forgerecipe',
  description: 'A sturdy iron blade.',
  cost: { gold: 40, crystals: 20 },
  timeMultiplier: 1.0,
  statBonuses: { attack: 3 },
  tier: 'basic',
};

const darkShieldRecipe: ForgeRecipeContent = {
  id: DARK_SHIELD_ID as ForgeRecipeId,
  name: 'Dark Shield',
  __type: 'forgerecipe',
  description: 'A shadow shield.',
  cost: { gold: 50, crystals: 15 },
  timeMultiplier: 1.2,
  statBonuses: { defense: 3 },
  tier: 'basic',
};

const infernalBladeRecipe: ForgeRecipeContent = {
  id: INFERNAL_BLADE_ID as ForgeRecipeId,
  name: 'Infernal Blade',
  __type: 'forgerecipe',
  description: 'A fearsome weapon.',
  cost: { gold: 120, essence: 40 },
  timeMultiplier: 2.0,
  statBonuses: { attack: 6, speed: 2 },
  tier: 'advanced',
};

// --- Room definitions ---

const forgeDef: RoomContent = {
  id: DARK_FORGE_ID as RoomId,
  name: 'Dark Forge',
  __type: 'room',
  description: 'Forges items.',
  shapeId: 'shape-2x2' as RoomShapeId,
  cost: { gold: 60, crystals: 20 },
  production: { gold: 1.2 },
  requiresWorkers: true,
  maxInhabitants: 2,
  inhabitantRestriction: undefined,
  fearLevel: 2,
  fearReductionAura: 0,
  adjacencyBonuses: [],
  isUnique: false,
  removable: true,
  autoPlace: false,
  role: 'darkForge',
  queueSize: 5,
  roomUpgradeIds: [masterForgePath.id, infernalForgePath.id],
};

const crystalMineDef: RoomContent = {
  id: CRYSTAL_MINE_ID as RoomId,
  name: 'Crystal Mine',
  __type: 'room',
  description: 'Mines crystals.',
  shapeId: 'shape-l' as RoomShapeId,
  cost: { gold: 50 },
  production: { crystals: 1.0 },
  requiresWorkers: true,
  maxInhabitants: 2,
  inhabitantRestriction: undefined,
  fearLevel: 1,
  fearReductionAura: 0,
  adjacencyBonuses: [],
  isUnique: false,
  removable: true,
  autoPlace: false,
  forgingAdjacencyEffects: { forgingSpeedBonus: 0.3 },
};

const trainingGroundsDef: RoomContent = {
  id: TRAINING_GROUNDS_ID as RoomId,
  name: 'Training Grounds',
  __type: 'room',
  description: 'Training.',
  shapeId: 'shape-t' as RoomShapeId,
  cost: { gold: 80, crystals: 30 },
  production: {},
  requiresWorkers: false,
  maxInhabitants: 4,
  inhabitantRestriction: undefined,
  fearLevel: 1,
  fearReductionAura: 0,
  adjacencyBonuses: [],
  isUnique: false,
  removable: true,
  autoPlace: false,
  forgingAdjacencyEffects: { forgingStatBonus: 1 },
};

// --- Helpers ---

function makeRoom(overrides: Partial<PlacedRoom> = {}): PlacedRoom {
  return {
    id: 'forge-1' as PlacedRoomId,
    roomTypeId: DARK_FORGE_ID as RoomId,
    shapeId: 'shape-2x2' as RoomShapeId,
    anchorX: 0,
    anchorY: 0,
    suffix: '',
    ...overrides,
  };
}

function makeInhabitant(
  overrides: Partial<InhabitantInstance> = {},
): InhabitantInstance {
  return {
    instanceId: 'inh-1' as InhabitantInstanceId,
    definitionId: 'def-1' as InhabitantId,
    name: 'Worker',
    state: 'normal',
    assignedRoomId: 'forge-1' as PlacedRoomId,
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
  forgeInventory?: ForgeInventoryEntry[];
}): GameState {
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
          roomupgrades: [],
          passiveBonuses: [],
        },
      },
      reputation: { terror: 0, wealth: 0, knowledge: 0, harmony: 0, chaos: 0 },
      floors: overrides.floors ?? [makeFloor()],
      currentFloorIndex: 0,
      trapInventory: [],
      forgeInventory: overrides.forgeInventory ?? [],
      alchemyConversions: [],
      prisoners: [],
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
  darkForgeAddJob,
  darkForgeAddToInventory,
  darkForgeAutoEquip,
  DARK_FORGE_BASE_CRAFTING_TICKS,
  darkForgeCanQueue,
  darkForgeGetAvailableRecipes,
  darkForgeGetCraftingTicks,
  darkForgeGetQueue,
  darkForgeGetStatBonuses,
  darkForgeProcess,
  darkForgeRemoveFromInventory,
  darkForgeRemoveJob,
} from '@helpers/dark-forge';
import { craftingQueueGetMaxSize } from '@helpers/crafting-queue';
import { contentGetEntriesByType } from '@helpers/content';

// --- Setup ---

beforeEach(() => {
  mockContent.clear();
  mockContent.set(DARK_FORGE_ID, forgeDef);
  mockContent.set(IRON_SWORD_ID, ironSwordRecipe);
  mockContent.set(DARK_SHIELD_ID, darkShieldRecipe);
  mockContent.set(INFERNAL_BLADE_ID, infernalBladeRecipe);
  mockContent.set(CRYSTAL_MINE_ID, crystalMineDef);
  mockContent.set(TRAINING_GROUNDS_ID, trainingGroundsDef);
  mockContent.set(masterForgePath.id, masterForgePath);
  mockContent.set(infernalForgePath.id, infernalForgePath);
});

// --- Tests ---

describe('Recipe Availability', () => {
  it('should return only basic recipes without Infernal Forge upgrade', () => {
    vi.mocked(contentGetEntriesByType).mockReturnValue([
      ironSwordRecipe,
      darkShieldRecipe,
      infernalBladeRecipe,
    ]);
    const room = makeRoom();
    const recipes = darkForgeGetAvailableRecipes(room);
    expect(recipes).toHaveLength(2);
    expect(recipes.every((r) => r.tier === 'basic')).toBe(true);
  });

  it('should include advanced recipes with Infernal Forge upgrade', () => {
    vi.mocked(contentGetEntriesByType).mockReturnValue([
      ironSwordRecipe,
      darkShieldRecipe,
      infernalBladeRecipe,
    ]);
    const room = makeRoom({ appliedUpgradePathId: infernalForgePath.id });
    const recipes = darkForgeGetAvailableRecipes(room);
    expect(recipes).toHaveLength(3);
    expect(recipes.some((r) => r.tier === 'advanced')).toBe(true);
  });
});

describe('Crafting Tick Calculation', () => {
  it('should return base time with 1 worker and no modifiers', () => {
    const room = makeRoom();
    const ticks = darkForgeGetCraftingTicks(room, 1, 1.0, new Set());
    expect(ticks).toBe(DARK_FORGE_BASE_CRAFTING_TICKS);
  });

  it('should apply recipe time multiplier', () => {
    const room = makeRoom();
    const ticks = darkForgeGetCraftingTicks(room, 1, 1.5, new Set());
    expect(ticks).toBe(Math.round(DARK_FORGE_BASE_CRAFTING_TICKS * 1.5));
  });

  it('should reduce time with 2 workers (20% faster)', () => {
    const room = makeRoom();
    const ticks = darkForgeGetCraftingTicks(room, 2, 1.0, new Set());
    expect(ticks).toBe(Math.round(DARK_FORGE_BASE_CRAFTING_TICKS * 0.8));
  });

  it('should cap worker bonus at 60% reduction (0.4 floor)', () => {
    const room = makeRoom();
    const ticks = darkForgeGetCraftingTicks(room, 10, 1.0, new Set());
    expect(ticks).toBe(Math.round(DARK_FORGE_BASE_CRAFTING_TICKS * 0.4));
  });

  it('should apply Master Forge speed upgrade', () => {
    const room = makeRoom({ appliedUpgradePathId: masterForgePath.id });
    const ticks = darkForgeGetCraftingTicks(room, 1, 1.0, new Set());
    expect(ticks).toBe(Math.round(DARK_FORGE_BASE_CRAFTING_TICKS * 0.75));
  });

  it('should apply adjacency speed bonus from Crystal Mine', () => {
    const room = makeRoom();
    const adjacentTypes = new Set([CRYSTAL_MINE_ID]);
    const ticks = darkForgeGetCraftingTicks(room, 1, 1.0, adjacentTypes);
    expect(ticks).toBe(Math.round(DARK_FORGE_BASE_CRAFTING_TICKS * (1 - 0.3)));
  });

  it('should combine upgrade, worker, and adjacency bonuses', () => {
    const room = makeRoom({ appliedUpgradePathId: masterForgePath.id });
    const adjacentTypes = new Set([CRYSTAL_MINE_ID]);
    const ticks = darkForgeGetCraftingTicks(room, 2, 1.0, adjacentTypes);
    const afterUpgrade = Math.round(DARK_FORGE_BASE_CRAFTING_TICKS * 0.75);
    const afterWorker = Math.round(afterUpgrade * 0.8);
    const afterAdj = Math.round(afterWorker * 0.7);
    expect(ticks).toBe(afterAdj);
  });
});

describe('Stat Bonus Calculation', () => {
  it('should return recipe base bonuses with no modifiers', () => {
    const room = makeRoom();
    const bonuses = darkForgeGetStatBonuses(room, ironSwordRecipe, new Set());
    expect(bonuses).toEqual({ attack: 3 });
  });

  it('should add Infernal Forge upgrade stat bonus (+2 all)', () => {
    const room = makeRoom({ appliedUpgradePathId: infernalForgePath.id });
    const bonuses = darkForgeGetStatBonuses(room, ironSwordRecipe, new Set());
    expect(bonuses.attack).toBe(5);
    expect(bonuses.hp).toBe(2);
    expect(bonuses.defense).toBe(2);
    expect(bonuses.speed).toBe(2);
  });

  it('should add adjacency stat bonus from Training Grounds', () => {
    const room = makeRoom();
    const adjacentTypes = new Set([TRAINING_GROUNDS_ID]);
    const bonuses = darkForgeGetStatBonuses(
      room,
      ironSwordRecipe,
      adjacentTypes,
    );
    expect(bonuses.attack).toBe(4);
    expect(bonuses.hp).toBe(1);
    expect(bonuses.defense).toBe(1);
    expect(bonuses.speed).toBe(1);
  });

  it('should combine upgrade and adjacency stat bonuses', () => {
    const room = makeRoom({ appliedUpgradePathId: infernalForgePath.id });
    const adjacentTypes = new Set([TRAINING_GROUNDS_ID]);
    const bonuses = darkForgeGetStatBonuses(
      room,
      ironSwordRecipe,
      adjacentTypes,
    );
    expect(bonuses.attack).toBe(6);
    expect(bonuses.hp).toBe(3);
    expect(bonuses.defense).toBe(3);
    expect(bonuses.speed).toBe(3);
  });
});

describe('Queue Management', () => {
  describe('darkForgeAddJob', () => {
    it('should add a job to a room with no existing queue', () => {
      const room = makeRoom();
      darkForgeAddJob(room, IRON_SWORD_ID, 20);
      expect(room.forgeJobs).toHaveLength(1);
      expect(room.forgeJobs![0].recipeId).toBe(IRON_SWORD_ID);
      expect(room.forgeJobs![0].progress).toBe(0);
      expect(room.forgeJobs![0].targetTicks).toBe(20);
    });

    it('should append job to existing queue', () => {
      const room = makeRoom({
        forgeJobs: [{ recipeId: IRON_SWORD_ID, progress: 5, targetTicks: 20 }],
      });
      darkForgeAddJob(room, DARK_SHIELD_ID, 25);
      expect(room.forgeJobs).toHaveLength(2);
      expect(room.forgeJobs![1].recipeId).toBe(DARK_SHIELD_ID);
    });
  });

  describe('darkForgeRemoveJob', () => {
    it('should remove job at specified index', () => {
      const room = makeRoom({
        forgeJobs: [
          { recipeId: IRON_SWORD_ID, progress: 0, targetTicks: 20 },
          { recipeId: DARK_SHIELD_ID, progress: 0, targetTicks: 25 },
        ],
      });
      darkForgeRemoveJob(room, 0);
      expect(room.forgeJobs).toHaveLength(1);
      expect(room.forgeJobs![0].recipeId).toBe(DARK_SHIELD_ID);
    });

    it('should clear forgeJobs when last job removed', () => {
      const room = makeRoom({
        forgeJobs: [{ recipeId: IRON_SWORD_ID, progress: 0, targetTicks: 20 }],
      });
      darkForgeRemoveJob(room, 0);
      expect(room.forgeJobs).toBeUndefined();
    });
  });

  describe('darkForgeGetQueue', () => {
    it('should return empty array when no jobs', () => {
      const room = makeRoom();
      expect(darkForgeGetQueue(room)).toEqual([]);
    });

    it('should return jobs array when present', () => {
      const jobs: ForgeCraftingJob[] = [{ recipeId: IRON_SWORD_ID, progress: 0, targetTicks: 20 }];
      const room = makeRoom({ forgeJobs: jobs });
      expect(darkForgeGetQueue(room)).toBe(jobs);
    });
  });
});

describe('craftingQueueGetMaxSize', () => {
  it('should return base queueSize from room definition', () => {
    const room = makeRoom();
    expect(craftingQueueGetMaxSize(room)).toBe(5);
  });
});

describe('darkForgeCanQueue', () => {
  it('should allow queuing with assigned worker and space', () => {
    const forge = makeRoom();
    const worker = makeInhabitant({ assignedRoomId: forge.id });
    const floor = makeFloor([forge], [worker]);

    const result = darkForgeCanQueue(forge, floor);
    expect(result.canQueue).toBe(true);
  });

  it('should reject when no workers assigned', () => {
    const forge = makeRoom();
    const floor = makeFloor([forge], []);

    const result = darkForgeCanQueue(forge, floor);
    expect(result.canQueue).toBe(false);
    expect(result.reason).toContain('inhabitant');
  });

  it('should reject for non-forge room', () => {
    const room = makeRoom({ roomTypeId: 'other-type' as RoomId });
    const worker = makeInhabitant({ assignedRoomId: room.id });
    const floor = makeFloor([room], [worker]);

    const result = darkForgeCanQueue(room, floor);
    expect(result.canQueue).toBe(false);
    expect(result.reason).toContain('not a Dark Forge');
  });

  it('should reject when queue is full', () => {
    const maxSize = craftingQueueGetMaxSize(makeRoom());
    const forge = makeRoom({
      forgeJobs: Array.from({ length: maxSize }, () => ({
        recipeId: IRON_SWORD_ID,
        progress: 0,
        targetTicks: 20,
      })),
    });
    const worker = makeInhabitant({ assignedRoomId: forge.id });
    const floor = makeFloor([forge], [worker]);

    const result = darkForgeCanQueue(forge, floor);
    expect(result.canQueue).toBe(false);
    expect(result.reason).toContain('full');
  });
});

describe('Inventory Management', () => {
  it('should add new entry for first item', () => {
    const result = darkForgeAddToInventory([], IRON_SWORD_ID, { attack: 3 });
    expect(result).toHaveLength(1);
    expect(result[0].recipeId).toBe(IRON_SWORD_ID);
    expect(result[0].count).toBe(1);
    expect(result[0].bakedStatBonuses).toEqual({ attack: 3 });
  });

  it('should increment count for existing item with matching bonuses', () => {
    const inventory: ForgeInventoryEntry[] = [
      { recipeId: IRON_SWORD_ID, count: 2, bakedStatBonuses: { attack: 3 } },
    ];
    const result = darkForgeAddToInventory(inventory, IRON_SWORD_ID, { attack: 3 });
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(3);
  });

  it('should create separate stack when same recipe has different bonuses', () => {
    const inventory: ForgeInventoryEntry[] = [
      { recipeId: IRON_SWORD_ID, count: 1, bakedStatBonuses: { attack: 3 } },
    ];
    const result = darkForgeAddToInventory(inventory, IRON_SWORD_ID, { attack: 5 });
    expect(result).toHaveLength(2);
    expect(result[0].bakedStatBonuses).toEqual({ attack: 3 });
    expect(result[1].bakedStatBonuses).toEqual({ attack: 5 });
  });

  it('should handle multiple items independently', () => {
    const inventory: ForgeInventoryEntry[] = [
      { recipeId: IRON_SWORD_ID, count: 1, bakedStatBonuses: { attack: 3 } },
    ];
    const result = darkForgeAddToInventory(inventory, DARK_SHIELD_ID, { defense: 3 });
    expect(result).toHaveLength(2);
    expect(result[0].recipeId).toBe(IRON_SWORD_ID);
    expect(result[0].count).toBe(1);
    expect(result[1].recipeId).toBe(DARK_SHIELD_ID);
    expect(result[1].count).toBe(1);
  });
});

describe('darkForgeRemoveFromInventory', () => {
  it('should decrement count for matching stack', () => {
    const inventory: ForgeInventoryEntry[] = [
      { recipeId: IRON_SWORD_ID, count: 3, bakedStatBonuses: { attack: 3 } },
    ];
    const result = darkForgeRemoveFromInventory(inventory, IRON_SWORD_ID, { attack: 3 });
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(2);
  });

  it('should remove entry when count reaches 0', () => {
    const inventory: ForgeInventoryEntry[] = [
      { recipeId: IRON_SWORD_ID, count: 1, bakedStatBonuses: { attack: 3 } },
    ];
    const result = darkForgeRemoveFromInventory(inventory, IRON_SWORD_ID, { attack: 3 });
    expect(result).toHaveLength(0);
  });

  it('should not modify inventory when no matching stack found', () => {
    const inventory: ForgeInventoryEntry[] = [
      { recipeId: IRON_SWORD_ID, count: 2, bakedStatBonuses: { attack: 3 } },
    ];
    const result = darkForgeRemoveFromInventory(inventory, IRON_SWORD_ID, { attack: 5 });
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(2);
  });

  it('should only remove from the matching bonus stack', () => {
    const inventory: ForgeInventoryEntry[] = [
      { recipeId: IRON_SWORD_ID, count: 2, bakedStatBonuses: { attack: 3 } },
      { recipeId: IRON_SWORD_ID, count: 1, bakedStatBonuses: { attack: 5 } },
    ];
    const result = darkForgeRemoveFromInventory(inventory, IRON_SWORD_ID, { attack: 5 });
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(2);
    expect(result[0].bakedStatBonuses).toEqual({ attack: 3 });
  });
});

describe('darkForgeAutoEquip', () => {
  it('should equip unequipped inhabitants with best available items', () => {
    const forge = makeRoom();
    const inh1 = makeInhabitant({
      instanceId: 'inh-1' as InhabitantInstanceId,
      assignedRoomId: forge.id,
    });
    const inh2 = makeInhabitant({
      instanceId: 'inh-2' as InhabitantInstanceId,
      assignedRoomId: forge.id,
    });
    const floor = makeFloor([forge], [inh1, inh2]);
    const state = makeGameState({
      floors: [floor],
      forgeInventory: [
        { recipeId: IRON_SWORD_ID, count: 1, bakedStatBonuses: { attack: 3 } },
        { recipeId: INFERNAL_BLADE_ID, count: 1, bakedStatBonuses: { attack: 6, speed: 2 } },
      ],
    });

    darkForgeAutoEquip(state, floor);

    // Best item (infernal blade, sum=8) goes to first inhabitant
    expect(inh1.equippedForgeItemRecipeId).toBe(INFERNAL_BLADE_ID);
    expect(inh1.equippedStatBonuses).toEqual({ attack: 6, speed: 2 });

    // Next best (iron sword, sum=3) goes to second
    expect(inh2.equippedForgeItemRecipeId).toBe(IRON_SWORD_ID);
    expect(inh2.equippedStatBonuses).toEqual({ attack: 3 });

    // Inventory should be empty
    expect(state.world.forgeInventory).toHaveLength(0);
  });

  it('should skip already equipped inhabitants', () => {
    const forge = makeRoom();
    const equippedInh = makeInhabitant({
      instanceId: 'inh-1' as InhabitantInstanceId,
      assignedRoomId: forge.id,
      equippedForgeItemRecipeId: DARK_SHIELD_ID,
      equippedStatBonuses: { defense: 3 },
    });
    const unequippedInh = makeInhabitant({
      instanceId: 'inh-2' as InhabitantInstanceId,
      assignedRoomId: forge.id,
    });
    const floor = makeFloor([forge], [equippedInh, unequippedInh]);
    const state = makeGameState({
      floors: [floor],
      forgeInventory: [
        { recipeId: IRON_SWORD_ID, count: 1, bakedStatBonuses: { attack: 3 } },
      ],
    });

    darkForgeAutoEquip(state, floor);

    // Already equipped inhabitant unchanged
    expect(equippedInh.equippedForgeItemRecipeId).toBe(DARK_SHIELD_ID);

    // Unequipped inhabitant gets the item
    expect(unequippedInh.equippedForgeItemRecipeId).toBe(IRON_SWORD_ID);
    expect(state.world.forgeInventory).toHaveLength(0);
  });

  it('should do nothing with empty inventory', () => {
    const forge = makeRoom();
    const inh = makeInhabitant({ assignedRoomId: forge.id });
    const floor = makeFloor([forge], [inh]);
    const state = makeGameState({ floors: [floor], forgeInventory: [] });

    darkForgeAutoEquip(state, floor);

    expect(inh.equippedForgeItemRecipeId).toBeUndefined();
  });

  it('should skip inhabitants without a room assignment', () => {
    const forge = makeRoom();
    const unassigned = makeInhabitant({
      instanceId: 'inh-1' as InhabitantInstanceId,
      assignedRoomId: undefined,
    });
    const floor = makeFloor([forge], [unassigned]);
    const state = makeGameState({
      floors: [floor],
      forgeInventory: [
        { recipeId: IRON_SWORD_ID, count: 1, bakedStatBonuses: { attack: 3 } },
      ],
    });

    darkForgeAutoEquip(state, floor);

    expect(unassigned.equippedForgeItemRecipeId).toBeUndefined();
    expect(state.world.forgeInventory).toHaveLength(1);
  });

  it('should handle more inhabitants than inventory items', () => {
    const forge = makeRoom();
    const inh1 = makeInhabitant({ instanceId: 'inh-1' as InhabitantInstanceId, assignedRoomId: forge.id });
    const inh2 = makeInhabitant({ instanceId: 'inh-2' as InhabitantInstanceId, assignedRoomId: forge.id });
    const inh3 = makeInhabitant({ instanceId: 'inh-3' as InhabitantInstanceId, assignedRoomId: forge.id });
    const floor = makeFloor([forge], [inh1, inh2, inh3]);
    const state = makeGameState({
      floors: [floor],
      forgeInventory: [
        { recipeId: IRON_SWORD_ID, count: 2, bakedStatBonuses: { attack: 3 } },
      ],
    });

    darkForgeAutoEquip(state, floor);

    expect(inh1.equippedForgeItemRecipeId).toBe(IRON_SWORD_ID);
    expect(inh2.equippedForgeItemRecipeId).toBe(IRON_SWORD_ID);
    expect(inh3.equippedForgeItemRecipeId).toBeUndefined();
    expect(state.world.forgeInventory).toHaveLength(0);
  });
});

describe('darkForgeProcess', () => {
  it('should advance progress on first job in queue', () => {
    const forge = makeRoom({
      forgeJobs: [{ recipeId: IRON_SWORD_ID, progress: 0, targetTicks: 5 }],
    });
    const worker = makeInhabitant({ assignedRoomId: forge.id });
    const floor = makeFloor([forge], [worker]);
    const state = makeGameState({ floors: [floor] });

    darkForgeProcess(state);

    expect(forge.forgeJobs![0].progress).toBe(1);
  });

  it('should complete job and add to inventory with baked stat bonuses', () => {
    const forge = makeRoom({
      forgeJobs: [{ recipeId: IRON_SWORD_ID, progress: 4, targetTicks: 5 }],
    });
    // Worker is already equipped so auto-equip won't consume the new item
    const worker = makeInhabitant({
      assignedRoomId: forge.id,
      equippedForgeItemRecipeId: DARK_SHIELD_ID,
      equippedStatBonuses: { defense: 3 },
    });
    const floor = makeFloor([forge], [worker]);
    const state = makeGameState({ floors: [floor] });

    darkForgeProcess(state);

    expect(forge.forgeJobs).toBeUndefined();
    expect(state.world.forgeInventory).toHaveLength(1);
    expect(state.world.forgeInventory[0].recipeId).toBe(IRON_SWORD_ID);
    expect(state.world.forgeInventory[0].count).toBe(1);
    expect(state.world.forgeInventory[0].bakedStatBonuses).toEqual({ attack: 3 });
  });

  it('should auto-equip inhabitant after completing a forge job', () => {
    const forge = makeRoom({
      forgeJobs: [{ recipeId: IRON_SWORD_ID, progress: 4, targetTicks: 5 }],
    });
    const worker = makeInhabitant({ assignedRoomId: forge.id });
    const floor = makeFloor([forge], [worker]);
    const state = makeGameState({ floors: [floor] });

    darkForgeProcess(state);

    // Worker should be auto-equipped since they're unequipped and on the floor with a forge
    expect(worker.equippedForgeItemRecipeId).toBe(IRON_SWORD_ID);
    expect(worker.equippedStatBonuses).toEqual({ attack: 3 });
    expect(state.world.forgeInventory).toHaveLength(0);
  });

  it('should not progress when no workers assigned', () => {
    const forge = makeRoom({
      forgeJobs: [{ recipeId: IRON_SWORD_ID, progress: 0, targetTicks: 5 }],
    });
    const floor = makeFloor([forge], []);
    const state = makeGameState({ floors: [floor] });

    darkForgeProcess(state);

    expect(forge.forgeJobs![0].progress).toBe(0);
  });

  it('should only progress the first job in queue', () => {
    const forge = makeRoom({
      forgeJobs: [
        { recipeId: IRON_SWORD_ID, progress: 0, targetTicks: 5 },
        { recipeId: DARK_SHIELD_ID, progress: 0, targetTicks: 10 },
      ],
    });
    const worker = makeInhabitant({ assignedRoomId: forge.id });
    const floor = makeFloor([forge], [worker]);
    const state = makeGameState({ floors: [floor] });

    darkForgeProcess(state);

    expect(forge.forgeJobs![0].progress).toBe(1);
    expect(forge.forgeJobs![1].progress).toBe(0);
  });

  it('should process multiple forges across floors', () => {
    const forge1 = makeRoom({ id: 'forge-1' as PlacedRoomId,
      forgeJobs: [{ recipeId: IRON_SWORD_ID, progress: 0, targetTicks: 5 }],
    });
    const forge2 = makeRoom({ id: 'forge-2' as PlacedRoomId,
      forgeJobs: [{ recipeId: DARK_SHIELD_ID, progress: 0, targetTicks: 10 }],
    });
    const w1 = makeInhabitant({
      instanceId: 'w1' as InhabitantInstanceId,
      assignedRoomId: 'forge-1' as PlacedRoomId,
    });
    const w2 = makeInhabitant({
      instanceId: 'w2' as InhabitantInstanceId,
      assignedRoomId: 'forge-2' as PlacedRoomId,
    });
    const floor1 = makeFloor([forge1], [w1]);
    const floor2 = makeFloor([forge2], [w2]);
    floor2.id = 'floor-2' as FloorId;

    const state = makeGameState({ floors: [floor1, floor2] });

    darkForgeProcess(state);

    expect(forge1.forgeJobs![0].progress).toBe(1);
    expect(forge2.forgeJobs![0].progress).toBe(1);
  });

  it('should accumulate inventory across completions', () => {
    const forge = makeRoom({
      forgeJobs: [{ recipeId: IRON_SWORD_ID, progress: 19, targetTicks: 20 }],
    });
    const worker = makeInhabitant({
      assignedRoomId: forge.id,
      equippedForgeItemRecipeId: DARK_SHIELD_ID,
      equippedStatBonuses: { defense: 3 },
    });
    const floor = makeFloor([forge], [worker]);
    const state = makeGameState({
      floors: [floor],
      forgeInventory: [{ recipeId: IRON_SWORD_ID, count: 2, bakedStatBonuses: { attack: 3 } }],
    });

    darkForgeProcess(state);

    expect(state.world.forgeInventory[0].count).toBe(3);
  });

  it('should advance to next job after completing first', () => {
    const forge = makeRoom({
      forgeJobs: [
        { recipeId: IRON_SWORD_ID, progress: 4, targetTicks: 5 },
        { recipeId: DARK_SHIELD_ID, progress: 0, targetTicks: 10 },
      ],
    });
    const worker = makeInhabitant({ assignedRoomId: forge.id });
    const floor = makeFloor([forge], [worker]);
    const state = makeGameState({ floors: [floor] });

    darkForgeProcess(state);

    expect(forge.forgeJobs).toHaveLength(1);
    expect(forge.forgeJobs![0].recipeId).toBe(DARK_SHIELD_ID);
    // Worker gets auto-equipped with the completed item
    expect(worker.equippedForgeItemRecipeId).toBe(IRON_SWORD_ID);
  });
});

describe('Upgrade Effects', () => {
  it('Master Forge: increases capacity by 2 and crafting speed 0.75x', () => {
    expect(masterForgePath.effects).toContainEqual({
      type: 'maxInhabitantBonus',
      value: 2,
    });
    expect(masterForgePath.effects).toContainEqual({
      type: 'forgingSpeedMultiplier',
      value: 0.75,
    });
  });

  it('Infernal Forge: unlocks advanced tier and adds +2 stat bonus', () => {
    expect(infernalForgePath.effects).toContainEqual({
      type: 'forgingTierUnlock',
      value: 1,
    });
    expect(infernalForgePath.effects).toContainEqual({
      type: 'forgingStatBonus',
      value: 2,
    });
  });
});
