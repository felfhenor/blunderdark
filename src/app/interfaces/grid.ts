import type { HallwayId } from '@interfaces/hallway';
import type { PlacedRoomId } from '@interfaces/room-shape';

export type TileOccupant = 'empty' | 'room' | 'hallway';

export type GridTile = {
  occupied: boolean;
  occupiedBy: TileOccupant;
  roomId: PlacedRoomId | undefined;
  hallwayId: HallwayId | undefined;
  connectionType: string | undefined;
};

export type GridState = GridTile[][];

export const GRID_SIZE = 20;
