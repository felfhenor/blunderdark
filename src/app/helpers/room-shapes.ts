import { getEntriesByType, getEntry } from '@helpers/content';
import type {
  GRID_SIZE,
  IsContentItem,
  RoomShape,
  TileOffset,
} from '@interfaces';

export function allRoomShapes(): (RoomShape & IsContentItem)[] {
  return getEntriesByType<RoomShape & IsContentItem>('roomshape');
}

export function getRoomShape(
  idOrName: string,
): (RoomShape & IsContentItem) | undefined {
  return getEntry<RoomShape & IsContentItem>(idOrName);
}

export function getAbsoluteTiles(
  shape: RoomShape,
  anchorX: number,
  anchorY: number,
): TileOffset[] {
  return shape.tiles.map((tile) => ({
    x: tile.x + anchorX,
    y: tile.y + anchorY,
  }));
}

export function getShapeBounds(shape: RoomShape): {
  width: number;
  height: number;
} {
  if (shape.tiles.length === 0) {
    return { width: 0, height: 0 };
  }

  let maxX = 0;
  let maxY = 0;

  for (const tile of shape.tiles) {
    if (tile.x > maxX) maxX = tile.x;
    if (tile.y > maxY) maxY = tile.y;
  }

  return { width: maxX + 1, height: maxY + 1 };
}

export function shapeFitsInGrid(
  shape: RoomShape,
  anchorX: number,
  anchorY: number,
  gridSize: typeof GRID_SIZE | number,
): boolean {
  return getAbsoluteTiles(shape, anchorX, anchorY).every(
    (tile) =>
      tile.x >= 0 && tile.x < gridSize && tile.y >= 0 && tile.y < gridSize,
  );
}
