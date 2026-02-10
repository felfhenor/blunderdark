import { createEmptyGrid, setTile } from '@helpers/grid';
import type { Floor, PlacedRoom, RoomShape } from '@interfaces';
import { describe, expect, it } from 'vitest';
import {
  formatPlacementErrors,
  isUniqueRoomTypePlaced,
  placeRoomOnFloor,
  removeRoomFromFloor,
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

function makeFloor(
  rooms: PlacedRoom[] = [],
  grid = createEmptyGrid(),
): Floor {
  return {
    id: 'floor-1',
    name: 'Floor 1',
    depth: 1,
    biome: 'neutral',
    grid,
    rooms,
    hallways: [],
    inhabitants: [],
    connections: [],
  };
}

describe('placeRoomOnFloor', () => {
  it('should place a room and mark grid tiles', () => {
    const floor = makeFloor();
    const room: PlacedRoom = {
      id: 'room-1',
      roomTypeId: 'room-crystal-mine',
      shapeId: 'square-2x2',
      anchorX: 5,
      anchorY: 5,
    };
    const result = placeRoomOnFloor(floor, room, square2x2);

    expect(result).not.toBeNull();
    expect(result!.rooms).toHaveLength(1);
    expect(result!.rooms[0].id).toBe('room-1');

    // Check all 4 tiles are marked
    expect(result!.grid[5][5].occupied).toBe(true);
    expect(result!.grid[5][5].occupiedBy).toBe('room');
    expect(result!.grid[5][5].roomId).toBe('room-1');
    expect(result!.grid[5][6].roomId).toBe('room-1');
    expect(result!.grid[6][5].roomId).toBe('room-1');
    expect(result!.grid[6][6].roomId).toBe('room-1');
  });

  it('should return null for invalid placement (out of bounds)', () => {
    const floor = makeFloor();
    const room: PlacedRoom = {
      id: 'room-1',
      roomTypeId: 'room-crystal-mine',
      shapeId: 'square-2x2',
      anchorX: 19,
      anchorY: 19,
    };
    const result = placeRoomOnFloor(floor, room, square2x2);
    expect(result).toBeNull();
  });

  it('should return null for overlapping placement', () => {
    const floor = makeFloor();
    const room1: PlacedRoom = {
      id: 'room-1',
      roomTypeId: 'room-crystal-mine',
      shapeId: 'square-2x2',
      anchorX: 5,
      anchorY: 5,
    };
    const placed = placeRoomOnFloor(floor, room1, square2x2)!;

    const room2: PlacedRoom = {
      id: 'room-2',
      roomTypeId: 'room-throne',
      shapeId: 'square-2x2',
      anchorX: 6,
      anchorY: 6,
    };
    const result = placeRoomOnFloor(placed, room2, square2x2);
    expect(result).toBeNull();
  });

  it('should allow placing non-overlapping rooms', () => {
    const floor = makeFloor();
    const room1: PlacedRoom = {
      id: 'room-1',
      roomTypeId: 'room-crystal-mine',
      shapeId: 'square-2x2',
      anchorX: 0,
      anchorY: 0,
    };
    const placed = placeRoomOnFloor(floor, room1, square2x2)!;

    const room2: PlacedRoom = {
      id: 'room-2',
      roomTypeId: 'room-throne',
      shapeId: 'square-2x2',
      anchorX: 3,
      anchorY: 0,
    };
    const result = placeRoomOnFloor(placed, room2, square2x2);
    expect(result).not.toBeNull();
    expect(result!.rooms).toHaveLength(2);
  });

  it('should not mutate the original floor', () => {
    const floor = makeFloor();
    const room: PlacedRoom = {
      id: 'room-1',
      roomTypeId: 'room-crystal-mine',
      shapeId: 'square-2x2',
      anchorX: 5,
      anchorY: 5,
    };
    placeRoomOnFloor(floor, room, square2x2);

    expect(floor.rooms).toHaveLength(0);
    expect(floor.grid[5][5].occupied).toBe(false);
  });
});

describe('removeRoomFromFloor', () => {
  it('should remove a room and clear grid tiles', () => {
    const floor = makeFloor();
    const room: PlacedRoom = {
      id: 'room-1',
      roomTypeId: 'room-crystal-mine',
      shapeId: 'square-2x2',
      anchorX: 5,
      anchorY: 5,
    };
    const placed = placeRoomOnFloor(floor, room, square2x2)!;

    const result = removeRoomFromFloor(placed, 'room-1', square2x2);
    expect(result).not.toBeNull();
    expect(result!.rooms).toHaveLength(0);
    expect(result!.grid[5][5].occupied).toBe(false);
    expect(result!.grid[5][5].roomId).toBeNull();
    expect(result!.grid[5][6].occupied).toBe(false);
    expect(result!.grid[6][5].occupied).toBe(false);
    expect(result!.grid[6][6].occupied).toBe(false);
  });

  it('should return null for non-existent room', () => {
    const floor = makeFloor();
    const result = removeRoomFromFloor(floor, 'nonexistent', square2x2);
    expect(result).toBeNull();
  });

  it('should only remove the specified room', () => {
    const floor = makeFloor();
    const room1: PlacedRoom = {
      id: 'room-1',
      roomTypeId: 'room-crystal-mine',
      shapeId: 'square-2x2',
      anchorX: 0,
      anchorY: 0,
    };
    const room2: PlacedRoom = {
      id: 'room-2',
      roomTypeId: 'room-throne',
      shapeId: 'square-2x2',
      anchorX: 5,
      anchorY: 5,
    };
    let placed = placeRoomOnFloor(floor, room1, square2x2)!;
    placed = placeRoomOnFloor(placed, room2, square2x2)!;

    const result = removeRoomFromFloor(placed, 'room-1', square2x2);
    expect(result).not.toBeNull();
    expect(result!.rooms).toHaveLength(1);
    expect(result!.rooms[0].id).toBe('room-2');
    // room-1 tiles cleared
    expect(result!.grid[0][0].occupied).toBe(false);
    // room-2 tiles still present
    expect(result!.grid[5][5].occupied).toBe(true);
    expect(result!.grid[5][5].roomId).toBe('room-2');
  });

  it('should not mutate the original floor', () => {
    const floor = makeFloor();
    const room: PlacedRoom = {
      id: 'room-1',
      roomTypeId: 'room-crystal-mine',
      shapeId: 'square-2x2',
      anchorX: 5,
      anchorY: 5,
    };
    const placed = placeRoomOnFloor(floor, room, square2x2)!;

    removeRoomFromFloor(placed, 'room-1', square2x2);

    expect(placed.rooms).toHaveLength(1);
    expect(placed.grid[5][5].occupied).toBe(true);
  });
});

describe('isUniqueRoomTypePlaced', () => {
  it('should return false when no rooms are placed', () => {
    const floors = [makeFloor()];
    expect(isUniqueRoomTypePlaced(floors, 'room-throne')).toBe(false);
  });

  it('should return true when the room type is placed on the current floor', () => {
    const existingRoom: PlacedRoom = {
      id: 'room-1',
      roomTypeId: 'room-throne',
      shapeId: 'square-2x2',
      anchorX: 0,
      anchorY: 0,
    };
    const floors = [makeFloor([existingRoom])];
    expect(isUniqueRoomTypePlaced(floors, 'room-throne')).toBe(true);
  });

  it('should return true when the room type is placed on a different floor', () => {
    const existingRoom: PlacedRoom = {
      id: 'room-1',
      roomTypeId: 'room-throne',
      shapeId: 'square-2x2',
      anchorX: 0,
      anchorY: 0,
    };
    const floors = [makeFloor(), makeFloor([existingRoom])];
    expect(isUniqueRoomTypePlaced(floors, 'room-throne')).toBe(true);
  });

  it('should return false for a different room type', () => {
    const existingRoom: PlacedRoom = {
      id: 'room-1',
      roomTypeId: 'room-crystal-mine',
      shapeId: 'square-2x2',
      anchorX: 0,
      anchorY: 0,
    };
    const floors = [makeFloor([existingRoom])];
    expect(isUniqueRoomTypePlaced(floors, 'room-throne')).toBe(false);
  });

  it('should check across multiple floors', () => {
    const room1: PlacedRoom = {
      id: 'room-1',
      roomTypeId: 'room-crystal-mine',
      shapeId: 'square-2x2',
      anchorX: 0,
      anchorY: 0,
    };
    const room2: PlacedRoom = {
      id: 'room-2',
      roomTypeId: 'room-throne',
      shapeId: 'square-2x2',
      anchorX: 5,
      anchorY: 5,
    };
    const floors = [makeFloor([room1]), makeFloor([room2])];
    expect(isUniqueRoomTypePlaced(floors, 'room-throne')).toBe(true);
    expect(isUniqueRoomTypePlaced(floors, 'room-crystal-mine')).toBe(true);
    expect(isUniqueRoomTypePlaced(floors, 'room-barracks')).toBe(false);
  });
});
