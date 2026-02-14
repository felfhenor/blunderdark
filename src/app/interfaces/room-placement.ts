import type { TileOffset } from '@interfaces/room-shape';

export type ValidationResult = {
  valid: boolean;
  error?: string;
};

export type OverlapValidationResult = ValidationResult & {
  conflictingTiles?: TileOffset[];
};

export type PlacementValidationResult = {
  valid: boolean;
  errors: string[];
};

export type PreviewTile = TileOffset & {
  inBounds: boolean;
};
