import type { Floor, PlacedRoom, TrainingBonuses } from '@interfaces';

export type TrainingRoomInfo = {
  placedRoom: PlacedRoom;
  floor: Floor;
  targetTicks: number;
  bonuses: TrainingBonuses;
};
