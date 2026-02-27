import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Floor, GameId, GameState, SaveData } from '@interfaces';
import {
  SAVE_VERSION,
  saveMigrations,
  saveMigrationDetectVersion,
  saveMigrationRun,
} from '@helpers/save-migrations';

// Save real migrations before the global beforeEach clears them
const realMigrationV1 = saveMigrations.get(1);
const realMigrationV2 = saveMigrations.get(2);

// --- Mocks ---

vi.mock('@helpers/logging', () => ({
  debug: vi.fn(),
  warn: vi.fn(),
}));

function makeGameState(overrides?: Partial<GameState>): GameState {
  return {
    meta: { version: 1, isSetup: true, isPaused: false, createdAt: 1000000 },
    gameId: 'test-game' as GameId,
    clock: {
      numTicks: 500,
      lastSaveTick: 490,
      day: 5,
      hour: 12,
      minute: 30,
    },
    world: {
      grid: { tiles: [], width: 0, height: 0 },
      resources: {
        crystals: { current: 100, max: 500 },
        food: { current: 50, max: 500 },
        gold: { current: 200, max: 1000 },
        flux: { current: 30, max: 200 },
        research: { current: 0, max: 300 },
        essence: { current: 0, max: 200 },
        corruption: { current: 0, max: Number.MAX_SAFE_INTEGER },
      },
      inhabitants: [],
      hallways: [],
      season: {
        currentSeason: 'growth' as const,
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
        },
      },
      reputation: {
        terror: 0,
        wealth: 0,
        knowledge: 0,
        harmony: 0,
        chaos: 0,
      },
      floors: [],
      currentFloorIndex: 0,
      trapInventory: [],
      forgeInventory: [],
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
    ...overrides,
  } as unknown as GameState;
}

function makeSaveData(
  version: number,
  gameState?: GameState,
): SaveData {
  return {
    formatVersion: version,
    savedAt: Date.now(),
    playtimeSeconds: 500,
    checksum: '',
    gameState: gameState ?? makeGameState(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  saveMigrations.clear();
});

// --- SAVE_VERSION ---

describe('SAVE_VERSION', () => {
  it('should be a positive integer', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(SAVE_VERSION)).toBe(true);
  });
});

// --- saveMigrationDetectVersion ---

describe('saveMigrationDetectVersion', () => {
  it('should return formatVersion when present', () => {
    const saveData = makeSaveData(3);
    expect(saveMigrationDetectVersion(saveData)).toBe(3);
  });

  it('should return 1 for saves with no version', () => {
    const saveData = makeSaveData(1);
    delete (saveData as Record<string, unknown>)['formatVersion'];
    expect(saveMigrationDetectVersion(saveData)).toBe(1);
  });

  it('should return 1 for saves with invalid version', () => {
    const saveData = makeSaveData(1);
    (saveData as Record<string, unknown>)['formatVersion'] = 'bad';
    expect(saveMigrationDetectVersion(saveData)).toBe(1);
  });

  it('should return 1 for version 0', () => {
    const saveData = makeSaveData(0);
    expect(saveMigrationDetectVersion(saveData)).toBe(1);
  });
});

// --- saveMigrationRun ---

describe('saveMigrationRun', () => {
  it('should return success with no migrations when version matches current', () => {
    const saveData = makeSaveData(SAVE_VERSION);

    const result = saveMigrationRun(saveData);

    expect(result.success).toBe(true);
    expect(result.migrationsApplied).toBe(0);
    expect(result.sourceVersion).toBe(SAVE_VERSION);
    expect(result.targetVersion).toBe(SAVE_VERSION);
    expect(result.isNewerVersion).toBe(false);
  });

  it('should return failure with isNewerVersion for newer saves', () => {
    const saveData = makeSaveData(SAVE_VERSION + 5);

    const result = saveMigrationRun(saveData);

    expect(result.success).toBe(false);
    expect(result.isNewerVersion).toBe(true);
    expect(result.sourceVersion).toBe(SAVE_VERSION + 5);
    expect(result.error).toContain('newer version');
  });

  it('should return failure when migration is missing', () => {
    // Temporarily set up a scenario where we need migration but don't have one
    const saveData = makeSaveData(SAVE_VERSION - 1);

    // Only works if SAVE_VERSION > 1; if it's 1, this test doesn't apply
    if (SAVE_VERSION > 1) {
      const result = saveMigrationRun(saveData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No migration found');
    }
  });

  it('should handle migration error gracefully', () => {
    // Register a migration that throws
    if (SAVE_VERSION > 1) {
      saveMigrations.set(SAVE_VERSION - 1, () => {
        throw new Error('Something broke');
      });

      const saveData = makeSaveData(SAVE_VERSION - 1);
      const result = saveMigrationRun(saveData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Something broke');
      expect(result.isNewerVersion).toBe(false);
    }
  });

  it('should deep clone save data before migrating', () => {
    if (SAVE_VERSION > 1) {
      saveMigrations.set(SAVE_VERSION - 1, (data) => {
        data.gameState.clock.numTicks = 9999;
        return data;
      });

      const saveData = makeSaveData(SAVE_VERSION - 1);
      const originalTicks = saveData.gameState.clock.numTicks;
      saveMigrationRun(saveData);

      expect(saveData.gameState.clock.numTicks).toBe(originalTicks);
    }
  });

  it('should preserve existing data through migration', () => {
    if (SAVE_VERSION > 1) {
      saveMigrations.set(SAVE_VERSION - 1, (data) => {
        // Add a new field without touching existing data
        (data.gameState.world as unknown as Record<string, unknown>)['newField'] =
          'default';
        return data;
      });

      const saveData = makeSaveData(SAVE_VERSION - 1);
      const result = saveMigrationRun(saveData);

      expect(result.success).toBe(true);
      expect(result.saveData.gameState.clock.numTicks).toBe(500);
      expect(result.saveData.gameState.gameId).toBe('test-game');
    }
  });
});

// --- Migration chaining ---

describe('migration chaining', () => {
  afterEach(() => {
    saveMigrations.clear();
  });

  it('should chain multiple migrations sequentially', () => {
    // Simulate a multi-version migration chain
    // We'll use version 100 as our "current" to test chaining logic
    // by registering migrations 1->2, 2->3, then running from v1

    // For this test, we register migrations and test them directly
    const migration1to2 = vi.fn((data: SaveData) => {
      (data.gameState.world as unknown as Record<string, unknown>)['addedInV2'] = true;
      return data;
    });

    const migration2to3 = vi.fn((data: SaveData) => {
      (data.gameState.world as unknown as Record<string, unknown>)['addedInV3'] = 42;
      return data;
    });

    saveMigrations.set(1, migration1to2);
    saveMigrations.set(2, migration2to3);

    // Only test if SAVE_VERSION >= 3
    if (SAVE_VERSION >= 3) {
      const saveData = makeSaveData(1);
      const result = saveMigrationRun(saveData);

      expect(migration1to2).toHaveBeenCalled();
      expect(migration2to3).toHaveBeenCalled();
      expect(result.migrationsApplied).toBeGreaterThanOrEqual(2);
    }
  });

  it('should update formatVersion after each migration step', () => {
    if (SAVE_VERSION >= 3) {
      saveMigrations.set(1, (data) => data);
      saveMigrations.set(2, (data) => {
        expect(data.formatVersion).toBe(2);
        return data;
      });

      const saveData = makeSaveData(1);
      saveMigrationRun(saveData);
    }
  });
});

// --- Adding new fields migration (US-004) ---

describe('adding new fields migration', () => {
  afterEach(() => {
    saveMigrations.clear();
  });

  // Helper: fill all migration slots from v1 to SAVE_VERSION with passthroughs,
  // then override key 1 with the real test migration.
  function registerWithPassthroughs(fn: (data: SaveData) => SaveData): void {
    for (let v = 1; v < SAVE_VERSION; v++) {
      saveMigrations.set(v, (data) => data);
    }
    saveMigrations.set(1, fn);
  }

  it('should add default values for new fields', () => {
    registerWithPassthroughs((data) => {
      const world = data.gameState.world as unknown as Record<string, unknown>;
      if (world['newFeatureEnabled'] === undefined) {
        world['newFeatureEnabled'] = false;
      }
      if (world['newCounter'] === undefined) {
        world['newCounter'] = 0;
      }
      return data;
    });

    if (SAVE_VERSION >= 2) {
      const saveData = makeSaveData(1);
      const result = saveMigrationRun(saveData);

      expect(result.success).toBe(true);
      const world = result.saveData.gameState.world as unknown as Record<string, unknown>;
      expect(world['newFeatureEnabled']).toBe(false);
      expect(world['newCounter']).toBe(0);
    }
  });

  it('should preserve existing data when adding new fields', () => {
    registerWithPassthroughs((data) => {
      const world = data.gameState.world as unknown as Record<string, unknown>;
      world['addedField'] = 'default';
      return data;
    });

    if (SAVE_VERSION >= 2) {
      const gs = makeGameState();
      gs.world.inhabitants = [];
      const saveData = makeSaveData(1, gs);

      const result = saveMigrationRun(saveData);
      expect(result.success).toBe(true);
      expect(result.saveData.gameState.world.inhabitants).toEqual([]);
      expect(result.saveData.gameState.clock.numTicks).toBe(500);
    }
  });
});

// --- Removing/renaming fields migration (US-005) ---

describe('removing/renaming fields migration', () => {
  afterEach(() => {
    saveMigrations.clear();
  });

  function registerWithPassthroughs(fn: (data: SaveData) => SaveData): void {
    for (let v = 1; v < SAVE_VERSION; v++) {
      saveMigrations.set(v, (data) => data);
    }
    saveMigrations.set(1, fn);
  }

  it('should remove deprecated fields', () => {
    registerWithPassthroughs((data) => {
      const world = data.gameState.world as unknown as Record<string, unknown>;
      delete world['deprecatedField'];
      return data;
    });

    if (SAVE_VERSION >= 2) {
      const gs = makeGameState();
      (gs.world as unknown as Record<string, unknown>)['deprecatedField'] = 'old-value';
      const saveData = makeSaveData(1, gs);

      const result = saveMigrationRun(saveData);
      expect(result.success).toBe(true);
      const world = result.saveData.gameState.world as unknown as Record<string, unknown>;
      expect(world['deprecatedField']).toBeUndefined();
    }
  });

  it('should rename fields preserving values', () => {
    registerWithPassthroughs((data) => {
      const world = data.gameState.world as unknown as Record<string, unknown>;
      if (world['oldName'] !== undefined) {
        world['newName'] = world['oldName'];
        delete world['oldName'];
      }
      return data;
    });

    if (SAVE_VERSION >= 2) {
      const gs = makeGameState();
      (gs.world as unknown as Record<string, unknown>)['oldName'] = 'preserved-value';
      const saveData = makeSaveData(1, gs);

      const result = saveMigrationRun(saveData);
      expect(result.success).toBe(true);
      const world = result.saveData.gameState.world as unknown as Record<string, unknown>;
      expect(world['oldName']).toBeUndefined();
      expect(world['newName']).toBe('preserved-value');
    }
  });

  it('should maintain data integrity through rename', () => {
    registerWithPassthroughs((data) => {
      const world = data.gameState.world as unknown as Record<string, unknown>;
      if (world['renamedArray'] !== undefined) {
        world['newArray'] = world['renamedArray'];
        delete world['renamedArray'];
      }
      return data;
    });

    if (SAVE_VERSION >= 2) {
      const gs = makeGameState();
      (gs.world as unknown as Record<string, unknown>)['renamedArray'] = [1, 2, 3];
      const saveData = makeSaveData(1, gs);

      const result = saveMigrationRun(saveData);
      expect(result.success).toBe(true);
      const world = result.saveData.gameState.world as unknown as Record<string, unknown>;
      expect(world['newArray']).toEqual([1, 2, 3]);
    }
  });
});

// --- Incompatible save handling (US-007) ---

describe('incompatible save handling', () => {
  afterEach(() => {
    saveMigrations.clear();
  });

  it('should catch and report migration errors', () => {
    if (SAVE_VERSION > 1) {
      saveMigrations.set(SAVE_VERSION - 1, () => {
        throw new Error('Corrupt data encountered');
      });

      const saveData = makeSaveData(SAVE_VERSION - 1);
      const result = saveMigrationRun(saveData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Corrupt data encountered');
      expect(result.isNewerVersion).toBe(false);
    }
  });

  it('should not modify original save data on error', () => {
    if (SAVE_VERSION > 1) {
      saveMigrations.set(SAVE_VERSION - 1, () => {
        throw new Error('Migration exploded');
      });

      const saveData = makeSaveData(SAVE_VERSION - 1);
      const originalVersion = saveData.formatVersion;
      saveMigrationRun(saveData);

      expect(saveData.formatVersion).toBe(originalVersion);
    }
  });

  it('should report partial migration progress on error', () => {
    if (SAVE_VERSION >= 3) {
      saveMigrations.set(1, (data) => data);
      saveMigrations.set(2, () => {
        throw new Error('Failed at v2->v3');
      });

      const saveData = makeSaveData(1);
      const result = saveMigrationRun(saveData);

      expect(result.success).toBe(false);
      expect(result.migrationsApplied).toBe(1);
      expect(result.error).toContain('Failed at v2->v3');
    }
  });
});

// --- Real migration tests (v2→v3: crafting queue overhaul) ---

describe('v2→v3 migration (crafting queue overhaul)', () => {
  beforeEach(() => {
    // Re-register the real migrations since the global beforeEach clears them
    if (realMigrationV1) saveMigrations.set(1, realMigrationV1);
    if (realMigrationV2) saveMigrations.set(2, realMigrationV2);
  });

  it('should migrate forgeCraftingQueues to per-room forgeJobs', () => {
    const gs = makeGameState();
    gs.world.floors = [
      {
        id: 'f1',
        name: 'F1',
        depth: 1,
        biome: 'neutral',
        grid: { tiles: [], width: 0, height: 0 },
        rooms: [
          { id: 'forge-1', roomTypeId: 'dark-forge', shapeId: 's', anchorX: 0, anchorY: 0 },
        ],
        hallways: [],
        inhabitants: [],
        connections: [],
        traps: [],
      } as unknown as Floor,
    ];

    // Add old-style world-level forge queue
    const world = gs.world as unknown as Record<string, unknown>;
    world['forgeCraftingQueues'] = [
      {
        roomId: 'forge-1',
        jobs: [
          { recipeId: 'recipe-sword', progress: 3, targetTicks: 10 },
          { recipeId: 'recipe-shield', progress: 0, targetTicks: 15 },
        ],
      },
    ];

    const saveData = makeSaveData(2, gs);
    const result = saveMigrationRun(saveData);

    expect(result.success).toBe(true);
    const migratedRoom = result.saveData.gameState.world.floors[0].rooms[0] as unknown as Record<string, unknown>;
    expect(migratedRoom['forgeJobs']).toEqual([
      { recipeId: 'recipe-sword', progress: 3, targetTicks: 10 },
      { recipeId: 'recipe-shield', progress: 0, targetTicks: 15 },
    ]);
    // Old field should be deleted
    const migratedWorld = result.saveData.gameState.world as unknown as Record<string, unknown>;
    expect(migratedWorld['forgeCraftingQueues']).toBeUndefined();
  });

  it('should migrate trapCraftingQueues to per-room trapJobs', () => {
    const gs = makeGameState();
    gs.world.floors = [
      {
        id: 'f1',
        name: 'F1',
        depth: 1,
        biome: 'neutral',
        grid: { tiles: [], width: 0, height: 0 },
        rooms: [
          { id: 'workshop-1', roomTypeId: 'trap-workshop', shapeId: 's', anchorX: 0, anchorY: 0 },
        ],
        hallways: [],
        inhabitants: [],
        connections: [],
        traps: [],
      } as unknown as Floor,
    ];

    const world = gs.world as unknown as Record<string, unknown>;
    world['trapCraftingQueues'] = [
      {
        roomId: 'workshop-1',
        jobs: [
          { trapTypeId: 'pit-trap', progress: 2, targetTicks: 5 },
        ],
      },
    ];

    const saveData = makeSaveData(2, gs);
    const result = saveMigrationRun(saveData);

    expect(result.success).toBe(true);
    const migratedRoom = result.saveData.gameState.world.floors[0].rooms[0] as unknown as Record<string, unknown>;
    expect(migratedRoom['trapJobs']).toEqual([
      { trapTypeId: 'pit-trap', progress: 2, targetTicks: 5 },
    ]);
    const migratedWorld = result.saveData.gameState.world as unknown as Record<string, unknown>;
    expect(migratedWorld['trapCraftingQueues']).toBeUndefined();
  });

  it('should migrate summonJob to summonJobs with count-up progress', () => {
    const gs = makeGameState();
    gs.world.floors = [
      {
        id: 'f1',
        name: 'F1',
        depth: 1,
        biome: 'neutral',
        grid: { tiles: [], width: 0, height: 0 },
        rooms: [
          {
            id: 'circle-1',
            roomTypeId: 'summoning-circle',
            shapeId: 's',
            anchorX: 0,
            anchorY: 0,
            summonJob: {
              recipeId: 'recipe-fire',
              ticksRemaining: 7,
              targetTicks: 20,
            },
          },
        ],
        hallways: [],
        inhabitants: [],
        connections: [],
        traps: [],
      } as unknown as Floor,
    ];

    const saveData = makeSaveData(2, gs);
    const result = saveMigrationRun(saveData);

    expect(result.success).toBe(true);
    const migratedRoom = result.saveData.gameState.world.floors[0].rooms[0] as unknown as Record<string, unknown>;
    expect(migratedRoom['summonJob']).toBeUndefined();
    expect(migratedRoom['summonJobs']).toEqual([
      { recipeId: 'recipe-fire', progress: 13, targetTicks: 20 },
    ]);
  });

  it('should handle rooms with no queues gracefully', () => {
    const gs = makeGameState();
    gs.world.floors = [
      {
        id: 'f1',
        name: 'F1',
        depth: 1,
        biome: 'neutral',
        grid: { tiles: [], width: 0, height: 0 },
        rooms: [
          { id: 'barracks-1', roomTypeId: 'barracks', shapeId: 's', anchorX: 0, anchorY: 0 },
        ],
        hallways: [],
        inhabitants: [],
        connections: [],
        traps: [],
      } as unknown as Floor,
    ];

    const world = gs.world as unknown as Record<string, unknown>;
    world['forgeCraftingQueues'] = [];
    world['trapCraftingQueues'] = [];

    const saveData = makeSaveData(2, gs);
    const result = saveMigrationRun(saveData);

    expect(result.success).toBe(true);
    const migratedRoom = result.saveData.gameState.world.floors[0].rooms[0] as unknown as Record<string, unknown>;
    expect(migratedRoom['forgeJobs']).toBeUndefined();
    expect(migratedRoom['trapJobs']).toBeUndefined();
    expect(migratedRoom['summonJobs']).toBeUndefined();
  });
});
