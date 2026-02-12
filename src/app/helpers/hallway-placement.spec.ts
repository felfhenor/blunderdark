import { createEmptyGrid, setTile } from '@helpers/grid';
import { findHallwayPath } from '@helpers/hallway-placement';
import type { GridState, GridTile } from '@interfaces';
import { describe, expect, it } from 'vitest';

function roomTile(roomId: string): GridTile {
  return {
    occupied: true,
    occupiedBy: 'room',
    roomId,
    hallwayId: undefined,
    connectionType: undefined,
  };
}

function makeGridWithRooms(
  rooms: Array<{ id: string; tiles: Array<{ x: number; y: number }> }>,
): GridState {
  let grid = createEmptyGrid();
  for (const room of rooms) {
    for (const t of room.tiles) {
      grid = setTile(grid, t.x, t.y, roomTile(room.id));
    }
  }
  return grid;
}

describe('findHallwayPath', () => {
  it('should find a straight path between two adjacent rooms with a gap', () => {
    const grid = makeGridWithRooms([
      { id: 'room-a', tiles: [{ x: 2, y: 5 }, { x: 3, y: 5 }] },
      { id: 'room-b', tiles: [{ x: 6, y: 5 }, { x: 7, y: 5 }] },
    ]);

    const path = findHallwayPath(grid, 'room-a', 'room-b');
    expect(path).toBeDefined();
    expect(path!.length).toBe(2);
    expect(path![0]).toEqual({ x: 4, y: 5 });
    expect(path![1]).toEqual({ x: 5, y: 5 });
  });

  it('should find a path of length 1 when rooms are separated by one tile', () => {
    const grid = makeGridWithRooms([
      { id: 'room-a', tiles: [{ x: 3, y: 5 }] },
      { id: 'room-b', tiles: [{ x: 5, y: 5 }] },
    ]);

    const path = findHallwayPath(grid, 'room-a', 'room-b');
    expect(path).toBeDefined();
    expect(path!.length).toBe(1);
    expect(path![0]).toEqual({ x: 4, y: 5 });
  });

  it('should find a path even when rooms are directly adjacent', () => {
    const grid = makeGridWithRooms([
      { id: 'room-a', tiles: [{ x: 3, y: 5 }] },
      { id: 'room-b', tiles: [{ x: 4, y: 5 }] },
    ]);

    const path = findHallwayPath(grid, 'room-a', 'room-b');
    expect(path).toBeDefined();
    // Path routes through empty tiles adjacent to both rooms
    expect(path!.length).toBeGreaterThanOrEqual(2);
  });

  it('should return null for self-connection', () => {
    const grid = makeGridWithRooms([
      { id: 'room-a', tiles: [{ x: 3, y: 5 }] },
    ]);

    const path = findHallwayPath(grid, 'room-a', 'room-a');
    expect(path).toBeUndefined();
  });

  it('should return null when path is blocked', () => {
    // Room A at (2,5), Room B at (6,5), wall of rooms at x=4
    const grid = makeGridWithRooms([
      { id: 'room-a', tiles: [{ x: 2, y: 5 }] },
      { id: 'room-b', tiles: [{ x: 6, y: 5 }] },
      {
        id: 'wall',
        tiles: Array.from({ length: 20 }, (_, i) => ({ x: 4, y: i })),
      },
    ]);

    const path = findHallwayPath(grid, 'room-a', 'room-b');
    expect(path).toBeUndefined();
  });

  it('should find a path around obstacles', () => {
    // Room A at (2,5), Room B at (6,5), partial wall at x=4 with gap at y=3
    const wallTiles = Array.from({ length: 20 }, (_, i) => ({
      x: 4,
      y: i,
    })).filter((t) => t.y !== 3);

    const grid = makeGridWithRooms([
      { id: 'room-a', tiles: [{ x: 2, y: 5 }] },
      { id: 'room-b', tiles: [{ x: 6, y: 5 }] },
      { id: 'wall', tiles: wallTiles },
    ]);

    const path = findHallwayPath(grid, 'room-a', 'room-b');
    expect(path).toBeDefined();
    expect(path!.length).toBeGreaterThan(2);
    // Path should go through the gap at (4,3)
    expect(path!.some((t) => t.x === 4 && t.y === 3)).toBe(true);
  });

  it('should return null when source room does not exist', () => {
    const grid = makeGridWithRooms([
      { id: 'room-b', tiles: [{ x: 6, y: 5 }] },
    ]);

    const path = findHallwayPath(grid, 'room-a', 'room-b');
    expect(path).toBeUndefined();
  });

  it('should find shortest path (BFS guarantees this)', () => {
    const grid = makeGridWithRooms([
      { id: 'room-a', tiles: [{ x: 0, y: 0 }] },
      { id: 'room-b', tiles: [{ x: 3, y: 0 }] },
    ]);

    const path = findHallwayPath(grid, 'room-a', 'room-b');
    expect(path).toBeDefined();
    expect(path!.length).toBe(2);
  });
});
