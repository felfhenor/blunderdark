export type ForgeInventoryEntry = {
  recipeId: string;
  count: number;
};

export type ForgeCraftingJob = {
  recipeId: string;
  progress: number;
  targetTicks: number;
};

export type ForgeCraftingQueue = {
  roomId: string;
  jobs: ForgeCraftingJob[];
};
