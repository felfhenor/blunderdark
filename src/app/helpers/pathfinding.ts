import type { Floor, GridState, PlacedRoomId, TileOffset } from '@interfaces';
import { GRID_SIZE } from '@interfaces/grid';
import type {
  DungeonGraph,
  PathEdge,
  PathfindingOptions,
  PathNode,
  SecondaryObjective,
} from '@interfaces/pathfinding';

// --- Graph building ---

function addBidirectionalEdge(
  adjacency: Map<PlacedRoomId, PathEdge[]>,
  roomAId: PlacedRoomId,
  roomBId: PlacedRoomId,
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
  roomFearLevels?: Map<PlacedRoomId, number>,
): DungeonGraph {
  const nodes = new Map<PlacedRoomId, PathNode>();
  const adjacency = new Map<PlacedRoomId, PathEdge[]>();

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

  return { nodes, adjacency };
}

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
  startRoomId: PlacedRoomId,
  goalRoomId: PlacedRoomId,
  options: PathfindingOptions = {},
): PlacedRoomId[] {
  if (!graph.nodes.has(startRoomId) || !graph.nodes.has(goalRoomId)) return [];
  if (startRoomId === goalRoomId) return [startRoomId];

  const blocked = options.blockedNodes ?? new Set<PlacedRoomId>();

  const openSet = new Set<PlacedRoomId>([startRoomId]);
  const cameFrom = new Map<PlacedRoomId, PlacedRoomId>();
  const gScore = new Map<PlacedRoomId, number>();

  gScore.set(startRoomId, 0);

  while (openSet.size > 0) {
    // Find node with lowest gScore in open set
    let current = '' as PlacedRoomId;
    let lowestG = Infinity;
    for (const nodeId of openSet) {
      const g = gScore.get(nodeId) ?? Infinity;
      if (g < lowestG) {
        lowestG = g;
        current = nodeId;
      }
    }

    if (current === goalRoomId) {
      const path: PlacedRoomId[] = [current];
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
  path: PlacedRoomId[],
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

/**
 * Find a path that may detour through a secondary objective if cost-effective.
 * Detour threshold: path via secondary must be less than 2x the direct path cost.
 */
export function pathfindingFindWithObjectives(
  graph: DungeonGraph,
  startRoomId: PlacedRoomId,
  primaryGoalId: PlacedRoomId,
  secondaryObjectives: SecondaryObjective[],
  options: PathfindingOptions = {},
): PlacedRoomId[] {
  const directPath = pathfindingFindPath(
    graph,
    startRoomId,
    primaryGoalId,
    options,
  );
  if (directPath.length === 0) return [];

  const directCost = pathfindingGetCost(graph, directPath, options);
  const detourThreshold = directCost * 2;

  let bestDetourPath: PlacedRoomId[] = [];
  let bestDetourPriority = -1;

  for (const objective of secondaryObjectives) {
    const pathToObj = pathfindingFindPath(
      graph,
      startRoomId,
      objective.roomId,
      options,
    );
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

    if (
      detourCost < detourThreshold &&
      objective.priority > bestDetourPriority
    ) {
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
  currentRoomId: PlacedRoomId,
  goalRoomId: PlacedRoomId,
  newBlockedNodeId: PlacedRoomId,
  options: PathfindingOptions = {},
): PlacedRoomId[] {
  const blocked = new Set(options.blockedNodes ?? []);
  blocked.add(newBlockedNodeId);

  return pathfindingFindPath(graph, currentRoomId, goalRoomId, {
    ...options,
    blockedNodes: blocked,
  });
}

// ============================================================
// Tile-level A* pathfinding
// ============================================================

/**
 * Binary min-heap for A* open set.
 * Entries are [fScore, tieBreaker, x, y] — tieBreaker favours later inserts (lower g).
 */
type HeapEntry = [number, number, number, number];

function heapPush(heap: HeapEntry[], entry: HeapEntry): void {
  heap.push(entry);
  let i = heap.length - 1;
  while (i > 0) {
    const parent = (i - 1) >> 1;
    if (
      heap[parent][0] < entry[0] ||
      (heap[parent][0] === entry[0] && heap[parent][1] <= entry[1])
    )
      break;
    heap[i] = heap[parent];
    heap[parent] = entry;
    i = parent;
  }
}

function heapPop(heap: HeapEntry[]): HeapEntry | undefined {
  if (heap.length === 0) return undefined;
  const top = heap[0];
  const last = heap.pop()!;
  if (heap.length > 0) {
    heap[0] = last;
    let i = 0;
    const len = heap.length;
    let needsSift = true;
    while (needsSift) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (
        left < len &&
        (heap[left][0] < heap[smallest][0] ||
          (heap[left][0] === heap[smallest][0] &&
            heap[left][1] < heap[smallest][1]))
      ) {
        smallest = left;
      }
      if (
        right < len &&
        (heap[right][0] < heap[smallest][0] ||
          (heap[right][0] === heap[smallest][0] &&
            heap[right][1] < heap[smallest][1]))
      ) {
        smallest = right;
      }
      if (smallest === i) {
        needsSift = false;
      } else {
        [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
        i = smallest;
      }
    }
  }
  return top;
}

const TILE_DIRS: ReadonlyArray<[number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

function manhattanDistance(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

/**
 * A* pathfinding on the tile grid.
 * Uses Manhattan distance heuristic and a min-heap priority queue.
 * Returns the shortest path as an ordered array of tiles, or null if no valid path.
 * Occupied tiles (rooms, hallways, stairs, etc.) are treated as impassable.
 */
export function tilePathfindingFindPath(
  grid: GridState,
  start: TileOffset,
  end: TileOffset,
): TileOffset[] | undefined {
  if (start.x === end.x && start.y === end.y)
    return [{ x: start.x, y: start.y }];

  if (
    start.x < 0 ||
    start.x >= GRID_SIZE ||
    start.y < 0 ||
    start.y >= GRID_SIZE
  )
    return undefined;
  if (end.x < 0 || end.x >= GRID_SIZE || end.y < 0 || end.y >= GRID_SIZE)
    return undefined;

  if (grid[start.y][start.x].occupied) return undefined;
  if (grid[end.y][end.x].occupied) return undefined;

  const gScore = new Float64Array(GRID_SIZE * GRID_SIZE).fill(Infinity);
  const cameFromX = new Int8Array(GRID_SIZE * GRID_SIZE).fill(-1);
  const cameFromY = new Int8Array(GRID_SIZE * GRID_SIZE).fill(-1);
  const closed = new Uint8Array(GRID_SIZE * GRID_SIZE);

  const startIdx = start.y * GRID_SIZE + start.x;
  gScore[startIdx] = 0;

  const heap: HeapEntry[] = [];
  let tieBreaker = 0;
  heapPush(heap, [
    manhattanDistance(start.x, start.y, end.x, end.y),
    tieBreaker++,
    start.x,
    start.y,
  ]);

  while (heap.length > 0) {
    const entry = heapPop(heap)!;
    const cx = entry[2];
    const cy = entry[3];
    const cIdx = cy * GRID_SIZE + cx;

    if (cx === end.x && cy === end.y) {
      // Reconstruct path
      const path: TileOffset[] = [];
      let px = cx;
      let py = cy;
      while (px !== -1 && py !== -1) {
        path.push({ x: px, y: py });
        const pIdx = py * GRID_SIZE + px;
        const nx = cameFromX[pIdx];
        const ny = cameFromY[pIdx];
        px = nx;
        py = ny;
      }
      path.reverse();
      return path;
    }

    if (closed[cIdx]) continue;
    closed[cIdx] = 1;

    const currentG = gScore[cIdx];

    for (const [dx, dy] of TILE_DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;

      const nIdx = ny * GRID_SIZE + nx;
      if (closed[nIdx]) continue;
      if (grid[ny][nx].occupied && !(nx === end.x && ny === end.y)) continue;

      const tentativeG = currentG + 1;
      if (tentativeG < gScore[nIdx]) {
        gScore[nIdx] = tentativeG;
        cameFromX[nIdx] = cx;
        cameFromY[nIdx] = cy;
        const f = tentativeG + manhattanDistance(nx, ny, end.x, end.y);
        heapPush(heap, [f, tieBreaker++, nx, ny]);
      }
    }
  }

  return undefined;
}

/**
 * Count the number of direction changes (turns) in a path.
 */
function countTurns(path: TileOffset[]): number {
  if (path.length < 3) return 0;
  let turns = 0;
  for (let i = 2; i < path.length; i++) {
    const dx1 = path[i - 1].x - path[i - 2].x;
    const dy1 = path[i - 1].y - path[i - 2].y;
    const dx2 = path[i].x - path[i - 1].x;
    const dy2 = path[i].y - path[i - 1].y;
    if (dx1 !== dx2 || dy1 !== dy2) turns++;
  }
  return turns;
}

/**
 * Find all tiles on the grid that belong to a given room.
 * Reads directly from grid state to avoid content service dependency.
 */
function getRoomTilesFromGrid(grid: GridState, roomId: PlacedRoomId): TileOffset[] {
  const tiles: TileOffset[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (grid[y][x].roomId === roomId) {
        tiles.push({ x, y });
      }
    }
  }
  return tiles;
}

/**
 * Get tiles adjacent to a room that are empty on the grid.
 * These are candidate start/end points for room-to-room pathfinding.
 */
function getRoomEdgeEmptyTiles(grid: GridState, roomId: PlacedRoomId): TileOffset[] {
  const roomTiles = getRoomTilesFromGrid(grid, roomId);
  const roomTileSet = new Set(roomTiles.map((t) => `${t.x},${t.y}`));

  const result: TileOffset[] = [];
  const seen = new Set<string>();

  for (const tile of roomTiles) {
    for (const [dx, dy] of TILE_DIRS) {
      const nx = tile.x + dx;
      const ny = tile.y + dy;
      const key = `${nx},${ny}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
      if (roomTileSet.has(key)) continue;
      if (!grid[ny][nx].occupied) {
        result.push({ x: nx, y: ny });
      }
    }
  }

  return result;
}

/**
 * Find a path from one room's edge to another room's edge.
 * Evaluates multiple start/end candidates from each room's border.
 * Returns the shortest path (preferring fewer turns when lengths are equal),
 * or null if no valid path exists.
 * The returned path does NOT include tiles inside either room.
 */
export function tilePathfindingFindRoomToRoomPath(
  floor: Floor,
  roomAId: PlacedRoomId,
  roomBId: PlacedRoomId,
): TileOffset[] | undefined {
  if (roomAId === roomBId) return undefined;

  const roomATiles = getRoomTilesFromGrid(floor.grid, roomAId);
  const roomBTiles = getRoomTilesFromGrid(floor.grid, roomBId);
  if (roomATiles.length === 0 || roomBTiles.length === 0) return undefined;

  const startsA = getRoomEdgeEmptyTiles(floor.grid, roomAId);
  const endsB = getRoomEdgeEmptyTiles(floor.grid, roomBId);

  if (startsA.length === 0 || endsB.length === 0) return undefined;

  let bestPath: TileOffset[] | undefined = undefined;
  let bestLen = Infinity;
  let bestTurns = Infinity;

  for (const start of startsA) {
    for (const end of endsB) {
      const path = tilePathfindingFindPath(floor.grid, start, end);
      if (!path) continue;

      const turns = countTurns(path);
      if (
        path.length < bestLen ||
        (path.length === bestLen && turns < bestTurns)
      ) {
        bestPath = path;
        bestLen = path.length;
        bestTurns = turns;
      }
    }
  }

  return bestPath;
}
