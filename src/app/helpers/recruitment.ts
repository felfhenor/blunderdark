import { computed } from '@angular/core';
import { sortBy } from 'es-toolkit/compat';
import { altarRoomCanRecruit } from '@helpers/altar-room';
import { contentGetEntriesByType } from '@helpers/content';
import { inhabitantAdd } from '@helpers/inhabitants';
import { generateInhabitantName } from '@helpers/inhabitant-names';
import { resourceCanAfford, resourcePayCost } from '@helpers/resources';
import { rngUuid } from '@helpers/rng';
import { seasonBonusGetRecruitmentCostMultiplier } from '@helpers/season-bonuses';
import { gamestate } from '@helpers/state-game';
import type {
  InhabitantInstance,
  InhabitantInstanceId,
  ResourceCost,
  ResourceType,
  Season,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';

export const RECRUITMENT_DEFAULT_MAX_INHABITANTS = 50;

/**
 * Signal for the currently unlocked recruitment tier.
 * Tier 1 is always unlocked. Higher tiers will be unlockable
 * via research or other progression systems in the future.
 */
export const recruitmentUnlockedTier = computed<number>(() => {
  return 1;
});

/**
 * Signal for the maximum number of total inhabitants allowed.
 */
export const recruitmentMaxInhabitantCount = computed<number>(() => {
  return RECRUITMENT_DEFAULT_MAX_INHABITANTS;
});

/**
 * Signal for the current total inhabitant count.
 */
export const recruitmentCurrentInhabitantCount = computed<number>(() => {
  return gamestate().world.inhabitants.length;
});

/**
 * Whether the roster is full (at max capacity).
 */
export const recruitmentIsRosterFull = computed<boolean>(() => {
  return recruitmentCurrentInhabitantCount() >= recruitmentMaxInhabitantCount();
});

/**
 * Get all inhabitant definitions available for display in the recruitment panel.
 * Filters out unique/ruler inhabitants and sorts by tier then name.
 */
export function recruitmentGetRecruitable(): InhabitantContent[] {
  const allDefs = contentGetEntriesByType<InhabitantContent>(
    'inhabitant',
  );

  return sortBy(
    allDefs.filter((def) => !def.restrictionTags.includes('unique')),
    [(d) => d.tier, (d) => d.name],
  );
}

/**
 * Get the resource shortfall for recruiting an inhabitant.
 * Returns an array of { type, needed } for each resource the player is short on.
 */
export function recruitmentGetShortfall(
  cost: Partial<Record<ResourceType, number>>,
  resources: Record<ResourceType, { current: number }>,
): { type: ResourceType; needed: number }[] {
  const shortfall: { type: ResourceType; needed: number }[] = [];

  for (const [type, amount] of Object.entries(cost)) {
    const resourceType = type as ResourceType;
    const current = resources[resourceType].current;
    if (current < amount) {
      shortfall.push({ type: resourceType, needed: amount - current });
    }
  }

  return shortfall;
}

/**
 * Apply season recruitment cost multiplier to a base cost.
 * Uses Math.ceil to round up adjusted costs.
 */
export function recruitmentGetAdjustedCost(
  cost: ResourceCost,
  season: Season,
): ResourceCost {
  const multiplier = seasonBonusGetRecruitmentCostMultiplier(season);
  if (multiplier === 1.0) return cost;

  const adjusted: ResourceCost = {};
  for (const [type, amount] of Object.entries(cost)) {
    if (!amount) continue;
    adjusted[type as ResourceType] = Math.ceil(amount * multiplier);
  }
  return adjusted;
}

/**
 * Recruit a new inhabitant by paying the cost and creating an instance.
 * Returns the result with success/error info.
 */
export async function recruitmentRecruit(
  def: InhabitantContent,
): Promise<{ success: boolean; error?: string; instance?: InhabitantInstance }> {
  if (!altarRoomCanRecruit()) {
    return { success: false, error: 'Altar required for recruitment' };
  }

  const state = gamestate();
  const totalInhabitants = state.world.inhabitants.length;
  if (totalInhabitants >= RECRUITMENT_DEFAULT_MAX_INHABITANTS) {
    return { success: false, error: 'Roster full' };
  }

  // Tier 1 always unlocked; higher tiers gated by progression
  if (def.tier > 1) {
    return { success: false, error: `Requires Tier ${def.tier}` };
  }

  const adjustedCost = recruitmentGetAdjustedCost(
    def.cost,
    state.world.season.currentSeason,
  );

  if (!resourceCanAfford(adjustedCost)) {
    return { success: false, error: 'Not enough resources' };
  }

  const paid = await resourcePayCost(adjustedCost);
  if (!paid) {
    return { success: false, error: 'Not enough resources' };
  }

  const instance: InhabitantInstance = {
    instanceId: rngUuid<InhabitantInstanceId>(),
    definitionId: def.id,
    name: generateInhabitantName(def.type),
    state: 'normal',
    assignedRoomId: undefined,
  };

  await inhabitantAdd(instance);

  return { success: true, instance };
}
