import { computed, signal } from '@angular/core';
import { getEntry } from '@helpers/content';
import { currentFloor } from '@helpers/floor';
import { canAfford, payCost } from '@helpers/resources';
import { rngUuid } from '@helpers/rng';
import {
  getAbsoluteTiles,
  getRotatedShape,
  getRoomShape,
} from '@helpers/room-shapes';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type {
  Floor,
  GridState,
  IsContentItem,
  PlacedRoom,
  Rotation,
  RoomDefinition,
  RoomShape,
  TileOffset,
} from '@interfaces';
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

// --- Unique room enforcement ---

/**
 * Check if a room type is already placed on any floor in the dungeon.
 * Used to enforce unique room constraints (e.g., only one Throne Room per dungeon).
 */
export function isUniqueRoomTypePlaced(
  floors: Floor[],
  roomTypeId: string,
): boolean {
  return floors.some((floor) =>
    floor.rooms.some((room) => room.roomTypeId === roomTypeId),
  );
}

/**
 * Set of room type IDs that are currently placed on any floor.
 * Used by the UI to gray out unique rooms that are already built.
 */
export const placedRoomTypeIds = computed(() => {
  const state = gamestate();
  const placed = new Set<string>();
  for (const floor of state.world.floors) {
    for (const room of floor.rooms) {
      placed.add(room.roomTypeId);
    }
  }
  return placed;
});

// --- Placement mode state ---

export const selectedRoomTypeId = signal<string | null>(null);
export const placementRotation = signal<Rotation>(0);

/** The base (unrotated) shape for the current placement. */
const placementBaseShape = signal<RoomShape | null>(null);

export function enterPlacementMode(roomTypeId: string, shape: RoomShape): void {
  selectedRoomTypeId.set(roomTypeId);
  placementBaseShape.set(shape);
  placementRotation.set(0);
  placementPreviewShape.set(shape);
  placementPreviewPosition.set(null);
}

export function exitPlacementMode(): void {
  selectedRoomTypeId.set(null);
  placementBaseShape.set(null);
  placementRotation.set(0);
  placementPreviewShape.set(null);
  placementPreviewPosition.set(null);
}

/** Rotate the placement preview by 90° clockwise. */
export function rotatePlacement(): void {
  const base = placementBaseShape();
  if (!base) return;
  const next = ((placementRotation() + 1) % 4) as Rotation;
  placementRotation.set(next);
  placementPreviewShape.set(getRotatedShape(base, next));
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

  const floor = currentFloor();
  if (!floor) return null;

  const grid = floor.grid;
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

export function clearPreviewPosition(): void {
  placementPreviewPosition.set(null);
}

export function clearPlacementPreview(): void {
  placementPreviewShape.set(null);
  placementPreviewPosition.set(null);
}

// --- Placement error messages ---

const PLAYER_FRIENDLY_ERRORS: Record<string, string> = {
  'Room extends beyond grid boundary': 'room extends beyond the grid boundary',
  'Tiles already occupied': 'tiles are already occupied',
};

function toPlayerFriendlyError(error: string): string {
  return PLAYER_FRIENDLY_ERRORS[error] ?? error.toLowerCase();
}

export function formatPlacementErrors(errors: string[]): string {
  if (errors.length === 0) return '';

  const friendly = errors.map(toPlayerFriendlyError);
  return `Cannot place room: ${friendly.join(', ')}`;
}

export function attemptPlacement(
  x: number,
  y: number,
): { placed: boolean; errors: string[]; message: string } {
  const shape = placementPreviewShape();
  if (!shape) return { placed: false, errors: [], message: '' };

  const grid = gamestate().world.grid;
  const result = validatePlacement(shape, x, y, grid);

  if (!result.valid) {
    return {
      placed: false,
      errors: result.errors,
      message: formatPlacementErrors(result.errors),
    };
  }

  return { placed: true, errors: [], message: '' };
}

export async function executeRoomPlacement(
  x: number,
  y: number,
): Promise<{ success: boolean; error?: string }> {
  const shape = placementPreviewShape();
  const roomTypeId = selectedRoomTypeId();
  if (!shape || !roomTypeId) return { success: false };

  const floor = currentFloor();
  if (!floor) return { success: false, error: 'No active floor' };

  const validation = validatePlacement(shape, x, y, floor.grid);
  if (!validation.valid) {
    return {
      success: false,
      error: formatPlacementErrors(validation.errors),
    };
  }

  const roomDef = getEntry<RoomDefinition & IsContentItem>(roomTypeId);
  if (!roomDef) return { success: false, error: 'Unknown room type' };

  if (roomDef.isUnique) {
    const allFloors = gamestate().world.floors;
    if (isUniqueRoomTypePlaced(allFloors, roomTypeId)) {
      return { success: false, error: 'This unique room is already built' };
    }
  }

  if (!canAfford(roomDef.cost)) {
    return { success: false, error: 'Not enough resources' };
  }

  const paid = await payCost(roomDef.cost);
  if (!paid) return { success: false, error: 'Not enough resources' };

  const placed = await placeRoom(
    roomTypeId,
    roomDef.shapeId,
    x,
    y,
    placementRotation(),
  );
  if (!placed) return { success: false, error: 'Failed to place room' };

  return { success: true };
}

// --- Room placement on floor ---

export function placeRoomOnFloor(
  floor: Floor,
  room: PlacedRoom,
  shape: RoomShape,
): Floor | null {
  const validation = validatePlacement(
    shape,
    room.anchorX,
    room.anchorY,
    floor.grid,
  );
  if (!validation.valid) return null;

  const tiles = getAbsoluteTiles(shape, room.anchorX, room.anchorY);
  const newGrid = floor.grid.map((row) => row.map((tile) => ({ ...tile })));

  for (const t of tiles) {
    newGrid[t.y][t.x] = {
      occupied: true,
      occupiedBy: 'room',
      roomId: room.id,
      hallwayId: null,
      connectionType: null,
    };
  }

  return {
    ...floor,
    grid: newGrid,
    rooms: [...floor.rooms, room],
  };
}

export function removeRoomFromFloor(
  floor: Floor,
  roomId: string,
  shape: RoomShape,
): Floor | null {
  const room = floor.rooms.find((r) => r.id === roomId);
  if (!room) return null;

  const tiles = getAbsoluteTiles(shape, room.anchorX, room.anchorY);
  const newGrid = floor.grid.map((row) => row.map((tile) => ({ ...tile })));

  for (const t of tiles) {
    if (
      t.y >= 0 &&
      t.y < newGrid.length &&
      t.x >= 0 &&
      t.x < newGrid[0].length
    ) {
      const gridTile = newGrid[t.y][t.x];
      if (gridTile.roomId === roomId) {
        newGrid[t.y][t.x] = {
          occupied: false,
          occupiedBy: 'empty',
          roomId: null,
          hallwayId: gridTile.hallwayId,
          connectionType: gridTile.connectionType,
        };
      }
    }
  }

  return {
    ...floor,
    grid: newGrid,
    rooms: floor.rooms.filter((r) => r.id !== roomId),
  };
}

export async function placeRoom(
  roomTypeId: string,
  shapeId: string,
  anchorX: number,
  anchorY: number,
  rotation: Rotation = 0,
): Promise<PlacedRoom | null> {
  const baseShape = getRoomShape(shapeId);
  if (!baseShape) return null;

  const shape = getRotatedShape(baseShape, rotation);

  const state = gamestate();
  const floorIndex = state.world.currentFloorIndex;
  const floor = state.world.floors[floorIndex];
  if (!floor) return null;

  const room: PlacedRoom = {
    id: rngUuid(),
    roomTypeId,
    shapeId,
    anchorX,
    anchorY,
    rotation: rotation || undefined,
  };

  const updatedFloor = placeRoomOnFloor(floor, room, shape);
  if (!updatedFloor) return null;

  await updateGamestate((s) => {
    const newFloors = [...s.world.floors];
    newFloors[floorIndex] = updatedFloor;
    return {
      ...s,
      world: {
        ...s.world,
        floors: newFloors,
      },
    };
  });

  return room;
}

/**
 * Check if a placed room can be removed based on its definition.
 * Returns false for rooms with removable: false (e.g., Altar Room).
 */
export function isRoomRemovable(roomTypeId: string): boolean {
  const roomDef = getEntry<RoomDefinition & IsContentItem>(roomTypeId);
  if (!roomDef) return true;
  return roomDef.removable;
}

export async function removeRoom(roomId: string): Promise<boolean> {
  const state = gamestate();
  const floorIndex = state.world.currentFloorIndex;
  const floor = state.world.floors[floorIndex];
  if (!floor) return false;

  const room = floor.rooms.find((r) => r.id === roomId);
  if (!room) return false;

  if (!isRoomRemovable(room.roomTypeId)) return false;

  const baseShape = getRoomShape(room.shapeId);
  if (!baseShape) return false;

  const shape = getRotatedShape(baseShape, room.rotation ?? 0);

  const updatedFloor = removeRoomFromFloor(floor, roomId, shape);
  if (!updatedFloor) return false;

  await updateGamestate((s) => {
    const newFloors = [...s.world.floors];
    newFloors[floorIndex] = updatedFloor;
    return {
      ...s,
      world: {
        ...s.world,
        floors: newFloors,
      },
    };
  });

  return true;
}
