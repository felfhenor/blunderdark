import { computed } from '@angular/core';
import { areRoomsAdjacent } from '@helpers/adjacency';
import { getEntriesByType, getEntry } from '@helpers/content';
import { canAfford, payCost } from '@helpers/resources';
import { placeRoomOnFloor } from '@helpers/room-placement';
import { findRoomIdByRole } from '@helpers/room-roles';
import { rngUuid } from '@helpers/rng';
import { getAbsoluteTiles } from '@helpers/room-shapes';
import {
  applyUpgrade,
  getAppliedUpgradeEffects,
  getUpgradePaths,
} from '@helpers/room-upgrades';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type {
  Floor,
  IsContentItem,
  PlacedRoom,
  RoomDefinition,
  RoomShape,
  RoomUpgradePath,
} from '@interfaces';
import { GRID_SIZE } from '@interfaces/grid';

/**
 * Find the placed Altar Room across all floors.
 */
export function findAltarRoom(
  floors: Floor[],
): { floor: Floor; room: PlacedRoom } | undefined {
  const altarId = findRoomIdByRole('altar');
  if (!altarId) return undefined;

  for (const floor of floors) {
    const room = floor.rooms.find(
      (r) => r.roomTypeId === altarId,
    );
    if (room) return { floor, room };
  }
  return undefined;
}

/**
 * Reactive signal: whether the Altar Room is placed.
 */
export const hasAltarRoom = computed<boolean>(() => {
  return findAltarRoom(gamestate().world.floors) !== undefined;
});

/**
 * Auto-place all rooms with autoPlace: true on a floor during world generation.
 * Places each room at the center of the grid.
 */
export function autoPlaceRooms(floor: Floor): Floor {
  const roomDefs = getEntriesByType<RoomDefinition & IsContentItem>('room');
  const autoPlaceRooms = roomDefs.filter((r) => r.autoPlace);

  let currentFloor = floor;

  for (const roomDef of autoPlaceRooms) {
    const shape = getEntry<RoomShape & IsContentItem>(roomDef.shapeId);
    if (!shape) continue;

    const anchorX = Math.floor((GRID_SIZE - shape.width) / 2);
    const anchorY = Math.floor((GRID_SIZE - shape.height) / 2);

    const placedRoom: PlacedRoom = {
      id: rngUuid(),
      roomTypeId: roomDef.id,
      shapeId: roomDef.shapeId,
      anchorX,
      anchorY,
    };

    const updated = placeRoomOnFloor(currentFloor, placedRoom, shape);
    if (updated) {
      currentFloor = updated;
    }
  }

  return currentFloor;
}

/**
 * Get the Altar Room's current level (1 = base, 2 = Empowered, 3 = Ascendant).
 * Uses upgradeLevel field from upgrade path definitions.
 */
export function getAltarLevel(floors: Floor[]): number {
  const altar = findAltarRoom(floors);
  if (!altar) return 0;

  if (!altar.room.appliedUpgradePathId) return 1;

  const altarId = findRoomIdByRole('altar');
  if (!altarId) return 1;

  const paths = getUpgradePaths(altarId);
  const appliedPath = paths.find((p) => p.id === altar.room.appliedUpgradePathId);
  if (appliedPath?.upgradeLevel) return appliedPath.upgradeLevel;

  // Fallback: use index position
  const appliedIndex = paths.findIndex((p) => p.id === altar.room.appliedUpgradePathId);
  return appliedIndex >= 0 ? appliedIndex + 2 : 1;
}

/**
 * Reactive signal for the Altar's current level.
 */
export const altarLevel = computed<number>(() => {
  return getAltarLevel(gamestate().world.floors);
});

/**
 * Get the next available upgrade for the Altar Room.
 * Returns undefined if fully upgraded or no Altar exists.
 */
export function getNextAltarUpgrade(floors: Floor[]): RoomUpgradePath | undefined {
  const altar = findAltarRoom(floors);
  if (!altar) return undefined;

  const altarId = findRoomIdByRole('altar');
  if (!altarId) return undefined;

  const currentLevel = getAltarLevel(floors);
  const paths = getUpgradePaths(altarId);

  const nextLevel = currentLevel + 1;
  // Find the path matching the next upgrade level
  const nextPath = paths.find((p) => p.upgradeLevel === nextLevel);
  if (nextPath) return nextPath;

  // Fallback: use index-based progression
  if (currentLevel === 1 && paths.length >= 1) return paths[0];
  if (currentLevel === 2 && paths.length >= 2) return paths[1];

  return undefined;
}

/**
 * Apply the next upgrade to the Altar Room.
 */
export async function applyAltarUpgrade(
  upgradePathId: string,
): Promise<{ success: boolean; error?: string }> {
  const state = gamestate();
  const altar = findAltarRoom(state.world.floors);
  if (!altar) return { success: false, error: 'No Altar found' };

  const altarId = findRoomIdByRole('altar');
  if (!altarId) return { success: false, error: 'No Altar type found' };

  const paths = getUpgradePaths(altarId);
  const path = paths.find((p) => p.id === upgradePathId);
  if (!path) return { success: false, error: 'Invalid upgrade path' };

  // Validate level ordering
  const currentLevel = getAltarLevel(state.world.floors);
  const targetLevel = path.upgradeLevel ?? (paths.indexOf(path) + 2);
  if (targetLevel !== currentLevel + 1) {
    return { success: false, error: `Altar must be Level ${targetLevel - 1} to apply this upgrade` };
  }

  if (!canAfford(path.cost)) {
    return { success: false, error: 'Not enough resources' };
  }

  const paid = await payCost(path.cost);
  if (!paid) return { success: false, error: 'Not enough resources' };

  await updateGamestate((s) => {
    const newFloors = s.world.floors.map((floor) => ({
      ...floor,
      rooms: floor.rooms.map((room) =>
        room.id === altar.room.id ? applyUpgrade(room, upgradePathId) : room,
      ),
    }));
    return {
      ...s,
      world: { ...s.world, floors: newFloors },
    };
  });

  return { success: true };
}

/**
 * Get the fear reduction aura value for the Altar Room.
 * Returns the base fearReductionAura, increased by upgrade effects.
 */
export function getAltarFearReductionAura(floors: Floor[]): number {
  const altar = findAltarRoom(floors);
  if (!altar) return 0;

  const roomDef = getEntry<RoomDefinition & IsContentItem>(altar.room.roomTypeId);
  if (!roomDef) return 0;

  // Check if upgrade overrides the fear reduction aura
  const effects = getAppliedUpgradeEffects(altar.room);
  for (const effect of effects) {
    if (effect.type === 'fearReductionAura') {
      return effect.value;
    }
  }

  return roomDef.fearReductionAura;
}

/**
 * Check if a room is adjacent to the Altar Room on the same floor.
 */
export function isAdjacentToAltar(
  floor: Floor,
  room: PlacedRoom,
): boolean {
  const altarId = findRoomIdByRole('altar');
  if (!altarId) return false;

  const altarPlaced = floor.rooms.find(
    (r) => r.roomTypeId === altarId,
  );
  if (!altarPlaced) return false;

  const roomShape = getEntry<RoomShape & IsContentItem>(room.shapeId);
  const altarShape = getEntry<RoomShape & IsContentItem>(altarPlaced.shapeId);
  if (!roomShape || !altarShape) return false;

  const roomTiles = getAbsoluteTiles(roomShape, room.anchorX, room.anchorY);
  const altarTiles = getAbsoluteTiles(altarShape, altarPlaced.anchorX, altarPlaced.anchorY);

  return areRoomsAdjacent(roomTiles, altarTiles);
}

/**
 * Reactive computed signal for the Altar Room's fear reduction aura value.
 */
export const altarFearReductionAura = computed<number>(() => {
  return getAltarFearReductionAura(gamestate().world.floors);
});

/**
 * Calculate the effective fear level for a room, accounting for the Altar's fear reduction aura.
 * Returns the room's base fear level minus the Altar's aura if adjacent, clamped to 0.
 * For rooms with 'variable' fear level, returns the original value unchanged.
 */
export function getEffectiveFearLevel(
  floor: Floor,
  room: PlacedRoom,
  baseFearLevel: number | 'variable',
): number | 'variable' {
  if (baseFearLevel === 'variable') return 'variable';

  const aura = getAltarFearReductionAura([floor]);
  if (aura <= 0) return baseFearLevel;

  if (!isAdjacentToAltar(floor, room)) return baseFearLevel;

  return Math.max(0, baseFearLevel - aura);
}

/**
 * Reactive signal: whether recruitment is available (requires Altar at Level 1+).
 * The Altar's presence enables basic recruitment; upgrades may expand it later.
 */
export const canRecruit = computed<boolean>(() => {
  return findAltarRoom(gamestate().world.floors) !== undefined;
});
