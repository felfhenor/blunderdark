import { gridCreateEmpty, gridSetTile } from '@helpers/grid';
import {
  roomPlacementCountTypeAllFloors,
  roomPlacementEnterMode,
  roomPlacementExitMode,
  roomPlacementFormatErrors,
  roomPlacementIsUniqueTypePlaced,
  roomPlacementPlaceOnFloor,
  roomPlacementPreviewShape,
  roomPlacementRemoveFromFloor,
  roomPlacementRotate,
  roomPlacementRotation,
  roomPlacementSelectedTypeId,
  roomPlacementValidate,
  roomPlacementValidateBounds,
  roomPlacementValidateNoOverlap,
} from '@helpers/room-placement';
import type {
  Floor,
  FloorId,
  PlacedRoom,
  PlacedRoomId,
  RoomId,
  RoomShapeContent,
  RoomShapeId,
} from '@interfaces';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const square2x2: RoomShapeContent = {
  id: 'square-2x2' as RoomShapeId,
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

const lShape: RoomShapeContent = {
  id: 'l-shape' as RoomShapeId,
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

const iShape: RoomShapeContent = {
  id: 'i-shape' as RoomShapeId,
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

describe('roomPlacementValidateBounds', () => {
  it('should return valid for placement at (0,0)', () => {
    const result = roomPlacementValidateBounds(square2x2, 0, 0);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should return valid for placement at (18,18) for 2x2', () => {
    const result = roomPlacementValidateBounds(square2x2, 18, 18);
    expect(result.valid).toBe(true);
  });

  it('should return invalid for placement at (19,19) for 2x2', () => {
    const result = roomPlacementValidateBounds(square2x2, 19, 19);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Room extends beyond grid boundary');
  });

  it('should return invalid for negative coordinates', () => {
    const result = roomPlacementValidateBounds(square2x2, -1, 0);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Room extends beyond grid boundary');
  });

  it('should return invalid for negative Y coordinates', () => {
    const result = roomPlacementValidateBounds(lShape, 0, -1);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Room extends beyond grid boundary');
  });

  it('should validate L-shape at edge', () => {
    // L-shape is 2 wide, 3 tall — at (18, 17) should fit
    const result = roomPlacementValidateBounds(lShape, 18, 17);
    expect(result.valid).toBe(true);
  });

  it('should reject L-shape that extends beyond bottom', () => {
    // L-shape is 3 tall — at (0, 18) extends to y=20
    const result = roomPlacementValidateBounds(lShape, 0, 18);
    expect(result.valid).toBe(false);
  });

  it('should validate I-shape at right edge', () => {
    // I-shape is 4 wide — at (16, 0) should fit
    const result = roomPlacementValidateBounds(iShape, 16, 0);
    expect(result.valid).toBe(true);
  });

  it('should reject I-shape that extends beyond right edge', () => {
    // I-shape is 4 wide — at (17, 0) extends to x=20
    const result = roomPlacementValidateBounds(iShape, 17, 0);
    expect(result.valid).toBe(false);
  });
});

describe('roomPlacementValidateNoOverlap', () => {
  it('should return valid on empty grid', () => {
    const grid = gridCreateEmpty();
    const result = roomPlacementValidateNoOverlap(square2x2, 5, 5, grid);
    expect(result.valid).toBe(true);
    expect(result.conflictingTiles).toBeUndefined();
  });

  it('should return invalid when tiles are partially occupied', () => {
    let grid = gridCreateEmpty();
    grid = gridSetTile(grid, 5, 5, {
      occupied: true,
      occupiedBy: 'room',
      roomId: 'existing-room' as PlacedRoomId,
      hallwayId: undefined,
      connectionType: undefined,
    });

    const result = roomPlacementValidateNoOverlap(square2x2, 5, 5, grid);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Tiles already occupied');
    expect(result.conflictingTiles).toEqual([{ x: 5, y: 5 }]);
  });

  it('should return invalid with all conflicting tiles when fully occupied', () => {
    let grid = gridCreateEmpty();
    const occupiedTile = {
      occupied: true,
      occupiedBy: 'room' as const,
      roomId: 'existing-room' as PlacedRoomId,
      hallwayId: undefined,
      connectionType: undefined,
    };
    grid = gridSetTile(grid, 5, 5, occupiedTile);
    grid = gridSetTile(grid, 6, 5, occupiedTile);
    grid = gridSetTile(grid, 5, 6, occupiedTile);
    grid = gridSetTile(grid, 6, 6, occupiedTile);

    const result = roomPlacementValidateNoOverlap(square2x2, 5, 5, grid);
    expect(result.valid).toBe(false);
    expect(result.conflictingTiles).toHaveLength(4);
  });

  it('should return valid when occupied tiles are adjacent but not overlapping', () => {
    let grid = gridCreateEmpty();
    grid = gridSetTile(grid, 4, 5, {
      occupied: true,
      occupiedBy: 'room',
      roomId: 'existing-room' as PlacedRoomId,
      hallwayId: undefined,
      connectionType: undefined,
    });

    const result = roomPlacementValidateNoOverlap(square2x2, 5, 5, grid);
    expect(result.valid).toBe(true);
  });
});

describe('roomPlacementValidate', () => {
  it('should return valid for a valid placement', () => {
    const grid = gridCreateEmpty();
    const result = roomPlacementValidate(square2x2, 5, 5, grid);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return bounds error for out-of-bounds placement', () => {
    const grid = gridCreateEmpty();
    const result = roomPlacementValidate(square2x2, 19, 19, grid);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Room extends beyond grid boundary');
  });

  it('should return overlap error for occupied tiles', () => {
    let grid = gridCreateEmpty();
    grid = gridSetTile(grid, 5, 5, {
      occupied: true,
      occupiedBy: 'room',
      roomId: 'existing-room' as PlacedRoomId,
      hallwayId: undefined,
      connectionType: undefined,
    });

    const result = roomPlacementValidate(square2x2, 5, 5, grid);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Tiles already occupied');
  });

  it('should return multiple errors when both bounds and overlap fail', () => {
    let grid = gridCreateEmpty();
    // Occupy tile at (19, 0) — placing a 2x2 at (19, 0) will be both out of bounds and overlapping
    grid = gridSetTile(grid, 19, 0, {
      occupied: true,
      occupiedBy: 'room',
      roomId: 'existing-room' as PlacedRoomId,
      hallwayId: undefined,
      connectionType: undefined,
    });

    const result = roomPlacementValidate(square2x2, 19, 0, grid);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Room extends beyond grid boundary');
    expect(result.errors).toContain('Tiles already occupied');
    expect(result.errors).toHaveLength(2);
  });
});

describe('roomPlacementFormatErrors', () => {
  it('should return empty string for no errors', () => {
    expect(roomPlacementFormatErrors([])).toBe('');
  });

  it('should format a single bounds error as player-friendly message', () => {
    const message = roomPlacementFormatErrors([
      'Room extends beyond grid boundary',
    ]);
    expect(message).toBe(
      'Cannot place room: room extends beyond the grid boundary',
    );
  });

  it('should format a single overlap error as player-friendly message', () => {
    const message = roomPlacementFormatErrors(['Tiles already occupied']);
    expect(message).toBe('Cannot place room: tiles are already occupied');
  });

  it('should combine multiple errors into a single message', () => {
    const message = roomPlacementFormatErrors([
      'Room extends beyond grid boundary',
      'Tiles already occupied',
    ]);
    expect(message).toBe(
      'Cannot place room: room extends beyond the grid boundary, tiles are already occupied',
    );
  });

  it('should lowercase unknown error messages', () => {
    const message = roomPlacementFormatErrors(['Some Unknown Error']);
    expect(message).toBe('Cannot place room: some unknown error');
  });
});

function makeFloor(rooms: PlacedRoom[] = [], grid = gridCreateEmpty()): Floor {
  return {
    id: 'floor-1' as FloorId,
    name: 'Floor 1',
    depth: 1,
    biome: 'neutral',
    grid,
    rooms,
    hallways: [],
    inhabitants: [],
    connections: [],
    traps: [],
  };
}

describe('roomPlacementPlaceOnFloor', () => {
  it('should place a room and mark grid tiles', () => {
    const floor = makeFloor();
    const room: PlacedRoom = {
      id: 'room-1' as PlacedRoomId,
      roomTypeId: 'room-crystal-mine' as RoomId,
      shapeId: 'square-2x2' as RoomShapeId,
      anchorX: 5,
      anchorY: 5,
    };
    const result = roomPlacementPlaceOnFloor(floor, room, square2x2);

    expect(result).toBeDefined();
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

  it('should return undefined for invalid placement (out of bounds)', () => {
    const floor = makeFloor();
    const room: PlacedRoom = {
      id: 'room-1' as PlacedRoomId,
      roomTypeId: 'room-crystal-mine' as RoomId,
      shapeId: 'square-2x2' as RoomShapeId,
      anchorX: 19,
      anchorY: 19,
    };
    const result = roomPlacementPlaceOnFloor(floor, room, square2x2);
    expect(result).toBeUndefined();
  });

  it('should return undefined for overlapping placement', () => {
    const floor = makeFloor();
    const room1: PlacedRoom = {
      id: 'room-1' as PlacedRoomId,
      roomTypeId: 'room-crystal-mine' as RoomId,
      shapeId: 'square-2x2' as RoomShapeId,
      anchorX: 5,
      anchorY: 5,
    };
    const placed = roomPlacementPlaceOnFloor(floor, room1, square2x2)!;

    const room2: PlacedRoom = {
      id: 'room-2' as PlacedRoomId,
      roomTypeId: 'room-throne' as RoomId,
      shapeId: 'square-2x2' as RoomShapeId,
      anchorX: 6,
      anchorY: 6,
    };
    const result = roomPlacementPlaceOnFloor(placed, room2, square2x2);
    expect(result).toBeUndefined();
  });

  it('should allow placing non-overlapping rooms', () => {
    const floor = makeFloor();
    const room1: PlacedRoom = {
      id: 'room-1' as PlacedRoomId,
      roomTypeId: 'room-crystal-mine' as RoomId,
      shapeId: 'square-2x2' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };
    const placed = roomPlacementPlaceOnFloor(floor, room1, square2x2)!;

    const room2: PlacedRoom = {
      id: 'room-2' as PlacedRoomId,
      roomTypeId: 'room-throne' as RoomId,
      shapeId: 'square-2x2' as RoomShapeId,
      anchorX: 3,
      anchorY: 0,
    };
    const result = roomPlacementPlaceOnFloor(placed, room2, square2x2);
    expect(result).toBeDefined();
    expect(result!.rooms).toHaveLength(2);
  });

  it('should not mutate the original floor', () => {
    const floor = makeFloor();
    const room: PlacedRoom = {
      id: 'room-1' as PlacedRoomId,
      roomTypeId: 'room-crystal-mine' as RoomId,
      shapeId: 'square-2x2' as RoomShapeId,
      anchorX: 5,
      anchorY: 5,
    };
    roomPlacementPlaceOnFloor(floor, room, square2x2);

    expect(floor.rooms).toHaveLength(0);
    expect(floor.grid[5][5].occupied).toBe(false);
  });
});

describe('roomPlacementRemoveFromFloor', () => {
  it('should remove a room and clear grid tiles', () => {
    const floor = makeFloor();
    const room: PlacedRoom = {
      id: 'room-1' as PlacedRoomId,
      roomTypeId: 'room-crystal-mine' as RoomId,
      shapeId: 'square-2x2' as RoomShapeId,
      anchorX: 5,
      anchorY: 5,
    };
    const placed = roomPlacementPlaceOnFloor(floor, room, square2x2)!;

    const result = roomPlacementRemoveFromFloor(
      placed,
      'room-1' as PlacedRoomId,
      square2x2,
    );
    expect(result).toBeDefined();
    expect(result!.rooms).toHaveLength(0);
    expect(result!.grid[5][5].occupied).toBe(false);
    expect(result!.grid[5][5].roomId).toBeUndefined();
    expect(result!.grid[5][6].occupied).toBe(false);
    expect(result!.grid[6][5].occupied).toBe(false);
    expect(result!.grid[6][6].occupied).toBe(false);
  });

  it('should return undefined for non-existent room', () => {
    const floor = makeFloor();
    const result = roomPlacementRemoveFromFloor(
      floor,
      'nonexistent' as PlacedRoomId,
      square2x2,
    );
    expect(result).toBeUndefined();
  });

  it('should only remove the specified room', () => {
    const floor = makeFloor();
    const room1: PlacedRoom = {
      id: 'room-1' as PlacedRoomId,
      roomTypeId: 'room-crystal-mine' as RoomId,
      shapeId: 'square-2x2' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };
    const room2: PlacedRoom = {
      id: 'room-2' as PlacedRoomId,
      roomTypeId: 'room-throne' as RoomId,
      shapeId: 'square-2x2' as RoomShapeId,
      anchorX: 5,
      anchorY: 5,
    };
    let placed = roomPlacementPlaceOnFloor(floor, room1, square2x2)!;
    placed = roomPlacementPlaceOnFloor(placed, room2, square2x2)!;

    const result = roomPlacementRemoveFromFloor(
      placed,
      'room-1' as PlacedRoomId,
      square2x2,
    );
    expect(result).toBeDefined();
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
      id: 'room-1' as PlacedRoomId,
      roomTypeId: 'room-crystal-mine' as RoomId,
      shapeId: 'square-2x2' as RoomShapeId,
      anchorX: 5,
      anchorY: 5,
    };
    const placed = roomPlacementPlaceOnFloor(floor, room, square2x2)!;

    roomPlacementRemoveFromFloor(placed, 'room-1' as PlacedRoomId, square2x2);

    expect(placed.rooms).toHaveLength(1);
    expect(placed.grid[5][5].occupied).toBe(true);
  });
});

describe('roomPlacementIsUniqueTypePlaced', () => {
  it('should return false when no rooms are placed', () => {
    const floors = [makeFloor()];
    expect(
      roomPlacementIsUniqueTypePlaced(floors, 'room-throne' as RoomId),
    ).toBe(false);
  });

  it('should return true when the room type is placed on the current floor', () => {
    const existingRoom: PlacedRoom = {
      id: 'room-1' as PlacedRoomId,
      roomTypeId: 'room-throne' as RoomId,
      shapeId: 'square-2x2' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };
    const floors = [makeFloor([existingRoom])];
    expect(
      roomPlacementIsUniqueTypePlaced(floors, 'room-throne' as RoomId),
    ).toBe(true);
  });

  it('should return true when the room type is placed on a different floor', () => {
    const existingRoom: PlacedRoom = {
      id: 'room-1' as PlacedRoomId,
      roomTypeId: 'room-throne' as RoomId,
      shapeId: 'square-2x2' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };
    const floors = [makeFloor(), makeFloor([existingRoom])];
    expect(
      roomPlacementIsUniqueTypePlaced(floors, 'room-throne' as RoomId),
    ).toBe(true);
  });

  it('should return false for a different room type', () => {
    const existingRoom: PlacedRoom = {
      id: 'room-1' as PlacedRoomId,
      roomTypeId: 'room-crystal-mine' as RoomId,
      shapeId: 'square-2x2' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };
    const floors = [makeFloor([existingRoom])];
    expect(
      roomPlacementIsUniqueTypePlaced(floors, 'room-throne' as RoomId),
    ).toBe(false);
  });

  it('should check across multiple floors', () => {
    const room1: PlacedRoom = {
      id: 'room-1' as PlacedRoomId,
      roomTypeId: 'room-crystal-mine' as RoomId,
      shapeId: 'square-2x2' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };
    const room2: PlacedRoom = {
      id: 'room-2' as PlacedRoomId,
      roomTypeId: 'room-throne' as RoomId,
      shapeId: 'square-2x2' as RoomShapeId,
      anchorX: 5,
      anchorY: 5,
    };
    const floors = [makeFloor([room1]), makeFloor([room2])];
    expect(
      roomPlacementIsUniqueTypePlaced(floors, 'room-throne' as RoomId),
    ).toBe(true);
    expect(
      roomPlacementIsUniqueTypePlaced(floors, 'room-crystal-mine' as RoomId),
    ).toBe(true);
    expect(
      roomPlacementIsUniqueTypePlaced(floors, 'room-barracks' as RoomId),
    ).toBe(false);
  });
});

describe('roomPlacementCountTypeAllFloors', () => {
  it('should return 0 when no rooms exist', () => {
    expect(
      roomPlacementCountTypeAllFloors(
        [makeFloor()],
        'room-crystal-mine' as RoomId,
      ),
    ).toBe(0);
  });

  it('should count rooms of the same type on one floor', () => {
    const rooms: PlacedRoom[] = [
      {
        id: 'room-1' as PlacedRoomId,
        roomTypeId: 'room-crystal-mine' as RoomId,
        shapeId: 'square-2x2' as RoomShapeId,
        anchorX: 0,
        anchorY: 0,
      },
      {
        id: 'room-2' as PlacedRoomId,
        roomTypeId: 'room-crystal-mine' as RoomId,
        shapeId: 'square-2x2' as RoomShapeId,
        anchorX: 5,
        anchorY: 5,
      },
    ];
    expect(
      roomPlacementCountTypeAllFloors(
        [makeFloor(rooms)],
        'room-crystal-mine' as RoomId,
      ),
    ).toBe(2);
  });

  it('should count rooms across multiple floors', () => {
    const room1: PlacedRoom = {
      id: 'room-1' as PlacedRoomId,
      roomTypeId: 'room-crystal-mine' as RoomId,
      shapeId: 'square-2x2' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };
    const room2: PlacedRoom = {
      id: 'room-2' as PlacedRoomId,
      roomTypeId: 'room-crystal-mine' as RoomId,
      shapeId: 'square-2x2' as RoomShapeId,
      anchorX: 0,
      anchorY: 0,
    };
    const room3: PlacedRoom = {
      id: 'room-3' as PlacedRoomId,
      roomTypeId: 'room-throne' as RoomId,
      shapeId: 'square-2x2' as RoomShapeId,
      anchorX: 5,
      anchorY: 5,
    };
    const floors = [makeFloor([room1, room3]), makeFloor([room2])];
    expect(
      roomPlacementCountTypeAllFloors(floors, 'room-crystal-mine' as RoomId),
    ).toBe(2);
    expect(
      roomPlacementCountTypeAllFloors(floors, 'room-throne' as RoomId),
    ).toBe(1);
    expect(
      roomPlacementCountTypeAllFloors(floors, 'room-barracks' as RoomId),
    ).toBe(0);
  });
});

describe('roomPlacementEnterMode / roomPlacementRotate / roomPlacementExitMode', () => {
  const tShape: RoomShapeContent = {
    id: 't-shape' as RoomShapeId,
    name: 'T-Shape',
    tiles: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
    ],
    width: 3,
    height: 2,
  };

  beforeEach(() => {
    roomPlacementExitMode();
  });

  afterEach(() => {
    roomPlacementExitMode();
  });

  it('should set initial state on enterMode', () => {
    roomPlacementEnterMode('room-test' as RoomId, square2x2);
    expect(roomPlacementSelectedTypeId()).toBe('room-test');
    expect(roomPlacementRotation()).toBe(0);
    expect(roomPlacementPreviewShape()).toBe(square2x2);
  });

  it('should reset state on exitMode', () => {
    roomPlacementEnterMode('room-test' as RoomId, square2x2);
    roomPlacementExitMode();
    expect(roomPlacementSelectedTypeId()).toBeUndefined();
    expect(roomPlacementRotation()).toBe(0);
    expect(roomPlacementPreviewShape()).toBeUndefined();
  });

  it('should cycle rotation 0→1→2→3→0', () => {
    roomPlacementEnterMode('room-test' as RoomId, square2x2);
    expect(roomPlacementRotation()).toBe(0);

    roomPlacementRotate();
    expect(roomPlacementRotation()).toBe(1);

    roomPlacementRotate();
    expect(roomPlacementRotation()).toBe(2);

    roomPlacementRotate();
    expect(roomPlacementRotation()).toBe(3);

    roomPlacementRotate();
    expect(roomPlacementRotation()).toBe(0);
  });

  it('should do nothing if no base shape is set', () => {
    // Don't call enterMode — no base shape
    roomPlacementRotate();
    expect(roomPlacementRotation()).toBe(0);
  });

  it('should update preview shape with rotated tiles on T-shape rotation', () => {
    roomPlacementEnterMode('room-test' as RoomId, tShape);

    // Initially preview is the unrotated T-shape (3x2)
    const preview0 = roomPlacementPreviewShape();
    expect(preview0?.width).toBe(3);
    expect(preview0?.height).toBe(2);

    // Rotate 90° — T-shape becomes 2x3
    roomPlacementRotate();
    const preview1 = roomPlacementPreviewShape();
    expect(preview1?.width).toBe(2);
    expect(preview1?.height).toBe(3);
    expect(preview1?.tiles).toHaveLength(4);

    // Rotate 180° — back to 3x2
    roomPlacementRotate();
    const preview2 = roomPlacementPreviewShape();
    expect(preview2?.width).toBe(3);
    expect(preview2?.height).toBe(2);

    // Rotate 270° — 2x3 again
    roomPlacementRotate();
    const preview3 = roomPlacementPreviewShape();
    expect(preview3?.width).toBe(2);
    expect(preview3?.height).toBe(3);
  });

  it('should always rotate from the base shape, not accumulate drift', () => {
    roomPlacementEnterMode('room-test' as RoomId, tShape);

    // Rotate 4 full cycles (16 rotations)
    for (let i = 0; i < 16; i++) {
      roomPlacementRotate();
    }
    expect(roomPlacementRotation()).toBe(0);

    // Preview should match original base shape
    const preview = roomPlacementPreviewShape();
    expect(preview?.width).toBe(tShape.width);
    expect(preview?.height).toBe(tShape.height);

    const originalSet = new Set(tShape.tiles.map((t) => `${t.x},${t.y}`));
    const previewSet = new Set(
      (preview?.tiles ?? []).map((t) => `${t.x},${t.y}`),
    );
    expect(previewSet).toEqual(originalSet);
  });

  it('should reset rotation to 0 when entering a new mode', () => {
    roomPlacementEnterMode('room-test' as RoomId, tShape);
    roomPlacementRotate();
    roomPlacementRotate();
    expect(roomPlacementRotation()).toBe(2);

    // Enter mode again — rotation should reset
    roomPlacementEnterMode('room-other' as RoomId, square2x2);
    expect(roomPlacementRotation()).toBe(0);
    expect(roomPlacementPreviewShape()).toBe(square2x2);
  });
});
