import { floorAll } from '@helpers/floor';
import { roomRoleFindById } from '@helpers/room-roles';
import type { Floor, PlacedRoom } from '@interfaces';

/**
 * Find a room by its role across all floors.
 * Returns the room and its containing floor, or undefined if not found.
 */
export function findRoomByRole(role: string): { room: PlacedRoom; floor: Floor } | undefined {
  const roleId = roomRoleFindById(role);
  if (!roleId) return undefined;

  for (const floor of floorAll()) {
    const room = floor.rooms.find((r) => r.roomTypeId === roleId);
    if (room) return { room, floor };
  }
  return undefined;
}
