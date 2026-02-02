import type { RoomShape } from '@interfaces';
import { describe, expect, it } from 'vitest';

import {
  getAbsoluteTiles,
  getShapeBounds,
  shapeFitsInGrid,
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

describe('getAbsoluteTiles', () => {
  it('should offset tiles by anchor position', () => {
    const result = getAbsoluteTiles(square2x2, 5, 3);
    expect(result).toEqual([
      { x: 5, y: 3 },
      { x: 6, y: 3 },
      { x: 5, y: 4 },
      { x: 6, y: 4 },
    ]);
  });

  it('should work with anchor at origin', () => {
    const result = getAbsoluteTiles(square2x2, 0, 0);
    expect(result).toEqual(square2x2.tiles);
  });

  it('should work with L-shape', () => {
    const result = getAbsoluteTiles(lShape, 10, 10);
    expect(result).toEqual([
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 },
      { x: 11, y: 12 },
      { x: 12, y: 12 },
    ]);
  });

  it('should return empty array for empty shape', () => {
    const result = getAbsoluteTiles(emptyShape, 5, 5);
    expect(result).toEqual([]);
  });
});

describe('getShapeBounds', () => {
  it('should return correct bounds for 2x2 square', () => {
    expect(getShapeBounds(square2x2)).toEqual({ width: 2, height: 2 });
  });

  it('should return correct bounds for L-shape', () => {
    expect(getShapeBounds(lShape)).toEqual({ width: 3, height: 3 });
  });

  it('should return correct bounds for I-shape', () => {
    expect(getShapeBounds(iShape)).toEqual({ width: 1, height: 4 });
  });

  it('should return zero bounds for empty shape', () => {
    expect(getShapeBounds(emptyShape)).toEqual({ width: 0, height: 0 });
  });
});

describe('shapeFitsInGrid', () => {
  const gridSize = 20;

  it('should fit at origin', () => {
    expect(shapeFitsInGrid(square2x2, 0, 0, gridSize)).toBe(true);
  });

  it('should fit at valid interior position', () => {
    expect(shapeFitsInGrid(square2x2, 10, 10, gridSize)).toBe(true);
  });

  it('should fit at maximum valid position', () => {
    expect(shapeFitsInGrid(square2x2, 18, 18, gridSize)).toBe(true);
  });

  it('should not fit when extending beyond right edge', () => {
    expect(shapeFitsInGrid(square2x2, 19, 0, gridSize)).toBe(false);
  });

  it('should not fit when extending beyond bottom edge', () => {
    expect(shapeFitsInGrid(square2x2, 0, 19, gridSize)).toBe(false);
  });

  it('should not fit with negative anchor', () => {
    expect(shapeFitsInGrid(square2x2, -1, 0, gridSize)).toBe(false);
  });

  it('should handle I-shape at bottom edge', () => {
    expect(shapeFitsInGrid(iShape, 0, 16, gridSize)).toBe(true);
    expect(shapeFitsInGrid(iShape, 0, 17, gridSize)).toBe(false);
  });

  it('should handle L-shape at corner', () => {
    expect(shapeFitsInGrid(lShape, 17, 17, gridSize)).toBe(true);
    expect(shapeFitsInGrid(lShape, 18, 18, gridSize)).toBe(false);
  });
});
