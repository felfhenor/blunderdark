import { computed, signal } from '@angular/core';
import { getAbsoluteTiles } from '@helpers/room-shapes';
import { gamestate } from '@helpers/state-game';
import type { GridState, RoomShape, TileOffset } from '@interfaces';
import { GRID_SIZE } from '@interfaces/grid';

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

export function validateBounds(
  shape: RoomShape,
  anchorX: number,
  anchorY: number,
  gridSize: number = GRID_SIZE,
): ValidationResult {
  const tiles = getAbsoluteTiles(shape, anchorX, anchorY);
  const outOfBounds = tiles.some(
    (t) => t.x < 0 || t.x >= gridSize || t.y < 0 || t.y >= gridSize,
  );

  if (outOfBounds) {
    return { valid: false, error: 'Room extends beyond grid boundary' };
  }

  return { valid: true };
}

export function validateNoOverlap(
  shape: RoomShape,
  anchorX: number,
  anchorY: number,
  grid: GridState,
): OverlapValidationResult {
  const tiles = getAbsoluteTiles(shape, anchorX, anchorY);
  const conflicting = tiles.filter(
    (t) =>
      t.y >= 0 &&
      t.y < grid.length &&
      t.x >= 0 &&
      t.x < grid[0].length &&
      grid[t.y][t.x].occupied,
  );

  if (conflicting.length > 0) {
    return {
      valid: false,
      error: 'Tiles already occupied',
      conflictingTiles: conflicting,
    };
  }

  return { valid: true };
}

export function validatePlacement(
  shape: RoomShape,
  anchorX: number,
  anchorY: number,
  grid: GridState,
): PlacementValidationResult {
  const errors: string[] = [];

  const boundsResult = validateBounds(shape, anchorX, anchorY);
  if (!boundsResult.valid && boundsResult.error) {
    errors.push(boundsResult.error);
  }

  const overlapResult = validateNoOverlap(shape, anchorX, anchorY, grid);
  if (!overlapResult.valid && overlapResult.error) {
    errors.push(overlapResult.error);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// --- Placement preview state ---

export type PreviewTile = TileOffset & {
  inBounds: boolean;
};

export const placementPreviewShape = signal<RoomShape | null>(null);
export const placementPreviewPosition = signal<TileOffset | null>(null);

export const placementPreview = computed(() => {
  const shape = placementPreviewShape();
  const position = placementPreviewPosition();
  if (!shape || !position) return null;

  const grid = gamestate().world.grid;
  const validation = validatePlacement(shape, position.x, position.y, grid);
  const tiles = getAbsoluteTiles(shape, position.x, position.y);

  return {
    tiles: tiles.map((t) => ({
      ...t,
      inBounds: t.x >= 0 && t.x < GRID_SIZE && t.y >= 0 && t.y < GRID_SIZE,
    })),
    valid: validation.valid,
    errors: validation.errors,
  };
});

export function setPlacementPreview(
  shape: RoomShape | null,
  position?: TileOffset | null,
): void {
  placementPreviewShape.set(shape);
  placementPreviewPosition.set(position ?? null);
}

export function updatePreviewPosition(x: number, y: number): void {
  if (!placementPreviewShape()) return;
  placementPreviewPosition.set({ x, y });
}

export function clearPlacementPreview(): void {
  placementPreviewShape.set(null);
  placementPreviewPosition.set(null);
}
