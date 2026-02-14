import type {
  Floor,
  ForgeCraftingQueue,
  ForgeInventoryEntry,
  ForgeRecipeContent,
  GameState,
  InhabitantInstance,
  IsContentItem,
  PlacedRoom,
  PlacedRoomId,
  RoomDefinition,
  RoomId,
  RoomUpgradePath,
} from '@interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Constants ---

const DARK_FORGE_ID = 'ae673803-b514-4da9-a0d4-df448aa412a4';
const CRYSTAL_MINE_ID = '9d9bddd6-cb51-4a9f-866d-cc4773bdec37';
const TRAINING_GROUNDS_ID = '46b5aa14-f6c5-48db-a9dd-d1d070dfde56';
const IRON_SWORD_ID = 'a1f01001-0001-4001-8001-000000000001';
const DARK_SHIELD_ID = 'a1f01001-0001-4001-8001-000000000002';
const INFERNAL_BLADE_ID = 'a1f01001-0001-4001-8001-000000000006';

// --- Upgrade paths ---

const masterForgePath: RoomUpgradePath = {
  id: 'e1f02001-0001-4001-8001-000000000001',
  name: 'Master Forge',
  description: 'Expand forge capacity and speed.',
  cost: { gold: 120, crystals: 60 },
  effects: [
    { type: 'maxInhabitantBonus', value: 2 },
    { type: 'forgingSpeedMultiplier', value: 0.75 },
  ],
};

const infernalForgePath: RoomUpgradePath = {
  id: 'e1f02001-0001-4001-8001-000000000002',
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
  roomShapeResolve: vi.fn(() => ({ tiles: [{ x: 0, y: 0 }], width: 1, height: 1 })),
  roomShapeGetAbsoluteTiles: vi.fn((_shape: unknown, ax: number, ay: number) => [{ x: ax, y: ay }]),
}));

vi.mock('@helpers/adjacency', () => ({
  adjacencyAreRoomsAdjacent: vi.fn(() => false),
}));

// --- Recipe definitions ---

const ironSwordRecipe: ForgeRecipeContent & IsContentItem = {
  id: IRON_SWORD_ID as ForgeRecipeContent['id'],
  name: 'Iron Sword',
  __type: 'forgerecipe',
  description: 'A sturdy iron blade.',
  category: 'equipment',
  cost: { gold: 40, crystals: 20 },
  timeMultiplier: 1.0,
  statBonuses: { attack: 3 },
  tier: 'basic',
};

const darkShieldRecipe: ForgeRecipeContent & IsContentItem = {
  id: DARK_SHIELD_ID as ForgeRecipeContent['id'],
  name: 'Dark Shield',
  __type: 'forgerecipe',
  description: 'A shadow shield.',
  category: 'equipment',
  cost: { gold: 50, crystals: 15 },
  timeMultiplier: 1.2,
  statBonuses: { defense: 3 },
  tier: 'basic',
};

const infernalBladeRecipe: ForgeRecipeContent & IsContentItem = {
  id: INFERNAL_BLADE_ID as ForgeRecipeContent['id'],
  name: 'Infernal Blade',
  __type: 'forgerecipe',
  description: 'A fearsome weapon.',
  category: 'equipment',
  cost: { gold: 120, essence: 40 },
  timeMultiplier: 2.0,
  statBonuses: { attack: 6, speed: 2 },
  tier: 'advanced',
};

// --- Room definitions ---

const forgeDef: RoomDefinition & IsContentItem = {
  id: DARK_FORGE_ID,
  name: 'Dark Forge',
  __type: 'room',
  description: 'Forges items.',
  shapeId: 'shape-2x2',
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
  upgradePaths: [masterForgePath, infernalForgePath],
  autoPlace: false,
  role: 'darkForge',
};

const crystalMineDef: RoomDefinition & IsContentItem = {
  id: CRYSTAL_MINE_ID,
  name: 'Crystal Mine',
  __type: 'room',
  description: 'Mines crystals.',
  shapeId: 'shape-l',
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
  upgradePaths: [],
  autoPlace: false,
  forgingAdjacencyEffects: { forgingSpeedBonus: 0.30 },
};

const trainingGroundsDef: RoomDefinition & IsContentItem = {
  id: TRAINING_GROUNDS_ID,
  name: 'Training Grounds',
  __type: 'room',
  description: 'Training.',
  shapeId: 'shape-t',
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
  upgradePaths: [],
  autoPlace: false,
  forgingAdjacencyEffects: { forgingStatBonus: 1 },
};

// --- Helpers ---

function makeRoom(overrides: Partial<PlacedRoom> = {}): PlacedRoom {
  return {
    id: 'forge-1' as PlacedRoomId,
    roomTypeId: DARK_FORGE_ID as RoomId,
    shapeId: 'shape-2x2',
    anchorX: 0,
    anchorY: 0,
    ...overrides,
  };
}

function makeInhabitant(
  overrides: Partial<InhabitantInstance> = {},
): InhabitantInstance {
  return {
    instanceId: 'inh-1',
    definitionId: 'def-1',
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
    id: 'floor-1',
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
  forgeInventory?: ForgeInventoryEntry[];
  forgeCraftingQueues?: ForgeCraftingQueue[];
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
      forgeInventory: overrides.forgeInventory ?? [],
      forgeCraftingQueues: overrides.forgeCraftingQueues ?? [],
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
  darkForgeAddJob,
  darkForgeAddToInventory,
  DARK_FORGE_BASE_CRAFTING_TICKS,
  darkForgeCanQueue,
  darkForgeGetAvailableRecipes,
  darkForgeGetCraftingTicks,
  darkForgeGetStatBonuses,
  darkForgeProcess,
  darkForgeRemoveJob,
  DARK_FORGE_MAX_QUEUE_SIZE,
} from '@helpers/dark-forge';
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
});

// --- Tests ---

describe('Recipe Availability', () => {
  it('should return only basic recipes without Infernal Forge upgrade', () => {
    vi.mocked(contentGetEntriesByType).mockReturnValue([ironSwordRecipe, darkShieldRecipe, infernalBladeRecipe]);
    const room = makeRoom();
    const recipes = darkForgeGetAvailableRecipes(room);
    expect(recipes).toHaveLength(2);
    expect(recipes.every((r) => r.tier === 'basic')).toBe(true);
  });

  it('should include advanced recipes with Infernal Forge upgrade', () => {
    vi.mocked(contentGetEntriesByType).mockReturnValue([ironSwordRecipe, darkShieldRecipe, infernalBladeRecipe]);
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
    expect(ticks).toBe(Math.round(DARK_FORGE_BASE_CRAFTING_TICKS * (1 - 0.30)));
  });

  it('should combine upgrade, worker, and adjacency bonuses', () => {
    const room = makeRoom({ appliedUpgradePathId: masterForgePath.id });
    const adjacentTypes = new Set([CRYSTAL_MINE_ID]);
    const ticks = darkForgeGetCraftingTicks(room, 2, 1.0, adjacentTypes);
    // upgrade: 20 * 0.75 = 15, worker: 15 * 0.8 = 12, adjacency: 12 * 0.7 = 8.4 → 8
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
    expect(bonuses.attack).toBe(5); // 3 + 2
    expect(bonuses.hp).toBe(2);
    expect(bonuses.defense).toBe(2);
    expect(bonuses.speed).toBe(2);
  });

  it('should add adjacency stat bonus from Training Grounds', () => {
    const room = makeRoom();
    const adjacentTypes = new Set([TRAINING_GROUNDS_ID]);
    const bonuses = darkForgeGetStatBonuses(room, ironSwordRecipe, adjacentTypes);
    expect(bonuses.attack).toBe(4); // 3 + 1
    expect(bonuses.hp).toBe(1);
    expect(bonuses.defense).toBe(1);
    expect(bonuses.speed).toBe(1);
  });

  it('should combine upgrade and adjacency stat bonuses', () => {
    const room = makeRoom({ appliedUpgradePathId: infernalForgePath.id });
    const adjacentTypes = new Set([TRAINING_GROUNDS_ID]);
    const bonuses = darkForgeGetStatBonuses(room, ironSwordRecipe, adjacentTypes);
    // recipe attack 3 + upgrade 2 + adjacency 1 = 6
    expect(bonuses.attack).toBe(6);
    expect(bonuses.hp).toBe(3); // 0 + 2 + 1
    expect(bonuses.defense).toBe(3);
    expect(bonuses.speed).toBe(3);
  });
});

describe('Queue Management', () => {
  describe('darkForgeAddJob', () => {
    it('should create new queue entry for room without existing queue', () => {
      const result = darkForgeAddJob([], 'forge-1' as PlacedRoomId, IRON_SWORD_ID, 20);
      expect(result).toHaveLength(1);
      expect(result[0].roomId).toBe('forge-1');
      expect(result[0].jobs).toHaveLength(1);
      expect(result[0].jobs[0].recipeId).toBe(IRON_SWORD_ID);
      expect(result[0].jobs[0].progress).toBe(0);
      expect(result[0].jobs[0].targetTicks).toBe(20);
    });

    it('should append job to existing queue', () => {
      const queues: ForgeCraftingQueue[] = [
        {
          roomId: 'forge-1' as PlacedRoomId,
          jobs: [{ recipeId: IRON_SWORD_ID, progress: 5, targetTicks: 20 }],
        },
      ];
      const result = darkForgeAddJob(queues, 'forge-1' as PlacedRoomId, DARK_SHIELD_ID, 25);
      expect(result[0].jobs).toHaveLength(2);
      expect(result[0].jobs[1].recipeId).toBe(DARK_SHIELD_ID);
    });

    it('should not modify other room queues', () => {
      const queues: ForgeCraftingQueue[] = [
        {
          roomId: 'forge-other' as PlacedRoomId,
          jobs: [{ recipeId: IRON_SWORD_ID, progress: 0, targetTicks: 20 }],
        },
      ];
      const result = darkForgeAddJob(queues, 'forge-1' as PlacedRoomId, DARK_SHIELD_ID, 25);
      expect(result).toHaveLength(2);
      expect(result[0].roomId).toBe('forge-other');
      expect(result[0].jobs).toHaveLength(1);
    });
  });

  describe('darkForgeRemoveJob', () => {
    it('should remove job at specified index', () => {
      const queues: ForgeCraftingQueue[] = [
        {
          roomId: 'forge-1' as PlacedRoomId,
          jobs: [
            { recipeId: IRON_SWORD_ID, progress: 0, targetTicks: 20 },
            { recipeId: DARK_SHIELD_ID, progress: 0, targetTicks: 25 },
          ],
        },
      ];
      const result = darkForgeRemoveJob(queues, 'forge-1' as PlacedRoomId, 0);
      expect(result[0].jobs).toHaveLength(1);
      expect(result[0].jobs[0].recipeId).toBe(DARK_SHIELD_ID);
    });

    it('should remove queue entry when last job removed', () => {
      const queues: ForgeCraftingQueue[] = [
        {
          roomId: 'forge-1' as PlacedRoomId,
          jobs: [{ recipeId: IRON_SWORD_ID, progress: 0, targetTicks: 20 }],
        },
      ];
      const result = darkForgeRemoveJob(queues, 'forge-1' as PlacedRoomId, 0);
      expect(result).toHaveLength(0);
    });
  });
});

describe('darkForgeCanQueue', () => {
  it('should allow queuing with assigned worker and space', () => {
    const forge = makeRoom();
    const worker = makeInhabitant({ assignedRoomId: forge.id });
    const floor = makeFloor([forge], [worker]);

    const result = darkForgeCanQueue(forge.id, [floor], []);
    expect(result.canQueue).toBe(true);
    expect(result.room).toBeDefined();
  });

  it('should reject when no workers assigned', () => {
    const forge = makeRoom();
    const floor = makeFloor([forge], []);

    const result = darkForgeCanQueue(forge.id, [floor], []);
    expect(result.canQueue).toBe(false);
    expect(result.reason).toContain('inhabitant');
  });

  it('should reject for non-forge room', () => {
    const room = makeRoom({ roomTypeId: 'other-type' as RoomId });
    const worker = makeInhabitant({ assignedRoomId: room.id });
    const floor = makeFloor([room], [worker]);

    const result = darkForgeCanQueue(room.id, [floor], []);
    expect(result.canQueue).toBe(false);
    expect(result.reason).toContain('not a Dark Forge');
  });

  it('should reject when queue is full', () => {
    const forge = makeRoom();
    const worker = makeInhabitant({ assignedRoomId: forge.id });
    const floor = makeFloor([forge], [worker]);

    const fullQueue: ForgeCraftingQueue[] = [
      {
        roomId: forge.id,
        jobs: Array.from({ length: DARK_FORGE_MAX_QUEUE_SIZE }, () => ({
          recipeId: IRON_SWORD_ID,
          progress: 0,
          targetTicks: 20,
        })),
      },
    ];

    const result = darkForgeCanQueue(forge.id, [floor], fullQueue);
    expect(result.canQueue).toBe(false);
    expect(result.reason).toContain('full');
  });

  it('should return not found for missing room', () => {
    const floor = makeFloor();
    const result = darkForgeCanQueue('nonexistent' as PlacedRoomId, [floor], []);
    expect(result.canQueue).toBe(false);
    expect(result.reason).toContain('not found');
  });
});

describe('Inventory Management', () => {
  it('should add new entry for first item', () => {
    const result = darkForgeAddToInventory([], IRON_SWORD_ID);
    expect(result).toHaveLength(1);
    expect(result[0].recipeId).toBe(IRON_SWORD_ID);
    expect(result[0].count).toBe(1);
  });

  it('should increment count for existing item', () => {
    const inventory: ForgeInventoryEntry[] = [{ recipeId: IRON_SWORD_ID, count: 2 }];
    const result = darkForgeAddToInventory(inventory, IRON_SWORD_ID);
    expect(result[0].count).toBe(3);
  });

  it('should handle multiple items independently', () => {
    const inventory: ForgeInventoryEntry[] = [{ recipeId: IRON_SWORD_ID, count: 1 }];
    const result = darkForgeAddToInventory(inventory, DARK_SHIELD_ID);
    expect(result).toHaveLength(2);
    expect(result[0].recipeId).toBe(IRON_SWORD_ID);
    expect(result[0].count).toBe(1);
    expect(result[1].recipeId).toBe(DARK_SHIELD_ID);
    expect(result[1].count).toBe(1);
  });
});

describe('darkForgeProcess', () => {
  it('should advance progress on first job in queue', () => {
    const forge = makeRoom();
    const worker = makeInhabitant({ assignedRoomId: forge.id });
    const floor = makeFloor([forge], [worker]);
    const state = makeGameState({
      floors: [floor],
      forgeCraftingQueues: [
        {
          roomId: forge.id,
          jobs: [{ recipeId: IRON_SWORD_ID, progress: 0, targetTicks: 5 }],
        },
      ],
    });

    darkForgeProcess(state);

    const queue = state.world.forgeCraftingQueues[0];
    expect(queue.jobs[0].progress).toBe(1);
  });

  it('should complete job and add to inventory when progress reaches target', () => {
    const forge = makeRoom();
    const worker = makeInhabitant({ assignedRoomId: forge.id });
    const floor = makeFloor([forge], [worker]);
    const state = makeGameState({
      floors: [floor],
      forgeCraftingQueues: [
        {
          roomId: forge.id,
          jobs: [{ recipeId: IRON_SWORD_ID, progress: 4, targetTicks: 5 }],
        },
      ],
    });

    darkForgeProcess(state);

    // Job should be removed, queue cleaned up
    expect(state.world.forgeCraftingQueues).toHaveLength(0);
    // Item added to inventory
    expect(state.world.forgeInventory).toHaveLength(1);
    expect(state.world.forgeInventory[0].recipeId).toBe(IRON_SWORD_ID);
    expect(state.world.forgeInventory[0].count).toBe(1);
  });

  it('should not progress when no workers assigned', () => {
    const forge = makeRoom();
    const floor = makeFloor([forge], []);
    const state = makeGameState({
      floors: [floor],
      forgeCraftingQueues: [
        {
          roomId: forge.id,
          jobs: [{ recipeId: IRON_SWORD_ID, progress: 0, targetTicks: 5 }],
        },
      ],
    });

    darkForgeProcess(state);

    expect(state.world.forgeCraftingQueues[0].jobs[0].progress).toBe(0);
  });

  it('should only progress the first job in queue', () => {
    const forge = makeRoom();
    const worker = makeInhabitant({ assignedRoomId: forge.id });
    const floor = makeFloor([forge], [worker]);
    const state = makeGameState({
      floors: [floor],
      forgeCraftingQueues: [
        {
          roomId: forge.id,
          jobs: [
            { recipeId: IRON_SWORD_ID, progress: 0, targetTicks: 5 },
            { recipeId: DARK_SHIELD_ID, progress: 0, targetTicks: 10 },
          ],
        },
      ],
    });

    darkForgeProcess(state);

    expect(state.world.forgeCraftingQueues[0].jobs[0].progress).toBe(1);
    expect(state.world.forgeCraftingQueues[0].jobs[1].progress).toBe(0);
  });

  it('should process multiple forges across floors', () => {
    const forge1 = makeRoom({ id: 'forge-1' as PlacedRoomId });
    const forge2 = makeRoom({ id: 'forge-2' as PlacedRoomId });
    const w1 = makeInhabitant({ instanceId: 'w1', assignedRoomId: 'forge-1' as PlacedRoomId });
    const w2 = makeInhabitant({ instanceId: 'w2', assignedRoomId: 'forge-2' as PlacedRoomId });
    const floor1 = makeFloor([forge1], [w1]);
    const floor2 = makeFloor([forge2], [w2]);
    floor2.id = 'floor-2';

    const state = makeGameState({
      floors: [floor1, floor2],
      forgeCraftingQueues: [
        {
          roomId: 'forge-1' as PlacedRoomId,
          jobs: [{ recipeId: IRON_SWORD_ID, progress: 0, targetTicks: 5 }],
        },
        {
          roomId: 'forge-2' as PlacedRoomId,
          jobs: [{ recipeId: DARK_SHIELD_ID, progress: 0, targetTicks: 10 }],
        },
      ],
    });

    darkForgeProcess(state);

    expect(state.world.forgeCraftingQueues[0].jobs[0].progress).toBe(1);
    expect(state.world.forgeCraftingQueues[1].jobs[0].progress).toBe(1);
  });

  it('should accumulate inventory across completions', () => {
    const forge = makeRoom();
    const worker = makeInhabitant({ assignedRoomId: forge.id });
    const floor = makeFloor([forge], [worker]);
    const state = makeGameState({
      floors: [floor],
      forgeInventory: [{ recipeId: IRON_SWORD_ID, count: 2 }],
      forgeCraftingQueues: [
        {
          roomId: forge.id,
          jobs: [{ recipeId: IRON_SWORD_ID, progress: 19, targetTicks: 20 }],
        },
      ],
    });

    darkForgeProcess(state);

    expect(state.world.forgeInventory[0].count).toBe(3);
  });

  it('should advance to next job after completing first', () => {
    const forge = makeRoom();
    const worker = makeInhabitant({ assignedRoomId: forge.id });
    const floor = makeFloor([forge], [worker]);
    const state = makeGameState({
      floors: [floor],
      forgeCraftingQueues: [
        {
          roomId: forge.id,
          jobs: [
            { recipeId: IRON_SWORD_ID, progress: 4, targetTicks: 5 },
            { recipeId: DARK_SHIELD_ID, progress: 0, targetTicks: 10 },
          ],
        },
      ],
    });

    darkForgeProcess(state);

    // First job completed and removed
    expect(state.world.forgeCraftingQueues[0].jobs).toHaveLength(1);
    expect(state.world.forgeCraftingQueues[0].jobs[0].recipeId).toBe(DARK_SHIELD_ID);
    // Inventory updated
    expect(state.world.forgeInventory[0].recipeId).toBe(IRON_SWORD_ID);
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
