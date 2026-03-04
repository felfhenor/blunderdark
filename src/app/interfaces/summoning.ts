import type { InhabitantCreatureType } from '@interfaces/content-inhabitant';
import type { PlacedRoomId } from '@interfaces/room-shape';

export type SummoningCompletedEvent = {
  roomId: PlacedRoomId;
  inhabitantName: string;
  inhabitantType: InhabitantCreatureType;
};

export type SummoningDismissedEvent = {
  inhabitantName: string;
  inhabitantType: InhabitantCreatureType;
};
