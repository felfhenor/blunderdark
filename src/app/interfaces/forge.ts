import type { ForgeRecipeId } from '@interfaces/content-forgerecipe';
import type { InhabitantStats } from '@interfaces/inhabitant';
import type { PlacedRoomId } from '@interfaces/room-shape';

export type ForgeInventoryEntry = {
  recipeId: ForgeRecipeId;
  count: number;
  bakedStatBonuses: Partial<InhabitantStats>;
};

export type DarkForgeCompletedEvent = {
  roomId: PlacedRoomId;
  recipeName: string;
};
