import type { Branded } from '@interfaces/identifiable';
import type { PlacedRoomId, TileOffset } from '@interfaces/room-shape';

export type ConnectionId = Branded<string, 'ConnectionId'>;

export type Connection = {
  id: ConnectionId;
  roomAId: PlacedRoomId;
  roomBId: PlacedRoomId;
  edgeTiles: TileOffset[];
};

export type ConnectionValidationResult = {
  valid: boolean;
  error?: string;
  edgeTiles?: TileOffset[];
};
