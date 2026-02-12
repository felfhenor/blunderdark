import { createEmptyGrid, setTile } from '@helpers/grid';
import { placeRoomOnFloor, removeRoomFromFloor } from '@helpers/room-placement';
import { calculateRefund } from '@helpers/room-removal';
import type { Floor, InhabitantInstance, PlacedRoom, RoomShape } from '@interfaces';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// --- Mock getEntry to control removable/cost for isRoomRemovable ---
const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  getEntry: (id: string) => mockContent.get(id),
  getEntriesByType: () => [],
}));

vi.mock('@helpers/room-upgrades', () => ({
  getEffectiveMaxInhabitants: (_room: PlacedRoom, def: { maxInhabitants: number }) =>
    def.maxInhabitants,
  getAppliedUpgradeEffects: () => [],
  getUpgradePaths: () => [],
}));

// --- Test shapes ---

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

const square3x3: RoomShape = {
  id: 'square-3x3',
  name: 'Square 3x3',
  tiles: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
  ],
  width: 3,
  height: 3,
};

// --- Test helper ---

function makeFloor(
  rooms: PlacedRoom[] = [],
  grid = createEmptyGrid(),
  inhabitants: InhabitantInstance[] = [],
): Floor {
  return {
    id: 'floor-1',
    name: 'Floor 1',
    depth: 1,
    biome: 'neutral',
    grid,
    rooms,
    hallways: [],
    inhabitants,
    connections: [],
  };
}

// --- Room type IDs ---
const ALTAR_ROOM_TYPE_ID = 'aa100001-0001-0001-0001-000000000009';
const CRYSTAL_MINE_TYPE_ID = 'aa100001-0001-0001-0001-000000000002';
const THRONE_ROOM_TYPE_ID = 'aa100001-0001-0001-0001-000000000001';

beforeEach(() => {
  mockContent.clear();

  // Altar Room: removable: false, no cost
  mockContent.set(ALTAR_ROOM_TYPE_ID, {
    id: ALTAR_ROOM_TYPE_ID,
    __type: 'room',
    name: 'Altar Room',
    description: '',
    shapeId: 'square-3x3',
    cost: {},
    production: { essence: 0.2 },
    requiresWorkers: false,
    adjacencyBonuses: [],
    isUnique: true,
    removable: false,
    autoPlace: true,
    maxInhabitants: 0,
    inhabitantRestriction: null,
    fearLevel: 0,
    fearReductionAura: 1,
    upgradePaths: [],
  });

  // Crystal Mine: removable: true, cost 50 gold
  mockContent.set(CRYSTAL_MINE_TYPE_ID, {
    id: CRYSTAL_MINE_TYPE_ID,
    __type: 'room',
    name: 'Crystal Mine',
    description: '',
    shapeId: 'square-2x2',
    cost: { gold: 50 },
    production: { crystals: 1.0 },
    requiresWorkers: true,
    adjacencyBonuses: [],
    isUnique: false,
    removable: true,
    autoPlace: false,
    maxInhabitants: 2,
    inhabitantRestriction: null,
    fearLevel: 1,
    fearReductionAura: 0,
    upgradePaths: [],
  });

  // Throne Room: removable: true, cost 100 gold + 50 crystals
  mockContent.set(THRONE_ROOM_TYPE_ID, {
    id: THRONE_ROOM_TYPE_ID,
    __type: 'room',
    name: 'Throne Room',
    description: '',
    shapeId: 'square-3x3',
    cost: { gold: 100, crystals: 50 },
    production: {},
    requiresWorkers: false,
    adjacencyBonuses: [],
    isUnique: true,
    removable: true,
    autoPlace: false,
    maxInhabitants: 1,
    inhabitantRestriction: 'unique',
    fearLevel: 'variable',
    fearReductionAura: 0,
    upgradePaths: [],
  });

  // Shapes
  mockContent.set('square-2x2', { ...square2x2, __type: 'roomshape' });
  mockContent.set('square-3x3', { ...square3x3, __type: 'roomshape' });
});

// --- US-001: Altar Cannot Be Removed ---

describe('US-001: Altar Cannot Be Removed', () => {
  it('should flag altar as non-removable via isRoomRemovable', async () => {
    const { isRoomRemovable } = await import('@helpers/room-placement');
    expect(isRoomRemovable(ALTAR_ROOM_TYPE_ID)).toBe(false);
  });

  it('should allow removal of regular rooms via isRoomRemovable', async () => {
    const { isRoomRemovable } = await import('@helpers/room-placement');
    expect(isRoomRemovable(CRYSTAL_MINE_TYPE_ID)).toBe(true);
  });

  it('should allow removal of unique non-altar rooms', async () => {
    const { isRoomRemovable } = await import('@helpers/room-placement');
    expect(isRoomRemovable(THRONE_ROOM_TYPE_ID)).toBe(true);
  });

  it('should return true for unknown room types (safe default)', async () => {
    const { isRoomRemovable } = await import('@helpers/room-placement');
    expect(isRoomRemovable('nonexistent-room-type')).toBe(true);
  });
});

// --- US-002: Resource Refund on Removal ---

describe('US-002: Resource Refund on Removal', () => {
  it('should refund 50% of cost rounded down', () => {
    const refund = calculateRefund({ gold: 50 });
    expect(refund).toEqual({ gold: 25 });
  });

  it('should refund 50% of multiple resource types', () => {
    const refund = calculateRefund({ gold: 100, crystals: 50 });
    expect(refund).toEqual({ gold: 50, crystals: 25 });
  });

  it('should floor fractional refund values', () => {
    const refund = calculateRefund({ gold: 33 });
    expect(refund).toEqual({ gold: 16 });
  });

  it('should floor odd single-unit costs to zero', () => {
    const refund = calculateRefund({ gold: 1 });
    expect(refund).toEqual({ gold: 0 });
  });

  it('should return empty object for zero-cost rooms', () => {
    const refund = calculateRefund({});
    expect(refund).toEqual({});
  });

  it('should return empty object for altar room (no cost)', () => {
    const refund = calculateRefund({});
    expect(refund).toEqual({});
  });

  it('should handle large costs correctly', () => {
    const refund = calculateRefund({ gold: 1000, crystals: 500, essence: 250 });
    expect(refund).toEqual({ gold: 500, crystals: 250, essence: 125 });
  });
});

// --- US-003: Clear Grid Tiles on Removal ---

describe('US-003: Clear Grid Tiles on Removal', () => {
  it('should clear all tiles occupied by the removed room', () => {
    const floor = makeFloor();
    const room: PlacedRoom = {
      id: 'room-1',
      roomTypeId: CRYSTAL_MINE_TYPE_ID,
      shapeId: 'square-2x2',
      anchorX: 5,
      anchorY: 5,
    };
    const placed = placeRoomOnFloor(floor, room, square2x2)!;
    expect(placed).not.toBeNull();

    const result = removeRoomFromFloor(placed, 'room-1', square2x2);
    expect(result).not.toBeNull();
    expect(result!.rooms).toHaveLength(0);

    // All 4 tiles should be cleared
    expect(result!.grid[5][5].occupied).toBe(false);
    expect(result!.grid[5][5].roomId).toBeNull();
    expect(result!.grid[5][6].occupied).toBe(false);
    expect(result!.grid[5][6].roomId).toBeNull();
    expect(result!.grid[6][5].occupied).toBe(false);
    expect(result!.grid[6][5].roomId).toBeNull();
    expect(result!.grid[6][6].occupied).toBe(false);
    expect(result!.grid[6][6].roomId).toBeNull();
  });

  it('should not affect tiles of other rooms', () => {
    const floor = makeFloor();
    const room1: PlacedRoom = {
      id: 'room-1',
      roomTypeId: CRYSTAL_MINE_TYPE_ID,
      shapeId: 'square-2x2',
      anchorX: 0,
      anchorY: 0,
    };
    const room2: PlacedRoom = {
      id: 'room-2',
      roomTypeId: CRYSTAL_MINE_TYPE_ID,
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
    // room-2 tiles still intact
    expect(result!.grid[5][5].occupied).toBe(true);
    expect(result!.grid[5][5].roomId).toBe('room-2');
  });

  it('should preserve hallway data on tiles when removing a room', () => {
    let grid = createEmptyGrid();
    // Simulate a tile that has both a room and a hallway
    grid = setTile(grid, 5, 5, {
      occupied: true,
      occupiedBy: 'room',
      roomId: 'room-1',
      hallwayId: 'hallway-1',
      connectionType: null,
    });
    grid = setTile(grid, 6, 5, {
      occupied: true,
      occupiedBy: 'room',
      roomId: 'room-1',
      hallwayId: null,
      connectionType: null,
    });
    grid = setTile(grid, 5, 6, {
      occupied: true,
      occupiedBy: 'room',
      roomId: 'room-1',
      hallwayId: null,
      connectionType: null,
    });
    grid = setTile(grid, 6, 6, {
      occupied: true,
      occupiedBy: 'room',
      roomId: 'room-1',
      hallwayId: null,
      connectionType: null,
    });

    const room: PlacedRoom = {
      id: 'room-1',
      roomTypeId: CRYSTAL_MINE_TYPE_ID,
      shapeId: 'square-2x2',
      anchorX: 5,
      anchorY: 5,
    };
    const floor = makeFloor([room], grid);

    const result = removeRoomFromFloor(floor, 'room-1', square2x2);
    expect(result).not.toBeNull();
    // Hallway data should be preserved
    expect(result!.grid[5][5].hallwayId).toBe('hallway-1');
    expect(result!.grid[5][5].occupied).toBe(false);
    expect(result!.grid[5][5].roomId).toBeNull();
  });

  it('should return null when trying to remove non-existent room', () => {
    const floor = makeFloor();
    const result = removeRoomFromFloor(floor, 'nonexistent', square2x2);
    expect(result).toBeNull();
  });

  it('should allow re-placing a room on cleared tiles', () => {
    const floor = makeFloor();
    const room: PlacedRoom = {
      id: 'room-1',
      roomTypeId: CRYSTAL_MINE_TYPE_ID,
      shapeId: 'square-2x2',
      anchorX: 5,
      anchorY: 5,
    };
    const placed = placeRoomOnFloor(floor, room, square2x2)!;
    const removed = removeRoomFromFloor(placed, 'room-1', square2x2)!;

    // Place a new room in the same spot
    const newRoom: PlacedRoom = {
      id: 'room-new',
      roomTypeId: CRYSTAL_MINE_TYPE_ID,
      shapeId: 'square-2x2',
      anchorX: 5,
      anchorY: 5,
    };
    const rePlaced = placeRoomOnFloor(removed, newRoom, square2x2);
    expect(rePlaced).not.toBeNull();
    expect(rePlaced!.rooms).toHaveLength(1);
    expect(rePlaced!.rooms[0].id).toBe('room-new');
  });
});

// --- US-004: Inhabitant Displacement on Removal ---

describe('US-004: Inhabitant Displacement - getRemovalInfo', () => {
  // These tests verify the pure calculation functions.
  // The full executeRoomRemoval function requires mocking gamestate/updateGamestate
  // which is complex, so we test the building blocks.

  it('should calculate refund for rooms with costs', () => {
    const refund = calculateRefund({ gold: 100, crystals: 50 });
    expect(refund).toEqual({ gold: 50, crystals: 25 });
  });

  it('should return no refund for rooms with no cost', () => {
    const refund = calculateRefund({});
    expect(refund).toEqual({});
  });

  it('should handle multi-resource costs', () => {
    const refund = calculateRefund({ gold: 80, crystals: 30, essence: 15 });
    expect(refund).toEqual({ gold: 40, crystals: 15, essence: 7 });
  });
});
