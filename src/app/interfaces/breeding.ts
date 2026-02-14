import type { PlacedRoomId } from '@interfaces/room-shape';

export type MutationOutcome = 'positive' | 'neutral' | 'negative';

export type BreedingCompletedEvent = {
  roomId: PlacedRoomId;
  hybridName: string;
};

export type MutationCompletedEvent = {
  roomId: PlacedRoomId;
  inhabitantName: string;
  outcome: MutationOutcome;
};
