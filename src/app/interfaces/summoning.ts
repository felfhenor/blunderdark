import type { PlacedRoomId } from '@interfaces/room-shape';

export type SummoningCompletedEvent = {
  roomId: PlacedRoomId;
  inhabitantName: string;
  inhabitantType: string;
};

export type SummoningDismissedEvent = {
  inhabitantName: string;
  inhabitantType: string;
};
