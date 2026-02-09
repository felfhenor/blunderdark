import type { TileOffset } from '@interfaces/room-shape';

export type Connection = {
  id: string;
  roomAId: string;
  roomBId: string;
  edgeTiles: TileOffset[];
};
