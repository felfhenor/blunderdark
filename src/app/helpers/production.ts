import { getEntry } from '@helpers/content';
import type { IsContentItem, RoomDefinition, RoomProduction } from '@interfaces';

export function getBaseProduction(roomTypeId: string): RoomProduction {
  const room = getEntry<RoomDefinition & IsContentItem>(roomTypeId);
  if (!room) return {};
  return room.production ?? {};
}

export function getRoomDefinition(
  roomTypeId: string,
): (RoomDefinition & IsContentItem) | undefined {
  return getEntry<RoomDefinition & IsContentItem>(roomTypeId);
}
