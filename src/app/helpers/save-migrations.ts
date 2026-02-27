import { debug, warn } from '@helpers/logging';
import type { SaveData, SaveMigrationResult } from '@interfaces';

// --- Constants ---

export const SAVE_VERSION = 4;

// --- Types ---

export type SaveMigrationFn = (saveData: SaveData) => SaveData;

// --- Migration Registry ---

/**
 * Map of migrations keyed by the source version they upgrade FROM.
 * Each function transforms save data from version N to version N+1.
 * Add new migrations here when changing the save format.
 *
 * Example:
 *   saveMigrations.set(1, (data) => {
 *     // transform v1 -> v2
 *     data.gameState.world.newField = defaultValue;
 *     return data;
 *   });
 */
export const saveMigrations: Map<number, SaveMigrationFn> = new Map();

saveMigrations.set(1, (data) => {
  data.gameState.world.farplaneSouls = data.gameState.world.farplaneSouls ?? [];
  return data;
});

saveMigrations.set(2, (data) => {
  const world = data.gameState.world as unknown as Record<string, unknown>;

  // Migrate forgeCraftingQueues → per-room forgeJobs
  const forgeQueues = (world['forgeCraftingQueues'] ?? []) as Array<{
    roomId: string;
    jobs: Array<{ recipeId: string; progress: number; targetTicks: number }>;
  }>;
  for (const entry of forgeQueues) {
    for (const floor of data.gameState.world.floors) {
      const room = floor.rooms.find(
        (r: { id: string }) => r.id === entry.roomId,
      );
      if (room) {
        (room as Record<string, unknown>)['forgeJobs'] = entry.jobs;
        break;
      }
    }
  }
  delete world['forgeCraftingQueues'];

  // Migrate trapCraftingQueues → per-room trapJobs
  const trapQueues = (world['trapCraftingQueues'] ?? []) as Array<{
    roomId: string;
    jobs: Array<{
      trapTypeId: string;
      progress: number;
      targetTicks: number;
    }>;
  }>;
  for (const entry of trapQueues) {
    for (const floor of data.gameState.world.floors) {
      const room = floor.rooms.find(
        (r: { id: string }) => r.id === entry.roomId,
      );
      if (room) {
        (room as Record<string, unknown>)['trapJobs'] = entry.jobs;
        break;
      }
    }
  }
  delete world['trapCraftingQueues'];

  // Migrate summonJob → summonJobs (single job to array, ticksRemaining → progress count-up)
  for (const floor of data.gameState.world.floors) {
    for (const room of floor.rooms) {
      const r = room as Record<string, unknown>;
      const oldJob = r['summonJob'] as
        | {
            recipeId: string;
            ticksRemaining: number;
            targetTicks: number;
          }
        | undefined;
      if (oldJob) {
        r['summonJobs'] = [
          {
            recipeId: oldJob.recipeId,
            progress: oldJob.targetTicks - oldJob.ticksRemaining,
            targetTicks: oldJob.targetTicks,
          },
        ];
        delete r['summonJob'];
      }
    }
  }

  return data;
});

saveMigrations.set(3, (data) => {
  const world = data.gameState.world as unknown as Record<string, unknown>;
  const inventory = (world['forgeInventory'] ?? []) as Array<{
    recipeId: string;
    count: number;
    bakedStatBonuses?: Record<string, number>;
  }>;
  for (const entry of inventory) {
    if (!entry.bakedStatBonuses) {
      entry.bakedStatBonuses = {};
    }
  }
  return data;
});

// --- Migration Pipeline ---

export function saveMigrationDetectVersion(saveData: SaveData): number {
  if (
    typeof saveData.formatVersion === 'number' &&
    saveData.formatVersion >= 1
  ) {
    return saveData.formatVersion;
  }

  return 1;
}

export function saveMigrationRun(saveData: SaveData): SaveMigrationResult {
  const sourceVersion = saveMigrationDetectVersion(saveData);

  if (sourceVersion > SAVE_VERSION) {
    return {
      success: false,
      saveData,
      sourceVersion,
      targetVersion: SAVE_VERSION,
      migrationsApplied: 0,
      error: `Save file is from a newer version (v${sourceVersion}) than the current game (v${SAVE_VERSION}). It may not load correctly.`,
      isNewerVersion: true,
    };
  }

  if (sourceVersion === SAVE_VERSION) {
    return {
      success: true,
      saveData,
      sourceVersion,
      targetVersion: SAVE_VERSION,
      migrationsApplied: 0,
      isNewerVersion: false,
    };
  }

  let current = structuredClone(saveData);
  let currentVersion = sourceVersion;
  let migrationsApplied = 0;

  while (currentVersion < SAVE_VERSION) {
    const migration = saveMigrations.get(currentVersion);

    if (!migration) {
      const msg = `No migration found for version ${currentVersion} -> ${currentVersion + 1}`;
      warn('SaveMigration', msg);
      return {
        success: false,
        saveData: current,
        sourceVersion,
        targetVersion: SAVE_VERSION,
        migrationsApplied,
        error: msg,
        isNewerVersion: false,
      };
    }

    try {
      current = migration(current);
      currentVersion++;
      current.formatVersion = currentVersion;
      migrationsApplied++;
      debug(
        'SaveMigration',
        `Migrated v${currentVersion - 1} -> v${currentVersion}`,
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unknown migration error';
      warn('SaveMigration', `Migration v${currentVersion} -> v${currentVersion + 1} failed: ${msg}`);
      return {
        success: false,
        saveData: current,
        sourceVersion,
        targetVersion: SAVE_VERSION,
        migrationsApplied,
        error: `Migration failed at v${currentVersion} -> v${currentVersion + 1}: ${msg}`,
        isNewerVersion: false,
      };
    }
  }

  debug(
    'SaveMigration',
    `Migration complete: v${sourceVersion} -> v${SAVE_VERSION} (${migrationsApplied} migrations)`,
  );

  return {
    success: true,
    saveData: current,
    sourceVersion,
    targetVersion: SAVE_VERSION,
    migrationsApplied,
    isNewerVersion: false,
  };
}
