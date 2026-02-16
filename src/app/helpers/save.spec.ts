import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GameState, SaveData, SaveMigrationResult } from '@interfaces';

// --- Mocks ---

vi.mock('@helpers/state-game', () => ({
  gamestate: vi.fn(),
  gamestateSet: vi.fn(),
}));

vi.mock('@helpers/migrate', () => ({
  migrateGameState: vi.fn(),
}));

vi.mock('@helpers/save-migrations', () => ({
  SAVE_VERSION: 1,
  saveMigrationRun: vi.fn(),
}));

vi.mock('@helpers/logging', () => ({
  warn: vi.fn(),
}));

// --- Imports after mocks ---

import {
  SAVE_FORMAT_VERSION,
  saveSerialize,
  saveDeserialize,
  saveDeserializeForceLoad,
  saveComputeChecksum,
  saveVerifyChecksum,
  saveValidate,
  saveParseLegacy,
} from '@helpers/save';
import { gamestate, gamestateSet } from '@helpers/state-game';
import { migrateGameState } from '@helpers/migrate';
import { saveMigrationRun } from '@helpers/save-migrations';

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
  gameState?: GameState,
  overrides?: Partial<SaveData>,
): SaveData {
  const gs = gameState ?? makeGameState();
  const base: SaveData = {
    formatVersion: SAVE_FORMAT_VERSION,
    savedAt: Date.now(),
    playtimeSeconds: gs.clock.numTicks,
    checksum: '',
    gameState: gs,
  };

  const data = { ...base, ...overrides };
  data.checksum = saveComputeChecksum(data);
  return data;
}

function makeSuccessMigrationResult(saveData: SaveData): SaveMigrationResult {
  return {
    success: true,
    saveData,
    sourceVersion: 1,
    targetVersion: 1,
    migrationsApplied: 0,
    isNewerVersion: false,
  };
}

function makeFailureMigrationResult(
  saveData: SaveData,
  opts?: { isNewerVersion?: boolean; error?: string },
): SaveMigrationResult {
  return {
    success: false,
    saveData,
    sourceVersion: opts?.isNewerVersion ? 99 : 1,
    targetVersion: 1,
    migrationsApplied: 0,
    error: opts?.error ?? 'Migration failed',
    isNewerVersion: opts?.isNewerVersion ?? false,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// --- saveSerialize ---

describe('saveSerialize', () => {
  it('should serialize game state into SaveData', () => {
    const gs = makeGameState();
    vi.mocked(gamestate).mockReturnValue(gs);

    const result = saveSerialize();

    expect(result.formatVersion).toBe(SAVE_FORMAT_VERSION);
    expect(result.savedAt).toBeGreaterThan(0);
    expect(result.playtimeSeconds).toBe(500);
    expect(result.checksum).toBeTruthy();
    expect(result.gameState).toEqual(gs);
  });

  it('should serialize provided state instead of signal', () => {
    const gs = makeGameState({ gameId: 'custom' as GameState['gameId'] });

    const result = saveSerialize(gs);

    expect(result.gameState.gameId).toBe('custom');
  });

  it('should produce valid JSON round-trip', () => {
    const gs = makeGameState();
    vi.mocked(gamestate).mockReturnValue(gs);

    const result = saveSerialize();
    const json = JSON.stringify(result);
    const parsed = JSON.parse(json);

    expect(parsed.formatVersion).toBe(SAVE_FORMAT_VERSION);
    expect(parsed.gameState.clock.numTicks).toBe(500);
  });

  it('should deep clone game state', () => {
    const gs = makeGameState();
    vi.mocked(gamestate).mockReturnValue(gs);

    const result = saveSerialize();
    result.gameState.clock.numTicks = 9999;

    expect(gs.clock.numTicks).toBe(500);
  });

  it('should include a valid checksum', () => {
    const gs = makeGameState();
    vi.mocked(gamestate).mockReturnValue(gs);

    const result = saveSerialize();

    expect(result.checksum).toMatch(/^v1:/);
    expect(saveVerifyChecksum(result)).toBe(true);
  });

  it('should include the current SAVE_VERSION', () => {
    const gs = makeGameState();
    vi.mocked(gamestate).mockReturnValue(gs);

    const result = saveSerialize();

    expect(result.formatVersion).toBe(SAVE_FORMAT_VERSION);
    expect(typeof result.formatVersion).toBe('number');
  });
});

// --- saveDeserialize ---

describe('saveDeserialize', () => {
  it('should set game state and run migration on success', () => {
    const gs = makeGameState();
    const saveData = makeSaveData(gs);
    vi.mocked(saveMigrationRun).mockReturnValue(
      makeSuccessMigrationResult(saveData),
    );

    const result = saveDeserialize(saveData);

    expect(result.success).toBe(true);
    expect(gamestateSet).toHaveBeenCalledWith(gs);
    expect(migrateGameState).toHaveBeenCalled();
  });

  it('should return migration result', () => {
    const gs = makeGameState();
    const saveData = makeSaveData(gs);
    vi.mocked(saveMigrationRun).mockReturnValue(
      makeSuccessMigrationResult(saveData),
    );

    const result = saveDeserialize(saveData);

    expect(result.success).toBe(true);
    expect(result.migrationsApplied).toBe(0);
  });

  it('should not set game state when migration fails', () => {
    const saveData = makeSaveData();
    vi.mocked(saveMigrationRun).mockReturnValue(
      makeFailureMigrationResult(saveData, { error: 'bad data' }),
    );

    const result = saveDeserialize(saveData);

    expect(result.success).toBe(false);
    expect(gamestateSet).not.toHaveBeenCalled();
    expect(migrateGameState).not.toHaveBeenCalled();
  });

  it('should return isNewerVersion when save is from a newer version', () => {
    const saveData = makeSaveData();
    vi.mocked(saveMigrationRun).mockReturnValue(
      makeFailureMigrationResult(saveData, { isNewerVersion: true }),
    );

    const result = saveDeserialize(saveData);

    expect(result.success).toBe(false);
    expect(result.isNewerVersion).toBe(true);
    expect(gamestateSet).not.toHaveBeenCalled();
  });
});

// --- saveDeserializeForceLoad ---

describe('saveDeserializeForceLoad', () => {
  it('should set game state and migrate without version check', () => {
    const gs = makeGameState();
    const saveData = makeSaveData(gs);

    saveDeserializeForceLoad(saveData);

    expect(gamestateSet).toHaveBeenCalledWith(gs);
    expect(migrateGameState).toHaveBeenCalled();
  });
});

// --- saveComputeChecksum ---

describe('saveComputeChecksum', () => {
  it('should produce a deterministic checksum', () => {
    const saveData = makeSaveData();
    saveData.checksum = '';

    const checksum1 = saveComputeChecksum(saveData);
    const checksum2 = saveComputeChecksum(saveData);

    expect(checksum1).toBe(checksum2);
  });

  it('should produce different checksums for different data', () => {
    const saveData1 = makeSaveData(makeGameState());
    saveData1.checksum = '';

    const saveData2 = makeSaveData(
      makeGameState({
        gameId: 'different-game' as GameState['gameId'],
      }),
    );
    saveData2.checksum = '';

    const checksum1 = saveComputeChecksum(saveData1);
    const checksum2 = saveComputeChecksum(saveData2);

    expect(checksum1).not.toBe(checksum2);
  });

  it('should ignore existing checksum field', () => {
    const saveData = makeSaveData();
    const original = saveComputeChecksum(saveData);

    saveData.checksum = 'tampered';
    const recomputed = saveComputeChecksum(saveData);

    expect(original).toBe(recomputed);
  });
});

// --- saveVerifyChecksum ---

describe('saveVerifyChecksum', () => {
  it('should return true for valid checksum', () => {
    const saveData = makeSaveData();
    expect(saveVerifyChecksum(saveData)).toBe(true);
  });

  it('should return false for tampered data', () => {
    const saveData = makeSaveData();
    saveData.gameState.clock.numTicks = 99999;

    expect(saveVerifyChecksum(saveData)).toBe(false);
  });

  it('should return false for tampered checksum', () => {
    const saveData = makeSaveData();
    saveData.checksum = 'v1:fakehash';

    expect(saveVerifyChecksum(saveData)).toBe(false);
  });
});

// --- saveValidate ---

describe('saveValidate', () => {
  it('should pass for valid save data', () => {
    const saveData = makeSaveData();

    const result = saveValidate(saveData);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail for null', () => {
    const result = saveValidate(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Save data is not an object');
  });

  it('should fail for undefined', () => {
    const result = saveValidate(undefined);
    expect(result.valid).toBe(false);
  });

  it('should fail for non-object', () => {
    const result = saveValidate('string');
    expect(result.valid).toBe(false);
  });

  it('should report missing formatVersion', () => {
    const saveData = makeSaveData();
    delete (saveData as Record<string, unknown>)['formatVersion'];

    const result = saveValidate(saveData);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing or invalid formatVersion');
  });

  it('should report missing savedAt', () => {
    const saveData = makeSaveData();
    delete (saveData as Record<string, unknown>)['savedAt'];

    const result = saveValidate(saveData);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing or invalid savedAt timestamp');
  });

  it('should report missing checksum', () => {
    const saveData = makeSaveData();
    delete (saveData as Record<string, unknown>)['checksum'];

    const result = saveValidate(saveData);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing or invalid checksum');
  });

  it('should report missing gameState', () => {
    const result = saveValidate({
      formatVersion: 1,
      savedAt: 123,
      playtimeSeconds: 0,
      checksum: 'x',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing or invalid gameState');
  });

  it('should report missing gameState.meta', () => {
    const saveData = makeSaveData();
    delete (saveData.gameState as unknown as Record<string, unknown>)['meta'];

    const result = saveValidate(saveData);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing gameState.meta');
  });

  it('should report missing gameState.meta.version', () => {
    const saveData = makeSaveData();
    delete (saveData.gameState.meta as unknown as Record<string, unknown>)['version'];

    const result = saveValidate(saveData);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing gameState.meta.version');
  });

  it('should report missing gameState.gameId', () => {
    const saveData = makeSaveData();
    delete (saveData.gameState as unknown as Record<string, unknown>)['gameId'];

    const result = saveValidate(saveData);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing gameState.gameId');
  });

  it('should report missing gameState.clock', () => {
    const saveData = makeSaveData();
    delete (saveData.gameState as unknown as Record<string, unknown>)['clock'];

    const result = saveValidate(saveData);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing gameState.clock');
  });

  it('should report missing gameState.world', () => {
    const saveData = makeSaveData();
    delete (saveData.gameState as unknown as Record<string, unknown>)['world'];

    const result = saveValidate(saveData);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing gameState.world');
  });

  it('should report missing world.resources', () => {
    const saveData = makeSaveData();
    delete (saveData.gameState.world as unknown as Record<string, unknown>)['resources'];

    const result = saveValidate(saveData);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing gameState.world.resources');
  });

  it('should report missing world.inhabitants', () => {
    const saveData = makeSaveData();
    delete (saveData.gameState.world as unknown as Record<string, unknown>)['inhabitants'];

    const result = saveValidate(saveData);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing gameState.world.inhabitants');
  });

  it('should report missing world.floors', () => {
    const saveData = makeSaveData();
    delete (saveData.gameState.world as unknown as Record<string, unknown>)['floors'];

    const result = saveValidate(saveData);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing gameState.world.floors');
  });

  it('should report missing world.season', () => {
    const saveData = makeSaveData();
    delete (saveData.gameState.world as unknown as Record<string, unknown>)['season'];

    const result = saveValidate(saveData);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing gameState.world.season');
  });

  it('should report missing world.research', () => {
    const saveData = makeSaveData();
    delete (saveData.gameState.world as unknown as Record<string, unknown>)['research'];

    const result = saveValidate(saveData);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing gameState.world.research');
  });

  it('should report missing world.reputation', () => {
    const saveData = makeSaveData();
    delete (saveData.gameState.world as unknown as Record<string, unknown>)['reputation'];

    const result = saveValidate(saveData);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing gameState.world.reputation');
  });

  it('should report missing world.invasionSchedule', () => {
    const saveData = makeSaveData();
    delete (saveData.gameState.world as unknown as Record<string, unknown>)[
      'invasionSchedule'
    ];

    const result = saveValidate(saveData);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing gameState.world.invasionSchedule');
  });

  it('should report missing world.victoryProgress', () => {
    const saveData = makeSaveData();
    delete (saveData.gameState.world as unknown as Record<string, unknown>)[
      'victoryProgress'
    ];

    const result = saveValidate(saveData);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing gameState.world.victoryProgress');
  });

  it('should report multiple errors at once', () => {
    const result = saveValidate({});

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });

  it('should warn on checksum mismatch', () => {
    const saveData = makeSaveData();
    saveData.gameState.clock.numTicks = 99999;
    // checksum is now stale

    const result = saveValidate(saveData);
    expect(result.valid).toBe(true);
    expect(result.warnings).toContain(
      'Checksum mismatch — save data may have been modified',
    );
  });

  it('should not warn on valid checksum', () => {
    const saveData = makeSaveData();

    const result = saveValidate(saveData);
    expect(result.warnings).toHaveLength(0);
  });

  it('should warn when save version is newer than current', () => {
    const saveData = makeSaveData(undefined, { formatVersion: 99 });

    const result = saveValidate(saveData);
    expect(result.valid).toBe(true);
    expect(result.warnings).toContainEqual(
      expect.stringContaining('newer version'),
    );
  });
});

// --- saveParseLegacy ---

describe('saveParseLegacy', () => {
  it('should return undefined for null', () => {
    expect(saveParseLegacy(null)).toBeUndefined();
  });

  it('should return undefined for non-object', () => {
    expect(saveParseLegacy('string')).toBeUndefined();
  });

  it('should return SaveData as-is if it has formatVersion', () => {
    const saveData = makeSaveData();
    const result = saveParseLegacy(saveData);

    expect(result).toBe(saveData);
  });

  it('should wrap raw GameState into SaveData with version 1', () => {
    const gs = makeGameState();
    const result = saveParseLegacy(gs);

    expect(result).toBeDefined();
    expect(result!.formatVersion).toBe(1);
    expect(result!.gameState).toBe(gs);
    expect(result!.playtimeSeconds).toBe(500);
  });

  it('should return undefined for unrecognized object', () => {
    expect(saveParseLegacy({ foo: 'bar' })).toBeUndefined();
  });
});
