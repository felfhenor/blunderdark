import type { Branded } from '@interfaces/identifiable';
import type { PlacedRoomId, TileOffset } from '@interfaces/room-shape';

export type HallwayId = Branded<string, 'HallwayId'>;

export type HallwayUpgrade = {
  id: string;
  name: string;
};

export type Hallway = {
  id: HallwayId;
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
