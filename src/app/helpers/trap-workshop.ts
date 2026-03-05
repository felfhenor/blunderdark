import { Subject } from 'rxjs';
import { contentGetEntriesByType, contentGetEntry } from '@helpers/content';
import { craftingQueueGetMaxSize } from '@helpers/crafting-queue';
import { researchUnlockGetPassiveBonusWithMastery } from '@helpers/research-unlocks';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import { roomRoleFindById } from '@helpers/room-roles';
import { roomUpgradeGetAppliedEffects } from '@helpers/room-upgrades';
import { trapAddToInventory } from '@helpers/traps';
import type {
  Floor,
  GameState,
  PlacedRoom,
  PlacedRoomId,
  TrapCraftingJob,
} from '@interfaces';
import type { TrapContent, TrapId } from '@interfaces/content-trap';
import type { ResourceCost } from '@interfaces/resource';
import type { TrapWorkshopInfo } from '@interfaces/trap-workshop';

/** Base crafting time: 20 game-minutes = 20 ticks */
export const TRAP_WORKSHOP_BASE_CRAFTING_TICKS = GAME_TIME_TICKS_PER_MINUTE * 20;

type TrapWorkshopCompletedEvent = {
  trapName: string;
};

const trapWorkshopCompletedSubject = new Subject<TrapWorkshopCompletedEvent>();
export const trapWorkshopCompleted$ =
  trapWorkshopCompletedSubject.asObservable();

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
  recipeTimeMultiplier = 1,
): number {
  let ticks = Math.round(TRAP_WORKSHOP_BASE_CRAFTING_TICKS * recipeTimeMultiplier);

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

  const researchCraftBonus = researchUnlockGetPassiveBonusWithMastery('craftingSpeed');
  if (researchCraftBonus > 0) {
    ticks = Math.max(1, Math.round(ticks * (1 / (1 + researchCraftBonus))));
  }

  return Math.max(1, ticks);
}

// --- Queue management ---

export function trapWorkshopGetQueue(room: PlacedRoom): TrapCraftingJob[] {
  return room.trapJobs ?? [];
}

export function trapWorkshopAddJob(
  room: PlacedRoom,
  trapTypeId: TrapId,
  targetTicks: number,
): void {
  if (!room.trapJobs) room.trapJobs = [];
  room.trapJobs.push({ trapTypeId, progress: 0, targetTicks });
}

export function trapWorkshopRemoveJob(
  room: PlacedRoom,
  jobIndex: number,
): void {
  if (!room.trapJobs) return;
  room.trapJobs.splice(jobIndex, 1);
  if (room.trapJobs.length === 0) room.trapJobs = undefined;
}

export function trapWorkshopRemoveJobGroup(
  room: PlacedRoom,
  startIndex: number,
  count: number,
): void {
  if (!room.trapJobs) return;
  room.trapJobs.splice(startIndex, count);
  if (room.trapJobs.length === 0) room.trapJobs = undefined;
}

// --- Validation ---

export function trapWorkshopCanQueue(
  room: PlacedRoom,
  floor: Floor,
): { canQueue: boolean; reason?: string } {
  if (room.roomTypeId !== roomRoleFindById('trapWorkshop')) {
    return { canQueue: false, reason: 'Room is not a Trap Workshop' };
  }

  const assignedCount = floor.inhabitants.filter(
    (i) => i.assignedRoomId === room.id,
  ).length;
  if (assignedCount < 1) {
    return {
      canQueue: false,
      reason: 'At least 1 inhabitant must be assigned to craft traps',
    };
  }

  const maxSize = craftingQueueGetMaxSize(room);
  const currentSize = (room.trapJobs ?? []).length;
  if (currentSize >= maxSize) {
    return {
      canQueue: false,
      reason: `Queue is full (max ${maxSize})`,
    };
  }

  return { canQueue: true };
}

// --- Tick processing ---

export function trapWorkshopProcess(state: GameState, numTicks = 1): void {
  for (const floor of state.world.floors) {
    for (const room of floor.rooms) {
      if (room.roomTypeId !== roomRoleFindById('trapWorkshop')) continue;
      if (!room.trapJobs || room.trapJobs.length === 0) continue;

      // Only the first job in the queue progresses
      const assignedCount = floor.inhabitants.filter(
        (i) => i.assignedRoomId === room.id,
      ).length;
      if (assignedCount < 1) continue;

      const job = room.trapJobs[0];
      job.progress += numTicks;

      if (job.progress >= job.targetTicks) {
        // Job complete: add to inventory and remove from queue
        state.world.trapInventory = trapAddToInventory(
          state.world.trapInventory,
          job.trapTypeId,
        );

        const trapDef = contentGetEntry<TrapContent>(job.trapTypeId);
        room.trapJobs.shift();

        // Clean up empty arrays
        if (room.trapJobs.length === 0) {
          room.trapJobs = undefined;
        }

        if (trapDef) {
          trapWorkshopCompletedSubject.next({
            trapName: trapDef.name,
          });
        }
      }
    }
  }
}

export function trapWorkshopGetInfo(
  roomId: PlacedRoomId,
  state: GameState,
): TrapWorkshopInfo | undefined {
  for (const floor of state.world.floors) {
    const room = floor.rooms.find((r) => r.id === roomId);
    if (!room || room.roomTypeId !== roomRoleFindById('trapWorkshop')) continue;

    const assignedWorkerCount = floor.inhabitants.filter(
      (i) => i.assignedRoomId === roomId,
    ).length;

    const craftingTicks = trapWorkshopGetCraftingTicks(room, assignedWorkerCount);

    const allTraps = contentGetEntriesByType<TrapContent>('trap');

    return {
      placedRoom: room,
      assignedWorkerCount,
      craftingTicks,
      queue: room.trapJobs ?? [],
      availableTraps: allTraps,
    };
  }
  return undefined;
}

export function trapWorkshopGetDefinitionById(
  trapTypeId: string,
): TrapContent | undefined {
  return contentGetEntry<TrapContent>(trapTypeId);
}
