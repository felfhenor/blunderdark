export type TileOccupant = 'empty' | 'room' | 'hallway' | 'stair';

export type GridTile = {
  occupied: boolean;
  occupiedBy: TileOccupant;
  roomId: string | undefined;
  hallwayId: string | undefined;
  stairId: string | undefined;
  connectionType: string | undefined;
};

export type GridState = GridTile[][];

export const GRID_SIZE = 20;
