import type { ForgeRecipeId } from '@interfaces/content-forgerecipe';
import type { PlacedRoomId } from '@interfaces/room-shape';

export type ForgeInventoryEntry = {
  recipeId: ForgeRecipeId;
  count: number;
};

export type ForgeCraftingJob = {
  recipeId: ForgeRecipeId;
  progress: number;
  targetTicks: number;
};

export type ForgeCraftingQueue = {
  roomId: PlacedRoomId;
  jobs: ForgeCraftingJob[];
};

export type DarkForgeCompletedEvent = {
  roomId: PlacedRoomId;
  recipeName: string;
  category: 'equipment' | 'upgrade';
};
