import { getEntriesByType, getEntry } from '@helpers/content';
import type {
  GRID_SIZE,
  IsContentItem,
  PlacedRoom,
  Rotation,
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

/**
 * Rotate a single tile 90° clockwise around the origin within a bounding box.
 * For a shape of size (w, h), rotating 90° CW maps (x, y) → (h - 1 - y, x).
 */
export function rotateTile90(
  tile: TileOffset,
  height: number,
): TileOffset {
  return { x: height - 1 - tile.y, y: tile.x };
}

/**
 * Rotate all tiles by the given number of 90° clockwise steps (0–3).
 * Returns new tiles and updated width/height.
 */
export function rotateTiles(
  tiles: TileOffset[],
  width: number,
  height: number,
  rotation: Rotation,
): { tiles: TileOffset[]; width: number; height: number } {
  let currentTiles = tiles;
  let w = width;
  let h = height;

  for (let i = 0; i < rotation; i++) {
    currentTiles = currentTiles.map((t) => rotateTile90(t, h));
    [w, h] = [h, w];
  }

  return { tiles: currentTiles, width: w, height: h };
}

/**
 * Return a new RoomShape with tiles rotated by the given rotation.
 * If rotation is 0, returns the original shape unchanged.
 */
export function getRotatedShape(
  shape: RoomShape,
  rotation: Rotation,
): RoomShape {
  if (rotation === 0) return shape;

  const rotated = rotateTiles(shape.tiles, shape.width, shape.height, rotation);

  return {
    ...shape,
    tiles: rotated.tiles,
    width: rotated.width,
    height: rotated.height,
  };
}

const FALLBACK_SHAPE: RoomShape = {
  id: 'fallback',
  name: 'Fallback',
  tiles: [{ x: 0, y: 0 }],
  width: 1,
  height: 1,
};

export function resolveRoomShape(placedRoom: PlacedRoom): RoomShape {
  const base = getRoomShape(placedRoom.shapeId) ?? FALLBACK_SHAPE;
  return getRotatedShape(base, placedRoom.rotation ?? 0);
}
