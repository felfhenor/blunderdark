import { computed } from '@angular/core';
import { contentGetEntry } from '@helpers/content';
import { researchUnlockGetPassiveBonusWithMastery } from '@helpers/research-unlocks';
import { dayNightGetResourceModifier } from '@helpers/day-night-modifiers';
import { throneRoomGetRulerBonusValue } from '@helpers/throne-room';
import {
  featureCalculateCorruptionGenerationPerTick,
  featureGetCorruptionSealedRoomIds,
} from '@helpers/features';
import { floorModifierGetObjectiveCorruptionRate } from '@helpers/floor-modifiers';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import { productionCalculateTotal } from '@helpers/production';
import { resourceAdd } from '@helpers/resources';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type { Floor, GameState, InhabitantInstance } from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';
import type { CorruptionLevel } from '@interfaces/corruption';

export const CORRUPTION_THRESHOLD_LOW = 0;
export const CORRUPTION_THRESHOLD_MEDIUM = 50;
export const CORRUPTION_THRESHOLD_HIGH = 100;
export const CORRUPTION_THRESHOLD_CRITICAL = 200;

export const corruptionCurrent = computed(
  () => gamestate().world.resources.corruption.current,
);

export const corruptionLevel = computed((): CorruptionLevel => {
  return corruptionGetLevel(corruptionCurrent());
});

export function corruptionGetLevel(value: number): CorruptionLevel {
  const resistance = researchUnlockGetPassiveBonusWithMastery('corruptionResistance');
  const scaledCritical = CORRUPTION_THRESHOLD_CRITICAL * (1 + resistance);
  const scaledHigh = CORRUPTION_THRESHOLD_HIGH * (1 + resistance);
  const scaledMedium = CORRUPTION_THRESHOLD_MEDIUM * (1 + resistance);
  if (value >= scaledCritical) return 'critical';
  if (value >= scaledHigh) return 'high';
  if (value >= scaledMedium) return 'medium';
  return 'low';
}

export function corruptionGetLevelDescription(level: CorruptionLevel): string {
  switch (level) {
    case 'low':
      return 'Corruption is under control. No adverse effects.';
    case 'medium':
      return 'Corruption is rising. Minor production penalties may occur.';
    case 'high':
      return 'Corruption is dangerous. Significant penalties to production and morale.';
    case 'critical':
      return 'Corruption is overwhelming. Severe penalties and catastrophic events possible.';
  }
}

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

/**
 * Process inhabitant-based corruption generation each tick.
 * Applies day/night modifier (night +50%) to inhabitant-generated corruption.
 * Room-based corruption production is handled by the standard production pipeline.
 * Mutates state in-place (same pattern as productionProcess/hungerProcess).
 */
export function corruptionGenerationProcess(state: GameState, numTicks = 1): void {
  const inhabitantPerTick = corruptionGenerationCalculateInhabitantRate(
    state.world.inhabitants,
  );

  const sealedRoomIds = featureGetCorruptionSealedRoomIds(
    state.world.floors ?? [],
  );

  let featurePerTick = 0;
  for (const floor of state.world.floors ?? []) {
    const unsealedRooms =
      sealedRoomIds.size > 0
        ? floor.rooms.filter((r) => !sealedRoomIds.has(r.id))
        : floor.rooms;
    featurePerTick += featureCalculateCorruptionGenerationPerTick(
      unsealedRooms,
      GAME_TIME_TICKS_PER_MINUTE,
    );
  }

  const deepObjectivePerTick = corruptionCalculateDeepObjectiveRate(state.world.floors ?? []);

  // Include room-based corruption production (positive and negative, e.g. Purification Chamber)
  const roomProduction = productionCalculateTotal(
    state.world.floors,
    state.clock.hour,
    state.world.season.currentSeason,
  );
  const roomCorruptionPerTick = roomProduction['corruption'] ?? 0;

  const basePerTick = inhabitantPerTick + featurePerTick + deepObjectivePerTick + roomCorruptionPerTick;

  const dayNightMod = dayNightGetResourceModifier(
    state.clock.hour,
    'corruption',
  );
  const researchCorruptionBonus = researchUnlockGetPassiveBonusWithMastery('corruptionGeneration');
  const throneCorruptionBonus = state.world.floors
    ? throneRoomGetRulerBonusValue(state.world.floors, 'corruptionGeneration')
    : 0;
  const finalPerTick = basePerTick * dayNightMod * (1 + researchCorruptionBonus + throneCorruptionBonus);

  if (finalPerTick > 0) {
    resourceAdd('corruption', finalPerTick * numTicks);
  } else if (finalPerTick < 0) {
    // Net negative: purification exceeds generation, drain corruption
    state.world.resources.corruption.current = Math.max(
      0,
      state.world.resources.corruption.current + finalPerTick * numTicks,
    );
  }
}

/**
 * Calculate total corruption generation per minute from all sources (for UI display).
 * Combines room-based production (from productionRates) and inhabitant-based generation.
 */
export function corruptionGenerationCalculateTotalPerMinute(
  inhabitantRatePerTick: number,
  roomRatePerTick: number,
): number {
  return (inhabitantRatePerTick + roomRatePerTick) * GAME_TIME_TICKS_PER_MINUTE;
}
