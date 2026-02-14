import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import type { ElevatorInstance, PortalInstance, StairInstance } from '@interfaces';

export const VERTICAL_TRANSPORT_STAIR_TICKS_PER_FLOOR = GAME_TIME_TICKS_PER_MINUTE;
export const VERTICAL_TRANSPORT_ELEVATOR_TICKS_PER_FLOOR = Math.round(GAME_TIME_TICKS_PER_MINUTE * 0.5);
export const VERTICAL_TRANSPORT_PORTAL_TICKS = 0;

type TransportEdge = {
  toDepth: number;
  travelTicks: number;
};

/**
 * Build a weighted graph of floor connections from all vertical transport types.
 * Returns adjacency list: Map<floorDepth, TransportEdge[]>
 */
export function verticalTransportBuildGraph(
  stairs: StairInstance[],
  elevators: ElevatorInstance[],
  portals: PortalInstance[],
): Map<number, TransportEdge[]> {
  const graph = new Map<number, TransportEdge[]>();

  function addEdge(from: number, to: number, ticks: number): void {
    if (!graph.has(from)) graph.set(from, []);
    graph.get(from)!.push({ toDepth: to, travelTicks: ticks });
  }

  // Stairs: 1 game-minute per floor traversed
  for (const stair of stairs) {
    addEdge(stair.floorDepthA, stair.floorDepthB, VERTICAL_TRANSPORT_STAIR_TICKS_PER_FLOOR);
    addEdge(stair.floorDepthB, stair.floorDepthA, VERTICAL_TRANSPORT_STAIR_TICKS_PER_FLOOR);
  }

  // Elevators: 0.5 game-minutes per floor traversed, connects all pairs within range
  for (const elevator of elevators) {
    const floors = elevator.connectedFloors;
    for (let i = 0; i < floors.length; i++) {
      for (let j = i + 1; j < floors.length; j++) {
        const floorsTraversed = floors[j] - floors[i];
        const ticks = floorsTraversed * VERTICAL_TRANSPORT_ELEVATOR_TICKS_PER_FLOOR;
        addEdge(floors[i], floors[j], ticks);
        addEdge(floors[j], floors[i], ticks);
      }
    }
  }

  // Portals: instant (0 ticks)
  for (const portal of portals) {
    addEdge(portal.floorDepthA, portal.floorDepthB, VERTICAL_TRANSPORT_PORTAL_TICKS);
    addEdge(portal.floorDepthB, portal.floorDepthA, VERTICAL_TRANSPORT_PORTAL_TICKS);
  }

  return graph;
}

/**
 * Check if two floors are connected via any vertical transport.
 * Uses BFS on the combined graph.
 */
export function verticalTransportFloorsAreConnected(
  stairs: StairInstance[],
  elevators: ElevatorInstance[],
  portals: PortalInstance[],
  fromDepth: number,
  toDepth: number,
): boolean {
  if (fromDepth === toDepth) return true;

  const graph = verticalTransportBuildGraph(stairs, elevators, portals);
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
 * Uses weighted edges: stairs = 5 ticks/floor, elevators = 3 ticks/floor, portals = 0.
 */
export function verticalTransportCalculateTravelTicks(
  stairs: StairInstance[],
  elevators: ElevatorInstance[],
  portals: PortalInstance[],
  fromDepth: number,
  toDepth: number,
): number | undefined {
  if (fromDepth === toDepth) return 0;

  const graph = verticalTransportBuildGraph(stairs, elevators, portals);

  // Dijkstra's algorithm
  const dist = new Map<number, number>();
  const visited = new Set<number>();

  dist.set(fromDepth, 0);

  // Dijkstra: process nodes until we reach toDepth or exhaust reachable nodes
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
