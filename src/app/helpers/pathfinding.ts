import type { Floor } from '@interfaces';

// --- Graph types ---

export type PathNode = {
  roomId: string;
  roomTypeId: string;
  x: number;
  y: number;
  fearLevel: number;
};

export type PathEdge = {
  toRoomId: string;
  baseCost: number;
};

export type DungeonGraph = {
  nodes: Map<string, PathNode>;
  adjacency: Map<string, PathEdge[]>;
};

// --- Graph building ---

function addBidirectionalEdge(
  adjacency: Map<string, PathEdge[]>,
  roomAId: string,
  roomBId: string,
  baseCost: number = 1,
): void {
  const edgesA = adjacency.get(roomAId);
  if (edgesA && !edgesA.some((e) => e.toRoomId === roomBId)) {
    edgesA.push({ toRoomId: roomBId, baseCost });
  }

  const edgesB = adjacency.get(roomBId);
  if (edgesB && !edgesB.some((e) => e.toRoomId === roomAId)) {
    edgesB.push({ toRoomId: roomAId, baseCost });
  }
}

/**
 * Build a graph representation from a Floor's rooms, connections, and hallways.
 * @param floor The floor to build from
 * @param roomFearLevels Map of roomId → fear level (from RoomDefinition lookups)
 */
export function pathfindingBuildDungeonGraph(
  floor: Floor,
  roomFearLevels?: Map<string, number>,
): DungeonGraph {
  const nodes = new Map<string, PathNode>();
  const adjacency = new Map<string, PathEdge[]>();

  for (const room of floor.rooms) {
    nodes.set(room.id, {
      roomId: room.id,
      roomTypeId: room.roomTypeId,
      x: room.anchorX,
      y: room.anchorY,
      fearLevel: roomFearLevels?.get(room.id) ?? 0,
    });
    adjacency.set(room.id, []);
  }

  for (const conn of floor.connections) {
    addBidirectionalEdge(adjacency, conn.roomAId, conn.roomBId);
  }

  for (const hallway of floor.hallways) {
    addBidirectionalEdge(adjacency, hallway.startRoomId, hallway.endRoomId);
  }

  return { nodes, adjacency };
}

// --- A* pathfinding ---

export type PathfindingOptions = {
  morale?: number;
  fearCostMultiplier?: number;
  blockedNodes?: Set<string>;
};

function getTraversalCost(
  graph: DungeonGraph,
  edge: PathEdge,
  options: PathfindingOptions,
): number {
  const targetNode = graph.nodes.get(edge.toRoomId);
  if (!targetNode) return edge.baseCost;

  const morale = options.morale ?? Infinity;
  const fearMultiplier = options.fearCostMultiplier ?? 3;

  if (targetNode.fearLevel > 0 && morale < targetNode.fearLevel) {
    return edge.baseCost * fearMultiplier;
  }

  return edge.baseCost;
}

/**
 * Dijkstra's algorithm (A* with h=0) from startRoomId to goalRoomId.
 * Uses h=0 because rooms can be connected at any distance via hallways,
 * making Manhattan distance inadmissible as a heuristic.
 * Returns an ordered list of room IDs from start to goal, or empty array if no path.
 */
export function pathfindingFindPath(
  graph: DungeonGraph,
  startRoomId: string,
  goalRoomId: string,
  options: PathfindingOptions = {},
): string[] {
  if (!graph.nodes.has(startRoomId) || !graph.nodes.has(goalRoomId)) return [];
  if (startRoomId === goalRoomId) return [startRoomId];

  const blocked = options.blockedNodes ?? new Set<string>();

  const openSet = new Set<string>([startRoomId]);
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();

  gScore.set(startRoomId, 0);

  while (openSet.size > 0) {
    // Find node with lowest gScore in open set
    let current = '';
    let lowestG = Infinity;
    for (const nodeId of openSet) {
      const g = gScore.get(nodeId) ?? Infinity;
      if (g < lowestG) {
        lowestG = g;
        current = nodeId;
      }
    }

    if (current === goalRoomId) {
      const path: string[] = [current];
      while (cameFrom.has(current)) {
        current = cameFrom.get(current)!;
        path.unshift(current);
      }
      return path;
    }

    openSet.delete(current);

    const edges = graph.adjacency.get(current) ?? [];
    for (const edge of edges) {
      if (blocked.has(edge.toRoomId)) continue;

      const cost = getTraversalCost(graph, edge, options);
      const tentativeG = (gScore.get(current) ?? Infinity) + cost;

      if (tentativeG < (gScore.get(edge.toRoomId) ?? Infinity)) {
        cameFrom.set(edge.toRoomId, current);
        gScore.set(edge.toRoomId, tentativeG);
        openSet.add(edge.toRoomId);
      }
    }
  }

  return [];
}

/**
 * Get the total traversal cost of a path.
 */
export function pathfindingGetCost(
  graph: DungeonGraph,
  path: string[],
  options: PathfindingOptions = {},
): number {
  if (path.length < 2) return 0;

  let totalCost = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const edges = graph.adjacency.get(path[i]) ?? [];
    const edge = edges.find((e) => e.toRoomId === path[i + 1]);
    if (edge) {
      totalCost += getTraversalCost(graph, edge, options);
    }
  }

  return totalCost;
}

// --- Secondary objectives ---

export type SecondaryObjective = {
  roomId: string;
  priority: number;
};

/**
 * Find a path that may detour through a secondary objective if cost-effective.
 * Detour threshold: path via secondary must be less than 2x the direct path cost.
 */
export function pathfindingFindWithObjectives(
  graph: DungeonGraph,
  startRoomId: string,
  primaryGoalId: string,
  secondaryObjectives: SecondaryObjective[],
  options: PathfindingOptions = {},
): string[] {
  const directPath = pathfindingFindPath(graph, startRoomId, primaryGoalId, options);
  if (directPath.length === 0) return [];

  const directCost = pathfindingGetCost(graph, directPath, options);
  const detourThreshold = directCost * 2;

  let bestDetourPath: string[] = [];
  let bestDetourPriority = -1;

  for (const objective of secondaryObjectives) {
    const pathToObj = pathfindingFindPath(graph, startRoomId, objective.roomId, options);
    if (pathToObj.length === 0) continue;

    const pathFromObj = pathfindingFindPath(
      graph,
      objective.roomId,
      primaryGoalId,
      options,
    );
    if (pathFromObj.length === 0) continue;

    const detourCost =
      pathfindingGetCost(graph, pathToObj, options) +
      pathfindingGetCost(graph, pathFromObj, options);

    if (detourCost < detourThreshold && objective.priority > bestDetourPriority) {
      bestDetourPath = [...pathToObj, ...pathFromObj.slice(1)];
      bestDetourPriority = objective.priority;
    }
  }

  return bestDetourPath.length > 0 ? bestDetourPath : directPath;
}

// --- Dynamic recalculation ---

/**
 * Recalculate path from current position with a newly blocked node.
 * Returns new path, or empty array if no path exists (invader enters 'confused' state).
 */
export function pathfindingRecalculate(
  graph: DungeonGraph,
  currentRoomId: string,
  goalRoomId: string,
  newBlockedNodeId: string,
  options: PathfindingOptions = {},
): string[] {
  const blocked = new Set(options.blockedNodes ?? []);
  blocked.add(newBlockedNodeId);

  return pathfindingFindPath(graph, currentRoomId, goalRoomId, {
    ...options,
    blockedNodes: blocked,
  });
}
