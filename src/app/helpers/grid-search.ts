import { computed, signal } from '@angular/core';
import type { FloorId, PlacedRoomId } from '@interfaces';
import { floorAll, roomAll } from '@helpers/floor';
import { roomGetDisplayName } from '@helpers/room-upgrades';

export const gridSearchQuery = signal('');

export const gridSearchHasQuery = computed(
  () => gridSearchQuery().trim().length > 0,
);

export const gridSearchMatchingRoomIds = computed<Set<PlacedRoomId>>(() => {
  const query = gridSearchQuery().trim().toLowerCase();
  if (!query) return new Set<PlacedRoomId>();

  const matching = new Set<PlacedRoomId>();
  for (const room of roomAll()) {
    const name = roomGetDisplayName(room).toLowerCase();
    if (name.includes(query)) {
      matching.add(room.id);
    }
  }
  return matching;
});

export const gridSearchFloorMatchCounts = computed<Map<FloorId, number>>(() => {
  const matching = gridSearchMatchingRoomIds();
  const counts = new Map<FloorId, number>();
  if (matching.size === 0) return counts;

  for (const floor of floorAll()) {
    let count = 0;
    for (const room of floor.rooms) {
      if (matching.has(room.id)) count++;
    }
    if (count > 0) {
      counts.set(floor.id, count);
    }
  }
  return counts;
});

export function gridSearchClear(): void {
  gridSearchQuery.set('');
}
