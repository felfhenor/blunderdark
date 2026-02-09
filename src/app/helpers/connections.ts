import { areRoomsAdjacent, getSharedEdges } from '@helpers/adjacency';
import { currentFloor } from '@helpers/floor';
import { rngUuid } from '@helpers/rng';
import { getAbsoluteTiles, resolveRoomShape } from '@helpers/room-shapes';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type { Connection, Floor, PlacedRoom, TileOffset } from '@interfaces';

export type ConnectionValidationResult = {
  valid: boolean;
  error?: string;
  edgeTiles?: TileOffset[];
};

/**
 * Get the absolute tiles for a placed room by resolving its shape.
 */
function getRoomTiles(room: PlacedRoom): TileOffset[] {
  const shape = resolveRoomShape(room);
  return getAbsoluteTiles(shape, room.anchorX, room.anchorY);
}

/**
 * Validate whether a connection can be created between two rooms on a floor.
 * Checks: self-connection, room existence, adjacency, and duplicate connection.
 */
export function validateConnection(
  floor: Floor,
  roomAId: string,
  roomBId: string,
): ConnectionValidationResult {
  if (roomAId === roomBId) {
    return { valid: false, error: 'Cannot connect a room to itself' };
  }

  const roomA = floor.rooms.find((r) => r.id === roomAId);
  const roomB = floor.rooms.find((r) => r.id === roomBId);

  if (!roomA || !roomB) {
    return { valid: false, error: 'One or both rooms not found on this floor' };
  }

  const tilesA = getRoomTiles(roomA);
  const tilesB = getRoomTiles(roomB);

  if (!areRoomsAdjacent(tilesA, tilesB)) {
    return { valid: false, error: 'Rooms are not adjacent' };
  }

  const existing = findConnection(floor, roomAId, roomBId);
  if (existing) {
    return { valid: false, error: 'Rooms are already connected' };
  }

  const edges = getSharedEdges(tilesA, tilesB);
  const edgeTiles = edges.map(([tileA]) => tileA);

  return { valid: true, edgeTiles };
}

/**
 * Get all connections on the current floor.
 */
export function getFloorConnections(): Connection[] {
  return currentFloor()?.connections ?? [];
}

/**
 * Get all room IDs connected to the given room on the current floor.
 */
export function getConnectedRooms(roomId: string): string[] {
  const connections = getFloorConnections();
  const connected: string[] = [];

  for (const conn of connections) {
    if (conn.roomAId === roomId) {
      connected.push(conn.roomBId);
    } else if (conn.roomBId === roomId) {
      connected.push(conn.roomAId);
    }
  }

  return connected;
}

/**
 * Check whether two rooms are connected on the current floor.
 */
export function areRoomsConnected(roomAId: string, roomBId: string): boolean {
  const connections = getFloorConnections();
  return connections.some(
    (c) =>
      (c.roomAId === roomAId && c.roomBId === roomBId) ||
      (c.roomAId === roomBId && c.roomBId === roomAId),
  );
}

/**
 * Find the connection between two rooms on a floor, if it exists.
 */
export function findConnection(
  floor: Floor,
  roomAId: string,
  roomBId: string,
): Connection | undefined {
  return floor.connections.find(
    (c) =>
      (c.roomAId === roomAId && c.roomBId === roomBId) ||
      (c.roomAId === roomBId && c.roomBId === roomAId),
  );
}

/**
 * Add a connection to a floor (pure function).
 * Returns the updated floor with the new connection, or null if it already exists.
 */
export function addConnectionToFloor(
  floor: Floor,
  roomAId: string,
  roomBId: string,
  edgeTiles: TileOffset[],
): { floor: Floor; connection: Connection } | null {
  const existing = findConnection(floor, roomAId, roomBId);
  if (existing) return null;

  const connection: Connection = {
    id: rngUuid(),
    roomAId,
    roomBId,
    edgeTiles,
  };

  return {
    floor: {
      ...floor,
      connections: [...floor.connections, connection],
    },
    connection,
  };
}

/**
 * Remove a connection from a floor (pure function).
 * Returns the updated floor, or null if the connection was not found.
 */
export function removeConnectionFromFloor(
  floor: Floor,
  connectionId: string,
): Floor | null {
  const index = floor.connections.findIndex((c) => c.id === connectionId);
  if (index === -1) return null;

  return {
    ...floor,
    connections: floor.connections.filter((c) => c.id !== connectionId),
  };
}

/**
 * Remove all connections involving a specific room from a floor (pure function).
 * Useful when removing a room from the floor.
 */
export function removeRoomConnectionsFromFloor(
  floor: Floor,
  roomId: string,
): Floor {
  return {
    ...floor,
    connections: floor.connections.filter(
      (c) => c.roomAId !== roomId && c.roomBId !== roomId,
    ),
  };
}

/**
 * Get adjacent rooms that are NOT yet connected to the given room on a floor.
 * Returns room IDs of adjacent but unconnected rooms.
 */
export function getAdjacentUnconnectedRooms(
  floor: Floor,
  roomId: string,
): string[] {
  const room = floor.rooms.find((r) => r.id === roomId);
  if (!room) return [];

  const roomTiles = getRoomTiles(room);
  const adjacent: string[] = [];

  for (const other of floor.rooms) {
    if (other.id === roomId) continue;
    const otherTiles = getRoomTiles(other);
    if (areRoomsAdjacent(roomTiles, otherTiles)) {
      if (!findConnection(floor, roomId, other.id)) {
        adjacent.push(other.id);
      }
    }
  }

  return adjacent;
}

/**
 * Get connections involving a specific room on a floor.
 * Returns the connection objects (not just IDs).
 */
export function getRoomConnections(
  floor: Floor,
  roomId: string,
): Connection[] {
  return floor.connections.filter(
    (c) => c.roomAId === roomId || c.roomBId === roomId,
  );
}

/**
 * Create a validated connection between two rooms on the current floor.
 * Validates adjacency, rejects self-connections and duplicates.
 * Edge tiles are computed automatically from shared edges.
 * Returns `{ connection }` on success, or `{ error }` on failure.
 */
export async function createConnection(
  roomAId: string,
  roomBId: string,
): Promise<{ connection: Connection; error?: undefined } | { connection?: undefined; error: string }> {
  const state = gamestate();
  const floorIndex = state.world.currentFloorIndex;
  const floor = state.world.floors[floorIndex];
  if (!floor) return { error: 'No active floor' };

  const validation = validateConnection(floor, roomAId, roomBId);
  if (!validation.valid) {
    return { error: validation.error! };
  }

  const result = addConnectionToFloor(floor, roomAId, roomBId, validation.edgeTiles!);
  if (!result) return { error: 'Failed to create connection' };

  await updateGamestate((s) => {
    const newFloors = [...s.world.floors];
    newFloors[floorIndex] = result.floor;
    return {
      ...s,
      world: {
        ...s.world,
        floors: newFloors,
      },
    };
  });

  return { connection: result.connection };
}

/**
 * Remove a connection by ID from the current floor.
 * Returns true on success, false if not found.
 */
export async function removeConnection(connectionId: string): Promise<boolean> {
  const state = gamestate();
  const floorIndex = state.world.currentFloorIndex;
  const floor = state.world.floors[floorIndex];
  if (!floor) return false;

  const updatedFloor = removeConnectionFromFloor(floor, connectionId);
  if (!updatedFloor) return false;

  await updateGamestate((s) => {
    const newFloors = [...s.world.floors];
    newFloors[floorIndex] = updatedFloor;
    return {
      ...s,
      world: {
        ...s.world,
        floors: newFloors,
      },
    };
  });

  return true;
}
