import type {
  Connection,
  Floor,
  FloorId,
  PlacedRoom,
  PlacedRoomId,
  RoomId,
  RoomShapeId,
} from '@interfaces';
import type { ConnectionId } from '@interfaces/connection';
import type { TransportGroupId } from '@interfaces/room-shape';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockFloors: Floor[];

vi.mock('@helpers/altar-room', () => ({
  altarRoomFind: vi.fn(() => {
    for (const floor of mockFloors) {
      const altar = floor.rooms.find(
        (r) => r.roomTypeId === ('altar' as RoomId),
      );
      if (altar) return { room: altar, floor };
    }
    return undefined;
  }),
}));

vi.mock('@helpers/state-game', () => ({
  gamestate: vi.fn(),
  updateGamestate: vi.fn(),
}));

const { connectivityGetConnectedRoomIds, connectivityGetDisconnectedRoomIds } =
  await import('@helpers/connectivity');

function makeFloor(overrides: Partial<Floor> = {}): Floor {
  return {
    id: 'floor-0' as FloorId,
    name: 'Floor 0',
    depth: 0,
    biome: 'neutral',
    grid: [],
    rooms: [],
    hallways: [],
    inhabitants: [],
    connections: [],
    traps: [],
    ...overrides,
  };
}

function makeRoom(overrides: Partial<PlacedRoom> = {}): PlacedRoom {
  return {
    id: 'room-1' as PlacedRoomId,
    roomTypeId: 'room-type' as RoomId,
    shapeId: 'shape' as RoomShapeId,
    anchorX: 0,
    anchorY: 0,
    ...overrides,
  };
}

function makeConnection(
  roomAId: string,
  roomBId: string,
  id?: string,
): Connection {
  return {
    id: (id ?? `conn-${roomAId}-${roomBId}`) as ConnectionId,
    roomAId: roomAId as PlacedRoomId,
    roomBId: roomBId as PlacedRoomId,
    edgeTiles: [],
  };
}

describe('connectivity', () => {
  beforeEach(() => {
    mockFloors = [];
  });

  describe('connectivityGetConnectedRoomIds', () => {
    it('should return empty set when no altar exists', () => {
      const floor = makeFloor();
      mockFloors = [floor];

      const result = connectivityGetConnectedRoomIds(floor, mockFloors);

      expect(result.size).toBe(0);
    });

    it('should return altar and connected rooms on altar floor', () => {
      const altar = makeRoom({
        id: 'altar' as PlacedRoomId,
        roomTypeId: 'altar' as RoomId,
      });
      const roomA = makeRoom({ id: 'room-a' as PlacedRoomId });
      const roomB = makeRoom({ id: 'room-b' as PlacedRoomId });
      const floor = makeFloor({
        rooms: [altar, roomA, roomB],
        connections: [
          makeConnection('altar', 'room-a'),
          makeConnection('room-a', 'room-b'),
        ],
      });
      mockFloors = [floor];

      const result = connectivityGetConnectedRoomIds(floor, mockFloors);

      expect(result.has('altar' as PlacedRoomId)).toBe(true);
      expect(result.has('room-a' as PlacedRoomId)).toBe(true);
      expect(result.has('room-b' as PlacedRoomId)).toBe(true);
    });

    it('should mark rooms without a connection path to altar as disconnected', () => {
      const altar = makeRoom({
        id: 'altar' as PlacedRoomId,
        roomTypeId: 'altar' as RoomId,
      });
      const connected = makeRoom({ id: 'connected' as PlacedRoomId });
      const isolated = makeRoom({ id: 'isolated' as PlacedRoomId });
      const floor = makeFloor({
        rooms: [altar, connected, isolated],
        connections: [makeConnection('altar', 'connected')],
      });
      mockFloors = [floor];

      const disconnected = connectivityGetDisconnectedRoomIds(
        floor,
        mockFloors,
      );

      expect(disconnected.has('isolated' as PlacedRoomId)).toBe(true);
      expect(disconnected.has('altar' as PlacedRoomId)).toBe(false);
      expect(disconnected.has('connected' as PlacedRoomId)).toBe(false);
    });

    it('should connect rooms on non-altar floor via vertical transport', () => {
      const groupId = 'elevator-group' as TransportGroupId;
      const altar = makeRoom({
        id: 'altar' as PlacedRoomId,
        roomTypeId: 'altar' as RoomId,
      });
      const elevatorF0 = makeRoom({
        id: 'elev-f0' as PlacedRoomId,
        transportType: 'elevator',
        transportGroupId: groupId,
      });
      const floor0 = makeFloor({
        id: 'f0' as FloorId,
        depth: 0,
        rooms: [altar, elevatorF0],
        connections: [makeConnection('altar', 'elev-f0')],
      });

      const elevatorF1 = makeRoom({
        id: 'elev-f1' as PlacedRoomId,
        transportType: 'elevator',
        transportGroupId: groupId,
      });
      const roomOnF1 = makeRoom({ id: 'room-f1' as PlacedRoomId });
      const floor1 = makeFloor({
        id: 'f1' as FloorId,
        depth: 1,
        rooms: [elevatorF1, roomOnF1],
        connections: [makeConnection('elev-f1', 'room-f1')],
      });

      mockFloors = [floor0, floor1];

      const result = connectivityGetConnectedRoomIds(floor1, mockFloors);

      expect(result.has('elev-f1' as PlacedRoomId)).toBe(true);
      expect(result.has('room-f1' as PlacedRoomId)).toBe(true);
    });

    it('should NOT connect rooms on non-altar floor when transport is disconnected from altar', () => {
      const groupId = 'elevator-group' as TransportGroupId;
      const altar = makeRoom({
        id: 'altar' as PlacedRoomId,
        roomTypeId: 'altar' as RoomId,
      });
      const elevatorF0 = makeRoom({
        id: 'elev-f0' as PlacedRoomId,
        transportType: 'elevator',
        transportGroupId: groupId,
      });
      // Elevator NOT connected to altar on floor 0
      const floor0 = makeFloor({
        id: 'f0' as FloorId,
        depth: 0,
        rooms: [altar, elevatorF0],
        connections: [],
      });

      const elevatorF1 = makeRoom({
        id: 'elev-f1' as PlacedRoomId,
        transportType: 'elevator',
        transportGroupId: groupId,
      });
      const floor1 = makeFloor({
        id: 'f1' as FloorId,
        depth: 1,
        rooms: [elevatorF1],
        connections: [],
      });

      mockFloors = [floor0, floor1];

      const result = connectivityGetConnectedRoomIds(floor1, mockFloors);

      expect(result.size).toBe(0);
    });

    it('should handle transitive transport connections (floor 0 → floor 1 → floor 2)', () => {
      const group1 = 'stair-01' as TransportGroupId;
      const group2 = 'stair-12' as TransportGroupId;

      const altar = makeRoom({
        id: 'altar' as PlacedRoomId,
        roomTypeId: 'altar' as RoomId,
      });
      const stairF0 = makeRoom({
        id: 'stair-f0' as PlacedRoomId,
        transportType: 'stair',
        transportGroupId: group1,
      });
      const floor0 = makeFloor({
        id: 'f0' as FloorId,
        depth: 0,
        rooms: [altar, stairF0],
        connections: [makeConnection('altar', 'stair-f0')],
      });

      const stairF1From0 = makeRoom({
        id: 'stair-f1-from0' as PlacedRoomId,
        transportType: 'stair',
        transportGroupId: group1,
      });
      const stairF1To2 = makeRoom({
        id: 'stair-f1-to2' as PlacedRoomId,
        transportType: 'stair',
        transportGroupId: group2,
      });
      const floor1 = makeFloor({
        id: 'f1' as FloorId,
        depth: 1,
        rooms: [stairF1From0, stairF1To2],
        connections: [makeConnection('stair-f1-from0', 'stair-f1-to2')],
      });

      const stairF2 = makeRoom({
        id: 'stair-f2' as PlacedRoomId,
        transportType: 'stair',
        transportGroupId: group2,
      });
      const deepRoom = makeRoom({ id: 'deep-room' as PlacedRoomId });
      const floor2 = makeFloor({
        id: 'f2' as FloorId,
        depth: 2,
        rooms: [stairF2, deepRoom],
        connections: [makeConnection('stair-f2', 'deep-room')],
      });

      mockFloors = [floor0, floor1, floor2];

      const result = connectivityGetConnectedRoomIds(floor2, mockFloors);

      expect(result.has('stair-f2' as PlacedRoomId)).toBe(true);
      expect(result.has('deep-room' as PlacedRoomId)).toBe(true);
    });

    it('should break transitive chain when intermediate floor transport is disconnected', () => {
      const group1 = 'stair-01' as TransportGroupId;
      const group2 = 'stair-12' as TransportGroupId;

      const altar = makeRoom({
        id: 'altar' as PlacedRoomId,
        roomTypeId: 'altar' as RoomId,
      });
      const stairF0 = makeRoom({
        id: 'stair-f0' as PlacedRoomId,
        transportType: 'stair',
        transportGroupId: group1,
      });
      const floor0 = makeFloor({
        id: 'f0' as FloorId,
        depth: 0,
        rooms: [altar, stairF0],
        connections: [makeConnection('altar', 'stair-f0')],
      });

      // Floor 1: two stairs NOT connected to each other
      const stairF1From0 = makeRoom({
        id: 'stair-f1-from0' as PlacedRoomId,
        transportType: 'stair',
        transportGroupId: group1,
      });
      const stairF1To2 = makeRoom({
        id: 'stair-f1-to2' as PlacedRoomId,
        transportType: 'stair',
        transportGroupId: group2,
      });
      const floor1 = makeFloor({
        id: 'f1' as FloorId,
        depth: 1,
        rooms: [stairF1From0, stairF1To2],
        connections: [], // No connection between the two stairs
      });

      const stairF2 = makeRoom({
        id: 'stair-f2' as PlacedRoomId,
        transportType: 'stair',
        transportGroupId: group2,
      });
      const floor2 = makeFloor({
        id: 'f2' as FloorId,
        depth: 2,
        rooms: [stairF2],
        connections: [],
      });

      mockFloors = [floor0, floor1, floor2];

      // Floor 1 stair from group1 is connected (seed from floor 0),
      // but stair from group2 is NOT connected to it on floor 1
      const f1Result = connectivityGetConnectedRoomIds(floor1, mockFloors);
      expect(f1Result.has('stair-f1-from0' as PlacedRoomId)).toBe(true);
      expect(f1Result.has('stair-f1-to2' as PlacedRoomId)).toBe(false);

      // Floor 2 should be disconnected since group2's stair on floor 1 isn't connected
      const f2Result = connectivityGetConnectedRoomIds(floor2, mockFloors);
      expect(f2Result.size).toBe(0);
    });

    it('should handle elevator spanning 3 floors (single transport group)', () => {
      const groupId = 'elevator-group' as TransportGroupId;

      const altar = makeRoom({
        id: 'altar' as PlacedRoomId,
        roomTypeId: 'altar' as RoomId,
      });
      const elevF0 = makeRoom({
        id: 'elev-f0' as PlacedRoomId,
        transportType: 'elevator',
        transportGroupId: groupId,
      });
      const floor0 = makeFloor({
        id: 'f0' as FloorId,
        depth: 0,
        rooms: [altar, elevF0],
        connections: [makeConnection('altar', 'elev-f0')],
      });

      const elevF1 = makeRoom({
        id: 'elev-f1' as PlacedRoomId,
        transportType: 'elevator',
        transportGroupId: groupId,
      });
      const roomF1 = makeRoom({ id: 'room-f1' as PlacedRoomId });
      const floor1 = makeFloor({
        id: 'f1' as FloorId,
        depth: 1,
        rooms: [elevF1, roomF1],
        connections: [makeConnection('elev-f1', 'room-f1')],
      });

      const elevF2 = makeRoom({
        id: 'elev-f2' as PlacedRoomId,
        transportType: 'elevator',
        transportGroupId: groupId,
      });
      const roomF2 = makeRoom({ id: 'room-f2' as PlacedRoomId });
      const floor2 = makeFloor({
        id: 'f2' as FloorId,
        depth: 2,
        rooms: [elevF2, roomF2],
        connections: [makeConnection('elev-f2', 'room-f2')],
      });

      mockFloors = [floor0, floor1, floor2];

      const f1Result = connectivityGetConnectedRoomIds(floor1, mockFloors);
      expect(f1Result.has('elev-f1' as PlacedRoomId)).toBe(true);
      expect(f1Result.has('room-f1' as PlacedRoomId)).toBe(true);

      const f2Result = connectivityGetConnectedRoomIds(floor2, mockFloors);
      expect(f2Result.has('elev-f2' as PlacedRoomId)).toBe(true);
      expect(f2Result.has('room-f2' as PlacedRoomId)).toBe(true);
    });

    it('should handle portal connecting non-adjacent floors', () => {
      const groupId = 'portal-group' as TransportGroupId;

      const altar = makeRoom({
        id: 'altar' as PlacedRoomId,
        roomTypeId: 'altar' as RoomId,
      });
      const portalF0 = makeRoom({
        id: 'portal-f0' as PlacedRoomId,
        transportType: 'portal',
        transportGroupId: groupId,
      });
      const floor0 = makeFloor({
        id: 'f0' as FloorId,
        depth: 0,
        rooms: [altar, portalF0],
        connections: [makeConnection('altar', 'portal-f0')],
      });

      // Floor 1 exists but has no transport — just a gap
      const floor1 = makeFloor({
        id: 'f1' as FloorId,
        depth: 1,
        rooms: [makeRoom({ id: 'isolated-f1' as PlacedRoomId })],
      });

      const portalF2 = makeRoom({
        id: 'portal-f2' as PlacedRoomId,
        transportType: 'portal',
        transportGroupId: groupId,
      });
      const roomF2 = makeRoom({ id: 'room-f2' as PlacedRoomId });
      const floor2 = makeFloor({
        id: 'f2' as FloorId,
        depth: 2,
        rooms: [portalF2, roomF2],
        connections: [makeConnection('portal-f2', 'room-f2')],
      });

      mockFloors = [floor0, floor1, floor2];

      // Floor 1 has no transport → all disconnected
      const f1Result = connectivityGetConnectedRoomIds(floor1, mockFloors);
      expect(f1Result.size).toBe(0);

      // Floor 2 is connected via portal from floor 0
      const f2Result = connectivityGetConnectedRoomIds(floor2, mockFloors);
      expect(f2Result.has('portal-f2' as PlacedRoomId)).toBe(true);
      expect(f2Result.has('room-f2' as PlacedRoomId)).toBe(true);
    });
  });
});
