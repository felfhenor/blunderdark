import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import type { Floor, PlacedRoom } from '@interfaces';
import type { TransportGroupId, TransportType } from '@interfaces/room-shape';

export const VERTICAL_TRANSPORT_STAIR_TICKS_PER_FLOOR = GAME_TIME_TICKS_PER_MINUTE;
export const VERTICAL_TRANSPORT_ELEVATOR_TICKS_PER_FLOOR = Math.round(GAME_TIME_TICKS_PER_MINUTE * 0.5);
export const VERTICAL_TRANSPORT_PORTAL_TICKS = 0;

type TransportEdge = {
  toDepth: number;
  travelTicks: number;
};

type TransportGroup = {
  type: TransportType;
  groupId: TransportGroupId;
  floors: number[];
};

/**
 * Collect all transport groups from floor rooms.
 */
function collectTransportGroups(floors: Floor[]): TransportGroup[] {
  const groupMap = new Map<string, TransportGroup>();

  for (const floor of floors) {
    for (const room of floor.rooms) {
      if (!room.transportType || !room.transportGroupId) continue;

      const existing = groupMap.get(room.transportGroupId);
      if (existing) {
        if (!existing.floors.includes(floor.depth)) {
          existing.floors.push(floor.depth);
        }
      } else {
        groupMap.set(room.transportGroupId, {
          type: room.transportType,
          groupId: room.transportGroupId,
          floors: [floor.depth],
        });
      }
    }
  }

  return [...groupMap.values()];
}

/**
 * Build a weighted graph of floor connections from all vertical transport types.
 * Returns adjacency list: Map<floorDepth, TransportEdge[]>
 */
export function verticalTransportBuildGraph(
  floors: Floor[],
): Map<number, TransportEdge[]> {
  const graph = new Map<number, TransportEdge[]>();
  const groups = collectTransportGroups(floors);

  function addEdge(from: number, to: number, ticks: number): void {
    if (!graph.has(from)) graph.set(from, []);
    graph.get(from)!.push({ toDepth: to, travelTicks: ticks });
  }

  for (const group of groups) {
    const sortedFloors = [...group.floors].sort((a, b) => a - b);

    switch (group.type) {
      case 'stair':
        // Stairs connect pairs of floors, 1 game-minute per floor
        for (let i = 0; i < sortedFloors.length; i++) {
          for (let j = i + 1; j < sortedFloors.length; j++) {
            const floorsTraversed = sortedFloors[j] - sortedFloors[i];
            const ticks = floorsTraversed * VERTICAL_TRANSPORT_STAIR_TICKS_PER_FLOOR;
            addEdge(sortedFloors[i], sortedFloors[j], ticks);
            addEdge(sortedFloors[j], sortedFloors[i], ticks);
          }
        }
        break;

      case 'elevator':
        // Elevators: 0.5 game-minutes per floor, connects all pairs
        for (let i = 0; i < sortedFloors.length; i++) {
          for (let j = i + 1; j < sortedFloors.length; j++) {
            const floorsTraversed = sortedFloors[j] - sortedFloors[i];
            const ticks = floorsTraversed * VERTICAL_TRANSPORT_ELEVATOR_TICKS_PER_FLOOR;
            addEdge(sortedFloors[i], sortedFloors[j], ticks);
            addEdge(sortedFloors[j], sortedFloors[i], ticks);
          }
        }
        break;

      case 'portal':
        // Portals: instant (0 ticks)
        for (let i = 0; i < sortedFloors.length; i++) {
          for (let j = i + 1; j < sortedFloors.length; j++) {
            addEdge(sortedFloors[i], sortedFloors[j], VERTICAL_TRANSPORT_PORTAL_TICKS);
            addEdge(sortedFloors[j], sortedFloors[i], VERTICAL_TRANSPORT_PORTAL_TICKS);
          }
        }
        break;
    }
  }

  return graph;
}

/**
 * Check if two floors are connected via any vertical transport.
 * Uses BFS on the combined graph.
 */
export function verticalTransportFloorsAreConnected(
  floors: Floor[],
  fromDepth: number,
  toDepth: number,
): boolean {
  if (fromDepth === toDepth) return true;

  const graph = verticalTransportBuildGraph(floors);
  const visited = new Set<number>();
  const queue = [fromDepth];
  visited.add(fromDepth);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const edges = graph.get(current) ?? [];

    for (const edge of edges) {
      if (!visited.has(edge.toDepth)) {
        if (edge.toDepth === toDepth) return true;
        visited.add(edge.toDepth);
        queue.push(edge.toDepth);
      }
    }
  }

  return false;
}

function findClosestUnvisited(
  dist: Map<number, number>,
  visited: Set<number>,
): number | undefined {
  let closest: number | undefined;
  let closestDist = Infinity;
  for (const [node, d] of dist) {
    if (!visited.has(node) && d < closestDist) {
      closest = node;
      closestDist = d;
    }
  }
  return closest;
}

/**
 * Calculate the minimum travel ticks between two floors using Dijkstra's algorithm.
 * Returns undefined if no path exists. Returns 0 for same floor.
 */
export function verticalTransportCalculateTravelTicks(
  floors: Floor[],
  fromDepth: number,
  toDepth: number,
): number | undefined {
  if (fromDepth === toDepth) return 0;

  const graph = verticalTransportBuildGraph(floors);

  // Dijkstra's algorithm
  const dist = new Map<number, number>();
  const visited = new Set<number>();

  dist.set(fromDepth, 0);

  let current = findClosestUnvisited(dist, visited);
  while (current !== undefined) {
    const currentDist = dist.get(current)!;
    if (current === toDepth) return currentDist;

    visited.add(current);

    const edges = graph.get(current) ?? [];
    for (const edge of edges) {
      if (visited.has(edge.toDepth)) continue;
      const newDist = currentDist + edge.travelTicks;
      const existingDist = dist.get(edge.toDepth) ?? Infinity;
      if (newDist < existingDist) {
        dist.set(edge.toDepth, newDist);
      }
    }

    current = findClosestUnvisited(dist, visited);
  }

  return undefined;
}

/**
 * Get all transport groups visible on a floor (for display purposes).
 */
export function verticalTransportGetGroupsOnFloor(
  floors: Floor[],
  floorDepth: number,
): { room: PlacedRoom; groupFloors: number[] }[] {
  const groups = collectTransportGroups(floors);
  const floor = floors.find((f) => f.depth === floorDepth);
  if (!floor) return [];

  const result: { room: PlacedRoom; groupFloors: number[] }[] = [];
  for (const room of floor.rooms) {
    if (!room.transportType || !room.transportGroupId) continue;
    const group = groups.find((g) => g.groupId === room.transportGroupId);
    if (group) {
      result.push({ room, groupFloors: group.floors.sort((a, b) => a - b) });
    }
  }

  return result;
}

/**
 * Process travel ticks for all traveling inhabitants.
 * Called each game tick.
 */
export function verticalTransportTravelProcess(state: {
  world: { inhabitants: { travelTicksRemaining?: number }[] };
}): void {
  for (const inhabitant of state.world.inhabitants) {
    if (
      inhabitant.travelTicksRemaining !== undefined &&
      inhabitant.travelTicksRemaining > 0
    ) {
      inhabitant.travelTicksRemaining -= 1;
    }
  }
}
