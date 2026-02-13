import {
  connectionAddToFloor,
  connectionAreConnected,
  connectionFind,
  connectionGetConnectedRooms,
  connectionGetFloorConnections,
  connectionRemoveFromFloor,
  connectionRemoveRoomFromFloor,
  connectionValidate,
} from '@helpers/connections';
import type { Connection, Floor, PlacedRoom } from '@interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGamestate = vi.fn();

vi.mock('@helpers/state-game', () => ({
  gamestate: (...args: unknown[]) => mockGamestate(...args),
  updateGamestate: vi.fn(),
}));

vi.mock('@helpers/rng', () => ({
  rngUuid: () => 'test-uuid',
}));

vi.mock('@helpers/room-shapes', () => ({
  roomShapeResolve: (room: PlacedRoom) => ({
    id: room.shapeId,
    name: 'Test Shape',
    tiles: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
    width: 2,
    height: 1,
  }),
  roomShapeGetAbsoluteTiles: (_shape: unknown, anchorX: number, anchorY: number) => [
    { x: anchorX, y: anchorY },
    { x: anchorX + 1, y: anchorY },
  ],
}));

function makeFloor(overrides: Partial<Floor> = {}): Floor {
  return {
    id: 'floor-1',
    name: 'Floor 1',
    depth: 1,
    biome: 'neutral',
    grid: [],
    rooms: [],
    hallways: [],
    inhabitants: [],
    connections: [],
    traps: [],
    ...overrides,
  } as Floor;
}

function makeConnection(overrides: Partial<Connection> = {}): Connection {
  return {
    id: 'conn-1',
    roomAId: 'room-a',
    roomBId: 'room-b',
    edgeTiles: [{ x: 2, y: 0 }],
    ...overrides,
  };
}

function makeRoom(overrides: Partial<PlacedRoom> = {}): PlacedRoom {
  return {
    id: 'room-a',
    roomTypeId: 'room-type-1',
    shapeId: 'shape-2x1',
    anchorX: 0,
    anchorY: 0,
    ...overrides,
  };
}

const defaultState = () => ({
  world: {
    floors: [
      makeFloor({
        connections: [
          makeConnection({ id: 'conn-1', roomAId: 'room-a', roomBId: 'room-b' }),
          makeConnection({ id: 'conn-2', roomAId: 'room-b', roomBId: 'room-c' }),
        ],
      }),
    ],
    currentFloorIndex: 0,
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGamestate.mockReturnValue(defaultState());
});

describe('connectionGetFloorConnections', () => {
  it('should return all connections on the current floor', () => {
    const connections = connectionGetFloorConnections();
    expect(connections).toHaveLength(2);
  });

  it('should return empty array when no floor exists', () => {
    mockGamestate.mockReturnValue({
      world: { floors: [], currentFloorIndex: 0 },
    });
    const connections = connectionGetFloorConnections();
    expect(connections).toEqual([]);
  });
});

describe('connectionGetConnectedRooms', () => {
  it('should return rooms connected to a room via roomAId', () => {
    const connected = connectionGetConnectedRooms('room-a');
    expect(connected).toEqual(['room-b']);
  });

  it('should return rooms connected to a room via roomBId', () => {
    const connected = connectionGetConnectedRooms('room-c');
    expect(connected).toEqual(['room-b']);
  });

  it('should return multiple connected rooms', () => {
    const connected = connectionGetConnectedRooms('room-b');
    expect(connected).toHaveLength(2);
    expect(connected).toContain('room-a');
    expect(connected).toContain('room-c');
  });

  it('should return empty array for unconnected room', () => {
    const connected = connectionGetConnectedRooms('room-z');
    expect(connected).toEqual([]);
  });
});

describe('connectionAreConnected', () => {
  it('should return true for connected rooms (A→B order)', () => {
    expect(connectionAreConnected('room-a', 'room-b')).toBe(true);
  });

  it('should return true for connected rooms (B→A order)', () => {
    expect(connectionAreConnected('room-b', 'room-a')).toBe(true);
  });

  it('should return false for unconnected rooms', () => {
    expect(connectionAreConnected('room-a', 'room-c')).toBe(false);
  });

  it('should return false for nonexistent rooms', () => {
    expect(connectionAreConnected('room-x', 'room-y')).toBe(false);
  });
});

describe('connectionFind', () => {
  it('should find connection in A→B order', () => {
    const floor = makeFloor({
      connections: [makeConnection({ id: 'conn-1', roomAId: 'room-a', roomBId: 'room-b' })],
    });
    const result = connectionFind(floor, 'room-a', 'room-b');
    expect(result).toBeDefined();
    expect(result?.id).toBe('conn-1');
  });

  it('should find connection in B→A order', () => {
    const floor = makeFloor({
      connections: [makeConnection({ id: 'conn-1', roomAId: 'room-a', roomBId: 'room-b' })],
    });
    const result = connectionFind(floor, 'room-b', 'room-a');
    expect(result).toBeDefined();
    expect(result?.id).toBe('conn-1');
  });

  it('should return undefined for nonexistent connection', () => {
    const floor = makeFloor({ connections: [] });
    const result = connectionFind(floor, 'room-a', 'room-b');
    expect(result).toBeUndefined();
  });
});

describe('connectionAddToFloor', () => {
  it('should add a new connection', () => {
    const floor = makeFloor({ connections: [] });
    const result = connectionAddToFloor(floor, 'room-a', 'room-b', [{ x: 2, y: 0 }]);
    expect(result).toBeDefined();
    expect(result!.floor.connections).toHaveLength(1);
    expect(result!.connection.roomAId).toBe('room-a');
    expect(result!.connection.roomBId).toBe('room-b');
    expect(result!.connection.edgeTiles).toEqual([{ x: 2, y: 0 }]);
  });

  it('should return undefined for duplicate connection', () => {
    const floor = makeFloor({
      connections: [makeConnection({ roomAId: 'room-a', roomBId: 'room-b' })],
    });
    const result = connectionAddToFloor(floor, 'room-a', 'room-b', [{ x: 2, y: 0 }]);
    expect(result).toBeUndefined();
  });

  it('should return undefined for duplicate connection in reverse order', () => {
    const floor = makeFloor({
      connections: [makeConnection({ roomAId: 'room-a', roomBId: 'room-b' })],
    });
    const result = connectionAddToFloor(floor, 'room-b', 'room-a', [{ x: 2, y: 0 }]);
    expect(result).toBeUndefined();
  });

  it('should not mutate the original floor', () => {
    const floor = makeFloor({ connections: [] });
    connectionAddToFloor(floor, 'room-a', 'room-b', [{ x: 2, y: 0 }]);
    expect(floor.connections).toHaveLength(0);
  });
});

describe('connectionRemoveFromFloor', () => {
  it('should remove a connection by ID', () => {
    const floor = makeFloor({
      connections: [
        makeConnection({ id: 'conn-1' }),
        makeConnection({ id: 'conn-2', roomAId: 'room-c', roomBId: 'room-d' }),
      ],
    });
    const result = connectionRemoveFromFloor(floor, 'conn-1');
    expect(result).toBeDefined();
    expect(result!.connections).toHaveLength(1);
    expect(result!.connections[0].id).toBe('conn-2');
  });

  it('should return undefined for nonexistent connection ID', () => {
    const floor = makeFloor({ connections: [makeConnection({ id: 'conn-1' })] });
    const result = connectionRemoveFromFloor(floor, 'conn-99');
    expect(result).toBeUndefined();
  });

  it('should not mutate the original floor', () => {
    const floor = makeFloor({ connections: [makeConnection({ id: 'conn-1' })] });
    connectionRemoveFromFloor(floor, 'conn-1');
    expect(floor.connections).toHaveLength(1);
  });
});

describe('connectionRemoveRoomFromFloor', () => {
  it('should remove all connections involving a room', () => {
    const floor = makeFloor({
      connections: [
        makeConnection({ id: 'conn-1', roomAId: 'room-a', roomBId: 'room-b' }),
        makeConnection({ id: 'conn-2', roomAId: 'room-b', roomBId: 'room-c' }),
        makeConnection({ id: 'conn-3', roomAId: 'room-c', roomBId: 'room-d' }),
      ],
    });
    const result = connectionRemoveRoomFromFloor(floor, 'room-b');
    expect(result.connections).toHaveLength(1);
    expect(result.connections[0].id).toBe('conn-3');
  });

  it('should return unchanged floor if room has no connections', () => {
    const floor = makeFloor({
      connections: [makeConnection({ id: 'conn-1', roomAId: 'room-a', roomBId: 'room-b' })],
    });
    const result = connectionRemoveRoomFromFloor(floor, 'room-z');
    expect(result.connections).toHaveLength(1);
  });

  it('should not mutate the original floor', () => {
    const floor = makeFloor({
      connections: [makeConnection({ id: 'conn-1', roomAId: 'room-a', roomBId: 'room-b' })],
    });
    connectionRemoveRoomFromFloor(floor, 'room-a');
    expect(floor.connections).toHaveLength(1);
  });
});

describe('connectionValidate', () => {
  it('should reject self-connection', () => {
    const floor = makeFloor({
      rooms: [makeRoom({ id: 'room-a', anchorX: 0, anchorY: 0 })],
    });
    const result = connectionValidate(floor, 'room-a', 'room-a');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Cannot connect an entity to itself');
  });

  it('should reject when room A not found', () => {
    const floor = makeFloor({
      rooms: [makeRoom({ id: 'room-b', anchorX: 2, anchorY: 0 })],
    });
    const result = connectionValidate(floor, 'room-x', 'room-b');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('One or both entities not found on this floor');
  });

  it('should reject when room B not found', () => {
    const floor = makeFloor({
      rooms: [makeRoom({ id: 'room-a', anchorX: 0, anchorY: 0 })],
    });
    const result = connectionValidate(floor, 'room-a', 'room-y');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('One or both entities not found on this floor');
  });

  it('should reject non-adjacent rooms', () => {
    // Room A at (0,0)-(1,0), Room B at (5,0)-(6,0) — not adjacent
    const floor = makeFloor({
      rooms: [
        makeRoom({ id: 'room-a', anchorX: 0, anchorY: 0 }),
        makeRoom({ id: 'room-b', anchorX: 5, anchorY: 0 }),
      ],
    });
    const result = connectionValidate(floor, 'room-a', 'room-b');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Entities are not adjacent');
  });

  it('should reject already connected rooms', () => {
    // Room A at (0,0)-(1,0), Room B at (2,0)-(3,0) — adjacent
    const floor = makeFloor({
      rooms: [
        makeRoom({ id: 'room-a', anchorX: 0, anchorY: 0 }),
        makeRoom({ id: 'room-b', anchorX: 2, anchorY: 0 }),
      ],
      connections: [makeConnection({ roomAId: 'room-a', roomBId: 'room-b' })],
    });
    const result = connectionValidate(floor, 'room-a', 'room-b');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Entities are already connected');
  });

  it('should reject already connected rooms in reverse order', () => {
    const floor = makeFloor({
      rooms: [
        makeRoom({ id: 'room-a', anchorX: 0, anchorY: 0 }),
        makeRoom({ id: 'room-b', anchorX: 2, anchorY: 0 }),
      ],
      connections: [makeConnection({ roomAId: 'room-a', roomBId: 'room-b' })],
    });
    const result = connectionValidate(floor, 'room-b', 'room-a');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Entities are already connected');
  });

  it('should accept valid adjacent unconnected rooms', () => {
    // Room A at (0,0)-(1,0), Room B at (2,0)-(3,0) — adjacent at x=1/x=2
    const floor = makeFloor({
      rooms: [
        makeRoom({ id: 'room-a', anchorX: 0, anchorY: 0 }),
        makeRoom({ id: 'room-b', anchorX: 2, anchorY: 0 }),
      ],
    });
    const result = connectionValidate(floor, 'room-a', 'room-b');
    expect(result.valid).toBe(true);
    expect(result.edgeTiles).toBeDefined();
    expect(result.edgeTiles!.length).toBeGreaterThan(0);
  });

  it('should return edge tiles for valid connection', () => {
    // Room A at (0,0)-(1,0), Room B at (2,0)-(3,0) — shared edge at (1,0)↔(2,0)
    const floor = makeFloor({
      rooms: [
        makeRoom({ id: 'room-a', anchorX: 0, anchorY: 0 }),
        makeRoom({ id: 'room-b', anchorX: 2, anchorY: 0 }),
      ],
    });
    const result = connectionValidate(floor, 'room-a', 'room-b');
    expect(result.valid).toBe(true);
    expect(result.edgeTiles).toEqual([{ x: 1, y: 0 }]);
  });
});
