import { computed } from '@angular/core';
import { contentGetEntry } from '@helpers/content';
import { floorModifierGetObjectiveCorruptionRate } from '@helpers/floor-modifiers';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type { Floor, InhabitantInstance } from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';

export const corruptionCurrent = computed(
  () => gamestate().world.resources.corruption.current,
);

export async function corruptionAdd(amount: number): Promise<number> {
  if (amount <= 0) return 0;

  let actualAdded = 0;

  await updateGamestate((state) => {
    const resource = state.world.resources.corruption;
    const available = resource.max - resource.current;
    actualAdded = Math.min(amount, available);

    return {
      ...state,
      world: {
        ...state.world,
        resources: {
          ...state.world.resources,
          corruption: {
            ...resource,
            current: resource.current + actualAdded,
          },
        },
      },
    };
  });

  return actualAdded;
}

export async function corruptionSpend(amount: number): Promise<boolean> {
  if (amount <= 0) return false;

  const current = gamestate().world.resources.corruption.current;
  if (current < amount) return false;

  await updateGamestate((state) => ({
    ...state,
    world: {
      ...state.world,
      resources: {
        ...state.world.resources,
        corruption: {
          ...state.world.resources.corruption,
          current: state.world.resources.corruption.current - amount,
        },
      },
    },
  }));

  return true;
}

export function corruptionCanAfford(amount: number): boolean {
  return gamestate().world.resources.corruption.current >= amount;
}

/**
 * Calculate per-tick corruption generation from stationed inhabitants.
 * corruptionGeneration on InhabitantContent is in per-game-minute units.
 * Only stationed (assigned to a room) inhabitants generate corruption.
 */
export function corruptionGenerationCalculateInhabitantRate(
  inhabitants: InhabitantInstance[],
  lookupDef?: (id: string) => InhabitantContent | undefined,
): number {
  const lookup =
    lookupDef ?? ((id: string) => contentGetEntry<InhabitantContent>(id));

  let totalPerMinute = 0;
  for (const inst of inhabitants) {
    if (!inst.assignedRoomId) continue;
    const def = lookup(inst.definitionId);
    if (!def) continue;
    const rate = def.corruptionGeneration ?? 0;
    if (rate > 0) {
      totalPerMinute += rate;
    }
  }

  return totalPerMinute / GAME_TIME_TICKS_PER_MINUTE;
}

/**
 * Calculate per-tick corruption generation from objective rooms on deep floors.
 * Objective rooms (rooms with objectiveTypes) on deeper floors passively generate
 * corruption, making it costly to bury them where invaders can't reach.
 */
export function corruptionCalculateDeepObjectiveRate(
  floors: Floor[],
): number {
  let totalPerMinute = 0;
  for (const floor of floors) {
    for (const room of floor.rooms) {
      const roomDef = contentGetEntry<RoomContent>(room.roomTypeId);
      if (roomDef?.objectiveTypes && roomDef.objectiveTypes.length > 0) {
        totalPerMinute += floorModifierGetObjectiveCorruptionRate(floor.depth);
      }
    }
  }
  return totalPerMinute / GAME_TIME_TICKS_PER_MINUTE;
}
