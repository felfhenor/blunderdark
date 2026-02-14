import { describe, expect, it } from 'vitest';
import type { DungeonGraph, PathEdge, PathNode } from '@interfaces/pathfinding';
import type { ConnectionId, Floor, FloorId, GridState, GridTile, HallwayId, PlacedRoomId, RoomId, RoomShapeId } from '@interfaces';

const {
  pathfindingBuildDungeonGraph,
  pathfindingFindPath,
  pathfindingGetCost,
  pathfindingFindWithObjectives,
  pathfindingRecalculate,
  tilePathfindingFindPath,
  tilePathfindingFindRoomToRoomPath,
} = await import('@helpers/pathfinding');

const { gridCreateEmpty, gridSetTile } = await import('@helpers/grid');

// --- Test helpers ---

/**
 * Build a simple graph from a list of nodes and edges.
 * Nodes: [id, roomTypeId, x, y, fearLevel]
 * Edges: [fromId, toId, cost?]
 */
function makeGraph(
  nodeDefs: [string, string, number, number, number][],
  edgeDefs: [string, string, number?][],
): DungeonGraph {
  const nodes = new Map<PlacedRoomId, PathNode>();
  const adjacency = new Map<PlacedRoomId, PathEdge[]>();

  for (const [id, roomTypeId, x, y, fearLevel] of nodeDefs) {
    const pId = id as PlacedRoomId;
    nodes.set(pId, { roomId: pId, roomTypeId: roomTypeId as RoomId, x, y, fearLevel });
    adjacency.set(pId, []);
  }

  for (const [from, to, cost] of edgeDefs) {
    const baseCost = cost ?? 1;
    const edgesFrom = adjacency.get(from as PlacedRoomId);
    if (edgesFrom) edgesFrom.push({ toRoomId: to as PlacedRoomId, baseCost });
    const edgesTo = adjacency.get(to as PlacedRoomId);
    if (edgesTo) edgesTo.push({ toRoomId: from as PlacedRoomId, baseCost });
  }

  return { nodes, adjacency };
}

function makeFloor(overrides: Partial<Floor> = {}): Floor {
  return {
    id: 'floor-1' as FloorId,
    name: 'Floor 1',
    depth: 1,
    biome: 'neutral',
    grid: [],
    rooms: [],
    hallways: [],
    inhabitants: [],
    connections: [],
    traps: [],
    ...overrides,
  };
}

// ============================================================
// US-001: Connection graph representation
// ============================================================

describe('pathfindingBuildDungeonGraph', () => {
  it('creates nodes from floor rooms', () => {
    const floor = makeFloor({
      rooms: [
        { id: 'r1' as PlacedRoomId, roomTypeId: 'type-a' as RoomId, shapeId: 's1' as RoomShapeId, anchorX: 0, anchorY: 0 },
        { id: 'r2' as PlacedRoomId, roomTypeId: 'type-b' as RoomId, shapeId: 's1' as RoomShapeId, anchorX: 5, anchorY: 0 },
      ],
    });

    const graph = pathfindingBuildDungeonGraph(floor);
    expect(graph.nodes.size).toBe(2);
    expect(graph.nodes.get('r1' as PlacedRoomId)!.roomTypeId).toBe('type-a');
    expect(graph.nodes.get('r2' as PlacedRoomId)!.x).toBe(5);
  });

  it('creates edges from connections', () => {
    const floor = makeFloor({
      rooms: [
        { id: 'r1' as PlacedRoomId, roomTypeId: 'type-a' as RoomId, shapeId: 's1' as RoomShapeId, anchorX: 0, anchorY: 0 },
        { id: 'r2' as PlacedRoomId, roomTypeId: 'type-b' as RoomId, shapeId: 's1' as RoomShapeId, anchorX: 3, anchorY: 0 },
      ],
      connections: [
        { id: 'c1' as ConnectionId, roomAId: 'r1' as PlacedRoomId, roomBId: 'r2' as PlacedRoomId, edgeTiles: [] },
      ],
    });

    const graph = pathfindingBuildDungeonGraph(floor);
    const r1Edges = graph.adjacency.get('r1' as PlacedRoomId)!;
    const r2Edges = graph.adjacency.get('r2' as PlacedRoomId)!;
    expect(r1Edges).toHaveLength(1);
    expect(r1Edges[0].toRoomId).toBe('r2');
    expect(r2Edges).toHaveLength(1);
    expect(r2Edges[0].toRoomId).toBe('r1');
  });

  it('creates edges from hallway connections', () => {
    const floor = makeFloor({
      rooms: [
        { id: 'r1' as PlacedRoomId, roomTypeId: 'type-a' as RoomId, shapeId: 's1' as RoomShapeId, anchorX: 0, anchorY: 0 },
        { id: 'r2' as PlacedRoomId, roomTypeId: 'type-b' as RoomId, shapeId: 's1' as RoomShapeId, anchorX: 10, anchorY: 0 },
      ],
      hallways: [
        { id: 'h1' as HallwayId, tiles: [], upgrades: [] },
      ],
      connections: [
        { id: 'c1' as ConnectionId, roomAId: 'r1' as PlacedRoomId, roomBId: 'r2' as PlacedRoomId, edgeTiles: [] },
      ],
    });

    const graph = pathfindingBuildDungeonGraph(floor);
    expect(graph.adjacency.get('r1' as PlacedRoomId)!).toHaveLength(1);
    expect(graph.adjacency.get('r2' as PlacedRoomId)!).toHaveLength(1);
  });

  it('does not create duplicate edges for same room pair', () => {
    const floor = makeFloor({
      rooms: [
        { id: 'r1' as PlacedRoomId, roomTypeId: 'type-a' as RoomId, shapeId: 's1' as RoomShapeId, anchorX: 0, anchorY: 0 },
        { id: 'r2' as PlacedRoomId, roomTypeId: 'type-b' as RoomId, shapeId: 's1' as RoomShapeId, anchorX: 3, anchorY: 0 },
      ],
      connections: [
        { id: 'c1' as ConnectionId, roomAId: 'r1' as PlacedRoomId, roomBId: 'r2' as PlacedRoomId, edgeTiles: [] },
        { id: 'c2' as ConnectionId, roomAId: 'r1' as PlacedRoomId, roomBId: 'r2' as PlacedRoomId, edgeTiles: [] },
      ],
      hallways: [
        { id: 'h1' as HallwayId, tiles: [], upgrades: [] },
      ],
    });

    const graph = pathfindingBuildDungeonGraph(floor);
    expect(graph.adjacency.get('r1' as PlacedRoomId)!).toHaveLength(1);
  });

  it('applies fear levels from roomFearLevels map', () => {
    const floor = makeFloor({
      rooms: [
        { id: 'r1' as PlacedRoomId, roomTypeId: 'type-a' as RoomId, shapeId: 's1' as RoomShapeId, anchorX: 0, anchorY: 0 },
      ],
    });

    const fearMap = new Map<PlacedRoomId, number>([['r1' as PlacedRoomId, 5]]);
    const graph = pathfindingBuildDungeonGraph(floor, fearMap);
    expect(graph.nodes.get('r1' as PlacedRoomId)!.fearLevel).toBe(5);
  });

  it('defaults fear level to 0 when not in map', () => {
    const floor = makeFloor({
      rooms: [
        { id: 'r1' as PlacedRoomId, roomTypeId: 'type-a' as RoomId, shapeId: 's1' as RoomShapeId, anchorX: 0, anchorY: 0 },
      ],
    });

    const graph = pathfindingBuildDungeonGraph(floor);
    expect(graph.nodes.get('r1' as PlacedRoomId)!.fearLevel).toBe(0);
  });

  it('edges have default base cost of 1', () => {
    const floor = makeFloor({
      rooms: [
        { id: 'r1' as PlacedRoomId, roomTypeId: 'type-a' as RoomId, shapeId: 's1' as RoomShapeId, anchorX: 0, anchorY: 0 },
        { id: 'r2' as PlacedRoomId, roomTypeId: 'type-b' as RoomId, shapeId: 's1' as RoomShapeId, anchorX: 3, anchorY: 0 },
      ],
      connections: [
        { id: 'c1' as ConnectionId, roomAId: 'r1' as PlacedRoomId, roomBId: 'r2' as PlacedRoomId, edgeTiles: [] },
      ],
    });

    const graph = pathfindingBuildDungeonGraph(floor);
    expect(graph.adjacency.get('r1' as PlacedRoomId)![0].baseCost).toBe(1);
  });

  it('graph updates when rooms/connections change (rebuild)', () => {
    const floor1 = makeFloor({
      rooms: [
        { id: 'r1' as PlacedRoomId, roomTypeId: 'type-a' as RoomId, shapeId: 's1' as RoomShapeId, anchorX: 0, anchorY: 0 },
        { id: 'r2' as PlacedRoomId, roomTypeId: 'type-b' as RoomId, shapeId: 's1' as RoomShapeId, anchorX: 3, anchorY: 0 },
      ],
      connections: [],
    });

    const graph1 = pathfindingBuildDungeonGraph(floor1);
    expect(graph1.adjacency.get('r1' as PlacedRoomId)!).toHaveLength(0);

    const floor2 = makeFloor({
      rooms: floor1.rooms,
      connections: [
        { id: 'c1' as ConnectionId, roomAId: 'r1' as PlacedRoomId, roomBId: 'r2' as PlacedRoomId, edgeTiles: [] },
      ],
    });

    const graph2 = pathfindingBuildDungeonGraph(floor2);
    expect(graph2.adjacency.get('r1' as PlacedRoomId)!).toHaveLength(1);
  });
});

// ============================================================
// US-002: A* pathfinding with fear-based cost
// ============================================================

describe('pathfindingFindPath', () => {
  it('finds direct path on simple linear dungeon (spawn → room → altar)', () => {
    //  spawn -- room1 -- room2 -- altar
    const graph = makeGraph(
      [
        ['spawn', 'spawn', 0, 0, 0],
        ['room1', 'generic', 3, 0, 0],
        ['room2', 'generic', 6, 0, 0],
        ['altar', 'altar', 9, 0, 0],
      ],
      [
        ['spawn', 'room1'],
        ['room1', 'room2'],
        ['room2', 'altar'],
      ],
    );

    const path = pathfindingFindPath(graph, 'spawn' as PlacedRoomId, 'altar' as PlacedRoomId);
    expect(path).toEqual(['spawn', 'room1', 'room2', 'altar']);
  });

  it('finds shortest path when multiple routes exist', () => {
    //  spawn -- A -- altar  (short: 2 edges)
    //  spawn -- B -- C -- altar  (long: 3 edges)
    const graph = makeGraph(
      [
        ['spawn', 'spawn', 0, 0, 0],
        ['A', 'generic', 3, 0, 0],
        ['B', 'generic', 0, 3, 0],
        ['C', 'generic', 3, 3, 0],
        ['altar', 'altar', 6, 0, 0],
      ],
      [
        ['spawn', 'A'],
        ['A', 'altar'],
        ['spawn', 'B'],
        ['B', 'C'],
        ['C', 'altar'],
      ],
    );

    const path = pathfindingFindPath(graph, 'spawn' as PlacedRoomId, 'altar' as PlacedRoomId);
    expect(path).toEqual(['spawn', 'A', 'altar']);
  });

  it('returns empty array when no path exists', () => {
    const graph = makeGraph(
      [
        ['spawn', 'spawn', 0, 0, 0],
        ['island', 'generic', 10, 10, 0],
        ['altar', 'altar', 5, 0, 0],
      ],
      [
        ['spawn', 'altar'],
        // island is disconnected
      ],
    );

    const path = pathfindingFindPath(graph, 'spawn' as PlacedRoomId, 'island' as PlacedRoomId);
    expect(path).toEqual([]);
  });

  it('returns single node when start equals goal', () => {
    const graph = makeGraph(
      [['spawn', 'spawn', 0, 0, 0]],
      [],
    );

    const path = pathfindingFindPath(graph, 'spawn' as PlacedRoomId, 'spawn' as PlacedRoomId);
    expect(path).toEqual(['spawn']);
  });

  it('returns empty array for non-existent start node', () => {
    const graph = makeGraph(
      [['altar', 'altar', 0, 0, 0]],
      [],
    );

    expect(pathfindingFindPath(graph, 'missing' as PlacedRoomId, 'altar' as PlacedRoomId)).toEqual([]);
  });

  it('returns empty array for non-existent goal node', () => {
    const graph = makeGraph(
      [['spawn', 'spawn', 0, 0, 0]],
      [],
    );

    expect(pathfindingFindPath(graph, 'spawn' as PlacedRoomId, 'missing' as PlacedRoomId)).toEqual([]);
  });

  it('respects blocked nodes', () => {
    //  spawn -- A -- altar
    //  spawn -- B -- altar
    const graph = makeGraph(
      [
        ['spawn', 'spawn', 0, 0, 0],
        ['A', 'generic', 3, 0, 0],
        ['B', 'generic', 0, 3, 0],
        ['altar', 'altar', 6, 0, 0],
      ],
      [
        ['spawn', 'A'],
        ['A', 'altar'],
        ['spawn', 'B'],
        ['B', 'altar'],
      ],
    );

    const path = pathfindingFindPath(graph, 'spawn' as PlacedRoomId, 'altar' as PlacedRoomId, {
      blockedNodes: new Set(['A' as PlacedRoomId]),
    });
    expect(path).toEqual(['spawn', 'B', 'altar']);
  });

  it('finds path around obstacle (blocked room)', () => {
    //  spawn -- blocked -- altar
    //  spawn -- detour -- altar
    const graph = makeGraph(
      [
        ['spawn', 'spawn', 0, 0, 0],
        ['blocked', 'generic', 3, 0, 0],
        ['detour', 'generic', 0, 3, 0],
        ['altar', 'altar', 6, 0, 0],
      ],
      [
        ['spawn', 'blocked'],
        ['blocked', 'altar'],
        ['spawn', 'detour'],
        ['detour', 'altar'],
      ],
    );

    const path = pathfindingFindPath(graph, 'spawn' as PlacedRoomId, 'altar' as PlacedRoomId, {
      blockedNodes: new Set(['blocked' as PlacedRoomId]),
    });
    expect(path).toEqual(['spawn', 'detour', 'altar']);
  });

  it('returns empty when all paths are blocked', () => {
    //  spawn -- A -- altar
    const graph = makeGraph(
      [
        ['spawn', 'spawn', 0, 0, 0],
        ['A', 'generic', 3, 0, 0],
        ['altar', 'altar', 6, 0, 0],
      ],
      [
        ['spawn', 'A'],
        ['A', 'altar'],
      ],
    );

    const path = pathfindingFindPath(graph, 'spawn' as PlacedRoomId, 'altar' as PlacedRoomId, {
      blockedNodes: new Set(['A' as PlacedRoomId]),
    });
    expect(path).toEqual([]);
  });
});

describe('Fear-based cost modification', () => {
  it('high-fear room increases traversal cost when morale is low', () => {
    //  spawn -- scary(fear=5) -- altar  cost = 3
    //  spawn -- safe -- safe2 -- altar  cost = 3
    //  With morale 2 < fear 5, scary room costs 3x (3), so direct = 3, alternate = 3
    //  Make alternate shorter to test preference:
    //  spawn -- scary(fear=5) -- altar  cost with fear = 3
    //  spawn -- safe -- altar            cost = 2
    const graph = makeGraph(
      [
        ['spawn', 'spawn', 0, 0, 0],
        ['scary', 'generic', 3, 0, 5],
        ['safe', 'generic', 0, 3, 0],
        ['altar', 'altar', 6, 0, 0],
      ],
      [
        ['spawn', 'scary'],
        ['scary', 'altar'],
        ['spawn', 'safe'],
        ['safe', 'altar'],
      ],
    );

    // With low morale: avoids scary room (cost 3) and goes through safe (cost 1)
    const pathWithFear = pathfindingFindPath(graph, 'spawn' as PlacedRoomId, 'altar' as PlacedRoomId, { morale: 2 });
    expect(pathWithFear).toEqual(['spawn', 'safe', 'altar']);
  });

  it('invader traverses high-fear room if no alternative exists', () => {
    //  spawn -- scary(fear=5) -- altar  (only path)
    const graph = makeGraph(
      [
        ['spawn', 'spawn', 0, 0, 0],
        ['scary', 'generic', 3, 0, 5],
        ['altar', 'altar', 6, 0, 0],
      ],
      [
        ['spawn', 'scary'],
        ['scary', 'altar'],
      ],
    );

    const path = pathfindingFindPath(graph, 'spawn' as PlacedRoomId, 'altar' as PlacedRoomId, { morale: 1 });
    expect(path).toEqual(['spawn', 'scary', 'altar']);
  });

  it('high morale ignores fear cost', () => {
    //  spawn -- scary(fear=3) -- altar  (2 edges)
    //  spawn -- safe -- safe2 -- altar  (3 edges)
    const graph = makeGraph(
      [
        ['spawn', 'spawn', 0, 0, 0],
        ['scary', 'generic', 3, 0, 3],
        ['safe', 'generic', 0, 3, 0],
        ['safe2', 'generic', 3, 3, 0],
        ['altar', 'altar', 6, 0, 0],
      ],
      [
        ['spawn', 'scary'],
        ['scary', 'altar'],
        ['spawn', 'safe'],
        ['safe', 'safe2'],
        ['safe2', 'altar'],
      ],
    );

    // High morale (10 > fear 3): goes through scary (shorter)
    const path = pathfindingFindPath(graph, 'spawn' as PlacedRoomId, 'altar' as PlacedRoomId, { morale: 10 });
    expect(path).toEqual(['spawn', 'scary', 'altar']);
  });

  it('custom fear cost multiplier is applied', () => {
    //  spawn -- scary(fear=3) -- altar  (fear cost = baseCost * 5 = 5)
    //  spawn -- A -- B -- C -- D -- altar  (cost = 4, cheaper than 5)
    const graph = makeGraph(
      [
        ['spawn', 'spawn', 0, 0, 0],
        ['scary', 'generic', 5, 0, 3],
        ['A', 'generic', 0, 2, 0],
        ['B', 'generic', 2, 2, 0],
        ['C', 'generic', 4, 2, 0],
        ['D', 'generic', 6, 2, 0],
        ['altar', 'altar', 10, 0, 0],
      ],
      [
        ['spawn', 'scary'],
        ['scary', 'altar'],
        ['spawn', 'A'],
        ['A', 'B'],
        ['B', 'C'],
        ['C', 'D'],
        ['D', 'altar'],
      ],
    );

    // With 5x fear multiplier, scary costs 5; alternate costs 5 (same)
    // With 6x, scary costs 6; alternate costs 5 (prefer alternate)
    const path = pathfindingFindPath(graph, 'spawn' as PlacedRoomId, 'altar' as PlacedRoomId, {
      morale: 1,
      fearCostMultiplier: 6,
    });
    expect(path).toEqual(['spawn', 'A', 'B', 'C', 'D', 'altar']);
  });
});

describe('pathfindingGetCost', () => {
  it('returns 0 for single-node path', () => {
    const graph = makeGraph([['A', 'generic', 0, 0, 0]], []);
    expect(pathfindingGetCost(graph, ['A' as PlacedRoomId])).toBe(0);
  });

  it('returns 0 for empty path', () => {
    const graph = makeGraph([], []);
    expect(pathfindingGetCost(graph, [])).toBe(0);
  });

  it('sums edge costs along path', () => {
    const graph = makeGraph(
      [
        ['A', 'generic', 0, 0, 0],
        ['B', 'generic', 1, 0, 0],
        ['C', 'generic', 2, 0, 0],
      ],
      [
        ['A', 'B'],
        ['B', 'C'],
      ],
    );

    expect(pathfindingGetCost(graph, ['A' as PlacedRoomId, 'B' as PlacedRoomId, 'C' as PlacedRoomId])).toBe(2);
  });

  it('applies fear cost in path cost calculation', () => {
    const graph = makeGraph(
      [
        ['A', 'generic', 0, 0, 0],
        ['B', 'generic', 1, 0, 5], // fear = 5
        ['C', 'generic', 2, 0, 0],
      ],
      [
        ['A', 'B'],
        ['B', 'C'],
      ],
    );

    // Without fear: cost = 2
    expect(pathfindingGetCost(graph, ['A' as PlacedRoomId, 'B' as PlacedRoomId, 'C' as PlacedRoomId])).toBe(2);
    // With low morale: entering B costs 3, then B→C costs 1 = 4
    expect(pathfindingGetCost(graph, ['A' as PlacedRoomId, 'B' as PlacedRoomId, 'C' as PlacedRoomId], { morale: 1 })).toBe(4);
  });
});

// ============================================================
// US-003: Secondary objectives and dynamic recalculation
// ============================================================

describe('pathfindingFindWithObjectives', () => {
  it('returns direct path when no secondary objectives', () => {
    const graph = makeGraph(
      [
        ['spawn', 'spawn', 0, 0, 0],
        ['altar', 'altar', 3, 0, 0],
      ],
      [['spawn', 'altar']],
    );

    const path = pathfindingFindWithObjectives(graph, 'spawn' as PlacedRoomId, 'altar' as PlacedRoomId, []);
    expect(path).toEqual(['spawn', 'altar']);
  });

  it('detours to secondary objective when within threshold', () => {
    //  spawn -- vault -- altar  (cost 2 via vault, direct cost 1)
    //  spawn -- altar  (direct, cost 1)
    //  Detour threshold: 2 * 1 = 2; detour cost = 2, not < 2 so no detour
    //  Let's make direct cost 2 so threshold is 4:
    //  spawn -- mid -- altar  (direct cost 2)
    //  spawn -- vault -- altar  (detour cost 2, < threshold 4)
    const graph = makeGraph(
      [
        ['spawn', 'spawn', 0, 0, 0],
        ['mid', 'generic', 3, 0, 0],
        ['vault', 'vault', 0, 3, 0],
        ['altar', 'altar', 6, 0, 0],
      ],
      [
        ['spawn', 'mid'],
        ['mid', 'altar'],
        ['spawn', 'vault'],
        ['vault', 'altar'],
      ],
    );

    const path = pathfindingFindWithObjectives(
      graph, 'spawn' as PlacedRoomId, 'altar' as PlacedRoomId,
      [{ roomId: 'vault' as PlacedRoomId, priority: 5 }],
    );
    // Both paths have cost 2; detour cost (2) < threshold (4), so vault detour is preferred
    expect(path).toEqual(['spawn', 'vault', 'altar']);
  });

  it('skips secondary objective when detour exceeds threshold', () => {
    //  spawn -- altar  (direct cost 1)
    //  spawn -- A -- B -- C -- vault -- D -- altar  (detour cost 6)
    //  Threshold: 2 * 1 = 2; 6 > 2 → no detour
    const graph = makeGraph(
      [
        ['spawn', 'spawn', 0, 0, 0],
        ['A', 'generic', 2, 0, 0],
        ['B', 'generic', 4, 0, 0],
        ['C', 'generic', 6, 0, 0],
        ['vault', 'vault', 8, 0, 0],
        ['D', 'generic', 8, 2, 0],
        ['altar', 'altar', 1, 0, 0],
      ],
      [
        ['spawn', 'altar'],
        ['spawn', 'A'],
        ['A', 'B'],
        ['B', 'C'],
        ['C', 'vault'],
        ['vault', 'D'],
        ['D', 'altar'],
      ],
    );

    const path = pathfindingFindWithObjectives(
      graph, 'spawn' as PlacedRoomId, 'altar' as PlacedRoomId,
      [{ roomId: 'vault' as PlacedRoomId, priority: 5 }],
    );
    expect(path).toEqual(['spawn', 'altar']);
  });

  it('picks highest priority secondary when multiple are reachable', () => {
    //  spawn -- throne -- altar  (cost 2, priority 3)
    //  spawn -- vault -- altar   (cost 2, priority 8)
    //  spawn -- mid -- altar     (direct cost 2)
    const graph = makeGraph(
      [
        ['spawn', 'spawn', 0, 0, 0],
        ['mid', 'generic', 3, 0, 0],
        ['throne', 'throne', 0, 3, 0],
        ['vault', 'vault', 0, 6, 0],
        ['altar', 'altar', 6, 0, 0],
      ],
      [
        ['spawn', 'mid'],
        ['mid', 'altar'],
        ['spawn', 'throne'],
        ['throne', 'altar'],
        ['spawn', 'vault'],
        ['vault', 'altar'],
      ],
    );

    const path = pathfindingFindWithObjectives(
      graph, 'spawn' as PlacedRoomId, 'altar' as PlacedRoomId,
      [
        { roomId: 'throne' as PlacedRoomId, priority: 3 },
        { roomId: 'vault' as PlacedRoomId, priority: 8 },
      ],
    );
    // Vault has higher priority and same cost
    expect(path).toEqual(['spawn', 'vault', 'altar']);
  });

  it('returns empty when no path to primary goal exists', () => {
    const graph = makeGraph(
      [
        ['spawn', 'spawn', 0, 0, 0],
        ['altar', 'altar', 10, 0, 0],
      ],
      [], // no edges
    );

    const path = pathfindingFindWithObjectives(graph, 'spawn' as PlacedRoomId, 'altar' as PlacedRoomId, []);
    expect(path).toEqual([]);
  });

  it('ignores unreachable secondary objectives', () => {
    const graph = makeGraph(
      [
        ['spawn', 'spawn', 0, 0, 0],
        ['altar', 'altar', 3, 0, 0],
        ['island', 'vault', 20, 20, 0], // disconnected
      ],
      [['spawn', 'altar']],
    );

    const path = pathfindingFindWithObjectives(
      graph, 'spawn' as PlacedRoomId, 'altar' as PlacedRoomId,
      [{ roomId: 'island' as PlacedRoomId, priority: 10 }],
    );
    expect(path).toEqual(['spawn', 'altar']);
  });
});

describe('pathfindingRecalculate', () => {
  it('finds alternate path when node is blocked', () => {
    //  current -- A -- altar
    //  current -- B -- altar
    const graph = makeGraph(
      [
        ['current', 'spawn', 0, 0, 0],
        ['A', 'generic', 3, 0, 0],
        ['B', 'generic', 0, 3, 0],
        ['altar', 'altar', 6, 0, 0],
      ],
      [
        ['current', 'A'],
        ['A', 'altar'],
        ['current', 'B'],
        ['B', 'altar'],
      ],
    );

    const path = pathfindingRecalculate(graph, 'current' as PlacedRoomId, 'altar' as PlacedRoomId, 'A' as PlacedRoomId);
    expect(path).toEqual(['current', 'B', 'altar']);
  });

  it('returns empty when blocked node eliminates all paths (confused state)', () => {
    //  current -- A -- altar  (only path)
    const graph = makeGraph(
      [
        ['current', 'spawn', 0, 0, 0],
        ['A', 'generic', 3, 0, 0],
        ['altar', 'altar', 6, 0, 0],
      ],
      [
        ['current', 'A'],
        ['A', 'altar'],
      ],
    );

    const path = pathfindingRecalculate(graph, 'current' as PlacedRoomId, 'altar' as PlacedRoomId, 'A' as PlacedRoomId);
    expect(path).toEqual([]);
  });

  it('combines with existing blocked nodes', () => {
    //  current -- A -- altar
    //  current -- B -- altar
    //  current -- C -- altar
    const graph = makeGraph(
      [
        ['current', 'spawn', 0, 0, 0],
        ['A', 'generic', 3, 0, 0],
        ['B', 'generic', 0, 3, 0],
        ['C', 'generic', 0, 6, 0],
        ['altar', 'altar', 6, 0, 0],
      ],
      [
        ['current', 'A'],
        ['A', 'altar'],
        ['current', 'B'],
        ['B', 'altar'],
        ['current', 'C'],
        ['C', 'altar'],
      ],
    );

    // A already blocked, now also block B → only C remains
    const path = pathfindingRecalculate(graph, 'current' as PlacedRoomId, 'altar' as PlacedRoomId, 'B' as PlacedRoomId, {
      blockedNodes: new Set(['A' as PlacedRoomId]),
    });
    expect(path).toEqual(['current', 'C', 'altar']);
  });

  it('preserves morale options during recalculation', () => {
    //  current -- scary(fear=5) -- altar
    //  current -- safe -- altar
    const graph = makeGraph(
      [
        ['current', 'spawn', 0, 0, 0],
        ['scary', 'generic', 3, 0, 5],
        ['safe', 'generic', 0, 3, 0],
        ['altar', 'altar', 6, 0, 0],
      ],
      [
        ['current', 'scary'],
        ['scary', 'altar'],
        ['current', 'safe'],
        ['safe', 'altar'],
      ],
    );

    // Block nothing new, but low morale should still prefer safe path
    const path = pathfindingRecalculate(graph, 'current' as PlacedRoomId, 'altar' as PlacedRoomId, 'nonexistent' as PlacedRoomId, {
      morale: 1,
    });
    expect(path).toEqual(['current', 'safe', 'altar']);
  });
});

// ============================================================
// US-004: Additional pathfinding tests
// ============================================================

describe('Complex graph scenarios', () => {
  it('handles larger graph (diamond shape with multiple paths)', () => {
    //       B
    //      / \
    // S - A   D - goal
    //      \ /
    //       C
    const graph = makeGraph(
      [
        ['S', 'spawn', 0, 2, 0],
        ['A', 'generic', 2, 2, 0],
        ['B', 'generic', 4, 0, 0],
        ['C', 'generic', 4, 4, 0],
        ['D', 'generic', 6, 2, 0],
        ['goal', 'altar', 8, 2, 0],
      ],
      [
        ['S', 'A'],
        ['A', 'B'],
        ['A', 'C'],
        ['B', 'D'],
        ['C', 'D'],
        ['D', 'goal'],
      ],
    );

    const path = pathfindingFindPath(graph, 'S' as PlacedRoomId, 'goal' as PlacedRoomId);
    expect(path).toHaveLength(5); // S → A → B/C → D → goal
    expect(path[0]).toBe('S');
    expect(path[path.length - 1]).toBe('goal');
  });

  it('fear makes invaders take longer but safer route', () => {
    //  S -- scary(fear=4) -- goal  (2 hops, but scary costs 3 = total 3)
    //  S -- A -- B -- goal         (3 hops, all safe = total 3)
    //  With fear multiplier, scary path cost > safe path cost
    //  S -- scary(fear=4) -- goal  cost = 1 + 3 = 4 (fear penalty entering scary)
    //  S -- A -- B -- goal         cost = 3
    const graph = makeGraph(
      [
        ['S', 'spawn', 0, 0, 0],
        ['scary', 'generic', 5, 0, 4],
        ['A', 'generic', 0, 2, 0],
        ['B', 'generic', 5, 2, 0],
        ['goal', 'altar', 10, 0, 0],
      ],
      [
        ['S', 'scary'],
        ['scary', 'goal'],
        ['S', 'A'],
        ['A', 'B'],
        ['B', 'goal'],
      ],
    );

    const pathFearful = pathfindingFindPath(graph, 'S' as PlacedRoomId, 'goal' as PlacedRoomId, { morale: 1 });
    expect(pathFearful).toEqual(['S', 'A', 'B', 'goal']);

    const pathBrave = pathfindingFindPath(graph, 'S' as PlacedRoomId, 'goal' as PlacedRoomId, { morale: 10 });
    expect(pathBrave).toEqual(['S', 'scary', 'goal']);
  });

  it('handles disconnected subgraphs', () => {
    const graph = makeGraph(
      [
        ['A', 'spawn', 0, 0, 0],
        ['B', 'generic', 3, 0, 0],
        ['C', 'generic', 10, 10, 0],
        ['D', 'generic', 13, 10, 0],
      ],
      [
        ['A', 'B'],
        ['C', 'D'], // separate subgraph
      ],
    );

    expect(pathfindingFindPath(graph, 'A' as PlacedRoomId, 'D' as PlacedRoomId)).toEqual([]);
    expect(pathfindingFindPath(graph, 'C' as PlacedRoomId, 'D' as PlacedRoomId)).toEqual(['C', 'D']);
  });

  it('handles graph with no edges', () => {
    const graph = makeGraph(
      [
        ['A', 'spawn', 0, 0, 0],
        ['B', 'altar', 5, 0, 0],
      ],
      [],
    );

    expect(pathfindingFindPath(graph, 'A' as PlacedRoomId, 'B' as PlacedRoomId)).toEqual([]);
  });
});

// ============================================================
// Tile-level A* pathfinding (tilePathfindingFindPath)
// ============================================================

function roomTile(roomId: string): GridTile {
  return {
    occupied: true,
    occupiedBy: 'room',
    roomId: roomId as PlacedRoomId,
    hallwayId: undefined,
    stairId: undefined,
    elevatorId: undefined,
    portalId: undefined,
    connectionType: undefined,
  };
}

function hallwayTile(hallwayId: string): GridTile {
  return {
    occupied: true,
    occupiedBy: 'hallway',
    roomId: undefined,
    hallwayId: hallwayId as HallwayId,
    stairId: undefined,
    elevatorId: undefined,
    portalId: undefined,
    connectionType: undefined,
  };
}

function makeGridWithObstacles(
  obstacles: Array<{ x: number; y: number; tile: GridTile }>,
): GridState {
  let grid = gridCreateEmpty();
  for (const obs of obstacles) {
    grid = gridSetTile(grid, obs.x, obs.y, obs.tile);
  }
  return grid;
}

describe('tilePathfindingFindPath', () => {
  it('should find a straight-line path with no obstacles', () => {
    const grid = gridCreateEmpty();
    const path = tilePathfindingFindPath(grid, { x: 5, y: 5 }, { x: 8, y: 5 });
    expect(path).not.toBeNull();
    expect(path!.length).toBe(4);
    expect(path![0]).toEqual({ x: 5, y: 5 });
    expect(path![3]).toEqual({ x: 8, y: 5 });
  });

  it('should find an L-shaped path around a single obstacle', () => {
    // Wall at (6,5) between start(5,5) and end(7,5)
    const grid = makeGridWithObstacles([
      { x: 6, y: 5, tile: roomTile('wall') },
    ]);
    const path = tilePathfindingFindPath(grid, { x: 5, y: 5 }, { x: 7, y: 5 });
    expect(path).not.toBeNull();
    // Must go around: e.g., (5,5)→(5,4)→(6,4)→(7,4)→(7,5) = 5 tiles
    // or (5,5)→(5,6)→(6,6)→(7,6)→(7,5) = 5 tiles
    expect(path!.length).toBe(5);
    expect(path![0]).toEqual({ x: 5, y: 5 });
    expect(path![path!.length - 1]).toEqual({ x: 7, y: 5 });
    // Path should not include the obstacle
    expect(path!.some((t) => t.x === 6 && t.y === 5)).toBe(false);
  });

  it('should find a multi-turn path around complex obstacles', () => {
    // Build a wall from y=0 to y=18 at x=6, with a gap at y=3
    const obstacles = Array.from({ length: 19 }, (_, i) => ({
      x: 6,
      y: i,
      tile: roomTile('wall'),
    })).filter((obs) => obs.y !== 3);

    const grid = makeGridWithObstacles(obstacles);
    const path = tilePathfindingFindPath(grid, { x: 5, y: 10 }, { x: 7, y: 10 });
    expect(path).not.toBeNull();
    // Must navigate up to gap at y=3, through x=6, then back down
    expect(path!.length).toBeGreaterThan(2);
    expect(path![0]).toEqual({ x: 5, y: 10 });
    expect(path![path!.length - 1]).toEqual({ x: 7, y: 10 });
    // Should pass through the gap
    expect(path!.some((t) => t.x === 6 && t.y === 3)).toBe(true);
  });

  it('should return null when no valid path exists', () => {
    // Complete wall from y=0 to y=19 at x=6
    const obstacles = Array.from({ length: 20 }, (_, i) => ({
      x: 6,
      y: i,
      tile: roomTile('wall'),
    }));
    const grid = makeGridWithObstacles(obstacles);
    const path = tilePathfindingFindPath(grid, { x: 3, y: 5 }, { x: 9, y: 5 });
    expect(path).toBeUndefined();
  });

  it('should return single tile for same start and end', () => {
    const grid = gridCreateEmpty();
    const path = tilePathfindingFindPath(grid, { x: 5, y: 5 }, { x: 5, y: 5 });
    expect(path).toEqual([{ x: 5, y: 5 }]);
  });

  it('should return null when start is occupied', () => {
    const grid = makeGridWithObstacles([
      { x: 5, y: 5, tile: roomTile('room-a') },
    ]);
    const path = tilePathfindingFindPath(grid, { x: 5, y: 5 }, { x: 8, y: 5 });
    expect(path).toBeUndefined();
  });

  it('should return null when end is occupied', () => {
    const grid = makeGridWithObstacles([
      { x: 8, y: 5, tile: roomTile('room-a') },
    ]);
    const path = tilePathfindingFindPath(grid, { x: 5, y: 5 }, { x: 8, y: 5 });
    expect(path).toBeUndefined();
  });

  it('should return null for out-of-bounds start', () => {
    const grid = gridCreateEmpty();
    expect(tilePathfindingFindPath(grid, { x: -1, y: 5 }, { x: 5, y: 5 })).toBeUndefined();
    expect(tilePathfindingFindPath(grid, { x: 20, y: 5 }, { x: 5, y: 5 })).toBeUndefined();
  });

  it('should return null for out-of-bounds end', () => {
    const grid = gridCreateEmpty();
    expect(tilePathfindingFindPath(grid, { x: 5, y: 5 }, { x: 5, y: -1 })).toBeUndefined();
    expect(tilePathfindingFindPath(grid, { x: 5, y: 5 }, { x: 5, y: 20 })).toBeUndefined();
  });

  it('should avoid room-occupied tiles', () => {
    const grid = makeGridWithObstacles([
      { x: 6, y: 5, tile: roomTile('room-a') },
    ]);
    const path = tilePathfindingFindPath(grid, { x: 5, y: 5 }, { x: 7, y: 5 });
    expect(path).not.toBeNull();
    expect(path!.every((t) => !(t.x === 6 && t.y === 5))).toBe(true);
  });

  it('should avoid hallway-occupied tiles', () => {
    const grid = makeGridWithObstacles([
      { x: 6, y: 5, tile: hallwayTile('hw-1') },
    ]);
    const path = tilePathfindingFindPath(grid, { x: 5, y: 5 }, { x: 7, y: 5 });
    expect(path).not.toBeNull();
    expect(path!.every((t) => !(t.x === 6 && t.y === 5))).toBe(true);
  });

  it('should find shortest path (Manhattan optimal for open grid)', () => {
    const grid = gridCreateEmpty();
    const path = tilePathfindingFindPath(grid, { x: 0, y: 0 }, { x: 3, y: 2 });
    expect(path).not.toBeNull();
    // Manhattan distance = 3 + 2 = 5, path length = distance + 1
    expect(path!.length).toBe(6);
  });

  it('should find adjacent tile path (length 2)', () => {
    const grid = gridCreateEmpty();
    const path = tilePathfindingFindPath(grid, { x: 5, y: 5 }, { x: 6, y: 5 });
    expect(path).not.toBeNull();
    expect(path!.length).toBe(2);
    expect(path![0]).toEqual({ x: 5, y: 5 });
    expect(path![1]).toEqual({ x: 6, y: 5 });
  });

  it('should complete pathfinding on a full 20x20 grid within acceptable time', () => {
    const grid = gridCreateEmpty();
    const start = performance.now();
    const path = tilePathfindingFindPath(grid, { x: 0, y: 0 }, { x: 19, y: 19 });
    const elapsed = performance.now() - start;
    expect(path).not.toBeNull();
    expect(path!.length).toBe(39); // Manhattan distance 19+19 = 38, +1 = 39
    expect(elapsed).toBeLessThan(100); // Should complete well under 100ms
  });
});

// ============================================================
// Room-to-room tile pathfinding (tilePathfindingFindRoomToRoomPath)
// ============================================================

function makeFloorWithRooms(
  rooms: Array<{ id: string; tiles: Array<{ x: number; y: number }> }>,
): Floor {
  let grid = gridCreateEmpty();
  for (const room of rooms) {
    for (const t of room.tiles) {
      grid = gridSetTile(grid, t.x, t.y, roomTile(room.id));
    }
  }
  return {
    id: 'floor-1' as FloorId,
    name: 'Floor 1',
    depth: 1,
    biome: 'neutral',
    grid,
    rooms: rooms.map((r) => ({
      id: r.id as PlacedRoomId,
      roomTypeId: 'type-a' as RoomId,
      shapeId: 'shape-1' as RoomShapeId,
      anchorX: r.tiles[0].x,
      anchorY: r.tiles[0].y,
    })),
    hallways: [],
    inhabitants: [],
    connections: [],
    traps: [],
  };
}

describe('tilePathfindingFindRoomToRoomPath', () => {
  it('should find a straight path between adjacent rooms with a gap', () => {
    // Room A at (2,5)(3,5), Room B at (6,5)(7,5), gap at (4,5)(5,5)
    const floor = makeFloorWithRooms([
      { id: 'room-a', tiles: [{ x: 2, y: 5 }, { x: 3, y: 5 }] },
      { id: 'room-b', tiles: [{ x: 6, y: 5 }, { x: 7, y: 5 }] },
    ]);
    const path = tilePathfindingFindRoomToRoomPath(floor, 'room-a' as PlacedRoomId, 'room-b' as PlacedRoomId);
    expect(path).not.toBeNull();
    expect(path![0]).toEqual({ x: 4, y: 5 });
    expect(path![path!.length - 1]).toEqual({ x: 5, y: 5 });
    // Path should not include room tiles
    expect(path!.every((t) => t.x !== 2 && t.x !== 3 && t.x !== 6 && t.x !== 7 || t.y !== 5)).toBe(true);
  });

  it('should find path with turns between offset rooms (0 direct alignment)', () => {
    // Room A at (2,2)(3,2), Room B at (8,6)(9,6)
    const floor = makeFloorWithRooms([
      { id: 'room-a', tiles: [{ x: 2, y: 2 }, { x: 3, y: 2 }] },
      { id: 'room-b', tiles: [{ x: 8, y: 6 }, { x: 9, y: 6 }] },
    ]);
    const path = tilePathfindingFindRoomToRoomPath(floor, 'room-a' as PlacedRoomId, 'room-b' as PlacedRoomId);
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(0);
  });

  it('should return null for same room', () => {
    const floor = makeFloorWithRooms([
      { id: 'room-a', tiles: [{ x: 2, y: 5 }] },
    ]);
    const path = tilePathfindingFindRoomToRoomPath(floor, 'room-a' as PlacedRoomId, 'room-a' as PlacedRoomId);
    expect(path).toBeUndefined();
  });

  it('should return null for non-existent room', () => {
    const floor = makeFloorWithRooms([
      { id: 'room-a', tiles: [{ x: 2, y: 5 }] },
    ]);
    const path = tilePathfindingFindRoomToRoomPath(floor, 'room-a' as PlacedRoomId, 'room-z' as PlacedRoomId);
    expect(path).toBeUndefined();
  });

  it('should return null when no path exists between rooms', () => {
    // Room A at left side, Room B at right side, full wall in between
    const wall = Array.from({ length: 20 }, (_, i) => ({
      x: 10,
      y: i,
      tile: roomTile('wall'),
    }));
    let grid = gridCreateEmpty();
    for (const w of wall) {
      grid = gridSetTile(grid, w.x, w.y, w.tile);
    }
    // Place rooms on either side of wall
    grid = gridSetTile(grid, 5, 5, roomTile('room-a'));
    grid = gridSetTile(grid, 15, 5, roomTile('room-b'));

    const floor: Floor = {
      id: 'floor-1' as FloorId,
      name: 'Floor 1',
      depth: 1,
      biome: 'neutral',
      grid,
      rooms: [
        { id: 'room-a' as PlacedRoomId, roomTypeId: 'type-a' as RoomId, shapeId: 's1' as RoomShapeId, anchorX: 5, anchorY: 5 },
        { id: 'room-b' as PlacedRoomId, roomTypeId: 'type-a' as RoomId, shapeId: 's1' as RoomShapeId, anchorX: 15, anchorY: 5 },
      ],
      hallways: [],
      inhabitants: [],
      connections: [],
      traps: [],
    };

    const path = tilePathfindingFindRoomToRoomPath(floor, 'room-a' as PlacedRoomId, 'room-b' as PlacedRoomId);
    expect(path).toBeUndefined();
  });

  it('should prefer paths with fewer turns when length is equal', () => {
    // Room A at (3,5), Room B at (7,5) — straight horizontal path has 0 turns
    const floor = makeFloorWithRooms([
      { id: 'room-a', tiles: [{ x: 3, y: 5 }] },
      { id: 'room-b', tiles: [{ x: 7, y: 5 }] },
    ]);
    const path = tilePathfindingFindRoomToRoomPath(floor, 'room-a' as PlacedRoomId, 'room-b' as PlacedRoomId);
    expect(path).not.toBeNull();
    // All tiles should be on y=5 (straight line, 0 turns)
    expect(path!.every((t) => t.y === 5)).toBe(true);
  });

  it('should not include room tiles in the returned path', () => {
    const floor = makeFloorWithRooms([
      { id: 'room-a', tiles: [{ x: 3, y: 5 }, { x: 4, y: 5 }] },
      { id: 'room-b', tiles: [{ x: 8, y: 5 }, { x: 9, y: 5 }] },
    ]);
    const path = tilePathfindingFindRoomToRoomPath(floor, 'room-a' as PlacedRoomId, 'room-b' as PlacedRoomId);
    expect(path).not.toBeNull();
    // No tile in path should be a room tile
    const roomTileKeys = new Set(['3,5', '4,5', '8,5', '9,5']);
    for (const t of path!) {
      expect(roomTileKeys.has(`${t.x},${t.y}`)).toBe(false);
    }
  });
});
