import type { PlacedRoomId, TileOffset } from '@interfaces/room-shape';

export type Connection = {
  id: string;
  roomAId: PlacedRoomId;
  roomBId: PlacedRoomId;
  edgeTiles: TileOffset[];
};

export type ConnectionValidationResult = {
  valid: boolean;
  error?: string;
  edgeTiles?: TileOffset[];
};
