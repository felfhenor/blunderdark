import type { PlacedRoomId, TileOffset } from '@interfaces/room-shape';

export type HallwayUpgrade = {
  id: string;
  name: string;
};

export type Hallway = {
  id: string;
  startRoomId?: PlacedRoomId;
  endRoomId?: PlacedRoomId;
  tiles: TileOffset[];
  upgrades: HallwayUpgrade[];
};

export type HallwayBuildStep =
  | 'inactive'
  | 'selectSource'
  | 'selectDestination'
  | 'preview';
