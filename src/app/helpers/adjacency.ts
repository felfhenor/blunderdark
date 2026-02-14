import type { PlacedRoomId, TileOffset } from '@interfaces';
import type { AdjacencyMap } from '@interfaces/adjacency';

/**
 * Checks if two sets of tiles share at least one edge (horizontal or vertical).
 * Diagonal (corner) touching does NOT count as adjacent.
 */
export function adjacencyAreRoomsAdjacent(
  tilesA: TileOffset[],
  tilesB: TileOffset[],
): boolean {
  const setB = new Set(tilesB.map((t) => `${t.x},${t.y}`));

  for (const tileA of tilesA) {
    const neighbors = [
      `${tileA.x - 1},${tileA.y}`,
      `${tileA.x + 1},${tileA.y}`,
      `${tileA.x},${tileA.y - 1}`,
      `${tileA.x},${tileA.y + 1}`,
    ];

    for (const neighbor of neighbors) {
      if (setB.has(neighbor)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Finds all shared edge tile pairs between two sets of tiles.
 * Returns pairs of [tileFromA, tileFromB] that share an edge.
 */
export function adjacencyGetSharedEdges(
  tilesA: TileOffset[],
  tilesB: TileOffset[],
): Array<[TileOffset, TileOffset]> {
  const setB = new Map<string, TileOffset>();
  for (const t of tilesB) {
    setB.set(`${t.x},${t.y}`, t);
  }

  const edges: Array<[TileOffset, TileOffset]> = [];

  for (const tileA of tilesA) {
    const neighborCoords: TileOffset[] = [
      { x: tileA.x - 1, y: tileA.y },
      { x: tileA.x + 1, y: tileA.y },
      { x: tileA.x, y: tileA.y - 1 },
      { x: tileA.x, y: tileA.y + 1 },
    ];

    for (const nc of neighborCoords) {
      const key = `${nc.x},${nc.y}`;
      const tileB = setB.get(key);
      if (tileB) {
        edges.push([tileA, tileB]);
      }
    }
  }

  return edges;
}

export function adjacencyCreateMap(): AdjacencyMap {
  return {};
}

export function adjacencyAddRoom(
  map: AdjacencyMap,
  roomId: PlacedRoomId,
  roomTiles: TileOffset[],
  allRooms: Array<{ id: PlacedRoomId; tiles: TileOffset[] }>,
): AdjacencyMap {
  const result = { ...map };
  result[roomId] = [];

  for (const other of allRooms) {
    if (other.id === roomId) continue;

    if (adjacencyAreRoomsAdjacent(roomTiles, other.tiles)) {
      result[roomId].push(other.id);

      if (!result[other.id]) {
        result[other.id] = [];
      }
      result[other.id] = [...result[other.id], roomId];
    }
  }

  return result;
}

export function adjacencyRemoveRoom(
  map: AdjacencyMap,
  roomId: PlacedRoomId,
): AdjacencyMap {
  const result = { ...map };

  // Remove this room from all other rooms' lists
  for (const key of Object.keys(result) as PlacedRoomId[]) {
    if (key === roomId) continue;
    result[key] = result[key].filter((id) => id !== roomId);
  }

  // Remove this room's entry
  delete result[roomId];

  return result;
}

export function adjacencyGetAdjacentRooms(
  map: AdjacencyMap,
  roomId: PlacedRoomId,
): PlacedRoomId[] {
  return map[roomId] ?? [];
}
