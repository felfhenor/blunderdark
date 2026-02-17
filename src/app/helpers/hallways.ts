import { adjacencyAreRoomsAdjacent } from '@helpers/adjacency';
import { gridGetTile, gridIsInBounds, gridSetTile } from '@helpers/grid';
import type { PlacedRoomId } from '@interfaces';
import type { Floor } from '@interfaces/floor';
import type { GridState, GridTile } from '@interfaces/grid';
import type { Hallway, HallwayId, HallwayUpgrade } from '@interfaces/hallway';
import type { TileOffset } from '@interfaces/room-shape';

export function hallwayAddToGrid(grid: GridState, hallway: Hallway): GridState {
  let result = grid;

  for (const tile of hallway.tiles) {
    if (!gridIsInBounds(tile.x, tile.y)) continue;

    const newTile: GridTile = {
      occupied: true,
      occupiedBy: 'hallway',
      roomId: undefined,
      hallwayId: hallway.id,
      connectionType: 'hallway',
    };
    result = gridSetTile(result, tile.x, tile.y, newTile);
  }

  return result;
}

export function hallwayRemoveFromGrid(
  grid: GridState,
  hallway: Hallway,
): GridState {
  let result = grid;

  for (const tile of hallway.tiles) {
    if (!gridIsInBounds(tile.x, tile.y)) continue;

    const existing = gridGetTile(result, tile.x, tile.y);
    if (existing?.hallwayId !== hallway.id) continue;

    const emptyTile: GridTile = {
      occupied: false,
      occupiedBy: 'empty',
      roomId: undefined,
      hallwayId: undefined,
      connectionType: undefined,
    };
    result = gridSetTile(result, tile.x, tile.y, emptyTile);
  }

  return result;
}

export function hallwayIsTileBlocked(
  grid: GridState,
  x: number,
  y: number,
): boolean {
  if (!gridIsInBounds(x, y)) return true;
  const tile = gridGetTile(grid, x, y);
  return tile?.occupied ?? true;
}

export function hallwayGetBetween(
  hallways: Hallway[],
  roomAId: string,
  roomBId: string,
): Hallway[] {
  return hallways.filter(
    (h) =>
      (h.startRoomId !== undefined && h.endRoomId !== undefined) &&
      ((h.startRoomId === roomAId && h.endRoomId === roomBId) ||
       (h.startRoomId === roomBId && h.endRoomId === roomAId)),
  );
}

export function hallwayAdd(hallways: Hallway[], hallway: Hallway): Hallway[] {
  return [...hallways, hallway];
}

export function hallwayRemove(
  hallways: Hallway[],
  hallwayId: HallwayId,
): Hallway[] {
  return hallways.filter((h) => h.id !== hallwayId);
}

export function hallwayAddUpgrade(
  hallway: Hallway,
  upgrade: HallwayUpgrade,
): Hallway {
  return {
    ...hallway,
    upgrades: [...hallway.upgrades, upgrade],
  };
}

export function hallwayRemoveUpgrade(
  hallway: Hallway,
  upgradeId: string,
): Hallway {
  return {
    ...hallway,
    upgrades: hallway.upgrades.filter((u) => u.id !== upgradeId),
  };
}

/**
 * Find all existing hallways on a floor that are adjacent to the given hallway.
 */
export function hallwayFindAdjacentHallways(
  floor: Floor,
  hallwayId: HallwayId,
): Hallway[] {
  const hallway = floor.hallways.find((h) => h.id === hallwayId);
  if (!hallway) return [];

  return floor.hallways.filter((other) => {
    if (other.id === hallwayId) return false;
    return adjacencyAreRoomsAdjacent(hallway.tiles, other.tiles);
  });
}

/**
 * Merge an absorbed hallway into a target hallway on a floor.
 * Combines tiles and upgrades, updates grid tile references,
 * transfers connections, and removes the absorbed hallway.
 */
export function hallwayMergeOnFloor(
  floor: Floor,
  targetId: HallwayId,
  absorbedId: HallwayId,
): Floor {
  const target = floor.hallways.find((h) => h.id === targetId);
  const absorbed = floor.hallways.find((h) => h.id === absorbedId);
  if (!target || !absorbed) return floor;

  // Combine tiles (deduplicate by coordinate)
  const tileSet = new Set(target.tiles.map((t) => `${t.x},${t.y}`));
  const mergedTiles = [...target.tiles];
  for (const tile of absorbed.tiles) {
    const key = `${tile.x},${tile.y}`;
    if (!tileSet.has(key)) {
      tileSet.add(key);
      mergedTiles.push(tile);
    }
  }

  // Combine upgrades (deduplicate by id)
  const upgradeIds = new Set(target.upgrades.map((u) => u.id));
  const mergedUpgrades = [...target.upgrades];
  for (const upgrade of absorbed.upgrades) {
    if (!upgradeIds.has(upgrade.id)) {
      upgradeIds.add(upgrade.id);
      mergedUpgrades.push(upgrade);
    }
  }

  const mergedHallway: Hallway = {
    ...target,
    tiles: mergedTiles,
    upgrades: mergedUpgrades,
  };

  // Update grid: re-point absorbed tiles to target id
  let updatedGrid = floor.grid;
  for (const tile of absorbed.tiles) {
    if (!gridIsInBounds(tile.x, tile.y)) continue;
    const existing = gridGetTile(updatedGrid, tile.x, tile.y);
    if (existing?.hallwayId === absorbedId) {
      updatedGrid = gridSetTile(updatedGrid, tile.x, tile.y, {
        ...existing,
        hallwayId: targetId,
      });
    }
  }

  // Transfer connections: replace absorbedId with targetId, drop self-connections and duplicates
  const updatedConnections = floor.connections
    .map((conn) => {
      let { roomAId, roomBId } = conn;
      if ((roomAId as string) === (absorbedId as string)) roomAId = targetId as unknown as PlacedRoomId;
      if ((roomBId as string) === (absorbedId as string)) roomBId = targetId as unknown as PlacedRoomId;
      return { ...conn, roomAId, roomBId };
    })
    .filter((conn) => conn.roomAId !== conn.roomBId)
    .filter((conn, idx, arr) =>
      arr.findIndex(
        (c) =>
          (c.roomAId === conn.roomAId && c.roomBId === conn.roomBId) ||
          (c.roomAId === conn.roomBId && c.roomBId === conn.roomAId),
      ) === idx,
    );

  // Replace target, remove absorbed from hallways list
  const updatedHallways = floor.hallways
    .map((h) => (h.id === targetId ? mergedHallway : h))
    .filter((h) => h.id !== absorbedId);

  return {
    ...floor,
    grid: updatedGrid,
    hallways: updatedHallways,
    connections: updatedConnections,
  };
}

export function hallwaySerialize(hallways: Hallway[]): Hallway[] {
  return hallways.map((h) => ({
    ...h,
    tiles: [...h.tiles],
    upgrades: [...h.upgrades],
  }));
}

export function hallwayDeserialize(data: unknown[]): Hallway[] {
  if (!Array.isArray(data)) return [];

  return data.map((item) => {
    const h = item as Record<string, unknown>;
    return {
      id: ((h['id'] as string) ?? '') as HallwayId,
      startRoomId: ((h['startRoomId'] as string) || undefined) as PlacedRoomId | undefined,
      endRoomId: ((h['endRoomId'] as string) || undefined) as PlacedRoomId | undefined,
      tiles: (h['tiles'] as TileOffset[]) ?? [],
      upgrades: (h['upgrades'] as HallwayUpgrade[]) ?? [],
    };
  });
}
