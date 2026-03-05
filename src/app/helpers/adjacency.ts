import type { TileOffset } from '@interfaces';

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
