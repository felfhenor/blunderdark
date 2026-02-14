import { contentGetEntry } from '@helpers/content';
import { roomUpgradeGetEffectiveMaxInhabitants } from '@helpers/room-upgrades';
import { gamestate } from '@helpers/state-game';
import type {
  PlacedRoom,
  PlacedRoomId,
} from '@interfaces';
import type { AssignmentValidation } from '@interfaces/assignment';
import type { RoomContent } from '@interfaces/content-room';

/**
 * Check whether a given room (by roomId) can accept another inhabitant.
 * Returns capacity info plus allowed/reason for UI feedback.
 */
export function assignmentCanAssignToRoom(roomId: PlacedRoomId): AssignmentValidation {
  const state = gamestate();

  let placedRoom: PlacedRoom | undefined;
  for (const floor of state.world.floors) {
    placedRoom = floor.rooms.find((r) => r.id === roomId);
    if (placedRoom) break;
  }

  if (!placedRoom) {
    return { allowed: false, reason: 'Room not found', currentCount: 0, maxCapacity: 0 };
  }

  const roomDef = contentGetEntry<RoomContent>(placedRoom.roomTypeId);
  if (!roomDef) {
    return { allowed: false, reason: 'Unknown room type', currentCount: 0, maxCapacity: 0 };
  }

  const maxCapacity = roomUpgradeGetEffectiveMaxInhabitants(placedRoom, roomDef);

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
export function assignmentGetCount(roomId: PlacedRoomId): number {
  return gamestate().world.inhabitants.filter(
    (i) => i.assignedRoomId === roomId,
  ).length;
}

/**
 * Check if an inhabitant instance is already assigned to any room.
 */
export function assignmentIsInhabitantAssigned(instanceId: string): boolean {
  const instance = gamestate().world.inhabitants.find(
    (i) => i.instanceId === instanceId,
  );
  return instance?.assignedRoomId !== undefined;
}

/**
 * Get assignment info for a specific room: current count and max capacity.
 * Returns undefined if room is not found or does not accept inhabitants.
 */
export function assignmentGetRoomInfo(
  roomId: PlacedRoomId,
): { currentCount: number; maxCapacity: number } | undefined {
  const state = gamestate();

  let placedRoom: PlacedRoom | undefined;
  for (const floor of state.world.floors) {
    placedRoom = floor.rooms.find((r) => r.id === roomId);
    if (placedRoom) break;
  }

  if (!placedRoom) return undefined;

  const roomDef = contentGetEntry<RoomContent>(placedRoom.roomTypeId);
  if (!roomDef) return undefined;

  const maxCapacity = roomUpgradeGetEffectiveMaxInhabitants(placedRoom, roomDef);
  if (maxCapacity === 0) return undefined;

  const currentCount = state.world.inhabitants.filter(
    (i) => i.assignedRoomId === roomId,
  ).length;

  return { currentCount, maxCapacity };
}
