import { adjacencyAreRoomsAdjacent, adjacencyGetSharedEdges } from '@helpers/adjacency';
import { floorCurrent } from '@helpers/floor';
import { productionGetRoomDefinition } from '@helpers/production';
import { rngUuid } from '@helpers/rng';
import { roomShapeGetAbsoluteTiles, roomShapeResolve } from '@helpers/room-shapes';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type { Connection, Floor, PlacedRoom, TileOffset } from '@interfaces';
import type { ConnectionValidationResult } from '@interfaces/connection';

/**
 * Get the absolute tiles for a placed room by resolving its shape.
 */
function getRoomTiles(room: PlacedRoom): TileOffset[] {
  const shape = roomShapeResolve(room);
  return roomShapeGetAbsoluteTiles(shape, room.anchorX, room.anchorY);
}

/**
 * Get the tiles for an entity (room or hallway) by ID.
 */
function getEntityTiles(floor: Floor, entityId: string): TileOffset[] | undefined {
  const room = floor.rooms.find((r) => r.id === entityId);
  if (room) return getRoomTiles(room);

  const hallway = floor.hallways.find((h) => h.id === entityId);
  if (hallway) return hallway.tiles;

  return undefined;
}

/**
 * Get the display name for an entity (room or hallway) by ID.
 */
export function getEntityName(floor: Floor, entityId: string): string {
  const room = floor.rooms.find((r) => r.id === entityId);
  if (room) return productionGetRoomDefinition(room.roomTypeId)?.name ?? 'Unknown';

  const hallway = floor.hallways.find((h) => h.id === entityId);
  if (hallway) return 'Corridor';

  return 'Unknown';
}

/**
 * Validate whether a connection can be created between two rooms on a floor.
 * Checks: self-connection, room existence, adjacency, and duplicate connection.
 */
export function connectionValidate(
  floor: Floor,
  roomAId: string,
  roomBId: string,
): ConnectionValidationResult {
  if (roomAId === roomBId) {
    return { valid: false, error: 'Cannot connect an entity to itself' };
  }

  const tilesA = getEntityTiles(floor, roomAId);
  const tilesB = getEntityTiles(floor, roomBId);

  if (!tilesA || !tilesB) {
    return { valid: false, error: 'One or both entities not found on this floor' };
  }

  if (!adjacencyAreRoomsAdjacent(tilesA, tilesB)) {
    return { valid: false, error: 'Entities are not adjacent' };
  }

  const existing = connectionFind(floor, roomAId, roomBId);
  if (existing) {
    return { valid: false, error: 'Entities are already connected' };
  }

  const edges = adjacencyGetSharedEdges(tilesA, tilesB);
  const edgeTiles = edges.map(([tileA]) => tileA);

  return { valid: true, edgeTiles };
}

/**
 * Get all connections on the current floor.
 */
export function connectionGetFloorConnections(): Connection[] {
  return floorCurrent()?.connections ?? [];
}

/**
 * Get all room IDs connected to the given room on the current floor.
 */
export function connectionGetConnectedRooms(roomId: string): string[] {
  const connections = connectionGetFloorConnections();
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
export function connectionAreConnected(roomAId: string, roomBId: string): boolean {
  const connections = connectionGetFloorConnections();
  return connections.some(
    (c) =>
      (c.roomAId === roomAId && c.roomBId === roomBId) ||
      (c.roomAId === roomBId && c.roomBId === roomAId),
  );
}

/**
 * Find the connection between two rooms on a floor, if it exists.
 */
export function connectionFind(
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
export function connectionAddToFloor(
  floor: Floor,
  roomAId: string,
  roomBId: string,
  edgeTiles: TileOffset[],
): { floor: Floor; connection: Connection } | undefined {
  const existing = connectionFind(floor, roomAId, roomBId);
  if (existing) return undefined;

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
export function connectionRemoveFromFloor(
  floor: Floor,
  connectionId: string,
): Floor | undefined {
  const index = floor.connections.findIndex((c) => c.id === connectionId);
  if (index === -1) return undefined;

  return {
    ...floor,
    connections: floor.connections.filter((c) => c.id !== connectionId),
  };
}

/**
 * Remove all connections involving a specific room from a floor (pure function).
 * Useful when removing a room from the floor.
 */
export function connectionRemoveRoomFromFloor(
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
export function connectionGetAdjacentUnconnected(
  floor: Floor,
  entityId: string,
): string[] {
  const sourceTiles = getEntityTiles(floor, entityId);
  if (!sourceTiles) return [];

  const adjacent: string[] = [];

  for (const other of floor.rooms) {
    if (other.id === entityId) continue;
    const otherTiles = getRoomTiles(other);
    if (adjacencyAreRoomsAdjacent(sourceTiles, otherTiles)) {
      if (!connectionFind(floor, entityId, other.id)) {
        adjacent.push(other.id);
      }
    }
  }

  for (const hallway of floor.hallways) {
    if (hallway.id === entityId) continue;
    if (adjacencyAreRoomsAdjacent(sourceTiles, hallway.tiles)) {
      if (!connectionFind(floor, entityId, hallway.id)) {
        adjacent.push(hallway.id);
      }
    }
  }

  return adjacent;
}

/**
 * Get connections involving a specific room on a floor.
 * Returns the connection objects (not just IDs).
 */
export function connectionGetRoomConnections(
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
export async function connectionCreate(
  roomAId: string,
  roomBId: string,
): Promise<{ connection: Connection; error?: undefined } | { connection?: undefined; error: string }> {
  const state = gamestate();
  const floorIndex = state.world.currentFloorIndex;
  const floor = state.world.floors[floorIndex];
  if (!floor) return { error: 'No active floor' };

  const validation = connectionValidate(floor, roomAId, roomBId);
  if (!validation.valid) {
    return { error: validation.error! };
  }

  const result = connectionAddToFloor(floor, roomAId, roomBId, validation.edgeTiles!);
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
export async function connectionRemove(connectionId: string): Promise<boolean> {
  const state = gamestate();
  const floorIndex = state.world.currentFloorIndex;
  const floor = state.world.floors[floorIndex];
  if (!floor) return false;

  const updatedFloor = connectionRemoveFromFloor(floor, connectionId);
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
