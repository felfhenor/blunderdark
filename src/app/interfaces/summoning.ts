import type { PlacedRoomId } from '@interfaces/room-shape';

export type SummoningCompletedEvent = {
  roomId: PlacedRoomId;
  inhabitantName: string;
  summonType: 'permanent' | 'temporary';
};

export type SummoningExpiredEvent = {
  inhabitantName: string;
};
