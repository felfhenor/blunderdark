import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GameState, SaveData, SaveSlotId } from '@interfaces';
import {
  SAVE_SLOT_IDS,
  SAVE_SLOT_MANUAL_IDS,
  saveSlotDefaultMeta,
  saveSlotDefaultMetaIndex,
  saveSlotExtractMeta,
  saveSlotDbKey,
  saveSlotIsManual,
  saveSlotDisplayName,
  saveSlotWrite,
  saveSlotRead,
  saveSlotDelete,
  saveSlotRefreshMeta,
  saveSlotMetaIndex,
} from '@helpers/save-slots';
import { saveSerialize } from '@helpers/save';
import { gamestate } from '@helpers/state-game';

// --- In-memory storage for mocking IndexedDB ---

const memoryStore = new Map<string, unknown>();

vi.mock('@helpers/save-slots-storage', () => ({
  saveSlotStorageGet: vi.fn(async (key: string) => memoryStore.get(key)),
  saveSlotStoragePut: vi.fn(async (key: string, value: unknown) => {
    memoryStore.set(key, structuredClone(value));
  }),
  saveSlotStorageDelete: vi.fn(async (key: string) => {
    memoryStore.delete(key);
  }),
}));

vi.mock('@helpers/logging', () => ({
  debug: vi.fn(),
}));

vi.mock('@helpers/save', () => ({
  saveSerialize: vi.fn(),
}));

vi.mock('@helpers/state-game', () => ({
  gamestate: vi.fn(),
}));

function makeSaveData(overrides?: Partial<SaveData>): SaveData {
  return {
    formatVersion: 1,
    savedAt: 1700000000000,
    playtimeSeconds: 500,
    checksum: 'v1:abc',
    gameState: {
      meta: { version: 1, isSetup: true, isPaused: false, createdAt: 1000000 },
      gameId: 'test-dungeon' as GameState['gameId'],
      clock: {
        numTicks: 500,
        lastSaveTick: 490,
        day: 15,
        hour: 12,
        minute: 30,
      },
      world: {
        grid: { tiles: [], width: 0, height: 0 },
        resources: {} as GameState['world']['resources'],
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
        reputation: { terror: 0, wealth: 0, knowledge: 0, harmony: 0, chaos: 0 },
        floors: [
          {
            id: 'f1',
            name: 'Floor 1',
            depth: 1,
            biome: 'neutral',
            grid: { tiles: [], width: 0, height: 0 },
            rooms: [
              { id: 'r1' },
              { id: 'r2' },
              { id: 'r3' },
            ],
            hallways: [],
            inhabitants: [],
            connections: [],
            traps: [],
          },
          {
            id: 'f2',
            name: 'Floor 2',
            depth: 2,
            biome: 'crystal',
            grid: { tiles: [], width: 0, height: 0 },
            rooms: [{ id: 'r4' }],
            hallways: [],
            inhabitants: [],
            connections: [],
            traps: [],
          },
        ] as unknown as GameState['world']['floors'],
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
    } as unknown as GameState,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  memoryStore.clear();
  saveSlotMetaIndex.set(saveSlotDefaultMetaIndex());
});

// --- Constants ---

describe('SAVE_SLOT_IDS', () => {
  it('should contain 4 slot IDs', () => {
    expect(SAVE_SLOT_IDS).toHaveLength(4);
    expect(SAVE_SLOT_IDS).toContain('autosave');
    expect(SAVE_SLOT_IDS).toContain('slot-1');
    expect(SAVE_SLOT_IDS).toContain('slot-2');
    expect(SAVE_SLOT_IDS).toContain('slot-3');
  });
});

describe('SAVE_SLOT_MANUAL_IDS', () => {
  it('should contain 3 manual slot IDs', () => {
    expect(SAVE_SLOT_MANUAL_IDS).toHaveLength(3);
    expect(SAVE_SLOT_MANUAL_IDS).not.toContain('autosave');
  });
});

// --- saveSlotDefaultMeta ---

describe('saveSlotDefaultMeta', () => {
  it('should return empty meta for a slot', () => {
    const meta = saveSlotDefaultMeta('slot-1');

    expect(meta.slotId).toBe('slot-1');
    expect(meta.isEmpty).toBe(true);
    expect(meta.timestamp).toBe(0);
    expect(meta.playtimeSeconds).toBe(0);
  });
});

// --- saveSlotDefaultMetaIndex ---

describe('saveSlotDefaultMetaIndex', () => {
  it('should return empty meta for all slots', () => {
    const index = saveSlotDefaultMetaIndex();

    for (const slotId of SAVE_SLOT_IDS) {
      expect(index[slotId as SaveSlotId].isEmpty).toBe(true);
      expect(index[slotId as SaveSlotId].slotId).toBe(slotId);
    }
  });
});

// --- saveSlotExtractMeta ---

describe('saveSlotExtractMeta', () => {
  it('should extract metadata from save data', () => {
    const saveData = makeSaveData();
    const meta = saveSlotExtractMeta('slot-1', saveData);

    expect(meta.slotId).toBe('slot-1');
    expect(meta.timestamp).toBe(1700000000000);
    expect(meta.dungeonName).toBe('test-dungeon');
    expect(meta.playtimeSeconds).toBe(500);
    expect(meta.floorCount).toBe(2);
    expect(meta.roomCount).toBe(4);
    expect(meta.dayNumber).toBe(15);
    expect(meta.isEmpty).toBe(false);
  });

  it('should count rooms across all floors', () => {
    const saveData = makeSaveData();
    const meta = saveSlotExtractMeta('autosave', saveData);

    // 3 rooms on floor 1 + 1 room on floor 2
    expect(meta.roomCount).toBe(4);
  });
});

// --- saveSlotDbKey ---

describe('saveSlotDbKey', () => {
  it('should return prefixed key for autosave', () => {
    expect(saveSlotDbKey('autosave')).toBe('saveslot:autosave');
  });

  it('should return prefixed key for manual slots', () => {
    expect(saveSlotDbKey('slot-1')).toBe('saveslot:slot-1');
    expect(saveSlotDbKey('slot-2')).toBe('saveslot:slot-2');
    expect(saveSlotDbKey('slot-3')).toBe('saveslot:slot-3');
  });
});

// --- saveSlotIsManual ---

describe('saveSlotIsManual', () => {
  it('should return false for autosave', () => {
    expect(saveSlotIsManual('autosave')).toBe(false);
  });

  it('should return true for manual slots', () => {
    expect(saveSlotIsManual('slot-1')).toBe(true);
    expect(saveSlotIsManual('slot-2')).toBe(true);
    expect(saveSlotIsManual('slot-3')).toBe(true);
  });
});

// --- saveSlotDisplayName ---

describe('saveSlotDisplayName', () => {
  it('should return display names', () => {
    expect(saveSlotDisplayName('autosave')).toBe('Autosave');
    expect(saveSlotDisplayName('slot-1')).toBe('Slot 1');
    expect(saveSlotDisplayName('slot-2')).toBe('Slot 2');
    expect(saveSlotDisplayName('slot-3')).toBe('Slot 3');
  });
});

// --- CRUD operations ---

describe('saveSlotWrite', () => {
  it('should write save data and update meta index', async () => {
    const saveData = makeSaveData();

    await saveSlotWrite('slot-1', saveData);

    const meta = saveSlotMetaIndex();
    expect(meta['slot-1'].isEmpty).toBe(false);
    expect(meta['slot-1'].slotId).toBe('slot-1');
    expect(meta['slot-1'].dayNumber).toBe(15);
    expect(meta['slot-1'].floorCount).toBe(2);
  });

  it('should serialize current gamestate when no saveData provided', async () => {
    const saveData = makeSaveData();
    vi.mocked(gamestate).mockReturnValue(saveData.gameState);
    vi.mocked(saveSerialize).mockReturnValue(saveData);

    await saveSlotWrite('slot-2');

    expect(saveSerialize).toHaveBeenCalledWith(saveData.gameState);
    const meta = saveSlotMetaIndex();
    expect(meta['slot-2'].isEmpty).toBe(false);
  });

  it('should write to autosave slot', async () => {
    const saveData = makeSaveData();

    await saveSlotWrite('autosave', saveData);

    const meta = saveSlotMetaIndex();
    expect(meta['autosave'].isEmpty).toBe(false);
  });

  it('should not affect other slots metadata', async () => {
    const saveData = makeSaveData();

    await saveSlotWrite('slot-1', saveData);

    const meta = saveSlotMetaIndex();
    expect(meta['slot-2'].isEmpty).toBe(true);
    expect(meta['slot-3'].isEmpty).toBe(true);
  });
});

describe('saveSlotRead', () => {
  it('should return undefined for empty slot', async () => {
    const result = await saveSlotRead('slot-1');
    expect(result).toBeUndefined();
  });

  it('should return save data for occupied slot', async () => {
    const saveData = makeSaveData();
    await saveSlotWrite('slot-1', saveData);

    const result = await saveSlotRead('slot-1');
    expect(result).toBeDefined();
    expect(result!.gameState.gameId).toBe('test-dungeon');
  });
});

describe('saveSlotDelete', () => {
  it('should clear save data and reset meta', async () => {
    const saveData = makeSaveData();
    await saveSlotWrite('slot-1', saveData);

    expect(saveSlotMetaIndex()['slot-1'].isEmpty).toBe(false);

    await saveSlotDelete('slot-1');

    expect(saveSlotMetaIndex()['slot-1'].isEmpty).toBe(true);
    const result = await saveSlotRead('slot-1');
    expect(result).toBeUndefined();
  });

  it('should not affect other slots', async () => {
    const saveData = makeSaveData();
    await saveSlotWrite('slot-1', saveData);
    await saveSlotWrite('slot-2', saveData);

    await saveSlotDelete('slot-1');

    expect(saveSlotMetaIndex()['slot-1'].isEmpty).toBe(true);
    expect(saveSlotMetaIndex()['slot-2'].isEmpty).toBe(false);
  });
});

describe('saveSlotRefreshMeta', () => {
  it('should return default meta when no data stored', async () => {
    const meta = await saveSlotRefreshMeta();

    for (const slotId of SAVE_SLOT_IDS) {
      expect(meta[slotId as SaveSlotId].isEmpty).toBe(true);
    }
  });

  it('should return stored meta after writes', async () => {
    const saveData = makeSaveData();
    await saveSlotWrite('slot-1', saveData);

    // Reset signal to default
    saveSlotMetaIndex.set(saveSlotDefaultMetaIndex());

    // Refresh should restore from DB
    const meta = await saveSlotRefreshMeta();
    expect(meta['slot-1'].isEmpty).toBe(false);
    expect(meta['slot-1'].dayNumber).toBe(15);
  });
});
