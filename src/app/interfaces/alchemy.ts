import type { AlchemyRecipeId } from '@interfaces/content-alchemyrecipe';
import type { PlacedRoomId } from '@interfaces/room-shape';

export type AlchemyConversion = {
  roomId: PlacedRoomId;
  recipeId: AlchemyRecipeId;
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
