import type {
  PlacedRoom,
  PlacedRoomId,
  RoomId,
  RoomShapeContent,
  RoomShapeId,
} from '@interfaces';
import { describe, expect, it } from 'vitest';

import {
  roomShapeFitsInGrid,
  roomShapeGetAbsoluteTiles,
  roomShapeGetBounds,
  roomShapeGetRotated,
  roomShapeResolve,
  roomShapeRotateTile90,
  roomShapeRotateTiles,
} from '@helpers/room-shapes';

const square2x2: RoomShapeContent = {
  id: 'test-2x2' as RoomShapeId,
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

const lShape: RoomShapeContent = {
  id: 'test-l' as RoomShapeId,
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

const iShape: RoomShapeContent = {
  id: 'test-i' as RoomShapeId,
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

const square1x1: RoomShapeContent = {
  id: 'test-1x1' as RoomShapeId,
  name: 'Square 1x1',
  width: 1,
  height: 1,
  tiles: [{ x: 0, y: 0 }],
};

const square3x3: RoomShapeContent = {
  id: 'test-3x3' as RoomShapeId,
  name: 'Square 3x3',
  width: 3,
  height: 3,
  tiles: [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
    { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
    { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 },
  ],
};

const square4x4: RoomShapeContent = {
  id: 'test-4x4' as RoomShapeId,
  name: 'Square 4x4',
  width: 4,
  height: 4,
  tiles: [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 },
    { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 },
    { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 },
    { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 },
  ],
};

const tShape: RoomShapeContent = {
  id: 'test-t' as RoomShapeId,
  name: 'T-Shape',
  width: 3,
  height: 2,
  tiles: [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
    { x: 1, y: 1 },
  ],
};

const smallLShape: RoomShapeContent = {
  id: 'test-small-l' as RoomShapeId,
  name: 'Small L-Shape',
  width: 2,
  height: 3,
  tiles: [
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 2 }, { x: 1, y: 2 },
  ],
};

const uShape: RoomShapeContent = {
  id: 'test-u' as RoomShapeId,
  name: 'U-Shape',
  width: 3,
  height: 3,
  tiles: [
    { x: 0, y: 0 }, { x: 2, y: 0 },
    { x: 0, y: 1 }, { x: 2, y: 1 },
    { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 },
  ],
};

const tridentShape: RoomShapeContent = {
  id: 'test-trident' as RoomShapeId,
  name: 'Trident',
  width: 3,
  height: 4,
  tiles: [
    { x: 0, y: 0 }, { x: 2, y: 0 },
    { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
    { x: 1, y: 2 },
    { x: 1, y: 3 },
  ],
};

const crossShape: RoomShapeContent = {
  id: 'test-cross' as RoomShapeId,
  name: 'Cross 5x5',
  width: 5,
  height: 5,
  tiles: [
    { x: 2, y: 0 },
    { x: 2, y: 1 },
    { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 },
    { x: 2, y: 3 },
    { x: 2, y: 4 },
  ],
};

const emptyShape: RoomShapeContent = {
  id: 'test-empty' as RoomShapeId,
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
      shapeId: 'test-2x2' as RoomShapeId,
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
      shapeId: 'test-2x2' as RoomShapeId,
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
      shapeId: 'nonexistent-shape-id' as RoomShapeId,
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
    const result = roomShapeRotateTiles(
      lShape.tiles,
      lShape.width,
      lShape.height,
      0,
    );
    expect(result.tiles).toEqual(lShape.tiles);
    expect(result.width).toBe(3);
    expect(result.height).toBe(3);
  });

  it('should rotate L-shape 90° clockwise', () => {
    // Original L-shape (3x3):     After 90° CW:
    //   X . .                       X X X
    //   X . .                       X . .
    //   X X X                       X . .
    const result = roomShapeRotateTiles(
      lShape.tiles,
      lShape.width,
      lShape.height,
      1,
    );
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
    const result = roomShapeRotateTiles(
      lShape.tiles,
      lShape.width,
      lShape.height,
      2,
    );
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
    const result = roomShapeRotateTiles(
      lShape.tiles,
      lShape.width,
      lShape.height,
      3,
    );
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
    const result = roomShapeRotateTiles(
      iShape.tiles,
      iShape.width,
      iShape.height,
      1,
    );
    expect(result.width).toBe(4);
    expect(result.height).toBe(1);

    const tileSet = new Set(result.tiles.map((t) => `${t.x},${t.y}`));
    expect(tileSet).toContain('0,0');
    expect(tileSet).toContain('1,0');
    expect(tileSet).toContain('2,0');
    expect(tileSet).toContain('3,0');
  });

  it('should return to original after 4 rotations', () => {
    const result = roomShapeRotateTiles(
      lShape.tiles,
      lShape.width,
      lShape.height,
      0,
    );
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

    const originalSet = new Set(result.tiles.map((t) => `${t.x},${t.y}`));
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
    const originalSet = new Set(square2x2.tiles.map((t) => `${t.x},${t.y}`));
    const rotatedSet = new Set(result.tiles.map((t) => `${t.x},${t.y}`));
    expect(rotatedSet).toEqual(originalSet);
  });
});

// --- Additional shape tests ---

describe('roomShapeGetBounds (additional shapes)', () => {
  it('should return correct bounds for 1x1 square', () => {
    expect(roomShapeGetBounds(square1x1)).toEqual({ width: 1, height: 1 });
  });

  it('should return correct bounds for 3x3 square', () => {
    expect(roomShapeGetBounds(square3x3)).toEqual({ width: 3, height: 3 });
  });

  it('should return correct bounds for 4x4 square', () => {
    expect(roomShapeGetBounds(square4x4)).toEqual({ width: 4, height: 4 });
  });

  it('should return correct bounds for T-shape (3x2)', () => {
    expect(roomShapeGetBounds(tShape)).toEqual({ width: 3, height: 2 });
  });

  it('should return correct bounds for Small L-shape (2x3)', () => {
    expect(roomShapeGetBounds(smallLShape)).toEqual({ width: 2, height: 3 });
  });

  it('should return correct bounds for U-shape (3x3)', () => {
    expect(roomShapeGetBounds(uShape)).toEqual({ width: 3, height: 3 });
  });

  it('should return correct bounds for Trident (3x4)', () => {
    expect(roomShapeGetBounds(tridentShape)).toEqual({ width: 3, height: 4 });
  });

  it('should return correct bounds for Cross (5x5)', () => {
    expect(roomShapeGetBounds(crossShape)).toEqual({ width: 5, height: 5 });
  });
});

describe('roomShapeRotateTiles (T-shape — asymmetric w/h)', () => {
  it('should swap width/height on 90° rotation (3x2 → 2x3)', () => {
    // T-Shape original (3w x 2h):     After 90° CW (2w x 3h):
    //   X X X                           . X
    //   . X .                           X X
    //                                   . X
    const result = roomShapeRotateTiles(
      tShape.tiles,
      tShape.width,
      tShape.height,
      1,
    );
    expect(result.width).toBe(2);
    expect(result.height).toBe(3);
    expect(result.tiles).toHaveLength(4);

    const tileSet = new Set(result.tiles.map((t) => `${t.x},${t.y}`));
    expect(tileSet).toContain('1,0');
    expect(tileSet).toContain('0,1');
    expect(tileSet).toContain('1,1');
    expect(tileSet).toContain('1,2');
  });

  it('should return to 3x2 on 180° rotation', () => {
    // 180° of T-shape:
    //   . X .
    //   X X X
    const result = roomShapeRotateTiles(
      tShape.tiles,
      tShape.width,
      tShape.height,
      2,
    );
    expect(result.width).toBe(3);
    expect(result.height).toBe(2);
    expect(result.tiles).toHaveLength(4);

    const tileSet = new Set(result.tiles.map((t) => `${t.x},${t.y}`));
    expect(tileSet).toContain('1,0');
    expect(tileSet).toContain('0,1');
    expect(tileSet).toContain('1,1');
    expect(tileSet).toContain('2,1');
  });

  it('should swap width/height on 270° rotation (3x2 → 2x3)', () => {
    const result = roomShapeRotateTiles(
      tShape.tiles,
      tShape.width,
      tShape.height,
      3,
    );
    expect(result.width).toBe(2);
    expect(result.height).toBe(3);
    expect(result.tiles).toHaveLength(4);

    const tileSet = new Set(result.tiles.map((t) => `${t.x},${t.y}`));
    expect(tileSet).toContain('0,0');
    expect(tileSet).toContain('0,1');
    expect(tileSet).toContain('1,1');
    expect(tileSet).toContain('0,2');
  });

  it('should return to original after 4 rotations of T-shape', () => {
    let { tiles, width, height } = roomShapeRotateTiles(
      tShape.tiles, tShape.width, tShape.height, 1,
    );
    ({ tiles, width, height } = roomShapeRotateTiles(tiles, width, height, 1));
    ({ tiles, width, height } = roomShapeRotateTiles(tiles, width, height, 1));
    ({ tiles, width, height } = roomShapeRotateTiles(tiles, width, height, 1));

    expect(width).toBe(tShape.width);
    expect(height).toBe(tShape.height);

    const originalSet = new Set(tShape.tiles.map((t) => `${t.x},${t.y}`));
    const rotatedSet = new Set(tiles.map((t) => `${t.x},${t.y}`));
    expect(rotatedSet).toEqual(originalSet);
  });
});

describe('roomShapeRotateTiles (Trident — 3x4 asymmetric)', () => {
  it('should swap width/height on 90° rotation (3x4 → 4x3)', () => {
    const result = roomShapeRotateTiles(
      tridentShape.tiles,
      tridentShape.width,
      tridentShape.height,
      1,
    );
    expect(result.width).toBe(4);
    expect(result.height).toBe(3);
    expect(result.tiles).toHaveLength(7);
  });

  it('should return to original after 4 rotations', () => {
    let { tiles, width, height } = roomShapeRotateTiles(
      tridentShape.tiles, tridentShape.width, tridentShape.height, 1,
    );
    ({ tiles, width, height } = roomShapeRotateTiles(tiles, width, height, 1));
    ({ tiles, width, height } = roomShapeRotateTiles(tiles, width, height, 1));
    ({ tiles, width, height } = roomShapeRotateTiles(tiles, width, height, 1));

    expect(width).toBe(tridentShape.width);
    expect(height).toBe(tridentShape.height);

    const originalSet = new Set(tridentShape.tiles.map((t) => `${t.x},${t.y}`));
    const rotatedSet = new Set(tiles.map((t) => `${t.x},${t.y}`));
    expect(rotatedSet).toEqual(originalSet);
  });
});

describe('roomShapeRotateTiles (Small L — 2x3 asymmetric)', () => {
  it('should swap width/height on 90° rotation (2x3 → 3x2)', () => {
    const result = roomShapeRotateTiles(
      smallLShape.tiles,
      smallLShape.width,
      smallLShape.height,
      1,
    );
    expect(result.width).toBe(3);
    expect(result.height).toBe(2);
    expect(result.tiles).toHaveLength(4);
  });

  it('should return to original after 4 rotations', () => {
    let { tiles, width, height } = roomShapeRotateTiles(
      smallLShape.tiles, smallLShape.width, smallLShape.height, 1,
    );
    ({ tiles, width, height } = roomShapeRotateTiles(tiles, width, height, 1));
    ({ tiles, width, height } = roomShapeRotateTiles(tiles, width, height, 1));
    ({ tiles, width, height } = roomShapeRotateTiles(tiles, width, height, 1));

    expect(width).toBe(smallLShape.width);
    expect(height).toBe(smallLShape.height);

    const originalSet = new Set(smallLShape.tiles.map((t) => `${t.x},${t.y}`));
    const rotatedSet = new Set(tiles.map((t) => `${t.x},${t.y}`));
    expect(rotatedSet).toEqual(originalSet);
  });
});

describe('roomShapeGetRotated (symmetric shapes invariant)', () => {
  it('should be tile-invariant for 1x1 square at any rotation', () => {
    for (const rot of [0, 1, 2, 3] as const) {
      const result = roomShapeGetRotated(square1x1, rot);
      expect(result.tiles).toHaveLength(1);
      expect(result.tiles[0]).toEqual({ x: 0, y: 0 });
    }
  });

  it('should be tile-invariant for 3x3 square at any rotation', () => {
    const originalSet = new Set(square3x3.tiles.map((t) => `${t.x},${t.y}`));
    for (const rot of [1, 2, 3] as const) {
      const result = roomShapeGetRotated(square3x3, rot);
      const rotatedSet = new Set(result.tiles.map((t) => `${t.x},${t.y}`));
      expect(rotatedSet).toEqual(originalSet);
      expect(result.width).toBe(3);
      expect(result.height).toBe(3);
    }
  });

  it('should be tile-invariant for 4x4 square at any rotation', () => {
    const originalSet = new Set(square4x4.tiles.map((t) => `${t.x},${t.y}`));
    for (const rot of [1, 2, 3] as const) {
      const result = roomShapeGetRotated(square4x4, rot);
      const rotatedSet = new Set(result.tiles.map((t) => `${t.x},${t.y}`));
      expect(rotatedSet).toEqual(originalSet);
      expect(result.width).toBe(4);
      expect(result.height).toBe(4);
    }
  });

  it('should be tile-invariant for Cross 5x5 at any rotation', () => {
    const originalSet = new Set(crossShape.tiles.map((t) => `${t.x},${t.y}`));
    for (const rot of [1, 2, 3] as const) {
      const result = roomShapeGetRotated(crossShape, rot);
      const rotatedSet = new Set(result.tiles.map((t) => `${t.x},${t.y}`));
      expect(rotatedSet).toEqual(originalSet);
      expect(result.width).toBe(5);
      expect(result.height).toBe(5);
    }
  });
});

describe('roomShapeFitsInGrid (additional shapes)', () => {
  const gridSize = 20;

  it('should fit 1x1 at any valid position', () => {
    expect(roomShapeFitsInGrid(square1x1, 0, 0, gridSize)).toBe(true);
    expect(roomShapeFitsInGrid(square1x1, 19, 19, gridSize)).toBe(true);
  });

  it('should not fit 1x1 out of bounds', () => {
    expect(roomShapeFitsInGrid(square1x1, 20, 0, gridSize)).toBe(false);
    expect(roomShapeFitsInGrid(square1x1, -1, 0, gridSize)).toBe(false);
  });

  it('should fit 4x4 at max valid position (16,16)', () => {
    expect(roomShapeFitsInGrid(square4x4, 16, 16, gridSize)).toBe(true);
    expect(roomShapeFitsInGrid(square4x4, 17, 16, gridSize)).toBe(false);
  });

  it('should fit T-shape (3x2) at bottom-right corner', () => {
    expect(roomShapeFitsInGrid(tShape, 17, 18, gridSize)).toBe(true);
    expect(roomShapeFitsInGrid(tShape, 18, 18, gridSize)).toBe(false);
  });

  it('should handle T-shape rotated 90° (becomes 2x3)', () => {
    const rotated = roomShapeGetRotated(tShape, 1);
    expect(roomShapeFitsInGrid(rotated, 18, 17, gridSize)).toBe(true);
    expect(roomShapeFitsInGrid(rotated, 18, 18, gridSize)).toBe(false);
  });

  it('should handle I-shape rotated 90° (1x4 → 4x1)', () => {
    const rotated = roomShapeGetRotated(iShape, 1);
    // Rotated I is 4 wide, 1 tall
    expect(roomShapeFitsInGrid(rotated, 16, 19, gridSize)).toBe(true);
    expect(roomShapeFitsInGrid(rotated, 17, 19, gridSize)).toBe(false);
  });

  it('should fit Trident (3x4) at valid position', () => {
    expect(roomShapeFitsInGrid(tridentShape, 17, 16, gridSize)).toBe(true);
    expect(roomShapeFitsInGrid(tridentShape, 17, 17, gridSize)).toBe(false);
  });

  it('should handle Trident rotated 90° (becomes 4x3)', () => {
    const rotated = roomShapeGetRotated(tridentShape, 1);
    expect(rotated.width).toBe(4);
    expect(rotated.height).toBe(3);
    expect(roomShapeFitsInGrid(rotated, 16, 17, gridSize)).toBe(true);
    expect(roomShapeFitsInGrid(rotated, 17, 17, gridSize)).toBe(false);
  });
});
