import { computed } from '@angular/core';
import { canRecruit } from '@helpers/altar-room';
import { getEntriesByType } from '@helpers/content';
import { addInhabitant } from '@helpers/inhabitants';
import { canAfford, payCost } from '@helpers/resources';
import { rngUuid } from '@helpers/rng';
import { gamestate } from '@helpers/state-game';
import type {
  InhabitantDefinition,
  InhabitantInstance,
  IsContentItem,
  ResourceType,
} from '@interfaces';

export const DEFAULT_MAX_INHABITANTS = 50;

/**
 * Signal for the currently unlocked recruitment tier.
 * Tier 1 is always unlocked. Higher tiers will be unlockable
 * via research or other progression systems in the future.
 */
export const unlockedTier = computed<number>(() => {
  return 1;
});

/**
 * Signal for the maximum number of total inhabitants allowed.
 */
export const maxInhabitantCount = computed<number>(() => {
  return DEFAULT_MAX_INHABITANTS;
});

/**
 * Signal for the current total inhabitant count.
 */
export const currentInhabitantCount = computed<number>(() => {
  return gamestate().world.inhabitants.length;
});

/**
 * Whether the roster is full (at max capacity).
 */
export const isRosterFull = computed<boolean>(() => {
  return currentInhabitantCount() >= maxInhabitantCount();
});

/**
 * Get all inhabitant definitions available for display in the recruitment panel.
 * Filters out unique/ruler inhabitants and sorts by tier then name.
 */
export function getRecruitableInhabitants(): (InhabitantDefinition &
  IsContentItem)[] {
  const allDefs = getEntriesByType<InhabitantDefinition & IsContentItem>(
    'inhabitant',
  );

  return allDefs
    .filter((def) => !def.restrictionTags.includes('unique'))
    .sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      return a.name.localeCompare(b.name);
    });
}

/**
 * Get the resource shortfall for recruiting an inhabitant.
 * Returns an array of { type, needed } for each resource the player is short on.
 */
export function getRecruitShortfall(
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
 * Recruit a new inhabitant by paying the cost and creating an instance.
 * Returns the result with success/error info.
 */
export async function recruitInhabitant(
  def: InhabitantDefinition,
): Promise<{ success: boolean; error?: string }> {
  if (!canRecruit()) {
    return { success: false, error: 'Altar required for recruitment' };
  }

  const state = gamestate();
  const totalInhabitants = state.world.inhabitants.length;
  if (totalInhabitants >= DEFAULT_MAX_INHABITANTS) {
    return { success: false, error: 'Roster full' };
  }

  // Tier 1 always unlocked; higher tiers gated by progression
  if (def.tier > 1) {
    return { success: false, error: `Requires Tier ${def.tier}` };
  }

  if (!canAfford(def.cost)) {
    return { success: false, error: 'Not enough resources' };
  }

  const paid = await payCost(def.cost);
  if (!paid) {
    return { success: false, error: 'Not enough resources' };
  }

  const instance: InhabitantInstance = {
    instanceId: rngUuid(),
    definitionId: def.id,
    name: def.name,
    state: 'normal',
    assignedRoomId: null,
  };

  await addInhabitant(instance);

  return { success: true };
}
