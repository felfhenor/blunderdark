import { createEmptyGrid, setTile } from '@helpers/grid';
import type { RoomShape } from '@interfaces';
import { describe, expect, it } from 'vitest';
import {
  formatPlacementErrors,
  validateBounds,
  validateNoOverlap,
  validatePlacement,
} from '@helpers/room-placement';

const square2x2: RoomShape = {
  id: 'square-2x2',
  name: 'Square 2x2',
  tiles: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ],
  width: 2,
  height: 2,
};

const lShape: RoomShape = {
  id: 'l-shape',
  name: 'L-Shape',
  tiles: [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 },
  ],
  width: 2,
  height: 3,
};

const iShape: RoomShape = {
  id: 'i-shape',
  name: 'I-Shape',
  tiles: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 },
  ],
  width: 4,
  height: 1,
};

describe('validateBounds', () => {
  it('should return valid for placement at (0,0)', () => {
    const result = validateBounds(square2x2, 0, 0);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should return valid for placement at (18,18) for 2x2', () => {
    const result = validateBounds(square2x2, 18, 18);
    expect(result.valid).toBe(true);
  });

  it('should return invalid for placement at (19,19) for 2x2', () => {
    const result = validateBounds(square2x2, 19, 19);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Room extends beyond grid boundary');
  });

  it('should return invalid for negative coordinates', () => {
    const result = validateBounds(square2x2, -1, 0);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Room extends beyond grid boundary');
  });

  it('should return invalid for negative Y coordinates', () => {
    const result = validateBounds(lShape, 0, -1);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Room extends beyond grid boundary');
  });

  it('should validate L-shape at edge', () => {
    // L-shape is 2 wide, 3 tall — at (18, 17) should fit
    const result = validateBounds(lShape, 18, 17);
    expect(result.valid).toBe(true);
  });

  it('should reject L-shape that extends beyond bottom', () => {
    // L-shape is 3 tall — at (0, 18) extends to y=20
    const result = validateBounds(lShape, 0, 18);
    expect(result.valid).toBe(false);
  });

  it('should validate I-shape at right edge', () => {
    // I-shape is 4 wide — at (16, 0) should fit
    const result = validateBounds(iShape, 16, 0);
    expect(result.valid).toBe(true);
  });

  it('should reject I-shape that extends beyond right edge', () => {
    // I-shape is 4 wide — at (17, 0) extends to x=20
    const result = validateBounds(iShape, 17, 0);
    expect(result.valid).toBe(false);
  });
});

describe('validateNoOverlap', () => {
  it('should return valid on empty grid', () => {
    const grid = createEmptyGrid();
    const result = validateNoOverlap(square2x2, 5, 5, grid);
    expect(result.valid).toBe(true);
    expect(result.conflictingTiles).toBeUndefined();
  });

  it('should return invalid when tiles are partially occupied', () => {
    let grid = createEmptyGrid();
    grid = setTile(grid, 5, 5, {
      occupied: true,
      roomId: 'existing-room',
      connectionType: null,
    });

    const result = validateNoOverlap(square2x2, 5, 5, grid);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Tiles already occupied');
    expect(result.conflictingTiles).toEqual([{ x: 5, y: 5 }]);
  });

  it('should return invalid with all conflicting tiles when fully occupied', () => {
    let grid = createEmptyGrid();
    const occupiedTile = {
      occupied: true,
      roomId: 'existing-room',
      connectionType: null,
    };
    grid = setTile(grid, 5, 5, occupiedTile);
    grid = setTile(grid, 6, 5, occupiedTile);
    grid = setTile(grid, 5, 6, occupiedTile);
    grid = setTile(grid, 6, 6, occupiedTile);

    const result = validateNoOverlap(square2x2, 5, 5, grid);
    expect(result.valid).toBe(false);
    expect(result.conflictingTiles).toHaveLength(4);
  });

  it('should return valid when occupied tiles are adjacent but not overlapping', () => {
    let grid = createEmptyGrid();
    grid = setTile(grid, 4, 5, {
      occupied: true,
      roomId: 'existing-room',
      connectionType: null,
    });

    const result = validateNoOverlap(square2x2, 5, 5, grid);
    expect(result.valid).toBe(true);
  });
});

describe('validatePlacement', () => {
  it('should return valid for a valid placement', () => {
    const grid = createEmptyGrid();
    const result = validatePlacement(square2x2, 5, 5, grid);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return bounds error for out-of-bounds placement', () => {
    const grid = createEmptyGrid();
    const result = validatePlacement(square2x2, 19, 19, grid);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Room extends beyond grid boundary');
  });

  it('should return overlap error for occupied tiles', () => {
    let grid = createEmptyGrid();
    grid = setTile(grid, 5, 5, {
      occupied: true,
      roomId: 'existing-room',
      connectionType: null,
    });

    const result = validatePlacement(square2x2, 5, 5, grid);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Tiles already occupied');
  });

  it('should return multiple errors when both bounds and overlap fail', () => {
    let grid = createEmptyGrid();
    // Occupy tile at (19, 0) — placing a 2x2 at (19, 0) will be both out of bounds and overlapping
    grid = setTile(grid, 19, 0, {
      occupied: true,
      roomId: 'existing-room',
      connectionType: null,
    });

    const result = validatePlacement(square2x2, 19, 0, grid);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Room extends beyond grid boundary');
    expect(result.errors).toContain('Tiles already occupied');
    expect(result.errors).toHaveLength(2);
  });
});

describe('formatPlacementErrors', () => {
  it('should return empty string for no errors', () => {
    expect(formatPlacementErrors([])).toBe('');
  });

  it('should format a single bounds error as player-friendly message', () => {
    const message = formatPlacementErrors(['Room extends beyond grid boundary']);
    expect(message).toBe(
      'Cannot place room: room extends beyond the grid boundary',
    );
  });

  it('should format a single overlap error as player-friendly message', () => {
    const message = formatPlacementErrors(['Tiles already occupied']);
    expect(message).toBe('Cannot place room: tiles are already occupied');
  });

  it('should combine multiple errors into a single message', () => {
    const message = formatPlacementErrors([
      'Room extends beyond grid boundary',
      'Tiles already occupied',
    ]);
    expect(message).toBe(
      'Cannot place room: room extends beyond the grid boundary, tiles are already occupied',
    );
  });

  it('should lowercase unknown error messages', () => {
    const message = formatPlacementErrors(['Some Unknown Error']);
    expect(message).toBe('Cannot place room: some unknown error');
  });
});
