import { gridCreateEmpty, gridSetTile } from '@helpers/grid';
import {
  calculateHallwayCost,
  HALLWAY_PLACEMENT_COST_PER_TILE,
  hallwayPlacementFindPointPath,
} from '@helpers/hallway-placement';
import type { GridState, GridTile, PlacedRoomId, TileOffset } from '@interfaces';
import { describe, expect, it } from 'vitest';

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

function makeGridWithRooms(
  rooms: Array<{ id: string; tiles: Array<{ x: number; y: number }> }>,
): GridState {
  let grid = gridCreateEmpty();
  for (const room of rooms) {
    for (const t of room.tiles) {
      grid = gridSetTile(grid, t.x, t.y, roomTile(room.id));
    }
  }
  return grid;
}

describe('hallwayPlacementFindPointPath', () => {
  it('should find a straight path between two empty tiles', () => {
    const grid = gridCreateEmpty();

    const path = hallwayPlacementFindPointPath(grid, { x: 4, y: 5 }, { x: 5, y: 5 });
    expect(path).toBeDefined();
    expect(path!.length).toBe(2);
    expect(path![0]).toEqual({ x: 4, y: 5 });
    expect(path![1]).toEqual({ x: 5, y: 5 });
  });

  it('should find a path between two empty tiles with a gap', () => {
    const grid = gridCreateEmpty();

    const path = hallwayPlacementFindPointPath(grid, { x: 3, y: 5 }, { x: 6, y: 5 });
    expect(path).toBeDefined();
    expect(path!.length).toBe(4);
    expect(path![0]).toEqual({ x: 3, y: 5 });
    expect(path![3]).toEqual({ x: 6, y: 5 });
  });

  it('should return a single-tile path when source and dest are the same empty tile', () => {
    const grid = gridCreateEmpty();

    const path = hallwayPlacementFindPointPath(grid, { x: 3, y: 5 }, { x: 3, y: 5 });
    expect(path).toBeDefined();
    expect(path!.length).toBe(1);
    expect(path![0]).toEqual({ x: 3, y: 5 });
  });

  it('should return undefined when source and dest are the same occupied tile', () => {
    const grid = makeGridWithRooms([
      { id: 'room-a', tiles: [{ x: 3, y: 5 }] },
    ]);

    const path = hallwayPlacementFindPointPath(grid, { x: 3, y: 5 }, { x: 3, y: 5 });
    expect(path).toBeUndefined();
  });

  it('should return undefined when path is blocked', () => {
    const grid = makeGridWithRooms([
      {
        id: 'wall',
        tiles: Array.from({ length: 20 }, (_, i) => ({ x: 4, y: i })),
      },
    ]);

    const path = hallwayPlacementFindPointPath(grid, { x: 2, y: 5 }, { x: 6, y: 5 });
    expect(path).toBeUndefined();
  });

  it('should find a path around obstacles', () => {
    const wallTiles = Array.from({ length: 20 }, (_, i) => ({
      x: 4,
      y: i,
    })).filter((t) => t.y !== 3);

    const grid = makeGridWithRooms([
      { id: 'wall', tiles: wallTiles },
    ]);

    const path = hallwayPlacementFindPointPath(grid, { x: 3, y: 5 }, { x: 5, y: 5 });
    expect(path).toBeDefined();
    expect(path!.length).toBeGreaterThan(2);
    expect(path!.some((t) => t.x === 4 && t.y === 3)).toBe(true);
  });

  it('should find shortest path (BFS guarantees this)', () => {
    const grid = gridCreateEmpty();

    const path = hallwayPlacementFindPointPath(grid, { x: 1, y: 0 }, { x: 2, y: 0 });
    expect(path).toBeDefined();
    expect(path!.length).toBe(2);
  });

  it('should use adjacent empty tiles when source is on an occupied tile', () => {
    const grid = makeGridWithRooms([
      { id: 'room-a', tiles: [{ x: 2, y: 5 }] },
    ]);

    const path = hallwayPlacementFindPointPath(grid, { x: 2, y: 5 }, { x: 5, y: 5 });
    expect(path).toBeDefined();
    // Path starts from an adjacent empty tile, not the room tile itself
    expect(path![0]).not.toEqual({ x: 2, y: 5 });
    expect(path![path!.length - 1]).toEqual({ x: 5, y: 5 });
  });

  it('should use adjacent empty tiles when dest is on an occupied tile', () => {
    const grid = makeGridWithRooms([
      { id: 'room-b', tiles: [{ x: 6, y: 5 }] },
    ]);

    const path = hallwayPlacementFindPointPath(grid, { x: 3, y: 5 }, { x: 6, y: 5 });
    expect(path).toBeDefined();
    expect(path![0]).toEqual({ x: 3, y: 5 });
    // Path ends at an adjacent empty tile, not the room tile itself
    expect(path![path!.length - 1]).not.toEqual({ x: 6, y: 5 });
  });
});

describe('calculateHallwayCost', () => {
  it('should return 0 for an empty path', () => {
    expect(calculateHallwayCost([])).toBe(0);
  });

  it('should return cost per tile for a single tile', () => {
    const path: TileOffset[] = [{ x: 5, y: 5 }];
    expect(calculateHallwayCost(path)).toBe(HALLWAY_PLACEMENT_COST_PER_TILE);
  });

  it('should return path.length * 5 for a multi-tile path', () => {
    const path: TileOffset[] = [
      { x: 3, y: 5 },
      { x: 4, y: 5 },
      { x: 5, y: 5 },
    ];
    expect(calculateHallwayCost(path)).toBe(15);
  });

  it('should scale linearly with path length', () => {
    const path10: TileOffset[] = Array.from({ length: 10 }, (_, i) => ({ x: i, y: 0 }));
    expect(calculateHallwayCost(path10)).toBe(50);
  });

  it('should use HALLWAY_PLACEMENT_COST_PER_TILE constant (5)', () => {
    expect(HALLWAY_PLACEMENT_COST_PER_TILE).toBe(5);
  });
});
