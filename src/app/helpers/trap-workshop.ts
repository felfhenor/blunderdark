import { contentGetEntriesByType, contentGetEntry } from '@helpers/content';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import { roomRoleFindById } from '@helpers/room-roles';
import { roomUpgradeGetAppliedEffects } from '@helpers/room-upgrades';
import { trapAddToInventory } from '@helpers/traps';
import type {
  GameState,
  IsContentItem,
  PlacedRoom,
  TrapCraftingJob,
  TrapCraftingQueue,
  TrapDefinition,
} from '@interfaces';
import type { ResourceCost } from '@interfaces/resource';

/** Base crafting time: 3 game-minutes = 15 ticks */
export const TRAP_WORKSHOP_BASE_CRAFTING_TICKS = GAME_TIME_TICKS_PER_MINUTE * 3;

// --- Crafting cost/time helpers ---

export function trapWorkshopGetCraftingCost(
  placedRoom: PlacedRoom,
  baseCost: ResourceCost,
): ResourceCost {
  const effects = roomUpgradeGetAppliedEffects(placedRoom);
  let costMultiplier = 1;
  for (const effect of effects) {
    if (effect.type === 'craftingCostMultiplier') {
      costMultiplier *= effect.value;
    }
  }

  if (costMultiplier === 1) return baseCost;

  const adjusted: ResourceCost = {};
  for (const [resource, amount] of Object.entries(baseCost)) {
    if (amount) {
      adjusted[resource as keyof ResourceCost] = Math.ceil(
        amount * costMultiplier,
      );
    }
  }
  return adjusted;
}

export function trapWorkshopGetCraftingTicks(
  placedRoom: PlacedRoom,
  assignedWorkerCount: number,
): number {
  let ticks = TRAP_WORKSHOP_BASE_CRAFTING_TICKS;

  const effects = roomUpgradeGetAppliedEffects(placedRoom);
  for (const effect of effects) {
    if (effect.type === 'craftingSpeedMultiplier') {
      ticks = Math.round(ticks * effect.value);
    }
  }

  // Each additional worker beyond the first reduces time by 20%
  if (assignedWorkerCount > 1) {
    const workerSpeedBonus = 1 - (assignedWorkerCount - 1) * 0.2;
    ticks = Math.round(ticks * Math.max(0.4, workerSpeedBonus));
  }

  return Math.max(1, ticks);
}

// --- Queue management ---

export function trapWorkshopGetQueue(
  queues: TrapCraftingQueue[],
  roomId: string,
): TrapCraftingQueue | undefined {
  return queues.find((q) => q.roomId === roomId);
}

export function trapWorkshopAddJob(
  queues: TrapCraftingQueue[],
  roomId: string,
  trapTypeId: string,
  targetTicks: number,
): TrapCraftingQueue[] {
  const job: TrapCraftingJob = {
    trapTypeId,
    progress: 0,
    targetTicks,
  };

  const existing = queues.find((q) => q.roomId === roomId);
  if (existing) {
    return queues.map((q) =>
      q.roomId === roomId ? { ...q, jobs: [...q.jobs, job] } : q,
    );
  }

  return [...queues, { roomId, jobs: [job] }];
}

export function trapWorkshopRemoveJob(
  queues: TrapCraftingQueue[],
  roomId: string,
  jobIndex: number,
): TrapCraftingQueue[] {
  return queues
    .map((q) => {
      if (q.roomId !== roomId) return q;
      const jobs = q.jobs.filter((_, i) => i !== jobIndex);
      return { ...q, jobs };
    })
    .filter((q) => q.jobs.length > 0);
}

// --- Validation ---

export function trapWorkshopCanQueue(
  roomId: string,
  floors: GameState['world']['floors'],
): { canQueue: boolean; reason?: string; room?: PlacedRoom } {
  for (const floor of floors) {
    const room = floor.rooms.find((r) => r.id === roomId);
    if (!room) continue;

    if (room.roomTypeId !== roomRoleFindById('trapWorkshop')) {
      return { canQueue: false, reason: 'Room is not a Trap Workshop' };
    }

    const assignedCount = floor.inhabitants.filter(
      (i) => i.assignedRoomId === roomId,
    ).length;
    if (assignedCount < 1) {
      return {
        canQueue: false,
        reason: 'At least 1 inhabitant must be assigned to craft traps',
      };
    }

    return { canQueue: true, room };
  }

  return { canQueue: false, reason: 'Room not found' };
}

// --- Tick processing ---

export function trapWorkshopProcess(state: GameState): void {
  for (const floor of state.world.floors) {
    for (const room of floor.rooms) {
      if (room.roomTypeId !== roomRoleFindById('trapWorkshop')) continue;

      const queueIndex = state.world.trapCraftingQueues.findIndex(
        (q) => q.roomId === room.id,
      );
      if (queueIndex === -1) continue;

      const queue = state.world.trapCraftingQueues[queueIndex];
      if (queue.jobs.length === 0) continue;

      // Only the first job in the queue progresses
      const assignedCount = floor.inhabitants.filter(
        (i) => i.assignedRoomId === room.id,
      ).length;
      if (assignedCount < 1) continue;

      const job = queue.jobs[0];
      job.progress += 1;

      if (job.progress >= job.targetTicks) {
        // Job complete: add to inventory and remove from queue
        state.world.trapInventory = trapAddToInventory(
          state.world.trapInventory,
          job.trapTypeId,
        );
        queue.jobs.shift();

        // Clean up empty queues
        if (queue.jobs.length === 0) {
          state.world.trapCraftingQueues.splice(queueIndex, 1);
        }
      }
    }
  }
}

// --- Workshop info ---

export type TrapWorkshopInfo = {
  placedRoom: PlacedRoom;
  assignedWorkerCount: number;
  craftingTicks: number;
  queue: TrapCraftingJob[];
  availableTraps: (TrapDefinition & IsContentItem)[];
};

export function trapWorkshopGetInfo(
  roomId: string,
  state: GameState,
): TrapWorkshopInfo | undefined {
  for (const floor of state.world.floors) {
    const room = floor.rooms.find((r) => r.id === roomId);
    if (!room || room.roomTypeId !== roomRoleFindById('trapWorkshop')) continue;

    const assignedWorkerCount = floor.inhabitants.filter(
      (i) => i.assignedRoomId === roomId,
    ).length;

    const craftingTicks = trapWorkshopGetCraftingTicks(room, assignedWorkerCount);

    const queueEntry = trapWorkshopGetQueue(
      state.world.trapCraftingQueues,
      roomId,
    );

    const allTraps = contentGetEntriesByType<TrapDefinition & IsContentItem>('trap');

    return {
      placedRoom: room,
      assignedWorkerCount,
      craftingTicks,
      queue: queueEntry?.jobs ?? [],
      availableTraps: allTraps,
    };
  }
  return undefined;
}

export function trapWorkshopGetDefinitionById(
  trapTypeId: string,
): (TrapDefinition & IsContentItem) | undefined {
  return contentGetEntry<TrapDefinition & IsContentItem>(trapTypeId);
}
