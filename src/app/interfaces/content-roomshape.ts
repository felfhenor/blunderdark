import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { TileOffset } from '@interfaces/room-shape';

export type RoomShapeId = Branded<string, 'RoomShapeId'>;

export type RoomShapeContent = IsContentItem & {
  id: RoomShapeId;
  tiles: TileOffset[];
  width: number;
  height: number;
};
