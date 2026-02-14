import type { IsContentItem, PlacedRoom, TrapCraftingJob, TrapDefinition } from '@interfaces';

export type TrapWorkshopInfo = {
  placedRoom: PlacedRoom;
  assignedWorkerCount: number;
  craftingTicks: number;
  queue: TrapCraftingJob[];
  availableTraps: (TrapDefinition & IsContentItem)[];
};
