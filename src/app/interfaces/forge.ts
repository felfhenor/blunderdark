import type { PlacedRoomId } from '@interfaces/room-shape';

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
  roomId: PlacedRoomId;
  jobs: ForgeCraftingJob[];
};

export type DarkForgeCompletedEvent = {
  roomId: PlacedRoomId;
  recipeName: string;
  category: 'equipment' | 'upgrade';
};
