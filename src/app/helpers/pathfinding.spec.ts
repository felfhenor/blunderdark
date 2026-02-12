import { describe, expect, it } from 'vitest';
import type { DungeonGraph, PathEdge, PathNode } from '@helpers/pathfinding';
import type { Floor } from '@interfaces';

const {
  buildDungeonGraph,
  findPath,
  getPathCost,
  findPathWithObjectives,
  recalculatePath,
} = await import('@helpers/pathfinding');

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
  const nodes = new Map<string, PathNode>();
  const adjacency = new Map<string, PathEdge[]>();

  for (const [id, roomTypeId, x, y, fearLevel] of nodeDefs) {
    nodes.set(id, { roomId: id, roomTypeId, x, y, fearLevel });
    adjacency.set(id, []);
  }

  for (const [from, to, cost] of edgeDefs) {
    const baseCost = cost ?? 1;
    const edgesFrom = adjacency.get(from);
    if (edgesFrom) edgesFrom.push({ toRoomId: to, baseCost });
    const edgesTo = adjacency.get(to);
    if (edgesTo) edgesTo.push({ toRoomId: from, baseCost });
  }

  return { nodes, adjacency };
}

function makeFloor(overrides: Partial<Floor> = {}): Floor {
  return {
    id: 'floor-1',
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

describe('buildDungeonGraph', () => {
  it('creates nodes from floor rooms', () => {
    const floor = makeFloor({
      rooms: [
        { id: 'r1', roomTypeId: 'type-a', shapeId: 's1', anchorX: 0, anchorY: 0 },
        { id: 'r2', roomTypeId: 'type-b', shapeId: 's1', anchorX: 5, anchorY: 0 },
      ],
    });

    const graph = buildDungeonGraph(floor);
    expect(graph.nodes.size).toBe(2);
    expect(graph.nodes.get('r1')!.roomTypeId).toBe('type-a');
    expect(graph.nodes.get('r2')!.x).toBe(5);
  });

  it('creates edges from connections', () => {
    const floor = makeFloor({
      rooms: [
        { id: 'r1', roomTypeId: 'type-a', shapeId: 's1', anchorX: 0, anchorY: 0 },
        { id: 'r2', roomTypeId: 'type-b', shapeId: 's1', anchorX: 3, anchorY: 0 },
      ],
      connections: [
        { id: 'c1', roomAId: 'r1', roomBId: 'r2', edgeTiles: [] },
      ],
    });

    const graph = buildDungeonGraph(floor);
    const r1Edges = graph.adjacency.get('r1')!;
    const r2Edges = graph.adjacency.get('r2')!;
    expect(r1Edges).toHaveLength(1);
    expect(r1Edges[0].toRoomId).toBe('r2');
    expect(r2Edges).toHaveLength(1);
    expect(r2Edges[0].toRoomId).toBe('r1');
  });

  it('creates edges from hallways', () => {
    const floor = makeFloor({
      rooms: [
        { id: 'r1', roomTypeId: 'type-a', shapeId: 's1', anchorX: 0, anchorY: 0 },
        { id: 'r2', roomTypeId: 'type-b', shapeId: 's1', anchorX: 10, anchorY: 0 },
      ],
      hallways: [
        { id: 'h1', startRoomId: 'r1', endRoomId: 'r2', tiles: [], upgrades: [] },
      ],
    });

    const graph = buildDungeonGraph(floor);
    expect(graph.adjacency.get('r1')!).toHaveLength(1);
    expect(graph.adjacency.get('r2')!).toHaveLength(1);
  });

  it('does not create duplicate edges for same room pair', () => {
    const floor = makeFloor({
      rooms: [
        { id: 'r1', roomTypeId: 'type-a', shapeId: 's1', anchorX: 0, anchorY: 0 },
        { id: 'r2', roomTypeId: 'type-b', shapeId: 's1', anchorX: 3, anchorY: 0 },
      ],
      connections: [
        { id: 'c1', roomAId: 'r1', roomBId: 'r2', edgeTiles: [] },
      ],
      hallways: [
        { id: 'h1', startRoomId: 'r1', endRoomId: 'r2', tiles: [], upgrades: [] },
      ],
    });

    const graph = buildDungeonGraph(floor);
    expect(graph.adjacency.get('r1')!).toHaveLength(1);
  });

  it('applies fear levels from roomFearLevels map', () => {
    const floor = makeFloor({
      rooms: [
        { id: 'r1', roomTypeId: 'type-a', shapeId: 's1', anchorX: 0, anchorY: 0 },
      ],
    });

    const fearMap = new Map([['r1', 5]]);
    const graph = buildDungeonGraph(floor, fearMap);
    expect(graph.nodes.get('r1')!.fearLevel).toBe(5);
  });

  it('defaults fear level to 0 when not in map', () => {
    const floor = makeFloor({
      rooms: [
        { id: 'r1', roomTypeId: 'type-a', shapeId: 's1', anchorX: 0, anchorY: 0 },
      ],
    });

    const graph = buildDungeonGraph(floor);
    expect(graph.nodes.get('r1')!.fearLevel).toBe(0);
  });

  it('edges have default base cost of 1', () => {
    const floor = makeFloor({
      rooms: [
        { id: 'r1', roomTypeId: 'type-a', shapeId: 's1', anchorX: 0, anchorY: 0 },
        { id: 'r2', roomTypeId: 'type-b', shapeId: 's1', anchorX: 3, anchorY: 0 },
      ],
      connections: [
        { id: 'c1', roomAId: 'r1', roomBId: 'r2', edgeTiles: [] },
      ],
    });

    const graph = buildDungeonGraph(floor);
    expect(graph.adjacency.get('r1')![0].baseCost).toBe(1);
  });

  it('graph updates when rooms/connections change (rebuild)', () => {
    const floor1 = makeFloor({
      rooms: [
        { id: 'r1', roomTypeId: 'type-a', shapeId: 's1', anchorX: 0, anchorY: 0 },
        { id: 'r2', roomTypeId: 'type-b', shapeId: 's1', anchorX: 3, anchorY: 0 },
      ],
      connections: [],
    });

    const graph1 = buildDungeonGraph(floor1);
    expect(graph1.adjacency.get('r1')!).toHaveLength(0);

    const floor2 = makeFloor({
      rooms: floor1.rooms,
      connections: [
        { id: 'c1', roomAId: 'r1', roomBId: 'r2', edgeTiles: [] },
      ],
    });

    const graph2 = buildDungeonGraph(floor2);
    expect(graph2.adjacency.get('r1')!).toHaveLength(1);
  });
});

// ============================================================
// US-002: A* pathfinding with fear-based cost
// ============================================================

describe('findPath', () => {
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

    const path = findPath(graph, 'spawn', 'altar');
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

    const path = findPath(graph, 'spawn', 'altar');
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

    const path = findPath(graph, 'spawn', 'island');
    expect(path).toEqual([]);
  });

  it('returns single node when start equals goal', () => {
    const graph = makeGraph(
      [['spawn', 'spawn', 0, 0, 0]],
      [],
    );

    const path = findPath(graph, 'spawn', 'spawn');
    expect(path).toEqual(['spawn']);
  });

  it('returns empty array for non-existent start node', () => {
    const graph = makeGraph(
      [['altar', 'altar', 0, 0, 0]],
      [],
    );

    expect(findPath(graph, 'missing', 'altar')).toEqual([]);
  });

  it('returns empty array for non-existent goal node', () => {
    const graph = makeGraph(
      [['spawn', 'spawn', 0, 0, 0]],
      [],
    );

    expect(findPath(graph, 'spawn', 'missing')).toEqual([]);
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

    const path = findPath(graph, 'spawn', 'altar', {
      blockedNodes: new Set(['A']),
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

    const path = findPath(graph, 'spawn', 'altar', {
      blockedNodes: new Set(['blocked']),
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

    const path = findPath(graph, 'spawn', 'altar', {
      blockedNodes: new Set(['A']),
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
    const pathWithFear = findPath(graph, 'spawn', 'altar', { morale: 2 });
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

    const path = findPath(graph, 'spawn', 'altar', { morale: 1 });
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
    const path = findPath(graph, 'spawn', 'altar', { morale: 10 });
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
    const path = findPath(graph, 'spawn', 'altar', {
      morale: 1,
      fearCostMultiplier: 6,
    });
    expect(path).toEqual(['spawn', 'A', 'B', 'C', 'D', 'altar']);
  });
});

describe('getPathCost', () => {
  it('returns 0 for single-node path', () => {
    const graph = makeGraph([['A', 'generic', 0, 0, 0]], []);
    expect(getPathCost(graph, ['A'])).toBe(0);
  });

  it('returns 0 for empty path', () => {
    const graph = makeGraph([], []);
    expect(getPathCost(graph, [])).toBe(0);
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

    expect(getPathCost(graph, ['A', 'B', 'C'])).toBe(2);
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
    expect(getPathCost(graph, ['A', 'B', 'C'])).toBe(2);
    // With low morale: entering B costs 3, then B→C costs 1 = 4
    expect(getPathCost(graph, ['A', 'B', 'C'], { morale: 1 })).toBe(4);
  });
});

// ============================================================
// US-003: Secondary objectives and dynamic recalculation
// ============================================================

describe('findPathWithObjectives', () => {
  it('returns direct path when no secondary objectives', () => {
    const graph = makeGraph(
      [
        ['spawn', 'spawn', 0, 0, 0],
        ['altar', 'altar', 3, 0, 0],
      ],
      [['spawn', 'altar']],
    );

    const path = findPathWithObjectives(graph, 'spawn', 'altar', []);
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

    const path = findPathWithObjectives(
      graph, 'spawn', 'altar',
      [{ roomId: 'vault', priority: 5 }],
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

    const path = findPathWithObjectives(
      graph, 'spawn', 'altar',
      [{ roomId: 'vault', priority: 5 }],
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

    const path = findPathWithObjectives(
      graph, 'spawn', 'altar',
      [
        { roomId: 'throne', priority: 3 },
        { roomId: 'vault', priority: 8 },
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

    const path = findPathWithObjectives(graph, 'spawn', 'altar', []);
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

    const path = findPathWithObjectives(
      graph, 'spawn', 'altar',
      [{ roomId: 'island', priority: 10 }],
    );
    expect(path).toEqual(['spawn', 'altar']);
  });
});

describe('recalculatePath', () => {
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

    const path = recalculatePath(graph, 'current', 'altar', 'A');
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

    const path = recalculatePath(graph, 'current', 'altar', 'A');
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
    const path = recalculatePath(graph, 'current', 'altar', 'B', {
      blockedNodes: new Set(['A']),
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
    const path = recalculatePath(graph, 'current', 'altar', 'nonexistent', {
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

    const path = findPath(graph, 'S', 'goal');
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

    const pathFearful = findPath(graph, 'S', 'goal', { morale: 1 });
    expect(pathFearful).toEqual(['S', 'A', 'B', 'goal']);

    const pathBrave = findPath(graph, 'S', 'goal', { morale: 10 });
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

    expect(findPath(graph, 'A', 'D')).toEqual([]);
    expect(findPath(graph, 'C', 'D')).toEqual(['C', 'D']);
  });

  it('handles graph with no edges', () => {
    const graph = makeGraph(
      [
        ['A', 'spawn', 0, 0, 0],
        ['B', 'altar', 5, 0, 0],
      ],
      [],
    );

    expect(findPath(graph, 'A', 'B')).toEqual([]);
  });
});
