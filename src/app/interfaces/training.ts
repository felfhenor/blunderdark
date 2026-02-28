import type { Floor, PlacedRoom } from '@interfaces';

export type TrainingRoomInfo = {
  placedRoom: PlacedRoom;
  floor: Floor;
  targetTicks: number;
  trainingTraitIds: string[];
};
