import type { PlacedRoomId } from '@interfaces/room-shape';

export type AlchemyConversion = {
  roomId: PlacedRoomId;
  recipeId: string;
  progress: number;
  targetTicks: number;
  inputConsumed: boolean;
};

export type AlchemyLabCompletedEvent = {
  roomId: PlacedRoomId;
  recipeName: string;
  outputResource: string;
  outputAmount: number;
};
