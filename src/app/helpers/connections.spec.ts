import {
  addConnectionToFloor,
  areRoomsConnected,
  findConnection,
  getConnectedRooms,
  getFloorConnections,
  removeConnectionFromFloor,
  removeRoomConnectionsFromFloor,
} from '@helpers/connections';
import type { Connection, Floor } from '@interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGamestate = vi.fn();

vi.mock('@helpers/state-game', () => ({
  gamestate: (...args: unknown[]) => mockGamestate(...args),
  updateGamestate: vi.fn(),
}));

vi.mock('@helpers/rng', () => ({
  rngUuid: () => 'test-uuid',
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

describe('getFloorConnections', () => {
  it('should return all connections on the current floor', () => {
    const connections = getFloorConnections();
    expect(connections).toHaveLength(2);
  });

  it('should return empty array when no floor exists', () => {
    mockGamestate.mockReturnValue({
      world: { floors: [], currentFloorIndex: 0 },
    });
    const connections = getFloorConnections();
    expect(connections).toEqual([]);
  });
});

describe('getConnectedRooms', () => {
  it('should return rooms connected to a room via roomAId', () => {
    const connected = getConnectedRooms('room-a');
    expect(connected).toEqual(['room-b']);
  });

  it('should return rooms connected to a room via roomBId', () => {
    const connected = getConnectedRooms('room-c');
    expect(connected).toEqual(['room-b']);
  });

  it('should return multiple connected rooms', () => {
    const connected = getConnectedRooms('room-b');
    expect(connected).toHaveLength(2);
    expect(connected).toContain('room-a');
    expect(connected).toContain('room-c');
  });

  it('should return empty array for unconnected room', () => {
    const connected = getConnectedRooms('room-z');
    expect(connected).toEqual([]);
  });
});

describe('areRoomsConnected', () => {
  it('should return true for connected rooms (A→B order)', () => {
    expect(areRoomsConnected('room-a', 'room-b')).toBe(true);
  });

  it('should return true for connected rooms (B→A order)', () => {
    expect(areRoomsConnected('room-b', 'room-a')).toBe(true);
  });

  it('should return false for unconnected rooms', () => {
    expect(areRoomsConnected('room-a', 'room-c')).toBe(false);
  });

  it('should return false for nonexistent rooms', () => {
    expect(areRoomsConnected('room-x', 'room-y')).toBe(false);
  });
});

describe('findConnection', () => {
  it('should find connection in A→B order', () => {
    const floor = makeFloor({
      connections: [makeConnection({ id: 'conn-1', roomAId: 'room-a', roomBId: 'room-b' })],
    });
    const result = findConnection(floor, 'room-a', 'room-b');
    expect(result).toBeDefined();
    expect(result?.id).toBe('conn-1');
  });

  it('should find connection in B→A order', () => {
    const floor = makeFloor({
      connections: [makeConnection({ id: 'conn-1', roomAId: 'room-a', roomBId: 'room-b' })],
    });
    const result = findConnection(floor, 'room-b', 'room-a');
    expect(result).toBeDefined();
    expect(result?.id).toBe('conn-1');
  });

  it('should return undefined for nonexistent connection', () => {
    const floor = makeFloor({ connections: [] });
    const result = findConnection(floor, 'room-a', 'room-b');
    expect(result).toBeUndefined();
  });
});

describe('addConnectionToFloor', () => {
  it('should add a new connection', () => {
    const floor = makeFloor({ connections: [] });
    const result = addConnectionToFloor(floor, 'room-a', 'room-b', [{ x: 2, y: 0 }]);
    expect(result).not.toBeNull();
    expect(result!.floor.connections).toHaveLength(1);
    expect(result!.connection.roomAId).toBe('room-a');
    expect(result!.connection.roomBId).toBe('room-b');
    expect(result!.connection.edgeTiles).toEqual([{ x: 2, y: 0 }]);
  });

  it('should return null for duplicate connection', () => {
    const floor = makeFloor({
      connections: [makeConnection({ roomAId: 'room-a', roomBId: 'room-b' })],
    });
    const result = addConnectionToFloor(floor, 'room-a', 'room-b', [{ x: 2, y: 0 }]);
    expect(result).toBeNull();
  });

  it('should return null for duplicate connection in reverse order', () => {
    const floor = makeFloor({
      connections: [makeConnection({ roomAId: 'room-a', roomBId: 'room-b' })],
    });
    const result = addConnectionToFloor(floor, 'room-b', 'room-a', [{ x: 2, y: 0 }]);
    expect(result).toBeNull();
  });

  it('should not mutate the original floor', () => {
    const floor = makeFloor({ connections: [] });
    addConnectionToFloor(floor, 'room-a', 'room-b', [{ x: 2, y: 0 }]);
    expect(floor.connections).toHaveLength(0);
  });
});

describe('removeConnectionFromFloor', () => {
  it('should remove a connection by ID', () => {
    const floor = makeFloor({
      connections: [
        makeConnection({ id: 'conn-1' }),
        makeConnection({ id: 'conn-2', roomAId: 'room-c', roomBId: 'room-d' }),
      ],
    });
    const result = removeConnectionFromFloor(floor, 'conn-1');
    expect(result).not.toBeNull();
    expect(result!.connections).toHaveLength(1);
    expect(result!.connections[0].id).toBe('conn-2');
  });

  it('should return null for nonexistent connection ID', () => {
    const floor = makeFloor({ connections: [makeConnection({ id: 'conn-1' })] });
    const result = removeConnectionFromFloor(floor, 'conn-99');
    expect(result).toBeNull();
  });

  it('should not mutate the original floor', () => {
    const floor = makeFloor({ connections: [makeConnection({ id: 'conn-1' })] });
    removeConnectionFromFloor(floor, 'conn-1');
    expect(floor.connections).toHaveLength(1);
  });
});

describe('removeRoomConnectionsFromFloor', () => {
  it('should remove all connections involving a room', () => {
    const floor = makeFloor({
      connections: [
        makeConnection({ id: 'conn-1', roomAId: 'room-a', roomBId: 'room-b' }),
        makeConnection({ id: 'conn-2', roomAId: 'room-b', roomBId: 'room-c' }),
        makeConnection({ id: 'conn-3', roomAId: 'room-c', roomBId: 'room-d' }),
      ],
    });
    const result = removeRoomConnectionsFromFloor(floor, 'room-b');
    expect(result.connections).toHaveLength(1);
    expect(result.connections[0].id).toBe('conn-3');
  });

  it('should return unchanged floor if room has no connections', () => {
    const floor = makeFloor({
      connections: [makeConnection({ id: 'conn-1', roomAId: 'room-a', roomBId: 'room-b' })],
    });
    const result = removeRoomConnectionsFromFloor(floor, 'room-z');
    expect(result.connections).toHaveLength(1);
  });

  it('should not mutate the original floor', () => {
    const floor = makeFloor({
      connections: [makeConnection({ id: 'conn-1', roomAId: 'room-a', roomBId: 'room-b' })],
    });
    removeRoomConnectionsFromFloor(floor, 'room-a');
    expect(floor.connections).toHaveLength(1);
  });
});
