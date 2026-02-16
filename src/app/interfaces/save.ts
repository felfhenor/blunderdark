import type { GameState } from '@interfaces/state-game';

export type SaveData = {
  formatVersion: number;
  savedAt: number;
  playtimeSeconds: number;
  checksum: string;
  gameState: GameState;
};

export type SaveValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type SaveMigrationResult = {
  success: boolean;
  saveData: SaveData;
  sourceVersion: number;
  targetVersion: number;
  migrationsApplied: number;
  error?: string;
  isNewerVersion: boolean;
};
