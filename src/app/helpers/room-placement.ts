import { computed, signal } from '@angular/core';
import { altarRoomFind } from '@helpers/altar-room';
import { biomeRestrictionCanBuild } from '@helpers/biome-restrictions';
import { contentGetEntry } from '@helpers/content';
import { floorCurrent } from '@helpers/floor';
import { resourceCanAfford, resourcePayCost } from '@helpers/resources';
import { rngUuid } from '@helpers/rng';
import {
  roomShapeGet,
  roomShapeGetAbsoluteTiles,
  roomShapeGetRotated,
} from '@helpers/room-shapes';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type {
  Floor,
  GridState,
  PlacedRoom,
  PlacedRoomId,
  RoomId,
  RoomShapeContent,
  RoomShapeId,
  Rotation,
  TileOffset,
} from '@interfaces';
import type { RoomContent } from '@interfaces/content-room';
import { GRID_SIZE } from '@interfaces/grid';
import type {
  OverlapValidationResult,
  PlacementValidationResult,
  ValidationResult,
} from '@interfaces/room-placement';

export function roomPlacementValidateBounds(
  shape: RoomShapeContent,
  anchorX: number,
  anchorY: number,
  gridSize: number = GRID_SIZE,
): ValidationResult {
  const tiles = roomShapeGetAbsoluteTiles(shape, anchorX, anchorY);
  const outOfBounds = tiles.some(
    (t) => t.x < 0 || t.x >= gridSize || t.y < 0 || t.y >= gridSize,
  );

  if (outOfBounds) {
    return { valid: false, error: 'Room extends beyond grid boundary' };
  }

  return { valid: true };
}

export function roomPlacementValidateNoOverlap(
  shape: RoomShapeContent,
  anchorX: number,
  anchorY: number,
  grid: GridState,
): OverlapValidationResult {
  const tiles = roomShapeGetAbsoluteTiles(shape, anchorX, anchorY);
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

export function roomPlacementValidate(
  shape: RoomShapeContent,
  anchorX: number,
  anchorY: number,
  grid: GridState,
): PlacementValidationResult {
  const errors: string[] = [];

  const boundsResult = roomPlacementValidateBounds(shape, anchorX, anchorY);
  if (!boundsResult.valid && boundsResult.error) {
    errors.push(boundsResult.error);
  }

  const overlapResult = roomPlacementValidateNoOverlap(
    shape,
    anchorX,
    anchorY,
    grid,
  );
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
export function roomPlacementIsUniqueTypePlaced(
  floors: Floor[],
  roomTypeId: RoomId,
): boolean {
  return floors.some((floor) =>
    floor.rooms.some((room) => room.roomTypeId === roomTypeId),
  );
}

/**
 * Set of room type IDs that are currently placed on any floor.
 * Used by the UI to gray out unique rooms that are already built.
 */
export const roomPlacementPlacedTypeIds = computed(() => {
  const state = gamestate();
  const placed = new Set<RoomId>();
  for (const floor of state.world.floors) {
    for (const room of floor.rooms) {
      placed.add(room.roomTypeId);
    }
  }
  return placed;
});

// --- Placement mode state ---

export const roomPlacementSelectedTypeId = signal<RoomId | undefined>(
  undefined,
);
export const roomPlacementRotation = signal<Rotation>(0);

/** The base (unrotated) shape for the current placement. */
const placementBaseShape = signal<RoomShapeContent | undefined>(undefined);

export function roomPlacementEnterMode(
  roomTypeId: RoomId,
  shape: RoomShapeContent,
): void {
  roomPlacementSelectedTypeId.set(roomTypeId);
  placementBaseShape.set(shape);
  roomPlacementRotation.set(0);
  roomPlacementPreviewShape.set(shape);
  roomPlacementPreviewPosition.set(undefined);
}

export function roomPlacementExitMode(): void {
  roomPlacementSelectedTypeId.set(undefined);
  placementBaseShape.set(undefined);
  roomPlacementRotation.set(0);
  roomPlacementPreviewShape.set(undefined);
  roomPlacementPreviewPosition.set(undefined);
}

/** Rotate the placement preview by 90° clockwise. */
export function roomPlacementRotate(): void {
  const base = placementBaseShape();
  if (!base) return;
  const next = ((roomPlacementRotation() + 1) % 4) as Rotation;
  roomPlacementRotation.set(next);
  roomPlacementPreviewShape.set(roomShapeGetRotated(base, next));
}

export const roomPlacementPreviewShape = signal<RoomShapeContent | undefined>(
  undefined,
);
export const roomPlacementPreviewPosition = signal<TileOffset | undefined>(
  undefined,
);

export const roomPlacementPreview = computed(() => {
  const shape = roomPlacementPreviewShape();
  const position = roomPlacementPreviewPosition();
  if (!shape || !position) return undefined;

  const floor = floorCurrent();
  if (!floor) return undefined;

  const grid = floor.grid;
  const validation = roomPlacementValidate(shape, position.x, position.y, grid);
  const tiles = roomShapeGetAbsoluteTiles(shape, position.x, position.y);

  return {
    tiles: tiles.map((t) => ({
      ...t,
      inBounds: t.x >= 0 && t.x < GRID_SIZE && t.y >= 0 && t.y < GRID_SIZE,
    })),
    valid: validation.valid,
    errors: validation.errors,
  };
});

export function roomPlacementSetPreview(
  shape: RoomShapeContent | undefined,
  position?: TileOffset | undefined,
): void {
  roomPlacementPreviewShape.set(shape);
  roomPlacementPreviewPosition.set(position ?? undefined);
}

export function roomPlacementUpdatePreviewPosition(x: number, y: number): void {
  if (!roomPlacementPreviewShape()) return;
  roomPlacementPreviewPosition.set({ x, y });
}

export function roomPlacementClearPreviewPosition(): void {
  roomPlacementPreviewPosition.set(undefined);
}

export function roomPlacementClearPreview(): void {
  roomPlacementPreviewShape.set(undefined);
  roomPlacementPreviewPosition.set(undefined);
}

// --- Placement error messages ---

const PLAYER_FRIENDLY_ERRORS: Record<string, string> = {
  'Room extends beyond grid boundary': 'room extends beyond the grid boundary',
  'Tiles already occupied': 'tiles are already occupied',
};

function toPlayerFriendlyError(error: string): string {
  return PLAYER_FRIENDLY_ERRORS[error] ?? error.toLowerCase();
}

export function roomPlacementFormatErrors(errors: string[]): string {
  if (errors.length === 0) return '';

  const friendly = errors.map(toPlayerFriendlyError);
  return `Cannot place room: ${friendly.join(', ')}`;
}

export function roomPlacementAttempt(
  x: number,
  y: number,
): { placed: boolean; errors: string[]; message: string } {
  const shape = roomPlacementPreviewShape();
  if (!shape) return { placed: false, errors: [], message: '' };

  const grid = gamestate().world.grid;
  const result = roomPlacementValidate(shape, x, y, grid);

  if (!result.valid) {
    return {
      placed: false,
      errors: result.errors,
      message: roomPlacementFormatErrors(result.errors),
    };
  }

  return { placed: true, errors: [], message: '' };
}

export async function roomPlacementExecute(
  x: number,
  y: number,
): Promise<{ success: boolean; error?: string }> {
  const shape = roomPlacementPreviewShape();
  const roomTypeId = roomPlacementSelectedTypeId();
  if (!shape || !roomTypeId) return { success: false };

  const floor = floorCurrent();
  if (!floor) return { success: false, error: 'No active floor' };

  const validation = roomPlacementValidate(shape, x, y, floor.grid);
  if (!validation.valid) {
    return {
      success: false,
      error: roomPlacementFormatErrors(validation.errors),
    };
  }

  const roomDef = contentGetEntry<RoomContent>(roomTypeId);
  if (!roomDef) return { success: false, error: 'Unknown room type' };

  // Non-autoPlace rooms require the Altar to be present
  if (!roomDef.autoPlace) {
    const floorAll = gamestate().world.floors;
    if (!altarRoomFind(floorAll)) {
      return { success: false, error: 'An Altar is required to build rooms' };
    }
  }

  if (roomDef.isUnique) {
    const floorAll = gamestate().world.floors;
    if (roomPlacementIsUniqueTypePlaced(floorAll, roomTypeId)) {
      return { success: false, error: 'This unique room is already built' };
    }
  }

  // Check biome restrictions
  const biomeCheck = biomeRestrictionCanBuild(roomTypeId, floor.biome, floor);
  if (!biomeCheck.allowed) {
    return { success: false, error: biomeCheck.reason };
  }

  if (!resourceCanAfford(roomDef.cost)) {
    return { success: false, error: 'Not enough resources' };
  }

  const paid = await resourcePayCost(roomDef.cost);
  if (!paid) return { success: false, error: 'Not enough resources' };

  const placed = await roomPlacementPlace(
    roomTypeId,
    roomDef.shapeId,
    x,
    y,
    roomPlacementRotation(),
  );
  if (!placed) return { success: false, error: 'Failed to place room' };

  return { success: true };
}

// --- Room placement on floor ---

export function roomPlacementPlaceOnFloor(
  floor: Floor,
  room: PlacedRoom,
  shape: RoomShapeContent,
): Floor | undefined {
  const validation = roomPlacementValidate(
    shape,
    room.anchorX,
    room.anchorY,
    floor.grid,
  );
  if (!validation.valid) return undefined;

  const tiles = roomShapeGetAbsoluteTiles(shape, room.anchorX, room.anchorY);
  const newGrid = floor.grid.map((row) => row.map((tile) => ({ ...tile })));

  for (const t of tiles) {
    newGrid[t.y][t.x] = {
      occupied: true,
      occupiedBy: 'room',
      roomId: room.id,
      hallwayId: undefined,
      connectionType: undefined,
    };
  }

  return {
    ...floor,
    grid: newGrid,
    rooms: [...floor.rooms, room],
  };
}

export function roomPlacementRemoveFromFloor(
  floor: Floor,
  roomId: PlacedRoomId,
  shape: RoomShapeContent,
): Floor | undefined {
  const room = floor.rooms.find((r) => r.id === roomId);
  if (!room) return undefined;

  const tiles = roomShapeGetAbsoluteTiles(shape, room.anchorX, room.anchorY);
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
          roomId: undefined,
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

export async function roomPlacementPlace(
  roomTypeId: RoomId,
  shapeId: RoomShapeId,
  anchorX: number,
  anchorY: number,
  rotation: Rotation = 0,
): Promise<PlacedRoom | undefined> {
  const baseShape = roomShapeGet(shapeId);
  if (!baseShape) return undefined;

  const shape = roomShapeGetRotated(baseShape, rotation);

  const state = gamestate();
  const floorIndex = state.world.currentFloorIndex;
  const floor = state.world.floors[floorIndex];
  if (!floor) return undefined;

  const room: PlacedRoom = {
    id: rngUuid<PlacedRoomId>(),
    roomTypeId,
    shapeId,
    anchorX,
    anchorY,
    rotation: rotation || undefined,
  };

  const updatedFloor = roomPlacementPlaceOnFloor(floor, room, shape);
  if (!updatedFloor) return undefined;

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
export function roomPlacementIsRemovable(roomTypeId: RoomId): boolean {
  const roomDef = contentGetEntry<RoomContent>(roomTypeId);
  if (!roomDef) return true;
  return roomDef.removable;
}

export async function roomPlacementRemove(
  roomId: PlacedRoomId,
): Promise<boolean> {
  const state = gamestate();
  const floorIndex = state.world.currentFloorIndex;
  const floor = state.world.floors[floorIndex];
  if (!floor) return false;

  const room = floor.rooms.find((r) => r.id === roomId);
  if (!room) return false;

  if (!roomPlacementIsRemovable(room.roomTypeId)) return false;

  const baseShape = roomShapeGet(room.shapeId);
  if (!baseShape) return false;

  const shape = roomShapeGetRotated(baseShape, room.rotation ?? 0);

  const updatedFloor = roomPlacementRemoveFromFloor(floor, roomId, shape);
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
