export type TileOffset = {
  x: number;
  y: number;
};

export type RoomShape = {
  id: string;
  name: string;
  tiles: TileOffset[];
  width: number;
  height: number;
};

export type PlacedRoom = {
  id: string;
  shapeId: string;
  anchorX: number;
  anchorY: number;
};
