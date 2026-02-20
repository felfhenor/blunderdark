import type { Floor } from '@interfaces/floor';
import type { RoomId } from '@interfaces/content-room';

/**
 * Convert a zero-based index to a letter suffix: 0→A, 1→B, ..., 25→Z, 26→AA, 27→AB, ...
 */
function indexToSuffix(index: number): string {
  let result = '';
  let n = index;
  do {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return result;
}

/**
 * Find the first unused letter suffix given a set of already-taken suffixes.
 */
function nextUnusedSuffix(taken: Set<string>): string {
  for (let i = 0; ; i++) {
    const candidate = indexToSuffix(i);
    if (!taken.has(candidate)) return candidate;
  }
}

/**
 * Generate the next available suffix for a room of the given type on a floor.
 */
export function generateRoomSuffix(floor: Floor, roomTypeId: RoomId): string {
  const taken = new Set<string>();
  for (const room of floor.rooms) {
    if (room.roomTypeId === roomTypeId && room.suffix) {
      taken.add(room.suffix);
    }
  }
  return nextUnusedSuffix(taken);
}

/**
 * Generate the next available suffix for a hallway on a floor.
 */
export function generateHallwaySuffix(floor: Floor): string {
  const taken = new Set<string>();
  for (const hallway of floor.hallways) {
    if (hallway.suffix) {
      taken.add(hallway.suffix);
    }
  }
  return nextUnusedSuffix(taken);
}

/**
 * Ensure all rooms and hallways on a floor have suffixes assigned.
 * Used for backward compatibility with saves that predate the suffix feature.
 */
export function ensureFloorSuffixes(floor: Floor): Floor {
  let changed = false;

  // Track taken suffixes per room type as we assign them
  const roomSuffixesByType = new Map<RoomId, Set<string>>();
  for (const room of floor.rooms) {
    if (!room.suffix) continue;
    let set = roomSuffixesByType.get(room.roomTypeId);
    if (!set) {
      set = new Set<string>();
      roomSuffixesByType.set(room.roomTypeId, set);
    }
    set.add(room.suffix);
  }

  const rooms = floor.rooms.map((room) => {
    if (room.suffix) return room;
    changed = true;
    let taken = roomSuffixesByType.get(room.roomTypeId);
    if (!taken) {
      taken = new Set<string>();
      roomSuffixesByType.set(room.roomTypeId, taken);
    }
    const suffix = nextUnusedSuffix(taken);
    taken.add(suffix);
    return { ...room, suffix };
  });

  // Track taken hallway suffixes as we assign them
  const hallwayTaken = new Set<string>();
  for (const hallway of floor.hallways) {
    if (hallway.suffix) hallwayTaken.add(hallway.suffix);
  }

  const hallways = floor.hallways.map((hallway) => {
    if (hallway.suffix) return hallway;
    changed = true;
    const suffix = nextUnusedSuffix(hallwayTaken);
    hallwayTaken.add(suffix);
    return { ...hallway, suffix };
  });

  if (!changed) return floor;

  return { ...floor, rooms, hallways };
}
