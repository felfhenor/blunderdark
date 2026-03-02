import type {
  Floor,
  FloorId,
  PlacedRoom,
  PlacedRoomId,
  RoomId,
  RoomShapeId,
} from '@interfaces';
import type { TransportGroupId } from '@interfaces/room-shape';
import { describe, expect, it } from 'vitest';
import {
  VERTICAL_TRANSPORT_ELEVATOR_TICKS_PER_FLOOR,
  VERTICAL_TRANSPORT_PORTAL_TICKS,
  VERTICAL_TRANSPORT_STAIR_TICKS_PER_FLOOR,
  verticalTransportBuildGraph,
  verticalTransportCalculateTravelTicks,
  verticalTransportFloorsAreConnected,
  verticalTransportGetGroupsOnFloor,
  verticalTransportTravelProcess,
} from '@helpers/vertical-transport';

// --- Test helpers ---

function makeFloor(depth: number, rooms: PlacedRoom[] = []): Floor {
  return {
    id: `floor-${depth}` as FloorId,
    name: `Floor ${depth}`,
    depth,
    biome: 'cavern',
    grid: [],
    rooms,
    hallways: [],
    inhabitants: [],
    connections: [],
  } as Floor;
}

function makeTransportRoom(
  type: 'stair' | 'elevator' | 'portal',
  groupId: string,
  id = 'room-1',
): PlacedRoom {
  return {
    id: id as PlacedRoomId,
    roomTypeId: 'transport-type' as RoomId,
    shapeId: 'shape-1x1' as RoomShapeId,
    anchorX: 0,
    anchorY: 0,
    transportType: type,
    transportGroupId: groupId as TransportGroupId,
  } as PlacedRoom;
}

// --- Constants ---

describe('vertical transport constants', () => {
  it('stair should cost 1 tick per floor', () => {
    expect(VERTICAL_TRANSPORT_STAIR_TICKS_PER_FLOOR).toBe(1);
  });

  it('elevator should cost half a minute per floor (rounded)', () => {
    expect(VERTICAL_TRANSPORT_ELEVATOR_TICKS_PER_FLOOR).toBe(
      Math.round(VERTICAL_TRANSPORT_STAIR_TICKS_PER_FLOOR * 0.5),
    );
  });

  it('portal should be instant (0 ticks)', () => {
    expect(VERTICAL_TRANSPORT_PORTAL_TICKS).toBe(0);
  });
});

// --- verticalTransportBuildGraph ---

describe('verticalTransportBuildGraph', () => {
  it('should return empty graph for empty floors', () => {
    const graph = verticalTransportBuildGraph([]);
    expect(graph.size).toBe(0);
  });

  it('should return empty graph when no transport rooms exist', () => {
    const graph = verticalTransportBuildGraph([makeFloor(1), makeFloor(2)]);
    expect(graph.size).toBe(0);
  });

  it('should not create edges for single-floor transport group', () => {
    const floors = [
      makeFloor(1, [makeTransportRoom('stair', 'g1')]),
    ];
    const graph = verticalTransportBuildGraph(floors);
    // Single floor in a group has no pair to connect to
    expect(graph.size).toBe(0);
  });

  it('should create bidirectional stair edges between two floors', () => {
    const floors = [
      makeFloor(1, [makeTransportRoom('stair', 'g1', 'r1')]),
      makeFloor(2, [makeTransportRoom('stair', 'g1', 'r2')]),
    ];
    const graph = verticalTransportBuildGraph(floors);

    const from1 = graph.get(1)!;
    const from2 = graph.get(2)!;
    expect(from1).toHaveLength(1);
    expect(from1[0]).toEqual({ toDepth: 2, travelTicks: 1 * VERTICAL_TRANSPORT_STAIR_TICKS_PER_FLOOR });
    expect(from2).toHaveLength(1);
    expect(from2[0]).toEqual({ toDepth: 1, travelTicks: 1 * VERTICAL_TRANSPORT_STAIR_TICKS_PER_FLOOR });
  });

  it('should scale stair ticks by floors traversed', () => {
    const floors = [
      makeFloor(1, [makeTransportRoom('stair', 'g1', 'r1')]),
      makeFloor(5, [makeTransportRoom('stair', 'g1', 'r2')]),
    ];
    const graph = verticalTransportBuildGraph(floors);

    const from1 = graph.get(1)!;
    expect(from1[0].travelTicks).toBe(4 * VERTICAL_TRANSPORT_STAIR_TICKS_PER_FLOOR);
  });

  it('should create elevator edges with half-speed ticks', () => {
    const floors = [
      makeFloor(1, [makeTransportRoom('elevator', 'g1', 'r1')]),
      makeFloor(3, [makeTransportRoom('elevator', 'g1', 'r2')]),
    ];
    const graph = verticalTransportBuildGraph(floors);

    const from1 = graph.get(1)!;
    expect(from1[0].travelTicks).toBe(2 * VERTICAL_TRANSPORT_ELEVATOR_TICKS_PER_FLOOR);
  });

  it('should create portal edges with 0 ticks', () => {
    const floors = [
      makeFloor(1, [makeTransportRoom('portal', 'g1', 'r1')]),
      makeFloor(10, [makeTransportRoom('portal', 'g1', 'r2')]),
    ];
    const graph = verticalTransportBuildGraph(floors);

    const from1 = graph.get(1)!;
    expect(from1[0].travelTicks).toBe(0);
  });

  it('should connect all pairs in a 3-floor stair group', () => {
    const floors = [
      makeFloor(1, [makeTransportRoom('stair', 'g1', 'r1')]),
      makeFloor(2, [makeTransportRoom('stair', 'g1', 'r2')]),
      makeFloor(3, [makeTransportRoom('stair', 'g1', 'r3')]),
    ];
    const graph = verticalTransportBuildGraph(floors);

    // Floor 1 should connect to both 2 and 3
    const from1 = graph.get(1)!;
    expect(from1).toHaveLength(2);
    expect(from1.find((e) => e.toDepth === 2)!.travelTicks).toBe(1 * VERTICAL_TRANSPORT_STAIR_TICKS_PER_FLOOR);
    expect(from1.find((e) => e.toDepth === 3)!.travelTicks).toBe(2 * VERTICAL_TRANSPORT_STAIR_TICKS_PER_FLOOR);

    // Floor 2 should connect to both 1 and 3
    const from2 = graph.get(2)!;
    expect(from2).toHaveLength(2);
  });

  it('should handle multiple independent transport groups', () => {
    const floors = [
      makeFloor(1, [
        makeTransportRoom('stair', 'g1', 'r1'),
        makeTransportRoom('portal', 'g2', 'r3'),
      ]),
      makeFloor(2, [makeTransportRoom('stair', 'g1', 'r2')]),
      makeFloor(5, [makeTransportRoom('portal', 'g2', 'r4')]),
    ];
    const graph = verticalTransportBuildGraph(floors);

    // Floor 1 has stair→2 and portal→5
    const from1 = graph.get(1)!;
    expect(from1).toHaveLength(2);
    expect(from1.find((e) => e.toDepth === 2)!.travelTicks).toBe(VERTICAL_TRANSPORT_STAIR_TICKS_PER_FLOOR);
    expect(from1.find((e) => e.toDepth === 5)!.travelTicks).toBe(0);
  });
});

// --- verticalTransportFloorsAreConnected ---

describe('verticalTransportFloorsAreConnected', () => {
  it('should return true for same floor', () => {
    expect(verticalTransportFloorsAreConnected([], 1, 1)).toBe(true);
  });

  it('should return false for disconnected floors', () => {
    const floors = [makeFloor(1), makeFloor(2)];
    expect(verticalTransportFloorsAreConnected(floors, 1, 2)).toBe(false);
  });

  it('should return true for directly connected floors', () => {
    const floors = [
      makeFloor(1, [makeTransportRoom('stair', 'g1', 'r1')]),
      makeFloor(2, [makeTransportRoom('stair', 'g1', 'r2')]),
    ];
    expect(verticalTransportFloorsAreConnected(floors, 1, 2)).toBe(true);
    expect(verticalTransportFloorsAreConnected(floors, 2, 1)).toBe(true);
  });

  it('should return true for indirectly connected floors', () => {
    const floors = [
      makeFloor(1, [makeTransportRoom('stair', 'g1', 'r1')]),
      makeFloor(2, [
        makeTransportRoom('stair', 'g1', 'r2'),
        makeTransportRoom('stair', 'g2', 'r3'),
      ]),
      makeFloor(3, [makeTransportRoom('stair', 'g2', 'r4')]),
    ];
    // 1→2 via g1, 2→3 via g2
    expect(verticalTransportFloorsAreConnected(floors, 1, 3)).toBe(true);
  });

  it('should return false when floors are in separate disconnected groups', () => {
    const floors = [
      makeFloor(1, [makeTransportRoom('stair', 'g1', 'r1')]),
      makeFloor(2, [makeTransportRoom('stair', 'g1', 'r2')]),
      makeFloor(5, [makeTransportRoom('stair', 'g3', 'r5')]),
      makeFloor(6, [makeTransportRoom('stair', 'g3', 'r6')]),
    ];
    // g1 connects 1-2, g3 connects 5-6, no bridge
    expect(verticalTransportFloorsAreConnected(floors, 1, 5)).toBe(false);
  });

  it('should return false for non-existent floor depths', () => {
    const floors = [makeFloor(1)];
    expect(verticalTransportFloorsAreConnected(floors, 1, 99)).toBe(false);
  });
});

// --- verticalTransportCalculateTravelTicks ---

describe('verticalTransportCalculateTravelTicks', () => {
  it('should return 0 for same floor', () => {
    expect(verticalTransportCalculateTravelTicks([], 1, 1)).toBe(0);
  });

  it('should return undefined for disconnected floors', () => {
    const floors = [makeFloor(1), makeFloor(2)];
    expect(verticalTransportCalculateTravelTicks(floors, 1, 2)).toBeUndefined();
  });

  it('should return stair ticks for directly connected floors', () => {
    const floors = [
      makeFloor(1, [makeTransportRoom('stair', 'g1', 'r1')]),
      makeFloor(3, [makeTransportRoom('stair', 'g1', 'r2')]),
    ];
    expect(verticalTransportCalculateTravelTicks(floors, 1, 3)).toBe(
      2 * VERTICAL_TRANSPORT_STAIR_TICKS_PER_FLOOR,
    );
  });

  it('should return 0 for portal-connected floors regardless of distance', () => {
    const floors = [
      makeFloor(1, [makeTransportRoom('portal', 'g1', 'r1')]),
      makeFloor(100, [makeTransportRoom('portal', 'g1', 'r2')]),
    ];
    expect(verticalTransportCalculateTravelTicks(floors, 1, 100)).toBe(0);
  });

  it('should find shortest path with mixed transport types', () => {
    // Floor 1 → Floor 3 via stair (2 ticks) or via portal to Floor 5 then stair to 3
    // Stair g1: floors 1-3 = 2 ticks
    // Portal g2: floors 1-5 = 0 ticks, stair g3: floors 5-3 = 2 ticks → total 2 ticks
    // Both paths equal, should return 2
    const floors = [
      makeFloor(1, [
        makeTransportRoom('stair', 'g1', 'r1'),
        makeTransportRoom('portal', 'g2', 'r3'),
      ]),
      makeFloor(3, [
        makeTransportRoom('stair', 'g1', 'r2'),
        makeTransportRoom('stair', 'g3', 'r5'),
      ]),
      makeFloor(5, [
        makeTransportRoom('portal', 'g2', 'r4'),
        makeTransportRoom('stair', 'g3', 'r6'),
      ]),
    ];
    expect(verticalTransportCalculateTravelTicks(floors, 1, 3)).toBe(
      2 * VERTICAL_TRANSPORT_STAIR_TICKS_PER_FLOOR,
    );
  });

  it('should prefer portal (0 ticks) over stairs when both available', () => {
    const floors = [
      makeFloor(1, [
        makeTransportRoom('stair', 'g1', 'r1'),
        makeTransportRoom('portal', 'g2', 'r3'),
      ]),
      makeFloor(2, [
        makeTransportRoom('stair', 'g1', 'r2'),
        makeTransportRoom('portal', 'g2', 'r4'),
      ]),
    ];
    expect(verticalTransportCalculateTravelTicks(floors, 1, 2)).toBe(0);
  });

  it('should accumulate ticks through multi-hop path', () => {
    // Floor 1→2 via stair, 2→3 via separate stair
    const floors = [
      makeFloor(1, [makeTransportRoom('stair', 'g1', 'r1')]),
      makeFloor(2, [
        makeTransportRoom('stair', 'g1', 'r2'),
        makeTransportRoom('stair', 'g2', 'r3'),
      ]),
      makeFloor(3, [makeTransportRoom('stair', 'g2', 'r4')]),
    ];
    const ticks = verticalTransportCalculateTravelTicks(floors, 1, 3);
    expect(ticks).toBe(2 * VERTICAL_TRANSPORT_STAIR_TICKS_PER_FLOOR);
  });

  it('should return undefined for non-existent destination', () => {
    const floors = [
      makeFloor(1, [makeTransportRoom('stair', 'g1', 'r1')]),
      makeFloor(2, [makeTransportRoom('stair', 'g1', 'r2')]),
    ];
    expect(verticalTransportCalculateTravelTicks(floors, 1, 99)).toBeUndefined();
  });
});

// --- verticalTransportGetGroupsOnFloor ---

describe('verticalTransportGetGroupsOnFloor', () => {
  it('should return empty for non-existent floor', () => {
    expect(verticalTransportGetGroupsOnFloor([], 1)).toEqual([]);
  });

  it('should return empty for floor with no transport rooms', () => {
    const floors = [makeFloor(1)];
    expect(verticalTransportGetGroupsOnFloor(floors, 1)).toEqual([]);
  });

  it('should return transport room with connected floors', () => {
    const stairRoom = makeTransportRoom('stair', 'g1', 'r1');
    const floors = [
      makeFloor(1, [stairRoom]),
      makeFloor(2, [makeTransportRoom('stair', 'g1', 'r2')]),
      makeFloor(3, [makeTransportRoom('stair', 'g1', 'r3')]),
    ];

    const groups = verticalTransportGetGroupsOnFloor(floors, 1);
    expect(groups).toHaveLength(1);
    expect(groups[0].room).toBe(stairRoom);
    expect(groups[0].groupFloors).toEqual([1, 2, 3]);
  });

  it('should return multiple transport rooms on same floor', () => {
    const stairRoom = makeTransportRoom('stair', 'g1', 'r1');
    const portalRoom = makeTransportRoom('portal', 'g2', 'r3');
    const floors = [
      makeFloor(1, [stairRoom, portalRoom]),
      makeFloor(2, [makeTransportRoom('stair', 'g1', 'r2')]),
      makeFloor(5, [makeTransportRoom('portal', 'g2', 'r4')]),
    ];

    const groups = verticalTransportGetGroupsOnFloor(floors, 1);
    expect(groups).toHaveLength(2);
  });

  it('should return sorted group floors', () => {
    const floors = [
      makeFloor(5, [makeTransportRoom('stair', 'g1', 'r1')]),
      makeFloor(1, [makeTransportRoom('stair', 'g1', 'r2')]),
      makeFloor(3, [makeTransportRoom('stair', 'g1', 'r3')]),
    ];

    const groups = verticalTransportGetGroupsOnFloor(floors, 5);
    expect(groups[0].groupFloors).toEqual([1, 3, 5]);
  });
});

// --- verticalTransportTravelProcess ---

describe('verticalTransportTravelProcess', () => {
  it('should do nothing when no inhabitants exist', () => {
    const state = { world: { inhabitants: [] } };
    verticalTransportTravelProcess(state);
    expect(state.world.inhabitants).toEqual([]);
  });

  it('should skip inhabitants without travelTicksRemaining', () => {
    const state = { world: { inhabitants: [{ name: 'Slime' }] } };
    verticalTransportTravelProcess(state);
    expect((state.world.inhabitants[0] as Record<string, unknown>)['travelTicksRemaining']).toBeUndefined();
  });

  it('should decrement travelTicksRemaining by 1', () => {
    const state = { world: { inhabitants: [{ travelTicksRemaining: 5 }] } };
    verticalTransportTravelProcess(state);
    expect(state.world.inhabitants[0].travelTicksRemaining).toBe(4);
  });

  it('should not decrement below 0', () => {
    const state = { world: { inhabitants: [{ travelTicksRemaining: 0 }] } };
    verticalTransportTravelProcess(state);
    expect(state.world.inhabitants[0].travelTicksRemaining).toBe(0);
  });

  it('should decrement from 1 to 0', () => {
    const state = { world: { inhabitants: [{ travelTicksRemaining: 1 }] } };
    verticalTransportTravelProcess(state);
    expect(state.world.inhabitants[0].travelTicksRemaining).toBe(0);
  });

  it('should process multiple inhabitants independently', () => {
    const state = {
      world: {
        inhabitants: [
          { travelTicksRemaining: 3 },
          { travelTicksRemaining: 1 },
          { travelTicksRemaining: 0 },
          {},
        ],
      },
    };
    verticalTransportTravelProcess(state);
    expect(state.world.inhabitants[0].travelTicksRemaining).toBe(2);
    expect(state.world.inhabitants[1].travelTicksRemaining).toBe(0);
    expect(state.world.inhabitants[2].travelTicksRemaining).toBe(0);
    expect((state.world.inhabitants[3] as Record<string, unknown>)['travelTicksRemaining']).toBeUndefined();
  });
});
