import type { ForgeRecipeId } from '@interfaces/content-forgerecipe';
import type { PlacedRoomId } from '@interfaces/room-shape';

export type ForgeInventoryEntry = {
  recipeId: ForgeRecipeId;
  count: number;
};

export type DarkForgeCompletedEvent = {
  roomId: PlacedRoomId;
  recipeName: string;
  category: 'equipment' | 'upgrade';
};
