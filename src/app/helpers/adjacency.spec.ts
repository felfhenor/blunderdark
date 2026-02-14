import {
  adjacencyAddRoom,
  adjacencyAreRoomsAdjacent,
  adjacencyCreateMap,
  adjacencyGetAdjacentRooms,
  adjacencyGetSharedEdges,
  adjacencyRemoveRoom,
} from '@helpers/adjacency';
import type { PlacedRoomId, TileOffset } from '@interfaces';
import { describe, expect, it } from 'vitest';

describe('adjacencyAreRoomsAdjacent', () => {
  it('should detect horizontal adjacency', () => {
    const tilesA: TileOffset[] = [{ x: 0, y: 0 }];
    const tilesB: TileOffset[] = [{ x: 1, y: 0 }];
    expect(adjacencyAreRoomsAdjacent(tilesA, tilesB)).toBe(true);
  });

  it('should detect vertical adjacency', () => {
    const tilesA: TileOffset[] = [{ x: 0, y: 0 }];
    const tilesB: TileOffset[] = [{ x: 0, y: 1 }];
    expect(adjacencyAreRoomsAdjacent(tilesA, tilesB)).toBe(true);
  });

  it('should NOT detect diagonal adjacency', () => {
    const tilesA: TileOffset[] = [{ x: 0, y: 0 }];
    const tilesB: TileOffset[] = [{ x: 1, y: 1 }];
    expect(adjacencyAreRoomsAdjacent(tilesA, tilesB)).toBe(false);
  });

  it('should return false for non-touching tiles', () => {
    const tilesA: TileOffset[] = [{ x: 0, y: 0 }];
    const tilesB: TileOffset[] = [{ x: 5, y: 5 }];
    expect(adjacencyAreRoomsAdjacent(tilesA, tilesB)).toBe(false);
  });

  it('should detect adjacency for multi-tile rooms', () => {
    const tilesA: TileOffset[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ];
    const tilesB: TileOffset[] = [
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ];
    expect(adjacencyAreRoomsAdjacent(tilesA, tilesB)).toBe(true);
  });

  it('should detect adjacency when only one pair of tiles shares an edge', () => {
    const tilesA: TileOffset[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ];
    const tilesB: TileOffset[] = [
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ];
    expect(adjacencyAreRoomsAdjacent(tilesA, tilesB)).toBe(true);
  });

  it('should return false for empty tile arrays', () => {
    expect(adjacencyAreRoomsAdjacent([], [])).toBe(false);
    expect(adjacencyAreRoomsAdjacent([{ x: 0, y: 0 }], [])).toBe(false);
  });

  it('should detect left adjacency', () => {
    const tilesA: TileOffset[] = [{ x: 5, y: 5 }];
    const tilesB: TileOffset[] = [{ x: 4, y: 5 }];
    expect(adjacencyAreRoomsAdjacent(tilesA, tilesB)).toBe(true);
  });

  it('should detect above adjacency', () => {
    const tilesA: TileOffset[] = [{ x: 5, y: 5 }];
    const tilesB: TileOffset[] = [{ x: 5, y: 4 }];
    expect(adjacencyAreRoomsAdjacent(tilesA, tilesB)).toBe(true);
  });
});

describe('adjacencyGetSharedEdges', () => {
  it('should return shared edge pairs', () => {
    const tilesA: TileOffset[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ];
    const tilesB: TileOffset[] = [{ x: 2, y: 0 }];
    const edges = adjacencyGetSharedEdges(tilesA, tilesB);
    expect(edges).toHaveLength(1);
    expect(edges[0][0]).toEqual({ x: 1, y: 0 });
    expect(edges[0][1]).toEqual({ x: 2, y: 0 });
  });

  it('should return empty for non-adjacent tiles', () => {
    const tilesA: TileOffset[] = [{ x: 0, y: 0 }];
    const tilesB: TileOffset[] = [{ x: 5, y: 5 }];
    expect(adjacencyGetSharedEdges(tilesA, tilesB)).toHaveLength(0);
  });

  it('should return multiple edges for rooms sharing a long edge', () => {
    const tilesA: TileOffset[] = [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
    ];
    const tilesB: TileOffset[] = [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ];
    const edges = adjacencyGetSharedEdges(tilesA, tilesB);
    expect(edges).toHaveLength(3);
  });
});

describe('AdjacencyMap operations', () => {
  it('should create an empty adjacency map', () => {
    const map = adjacencyCreateMap();
    expect(Object.keys(map)).toHaveLength(0);
  });

  it('should add a room with no neighbors', () => {
    let map = adjacencyCreateMap();
    map = adjacencyAddRoom(map, 'room-a' as PlacedRoomId, [{ x: 0, y: 0 }], []);
    expect(adjacencyGetAdjacentRooms(map, 'room-a' as PlacedRoomId)).toEqual([]);
  });

  it('should detect adjacency when adding a room near existing rooms', () => {
    let map = adjacencyCreateMap();
    const roomATiles = [{ x: 0, y: 0 }];
    const roomBTiles = [{ x: 1, y: 0 }];

    map = adjacencyAddRoom(map, 'room-a' as PlacedRoomId, roomATiles, []);
    map = adjacencyAddRoom(map, 'room-b' as PlacedRoomId, roomBTiles, [
      { id: 'room-a' as PlacedRoomId, tiles: roomATiles },
    ]);

    expect(adjacencyGetAdjacentRooms(map, 'room-a' as PlacedRoomId)).toContain('room-b');
    expect(adjacencyGetAdjacentRooms(map, 'room-b' as PlacedRoomId)).toContain('room-a');
  });

  it('should remove a room and clean up all references', () => {
    let map = adjacencyCreateMap();
    const roomATiles = [{ x: 0, y: 0 }];
    const roomBTiles = [{ x: 1, y: 0 }];

    map = adjacencyAddRoom(map, 'room-a' as PlacedRoomId, roomATiles, []);
    map = adjacencyAddRoom(map, 'room-b' as PlacedRoomId, roomBTiles, [
      { id: 'room-a' as PlacedRoomId, tiles: roomATiles },
    ]);

    map = adjacencyRemoveRoom(map, 'room-b' as PlacedRoomId);

    expect(adjacencyGetAdjacentRooms(map, 'room-a' as PlacedRoomId)).toEqual([]);
    expect(adjacencyGetAdjacentRooms(map, 'room-b' as PlacedRoomId)).toEqual([]);
  });

  it('should return empty array for unknown room ID', () => {
    const map = adjacencyCreateMap();
    expect(adjacencyGetAdjacentRooms(map, 'nonexistent' as PlacedRoomId)).toEqual([]);
  });

  it('should handle multiple adjacent rooms', () => {
    let map = adjacencyCreateMap();
    const roomATiles = [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ];
    const roomBTiles = [{ x: 0, y: 0 }];
    const roomCTiles = [{ x: 2, y: 0 }];

    map = adjacencyAddRoom(map, 'room-a' as PlacedRoomId, roomATiles, []);
    map = adjacencyAddRoom(map, 'room-b' as PlacedRoomId, roomBTiles, [
      { id: 'room-a' as PlacedRoomId, tiles: roomATiles },
    ]);
    map = adjacencyAddRoom(map, 'room-c' as PlacedRoomId, roomCTiles, [
      { id: 'room-a' as PlacedRoomId, tiles: roomATiles },
      { id: 'room-b' as PlacedRoomId, tiles: roomBTiles },
    ]);

    const adjacentToA = adjacencyGetAdjacentRooms(map, 'room-a' as PlacedRoomId);
    expect(adjacentToA).toContain('room-b');
    expect(adjacentToA).toContain('room-c');
    expect(adjacentToA).toHaveLength(2);
  });
});
