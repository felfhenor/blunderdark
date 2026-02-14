import type { PlacedRoomId } from '@interfaces/room-shape';

export type TortureExtractionCompleteEvent = {
  roomId: PlacedRoomId;
  prisonerName: string;
  researchGained: number;
};

export type TortureConversionCompleteEvent = {
  roomId: PlacedRoomId;
  prisonerName: string;
  success: boolean;
  inhabitantName?: string;
};
