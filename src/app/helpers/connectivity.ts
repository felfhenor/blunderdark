import { computed } from '@angular/core';
import { altarRoomFind } from '@helpers/altar-room';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type {
  Floor,
  PlacedRoomId,
} from '@interfaces';

/**
 * Compute the set of room IDs reachable from the Altar Room via connections.
 * BFS traversal through the connection graph, treating hallways as intermediate nodes.
 * The Altar Room is always in the connected set (root node).
 * Rooms on floors without an Altar are all considered disconnected.
 */
export function connectivityGetConnectedRoomIds(
  floor: Floor,
  floors: Floor[],
): Set<PlacedRoomId> {
  const connected = new Set<PlacedRoomId>();

  const altar = altarRoomFind(floors);
  if (!altar || altar.floor.id !== floor.id) return connected;

  const altarRoomId = altar.room.id;
  connected.add(altarRoomId);

  // Build adjacency list from connections (rooms + hallways are all nodes)
  const adjacency = new Map<string, string[]>();
  for (const conn of floor.connections) {
    const aId = conn.roomAId as string;
    const bId = conn.roomBId as string;

    if (!adjacency.has(aId)) adjacency.set(aId, []);
    if (!adjacency.has(bId)) adjacency.set(bId, []);
    adjacency.get(aId)!.push(bId);
    adjacency.get(bId)!.push(aId);
  }

  // BFS from altar
  const visited = new Set<string>();
  const queue: string[] = [altarRoomId];
  visited.add(altarRoomId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjacency.get(current) ?? [];

    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      queue.push(neighbor);
      // Add to connected set (could be room or hallway ID, both are fine)
      connected.add(neighbor as PlacedRoomId);
    }
  }

  return connected;
}

/**
 * Get disconnected room IDs for a floor (rooms not reachable from Altar).
 * Returns only actual room IDs, not hallway IDs.
 */
export function connectivityGetDisconnectedRoomIds(
  floor: Floor,
  floors: Floor[],
): Set<PlacedRoomId> {
  const connected = connectivityGetConnectedRoomIds(floor, floors);
  const disconnected = new Set<PlacedRoomId>();

  for (const room of floor.rooms) {
    if (!connected.has(room.id)) {
      disconnected.add(room.id);
    }
  }

  return disconnected;
}

/**
 * Reactive signal: set of disconnected room IDs on the current floor.
 * Recomputes when floors, rooms, connections, or hallways change.
 */
export const connectivityDisconnectedRoomIds = computed<Set<PlacedRoomId>>(
  () => {
    const state = gamestate();
    const floors = state.world.floors;
    const currentFloor = floors[state.world.currentFloorIndex];
    if (!currentFloor) return new Set<PlacedRoomId>();

    return connectivityGetDisconnectedRoomIds(currentFloor, floors);
  },
);

/**
 * Reactive signal: set of connected room IDs on the current floor.
 */
export const connectivityConnectedRoomIds = computed<Set<PlacedRoomId>>(
  () => {
    const state = gamestate();
    const floors = state.world.floors;
    const currentFloor = floors[state.world.currentFloorIndex];
    if (!currentFloor) return new Set<PlacedRoomId>();

    return connectivityGetConnectedRoomIds(currentFloor, floors);
  },
);

/**
 * Check if a specific room is connected to the Altar on its floor.
 */
export function connectivityIsRoomConnected(
  roomId: PlacedRoomId,
  floor: Floor,
  floors: Floor[],
): boolean {
  const connected = connectivityGetConnectedRoomIds(floor, floors);
  return connected.has(roomId);
}

/**
 * Reactive signal: count of disconnected rooms on the current floor.
 */
export const connectivityDisconnectedCount = computed<number>(() => {
  return connectivityDisconnectedRoomIds().size;
});

/**
 * Auto-unassign inhabitants from newly disconnected rooms.
 * Compares current connectivity against assigned inhabitants and
 * clears assignedRoomId for any inhabitant in a disconnected room.
 */
export async function connectivityUnassignDisconnectedInhabitants(
  floor: Floor,
  floors: Floor[],
): Promise<void> {
  const disconnected = connectivityGetDisconnectedRoomIds(floor, floors);
  if (disconnected.size === 0) return;

  const state = gamestate();
  const hasAffected = state.world.inhabitants.some(
    (i) => i.assignedRoomId !== undefined && disconnected.has(i.assignedRoomId),
  );
  if (!hasAffected) return;

  await updateGamestate((s) => ({
    ...s,
    world: {
      ...s.world,
      inhabitants: s.world.inhabitants.map((i) =>
        i.assignedRoomId !== undefined && disconnected.has(i.assignedRoomId)
          ? { ...i, assignedRoomId: undefined, travelTicksRemaining: undefined }
          : i,
      ),
    },
  }));
}
