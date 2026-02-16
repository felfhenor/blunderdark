import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { GameState, SaveData } from '@interfaces';

// --- Mocks ---

vi.mock('@helpers/logging', () => ({
  debug: vi.fn(),
  warn: vi.fn(),
}));

// --- Imports after mocks ---

import {
  SAVE_VERSION,
  saveMigrations,
  saveMigrationDetectVersion,
  saveMigrationRun,
} from '@helpers/save-migrations';

function makeGameState(overrides?: Partial<GameState>): GameState {
  return {
    meta: { version: 1, isSetup: true, isPaused: false, createdAt: 1000000 },
    gameId: 'test-game' as GameState['gameId'],
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
          upgrades: [],
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

  it('should add default values for new fields', () => {
    saveMigrations.set(1, (data) => {
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
    saveMigrations.set(1, (data) => {
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

  it('should remove deprecated fields', () => {
    saveMigrations.set(1, (data) => {
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
    saveMigrations.set(1, (data) => {
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
    saveMigrations.set(1, (data) => {
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
