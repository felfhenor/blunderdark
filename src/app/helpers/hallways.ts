import { getTile, isInBounds, setTile } from '@helpers/grid';
import type { GridState, GridTile } from '@interfaces/grid';
import type { Hallway, HallwayUpgrade } from '@interfaces/hallway';
import type { TileOffset } from '@interfaces/room-shape';

export function addHallwayToGrid(
  grid: GridState,
  hallway: Hallway,
): GridState {
  let result = grid;

  for (const tile of hallway.tiles) {
    if (!isInBounds(tile.x, tile.y)) continue;

    const newTile: GridTile = {
      occupied: true,
      occupiedBy: 'hallway',
      roomId: null,
      hallwayId: hallway.id,
      connectionType: 'hallway',
    };
    result = setTile(result, tile.x, tile.y, newTile);
  }

  return result;
}

export function removeHallwayFromGrid(
  grid: GridState,
  hallway: Hallway,
): GridState {
  let result = grid;

  for (const tile of hallway.tiles) {
    if (!isInBounds(tile.x, tile.y)) continue;

    const existing = getTile(result, tile.x, tile.y);
    if (existing?.hallwayId !== hallway.id) continue;

    const emptyTile: GridTile = {
      occupied: false,
      occupiedBy: 'empty',
      roomId: null,
      hallwayId: null,
      connectionType: null,
    };
    result = setTile(result, tile.x, tile.y, emptyTile);
  }

  return result;
}

export function isTileBlockedForHallway(
  grid: GridState,
  x: number,
  y: number,
): boolean {
  if (!isInBounds(x, y)) return true;
  const tile = getTile(grid, x, y);
  return tile?.occupied ?? true;
}

export function getHallwaysBetween(
  hallways: Hallway[],
  roomAId: string,
  roomBId: string,
): Hallway[] {
  return hallways.filter(
    (h) =>
      (h.startRoomId === roomAId && h.endRoomId === roomBId) ||
      (h.startRoomId === roomBId && h.endRoomId === roomAId),
  );
}

export function addHallway(
  hallways: Hallway[],
  hallway: Hallway,
): Hallway[] {
  return [...hallways, hallway];
}

export function removeHallway(
  hallways: Hallway[],
  hallwayId: string,
): Hallway[] {
  return hallways.filter((h) => h.id !== hallwayId);
}

export function addUpgradeToHallway(
  hallway: Hallway,
  upgrade: HallwayUpgrade,
): Hallway {
  return {
    ...hallway,
    upgrades: [...hallway.upgrades, upgrade],
  };
}

export function removeUpgradeFromHallway(
  hallway: Hallway,
  upgradeId: string,
): Hallway {
  return {
    ...hallway,
    upgrades: hallway.upgrades.filter((u) => u.id !== upgradeId),
  };
}

export function serializeHallways(hallways: Hallway[]): Hallway[] {
  return hallways.map((h) => ({ ...h, tiles: [...h.tiles], upgrades: [...h.upgrades] }));
}

export function deserializeHallways(data: unknown[]): Hallway[] {
  if (!Array.isArray(data)) return [];

  return data.map((item) => {
    const h = item as Record<string, unknown>;
    return {
      id: (h['id'] as string) ?? '',
      startRoomId: (h['startRoomId'] as string) ?? '',
      endRoomId: (h['endRoomId'] as string) ?? '',
      tiles: (h['tiles'] as TileOffset[]) ?? [],
      upgrades: (h['upgrades'] as HallwayUpgrade[]) ?? [],
    };
  });
}
