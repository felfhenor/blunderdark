import { contentGetEntriesByType, contentGetEntry } from '@helpers/content';
import type {
  GRID_SIZE,
  PlacedRoom,
  RoomShapeContent,
  RoomShapeId,
  Rotation,
  TileOffset,
} from '@interfaces';

export function roomShapeAll(): RoomShapeContent[] {
  return contentGetEntriesByType<RoomShapeContent>('roomshape');
}

export function roomShapeGet(idOrName: string): RoomShapeContent | undefined {
  return contentGetEntry<RoomShapeContent>(idOrName);
}

export function roomShapeGetAbsoluteTiles(
  shape: RoomShapeContent,
  anchorX: number,
  anchorY: number,
): TileOffset[] {
  return shape.tiles.map((tile) => ({
    x: tile.x + anchorX,
    y: tile.y + anchorY,
  }));
}

export function roomShapeGetBounds(shape: RoomShapeContent): {
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

export function roomShapeFitsInGrid(
  shape: RoomShapeContent,
  anchorX: number,
  anchorY: number,
  gridSize: typeof GRID_SIZE | number,
): boolean {
  return roomShapeGetAbsoluteTiles(shape, anchorX, anchorY).every(
    (tile) =>
      tile.x >= 0 && tile.x < gridSize && tile.y >= 0 && tile.y < gridSize,
  );
}

/**
 * Rotate a single tile 90° clockwise around the origin within a bounding box.
 * For a shape of size (w, h), rotating 90° CW maps (x, y) → (h - 1 - y, x).
 */
export function roomShapeRotateTile90(
  tile: TileOffset,
  height: number,
): TileOffset {
  return { x: height - 1 - tile.y, y: tile.x };
}

/**
 * Rotate all tiles by the given number of 90° clockwise steps (0–3).
 * Returns new tiles and updated width/height.
 */
export function roomShapeRotateTiles(
  tiles: TileOffset[],
  width: number,
  height: number,
  rotation: Rotation,
): { tiles: TileOffset[]; width: number; height: number } {
  let currentTiles = tiles;
  let w = width;
  let h = height;

  for (let i = 0; i < rotation; i++) {
    currentTiles = currentTiles.map((t) => roomShapeRotateTile90(t, h));
    [w, h] = [h, w];
  }

  return { tiles: currentTiles, width: w, height: h };
}

/**
 * Return a new RoomShape with tiles rotated by the given rotation.
 * If rotation is 0, returns the original shape unchanged.
 */
export function roomShapeGetRotated(
  shape: RoomShapeContent,
  rotation: Rotation,
): RoomShapeContent {
  if (rotation === 0) return shape;

  const rotated = roomShapeRotateTiles(
    shape.tiles,
    shape.width,
    shape.height,
    rotation,
  );

  return {
    ...shape,
    tiles: rotated.tiles,
    width: rotated.width,
    height: rotated.height,
  };
}

const FALLBACK_SHAPE: RoomShapeContent = {
  id: 'fallback' as RoomShapeId,
  __type: 'roomshape',
  name: 'Fallback',
  tiles: [{ x: 0, y: 0 }],
  width: 1,
  height: 1,
};

export function roomShapeResolve(placedRoom: PlacedRoom): RoomShapeContent {
  const base = roomShapeGet(placedRoom.shapeId) ?? FALLBACK_SHAPE;
  return roomShapeGetRotated(base, placedRoom.rotation ?? 0);
}
