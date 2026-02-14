import type { TileOffset } from '@interfaces/room-shape';

export type HallwayUpgrade = {
  id: string;
  name: string;
};

export type Hallway = {
  id: string;
  startRoomId?: string;
  endRoomId?: string;
  tiles: TileOffset[];
  upgrades: HallwayUpgrade[];
};

export type HallwayBuildStep =
  | 'inactive'
  | 'selectSource'
  | 'selectDestination'
  | 'preview';
