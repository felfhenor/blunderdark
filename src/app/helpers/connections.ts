import { currentFloor } from '@helpers/floor';
import { rngUuid } from '@helpers/rng';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type { Connection, Floor, TileOffset } from '@interfaces';

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
 * Create a connection between two rooms on the current floor.
 * Returns the connection on success, or null on failure.
 */
export async function createConnection(
  roomAId: string,
  roomBId: string,
  edgeTiles: TileOffset[],
): Promise<Connection | null> {
  const state = gamestate();
  const floorIndex = state.world.currentFloorIndex;
  const floor = state.world.floors[floorIndex];
  if (!floor) return null;

  const result = addConnectionToFloor(floor, roomAId, roomBId, edgeTiles);
  if (!result) return null;

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

  return result.connection;
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
