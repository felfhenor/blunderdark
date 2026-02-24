import { computed } from '@angular/core';
import { altarRoomFind } from '@helpers/altar-room';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type { Floor, PlacedRoomId } from '@interfaces';

/**
 * BFS on a single floor from one or more seed room IDs.
 * Traverses same-floor connections (rooms + hallways as intermediate nodes).
 */
function bfsOnFloor(floor: Floor, seeds: PlacedRoomId[]): Set<PlacedRoomId> {
  const connected = new Set<PlacedRoomId>();

  const adjacency = new Map<string, string[]>();
  for (const conn of floor.connections) {
    const aId = conn.roomAId as string;
    const bId = conn.roomBId as string;

    if (!adjacency.has(aId)) adjacency.set(aId, []);
    if (!adjacency.has(bId)) adjacency.set(bId, []);
    adjacency.get(aId)!.push(bId);
    adjacency.get(bId)!.push(aId);
  }

  const visited = new Set<string>();
  const queue: string[] = [];

  for (const seed of seeds) {
    if (!visited.has(seed)) {
      visited.add(seed);
      queue.push(seed);
      connected.add(seed);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjacency.get(current) ?? [];

    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      queue.push(neighbor);
      connected.add(neighbor as PlacedRoomId);
    }
  }

  return connected;
}

/**
 * Compute connected room IDs for all floors at once, propagating connectivity
 * through vertical transport links (stairs, elevators, portals).
 *
 * Algorithm:
 * 1. BFS on the Altar's floor from the Altar room
 * 2. Find connected transport rooms → propagate to other floors as seeds
 * 3. BFS on those floors from the transport seed rooms
 * 4. Repeat until no new floors are discovered
 */
function connectivityComputeGlobal(
  floors: Floor[],
  altar: { room: { id: PlacedRoomId }; floor: Floor },
): Map<string, Set<PlacedRoomId>> {
  const result = new Map<string, Set<PlacedRoomId>>();
  const seedSets = new Map<string, Set<PlacedRoomId>>();

  seedSets.set(altar.floor.id, new Set([altar.room.id]));
  result.set(altar.floor.id, bfsOnFloor(altar.floor, [altar.room.id]));

  const propagatedRooms = new Set<PlacedRoomId>();
  const floorQueue: Floor[] = [altar.floor];

  while (floorQueue.length > 0) {
    const currentFloor = floorQueue.shift()!;
    const connected = result.get(currentFloor.id)!;

    for (const room of currentFloor.rooms) {
      if (!room.transportGroupId || !connected.has(room.id)) continue;
      if (propagatedRooms.has(room.id)) continue;
      propagatedRooms.add(room.id);

      for (const otherFloor of floors) {
        if (otherFloor.id === currentFloor.id) continue;

        let hasNewSeeds = false;
        let otherSeeds = seedSets.get(otherFloor.id);
        if (!otherSeeds) {
          otherSeeds = new Set();
          seedSets.set(otherFloor.id, otherSeeds);
        }

        for (const otherRoom of otherFloor.rooms) {
          if (otherRoom.transportGroupId === room.transportGroupId) {
            if (!otherSeeds.has(otherRoom.id)) {
              otherSeeds.add(otherRoom.id);
              hasNewSeeds = true;
            }
          }
        }

        if (hasNewSeeds) {
          result.set(otherFloor.id, bfsOnFloor(otherFloor, [...otherSeeds]));
          floorQueue.push(otherFloor);
        }
      }
    }
  }

  return result;
}

/**
 * Compute the set of room IDs reachable from the Altar Room via connections
 * and vertical transport links.
 * BFS traversal through the connection graph, treating hallways as intermediate nodes.
 * The Altar Room is always in the connected set (root node).
 * On non-Altar floors, transport rooms connected to the Altar network serve as seeds.
 */
export function connectivityGetConnectedRoomIds(
  floor: Floor,
  floors: Floor[],
): Set<PlacedRoomId> {
  const altar = altarRoomFind(floors);
  if (!altar) return new Set<PlacedRoomId>();

  const globalConnected = connectivityComputeGlobal(floors, altar);
  return globalConnected.get(floor.id) ?? new Set<PlacedRoomId>();
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
export const connectivityConnectedRoomIds = computed<Set<PlacedRoomId>>(() => {
  const state = gamestate();
  const floors = state.world.floors;
  const currentFloor = floors[state.world.currentFloorIndex];
  if (!currentFloor) return new Set<PlacedRoomId>();

  return connectivityGetConnectedRoomIds(currentFloor, floors);
});

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
