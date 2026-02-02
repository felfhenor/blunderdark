export type TileOccupant = 'empty' | 'room' | 'hallway';

export type GridTile = {
  occupied: boolean;
  occupiedBy: TileOccupant;
  roomId: string | null;
  hallwayId: string | null;
  connectionType: string | null;
};

export type GridState = GridTile[][];

export const GRID_SIZE = 20;
