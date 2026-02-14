export type AlchemyConversion = {
  roomId: string;
  recipeId: string;
  progress: number;
  targetTicks: number;
  inputConsumed: boolean;
};

export type AlchemyLabCompletedEvent = {
  roomId: string;
  recipeName: string;
  outputResource: string;
  outputAmount: number;
};
