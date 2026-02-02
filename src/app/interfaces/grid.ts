export type GridTile = {
  occupied: boolean;
  roomId: string | null;
  connectionType: string | null;
};

export type GridState = GridTile[][];

export const GRID_SIZE = 20;
