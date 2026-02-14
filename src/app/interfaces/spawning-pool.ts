import type { PlacedRoomId } from '@interfaces/room-shape';

export type SpawningPoolEvent = {
  roomId: PlacedRoomId;
  inhabitantName: string;
};
