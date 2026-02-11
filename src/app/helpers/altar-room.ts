import { computed } from '@angular/core';
import { getEntriesByType, getEntry } from '@helpers/content';
import { getAbsoluteTiles } from '@helpers/room-shapes';
import { placeRoomOnFloor } from '@helpers/room-placement';
import { rngUuid } from '@helpers/rng';
import { gamestate } from '@helpers/state-game';
import { areRoomsAdjacent } from '@helpers/adjacency';
import type {
  Floor,
  IsContentItem,
  PlacedRoom,
  RoomDefinition,
  RoomShape,
} from '@interfaces';
import { GRID_SIZE } from '@interfaces/grid';

export const ALTAR_ROOM_TYPE_ID = 'aa100001-0001-0001-0001-000000000009';

/**
 * Find the placed Altar Room across all floors.
 */
export function findAltarRoom(
  floors: Floor[],
): { floor: Floor; room: PlacedRoom } | null {
  for (const floor of floors) {
    const room = floor.rooms.find(
      (r) => r.roomTypeId === ALTAR_ROOM_TYPE_ID,
    );
    if (room) return { floor, room };
  }
  return null;
}

/**
 * Reactive signal: whether the Altar Room is placed.
 */
export const hasAltarRoom = computed<boolean>(() => {
  return findAltarRoom(gamestate().world.floors) !== null;
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
 * Get the fear reduction aura value for the Altar Room.
 * Returns the base fearReductionAura from the room definition.
 * Upgrade effects can increase this value.
 */
export function getAltarFearReductionAura(floors: Floor[]): number {
  const altar = findAltarRoom(floors);
  if (!altar) return 0;

  const roomDef = getEntry<RoomDefinition & IsContentItem>(altar.room.roomTypeId);
  if (!roomDef) return 0;

  return roomDef.fearReductionAura;
}

/**
 * Check if a room is adjacent to the Altar Room on the same floor.
 */
export function isAdjacentToAltar(
  floor: Floor,
  room: PlacedRoom,
): boolean {
  const altarPlaced = floor.rooms.find(
    (r) => r.roomTypeId === ALTAR_ROOM_TYPE_ID,
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
 * Reactive signal: whether recruitment is available (requires Altar at Level 1+).
 * The Altar's presence enables basic recruitment; upgrades may expand it later.
 */
export const canRecruit = computed<boolean>(() => {
  return findAltarRoom(gamestate().world.floors) !== null;
});
