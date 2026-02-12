import { getEntry } from '@helpers/content';
import { getEffectiveMaxInhabitants } from '@helpers/room-upgrades';
import { gamestate } from '@helpers/state-game';
import type {
  InhabitantDefinition,
  InhabitantInstance,
  IsContentItem,
  PlacedRoom,
  RoomDefinition,
} from '@interfaces';

export type AssignmentValidation = {
  allowed: boolean;
  reason?: string;
  currentCount: number;
  maxCapacity: number;
};

/**
 * Check whether a given room (by roomId) can accept another inhabitant.
 * Returns capacity info plus allowed/reason for UI feedback.
 */
export function canAssignToRoom(roomId: string): AssignmentValidation {
  const state = gamestate();

  let placedRoom: PlacedRoom | undefined;
  for (const floor of state.world.floors) {
    placedRoom = floor.rooms.find((r) => r.id === roomId);
    if (placedRoom) break;
  }

  if (!placedRoom) {
    return { allowed: false, reason: 'Room not found', currentCount: 0, maxCapacity: 0 };
  }

  const roomDef = getEntry<RoomDefinition & IsContentItem>(placedRoom.roomTypeId);
  if (!roomDef) {
    return { allowed: false, reason: 'Unknown room type', currentCount: 0, maxCapacity: 0 };
  }

  const maxCapacity = getEffectiveMaxInhabitants(placedRoom, roomDef);

  if (maxCapacity === 0) {
    return { allowed: false, reason: 'Room does not accept inhabitants', currentCount: 0, maxCapacity: 0 };
  }

  const currentCount = state.world.inhabitants.filter(
    (i) => i.assignedRoomId === roomId,
  ).length;

  if (maxCapacity >= 0 && currentCount >= maxCapacity) {
    return { allowed: false, reason: 'Room is at maximum capacity', currentCount, maxCapacity };
  }

  return { allowed: true, currentCount, maxCapacity };
}

/**
 * Get the current assignment count for a room.
 */
export function getAssignmentCount(roomId: string): number {
  return gamestate().world.inhabitants.filter(
    (i) => i.assignedRoomId === roomId,
  ).length;
}

/**
 * Check if an inhabitant instance is already assigned to any room.
 */
export function isInhabitantAssigned(instanceId: string): boolean {
  const instance = gamestate().world.inhabitants.find(
    (i) => i.instanceId === instanceId,
  );
  return instance?.assignedRoomId !== null && instance?.assignedRoomId !== undefined;
}

/**
 * Get assignment info for a specific room: current count and max capacity.
 * Returns null if room is not found or does not accept inhabitants.
 */
export function getRoomAssignmentInfo(
  roomId: string,
): { currentCount: number; maxCapacity: number } | null {
  const state = gamestate();

  let placedRoom: PlacedRoom | undefined;
  for (const floor of state.world.floors) {
    placedRoom = floor.rooms.find((r) => r.id === roomId);
    if (placedRoom) break;
  }

  if (!placedRoom) return null;

  const roomDef = getEntry<RoomDefinition & IsContentItem>(placedRoom.roomTypeId);
  if (!roomDef) return null;

  const maxCapacity = getEffectiveMaxInhabitants(placedRoom, roomDef);
  if (maxCapacity === 0) return null;

  const currentCount = state.world.inhabitants.filter(
    (i) => i.assignedRoomId === roomId,
  ).length;

  return { currentCount, maxCapacity };
}
