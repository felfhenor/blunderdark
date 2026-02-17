import { computed } from '@angular/core';
import { contentGetEntry } from '@helpers/content';
import { featureGetAllForRoom } from '@helpers/features';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import {
  hungerGetConsumptionRate,
  hungerGetPerTickConsumption,
} from '@helpers/hunger';
import { gamestate } from '@helpers/state-game';
import { stateModifierGetFoodConsumptionMultiplier } from '@helpers/state-modifiers';
import type {
  Floor,
  InhabitantInstance,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { ResourceConsumptionBreakdown } from '@interfaces/production';

/**
 * Calculate consumption breakdowns for all resource types.
 * Aggregates food consumption from inhabitants, legendary upkeep, and feature maintenance.
 */
export function consumptionCalculateBreakdowns(
  floors: Floor[],
  inhabitants: InhabitantInstance[],
): Record<string, ResourceConsumptionBreakdown> {
  const breakdowns: Record<string, ResourceConsumptionBreakdown> = {};

  const ensure = (type: string): ResourceConsumptionBreakdown => {
    if (!breakdowns[type]) {
      breakdowns[type] = {
        inhabitantFood: 0,
        legendaryUpkeep: 0,
        featureMaintenance: 0,
        total: 0,
      };
    }
    return breakdowns[type];
  };

  // 1. Inhabitant food consumption
  for (const inhabitant of inhabitants) {
    const rate = hungerGetConsumptionRate(inhabitant.definitionId);
    if (rate <= 0) continue;

    const consumptionMultiplier =
      stateModifierGetFoodConsumptionMultiplier(inhabitant);
    const perTick = hungerGetPerTickConsumption(rate) * consumptionMultiplier;
    const bd = ensure('food');
    bd.inhabitantFood += perTick;
  }

  // 2. Legendary inhabitant upkeep
  for (const inhabitant of inhabitants) {
    const def = contentGetEntry<InhabitantContent>(inhabitant.definitionId);
    if (!def?.upkeepCost || Object.keys(def.upkeepCost).length === 0) continue;

    for (const [type, amountPerMinute] of Object.entries(def.upkeepCost)) {
      if (!amountPerMinute || amountPerMinute <= 0) continue;
      const perTick = amountPerMinute / GAME_TIME_TICKS_PER_MINUTE;
      const bd = ensure(type);
      bd.legendaryUpkeep += perTick;
    }
  }

  // 3. Feature maintenance costs
  for (const floor of floors) {
    for (const room of floor.rooms) {
      const features = featureGetAllForRoom(room);
      for (const feature of features) {
        if (!feature.maintenanceCost) continue;
        for (const [type, amountPerMinute] of Object.entries(
          feature.maintenanceCost,
        )) {
          if (!amountPerMinute || amountPerMinute <= 0) continue;
          const perTick = amountPerMinute / GAME_TIME_TICKS_PER_MINUTE;
          const bd = ensure(type);
          bd.featureMaintenance += perTick;
        }
      }
    }
  }

  // Calculate totals
  for (const bd of Object.values(breakdowns)) {
    bd.total = bd.inhabitantFood + bd.legendaryUpkeep + bd.featureMaintenance;
  }

  return breakdowns;
}

export const consumptionBreakdowns = computed(() => {
  const state = gamestate();
  return consumptionCalculateBreakdowns(
    state.world.floors,
    state.world.inhabitants,
  );
});
