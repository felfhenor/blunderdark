import { gamestate, gamestateSet } from '@helpers/state-game';
import { migrateGameState } from '@helpers/migrate';
import type { GameState, SaveData, SaveValidationResult } from '@interfaces';

// --- Constants ---

export const SAVE_FORMAT_VERSION = 1;

// --- Serialization ---

export function saveSerialize(state?: GameState): SaveData {
  const source = state ?? gamestate();
  const cloned = structuredClone(source);

  const playtimeSeconds = cloned.clock.numTicks;

  const saveData: SaveData = {
    formatVersion: SAVE_FORMAT_VERSION,
    savedAt: Date.now(),
    playtimeSeconds,
    checksum: '',
    gameState: cloned,
  };

  saveData.checksum = saveComputeChecksum(saveData);

  return saveData;
}

// --- Deserialization ---

export function saveDeserialize(saveData: SaveData): void {
  gamestateSet(saveData.gameState);
  migrateGameState();
}

// --- Checksum ---

export function saveComputeChecksum(saveData: SaveData): string {
  const dataForHash: SaveData = {
    ...saveData,
    checksum: '',
  };

  const json = JSON.stringify(dataForHash);

  let hash = 0;
  for (let i = 0; i < json.length; i++) {
    const char = json.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }

  return `v1:${(hash >>> 0).toString(36)}`;
}

export function saveVerifyChecksum(saveData: SaveData): boolean {
  const expected = saveComputeChecksum(saveData);
  return expected === saveData.checksum;
}

// --- Validation ---

export function saveValidate(data: unknown): SaveValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (data === undefined || data === null || typeof data !== 'object') {
    return { valid: false, errors: ['Save data is not an object'], warnings };
  }

  const obj = data as Record<string, unknown>;

  // Check top-level fields
  if (typeof obj['formatVersion'] !== 'number') {
    errors.push('Missing or invalid formatVersion');
  }

  if (typeof obj['savedAt'] !== 'number') {
    errors.push('Missing or invalid savedAt timestamp');
  }

  if (typeof obj['playtimeSeconds'] !== 'number') {
    errors.push('Missing or invalid playtimeSeconds');
  }

  if (typeof obj['checksum'] !== 'string') {
    errors.push('Missing or invalid checksum');
  }

  if (
    obj['gameState'] === undefined ||
    obj['gameState'] === null ||
    typeof obj['gameState'] !== 'object'
  ) {
    errors.push('Missing or invalid gameState');
    return { valid: errors.length === 0, errors, warnings };
  }

  const gs = obj['gameState'] as Record<string, unknown>;

  // Validate gameState structure
  if (
    gs['meta'] === undefined ||
    gs['meta'] === null ||
    typeof gs['meta'] !== 'object'
  ) {
    errors.push('Missing gameState.meta');
  } else {
    const meta = gs['meta'] as Record<string, unknown>;
    if (typeof meta['version'] !== 'number')
      errors.push('Missing gameState.meta.version');
    if (typeof meta['createdAt'] !== 'number')
      errors.push('Missing gameState.meta.createdAt');
  }

  if (typeof gs['gameId'] !== 'string') {
    errors.push('Missing gameState.gameId');
  }

  if (
    gs['clock'] === undefined ||
    gs['clock'] === null ||
    typeof gs['clock'] !== 'object'
  ) {
    errors.push('Missing gameState.clock');
  } else {
    const clock = gs['clock'] as Record<string, unknown>;
    if (typeof clock['numTicks'] !== 'number')
      errors.push('Missing gameState.clock.numTicks');
    if (typeof clock['day'] !== 'number')
      errors.push('Missing gameState.clock.day');
  }

  if (
    gs['world'] === undefined ||
    gs['world'] === null ||
    typeof gs['world'] !== 'object'
  ) {
    errors.push('Missing gameState.world');
  } else {
    const world = gs['world'] as Record<string, unknown>;

    if (
      world['resources'] === undefined ||
      world['resources'] === null ||
      typeof world['resources'] !== 'object'
    ) {
      errors.push('Missing gameState.world.resources');
    }

    if (!Array.isArray(world['inhabitants'])) {
      errors.push('Missing gameState.world.inhabitants');
    }

    if (!Array.isArray(world['floors'])) {
      errors.push('Missing gameState.world.floors');
    }

    if (
      world['season'] === undefined ||
      world['season'] === null ||
      typeof world['season'] !== 'object'
    ) {
      errors.push('Missing gameState.world.season');
    }

    if (
      world['research'] === undefined ||
      world['research'] === null ||
      typeof world['research'] !== 'object'
    ) {
      errors.push('Missing gameState.world.research');
    }

    if (
      world['reputation'] === undefined ||
      world['reputation'] === null ||
      typeof world['reputation'] !== 'object'
    ) {
      errors.push('Missing gameState.world.reputation');
    }

    if (
      world['invasionSchedule'] === undefined ||
      world['invasionSchedule'] === null ||
      typeof world['invasionSchedule'] !== 'object'
    ) {
      errors.push('Missing gameState.world.invasionSchedule');
    }

    if (
      world['victoryProgress'] === undefined ||
      world['victoryProgress'] === null ||
      typeof world['victoryProgress'] !== 'object'
    ) {
      errors.push('Missing gameState.world.victoryProgress');
    }
  }

  // Checksum warning (not error — allow player to proceed)
  if (errors.length === 0 && typeof obj['checksum'] === 'string') {
    if (!saveVerifyChecksum(data as SaveData)) {
      warnings.push('Checksum mismatch — save data may have been modified');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// --- Legacy support: parse raw GameState (no SaveData wrapper) ---

export function saveParseLegacy(data: unknown): SaveData | undefined {
  if (data === undefined || data === null || typeof data !== 'object') {
    return undefined;
  }

  const obj = data as Record<string, unknown>;

  // Check if this is already a SaveData (has formatVersion)
  if (typeof obj['formatVersion'] === 'number') {
    return data as SaveData;
  }

  // Check if this is a raw GameState (has meta, clock, world)
  if (
    obj['meta'] !== undefined &&
    obj['clock'] !== undefined &&
    obj['world'] !== undefined
  ) {
    const gameState = data as GameState;
    return {
      formatVersion: SAVE_FORMAT_VERSION,
      savedAt: Date.now(),
      playtimeSeconds: (gameState.clock as Record<string, unknown>)[
        'numTicks'
      ] as number,
      checksum: '',
      gameState,
    };
  }

  return undefined;
}
