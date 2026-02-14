import type { PlacedRoom, PlacedRoomId, RoomId, RoomShape } from '@interfaces';
import { describe, expect, it } from 'vitest';

import {
  roomShapeGetAbsoluteTiles,
  roomShapeGetRotated,
  roomShapeGetBounds,
  roomShapeResolve,
  roomShapeRotateTile90,
  roomShapeRotateTiles,
  roomShapeFitsInGrid,
} from '@helpers/room-shapes';

const square2x2: RoomShape = {
  id: 'test-2x2',
  name: 'Square 2x2',
  width: 2,
  height: 2,
  tiles: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ],
};

const lShape: RoomShape = {
  id: 'test-l',
  name: 'L-Shape',
  width: 3,
  height: 3,
  tiles: [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
  ],
};

const iShape: RoomShape = {
  id: 'test-i',
  name: 'I-Shape',
  width: 1,
  height: 4,
  tiles: [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: 2 },
    { x: 0, y: 3 },
  ],
};

const emptyShape: RoomShape = {
  id: 'test-empty',
  name: 'Empty',
  width: 0,
  height: 0,
  tiles: [],
};

describe('roomShapeGetAbsoluteTiles', () => {
  it('should offset tiles by anchor position', () => {
    const result = roomShapeGetAbsoluteTiles(square2x2, 5, 3);
    expect(result).toEqual([
      { x: 5, y: 3 },
      { x: 6, y: 3 },
      { x: 5, y: 4 },
      { x: 6, y: 4 },
    ]);
  });

  it('should work with anchor at origin', () => {
    const result = roomShapeGetAbsoluteTiles(square2x2, 0, 0);
    expect(result).toEqual(square2x2.tiles);
  });

  it('should work with L-shape', () => {
    const result = roomShapeGetAbsoluteTiles(lShape, 10, 10);
    expect(result).toEqual([
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 },
      { x: 11, y: 12 },
      { x: 12, y: 12 },
    ]);
  });

  it('should return empty array for empty shape', () => {
    const result = roomShapeGetAbsoluteTiles(emptyShape, 5, 5);
    expect(result).toEqual([]);
  });
});

describe('roomShapeGetBounds', () => {
  it('should return correct bounds for 2x2 square', () => {
    expect(roomShapeGetBounds(square2x2)).toEqual({ width: 2, height: 2 });
  });

  it('should return correct bounds for L-shape', () => {
    expect(roomShapeGetBounds(lShape)).toEqual({ width: 3, height: 3 });
  });

  it('should return correct bounds for I-shape', () => {
    expect(roomShapeGetBounds(iShape)).toEqual({ width: 1, height: 4 });
  });

  it('should return zero bounds for empty shape', () => {
    expect(roomShapeGetBounds(emptyShape)).toEqual({ width: 0, height: 0 });
  });
});

describe('roomShapeFitsInGrid', () => {
  const gridSize = 20;

  it('should fit at origin', () => {
    expect(roomShapeFitsInGrid(square2x2, 0, 0, gridSize)).toBe(true);
  });

  it('should fit at valid interior position', () => {
    expect(roomShapeFitsInGrid(square2x2, 10, 10, gridSize)).toBe(true);
  });

  it('should fit at maximum valid position', () => {
    expect(roomShapeFitsInGrid(square2x2, 18, 18, gridSize)).toBe(true);
  });

  it('should not fit when extending beyond right edge', () => {
    expect(roomShapeFitsInGrid(square2x2, 19, 0, gridSize)).toBe(false);
  });

  it('should not fit when extending beyond bottom edge', () => {
    expect(roomShapeFitsInGrid(square2x2, 0, 19, gridSize)).toBe(false);
  });

  it('should not fit with negative anchor', () => {
    expect(roomShapeFitsInGrid(square2x2, -1, 0, gridSize)).toBe(false);
  });

  it('should handle I-shape at bottom edge', () => {
    expect(roomShapeFitsInGrid(iShape, 0, 16, gridSize)).toBe(true);
    expect(roomShapeFitsInGrid(iShape, 0, 17, gridSize)).toBe(false);
  });

  it('should handle L-shape at corner', () => {
    expect(roomShapeFitsInGrid(lShape, 17, 17, gridSize)).toBe(true);
    expect(roomShapeFitsInGrid(lShape, 18, 18, gridSize)).toBe(false);
  });
});

describe('PlacedRoom serialization', () => {
  it('should be JSON-serializable and round-trip correctly', () => {
    const placed: PlacedRoom = {
      id: 'room-001' as PlacedRoomId,
      roomTypeId: 'room-type-001' as RoomId,
      shapeId: 'test-2x2',
      anchorX: 5,
      anchorY: 3,
    };

    const json = JSON.stringify(placed);
    const parsed = JSON.parse(json) as PlacedRoom;

    expect(parsed.id).toBe('room-001');
    expect(parsed.shapeId).toBe('test-2x2');
    expect(parsed.anchorX).toBe(5);
    expect(parsed.anchorY).toBe(3);
  });

  it('should store shapeId not full shape data', () => {
    const placed: PlacedRoom = {
      id: 'room-001' as PlacedRoomId,
      roomTypeId: 'room-type-001' as RoomId,
      shapeId: 'test-2x2',
      anchorX: 0,
      anchorY: 0,
    };

    const json = JSON.stringify(placed);
    expect(json).not.toContain('tiles');
    expect(json).toContain('shapeId');
  });
});

describe('roomShapeResolve', () => {
  it('should return fallback shape when shape ID is not found in content', () => {
    const placed: PlacedRoom = {
      id: 'room-001' as PlacedRoomId,
      roomTypeId: 'room-type-001' as RoomId,
      shapeId: 'nonexistent-shape-id',
      anchorX: 0,
      anchorY: 0,
    };

    const shape = roomShapeResolve(placed);
    expect(shape.id).toBe('fallback');
    expect(shape.tiles).toHaveLength(1);
  });
});

describe('roomShapeRotateTile90', () => {
  it('should rotate (0,0) in a 3-tall shape to (2,0)', () => {
    expect(roomShapeRotateTile90({ x: 0, y: 0 }, 3)).toEqual({ x: 2, y: 0 });
  });

  it('should rotate (0,2) in a 3-tall shape to (0,0)', () => {
    expect(roomShapeRotateTile90({ x: 0, y: 2 }, 3)).toEqual({ x: 0, y: 0 });
  });

  it('should rotate (2,2) in a 3-tall shape to (0,2)', () => {
    expect(roomShapeRotateTile90({ x: 2, y: 2 }, 3)).toEqual({ x: 0, y: 2 });
  });
});

describe('roomShapeRotateTiles', () => {
  it('should return original tiles for rotation 0', () => {
    const result = roomShapeRotateTiles(lShape.tiles, lShape.width, lShape.height, 0);
    expect(result.tiles).toEqual(lShape.tiles);
    expect(result.width).toBe(3);
    expect(result.height).toBe(3);
  });

  it('should rotate L-shape 90° clockwise', () => {
    // Original L-shape (3x3):     After 90° CW:
    //   X . .                       X X X
    //   X . .                       X . .
    //   X X X                       X . .
    const result = roomShapeRotateTiles(lShape.tiles, lShape.width, lShape.height, 1);
    expect(result.width).toBe(3);
    expect(result.height).toBe(3);

    const tileSet = new Set(result.tiles.map((t) => `${t.x},${t.y}`));
    expect(tileSet).toContain('0,0');
    expect(tileSet).toContain('1,0');
    expect(tileSet).toContain('2,0');
    expect(tileSet).toContain('0,1');
    expect(tileSet).toContain('0,2');
    expect(result.tiles).toHaveLength(5);
  });

  it('should rotate L-shape 180°', () => {
    // Original:       After 180°:
    //   X . .          X X X
    //   X . .          . . X
    //   X X X          . . X
    const result = roomShapeRotateTiles(lShape.tiles, lShape.width, lShape.height, 2);
    expect(result.width).toBe(3);
    expect(result.height).toBe(3);

    const tileSet = new Set(result.tiles.map((t) => `${t.x},${t.y}`));
    expect(tileSet).toContain('0,0');
    expect(tileSet).toContain('1,0');
    expect(tileSet).toContain('2,0');
    expect(tileSet).toContain('2,1');
    expect(tileSet).toContain('2,2');
    expect(result.tiles).toHaveLength(5);
  });

  it('should rotate L-shape 270° (3 steps)', () => {
    // Original:       After 270° CW:
    //   X . .          . . X
    //   X . .          . . X
    //   X X X          X X X
    const result = roomShapeRotateTiles(lShape.tiles, lShape.width, lShape.height, 3);
    expect(result.width).toBe(3);
    expect(result.height).toBe(3);

    const tileSet = new Set(result.tiles.map((t) => `${t.x},${t.y}`));
    expect(result.tiles).toHaveLength(5);
    expect(tileSet).toContain('2,0');
    expect(tileSet).toContain('2,1');
    expect(tileSet).toContain('0,2');
    expect(tileSet).toContain('1,2');
    expect(tileSet).toContain('2,2');
  });

  it('should rotate I-shape 90° to horizontal', () => {
    // I-shape is 1x4 vertical → after 90° should be 4x1 horizontal
    const result = roomShapeRotateTiles(iShape.tiles, iShape.width, iShape.height, 1);
    expect(result.width).toBe(4);
    expect(result.height).toBe(1);

    const tileSet = new Set(result.tiles.map((t) => `${t.x},${t.y}`));
    expect(tileSet).toContain('0,0');
    expect(tileSet).toContain('1,0');
    expect(tileSet).toContain('2,0');
    expect(tileSet).toContain('3,0');
  });

  it('should return to original after 4 rotations', () => {
    const result = roomShapeRotateTiles(lShape.tiles, lShape.width, lShape.height, 0);
    // Rotate 4 times manually
    let { tiles, width, height } = roomShapeRotateTiles(
      lShape.tiles,
      lShape.width,
      lShape.height,
      1,
    );
    ({ tiles, width, height } = roomShapeRotateTiles(tiles, width, height, 1));
    ({ tiles, width, height } = roomShapeRotateTiles(tiles, width, height, 1));
    ({ tiles, width, height } = roomShapeRotateTiles(tiles, width, height, 1));

    expect(width).toBe(lShape.width);
    expect(height).toBe(lShape.height);

    const originalSet = new Set(
      result.tiles.map((t) => `${t.x},${t.y}`),
    );
    const rotatedSet = new Set(tiles.map((t) => `${t.x},${t.y}`));
    expect(rotatedSet).toEqual(originalSet);
  });
});

describe('roomShapeGetRotated', () => {
  it('should return the same shape for rotation 0', () => {
    const result = roomShapeGetRotated(lShape, 0);
    expect(result).toBe(lShape);
  });

  it('should return a new shape with rotated tiles for rotation 1', () => {
    const result = roomShapeGetRotated(lShape, 1);
    expect(result).not.toBe(lShape);
    expect(result.id).toBe(lShape.id);
    expect(result.name).toBe(lShape.name);
    expect(result.tiles).toHaveLength(5);
  });

  it('should preserve symmetric shapes', () => {
    // 2x2 square is rotationally symmetric
    const result = roomShapeGetRotated(square2x2, 1);
    const originalSet = new Set(
      square2x2.tiles.map((t) => `${t.x},${t.y}`),
    );
    const rotatedSet = new Set(result.tiles.map((t) => `${t.x},${t.y}`));
    expect(rotatedSet).toEqual(originalSet);
  });
});
