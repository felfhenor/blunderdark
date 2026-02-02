import { getEntriesByType, getEntry } from '@helpers/content';
import type { IsContentItem, RoomShape } from '@interfaces';

export function allRoomShapes(): (RoomShape & IsContentItem)[] {
  return getEntriesByType<RoomShape & IsContentItem>('roomshape');
}

export function getRoomShape(
  idOrName: string,
): (RoomShape & IsContentItem) | undefined {
  return getEntry<RoomShape & IsContentItem>(idOrName);
}
