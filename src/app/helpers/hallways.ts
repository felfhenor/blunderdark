import { gridGetTile, gridIsInBounds, gridSetTile } from '@helpers/grid';
import type { GridState, GridTile } from '@interfaces/grid';
import type { Hallway, HallwayUpgrade } from '@interfaces/hallway';
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
      (h.startRoomId === roomAId && h.endRoomId === roomBId) ||
      (h.startRoomId === roomBId && h.endRoomId === roomAId),
  );
}

export function hallwayAdd(hallways: Hallway[], hallway: Hallway): Hallway[] {
  return [...hallways, hallway];
}

export function hallwayRemove(
  hallways: Hallway[],
  hallwayId: string,
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
      id: (h['id'] as string) ?? '',
      startRoomId: (h['startRoomId'] as string) ?? '',
      endRoomId: (h['endRoomId'] as string) ?? '',
      tiles: (h['tiles'] as TileOffset[]) ?? [],
      upgrades: (h['upgrades'] as HallwayUpgrade[]) ?? [],
    };
  });
}
