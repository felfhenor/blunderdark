import type { PlacedRoom, TrapCraftingJob } from '@interfaces';
import type { TrapContent } from '@interfaces/content-trap';

export type TrapWorkshopInfo = {
  placedRoom: PlacedRoom;
  assignedWorkerCount: number;
  craftingTicks: number;
  queue: TrapCraftingJob[];
  availableTraps: TrapContent[];
};
