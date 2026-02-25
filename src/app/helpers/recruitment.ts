import { computed } from '@angular/core';
import { sortBy } from 'es-toolkit/compat';
import { altarRoomCanRecruit } from '@helpers/altar-room';
import { contentGetEntriesByType } from '@helpers/content';
import { inhabitantAdd } from '@helpers/inhabitants';
import { generateInhabitantName } from '@helpers/inhabitant-names';
import {
  researchUnlockGetPassiveBonusWithMastery,
  researchUnlockIsResearchGated,
  researchUnlockIsUnlocked,
} from '@helpers/research-unlocks';
import { reputationEffectGetMaxAttractionLevel } from '@helpers/reputation-effects';
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
 * Signal for the highest tier of inhabitants that have been research-unlocked.
 * Used for display purposes (e.g. showing "Tier X unlocked" in the UI).
 */
export const recruitmentUnlockedTier = computed<number>(() => {
  const allDefs = contentGetEntriesByType<InhabitantContent>('inhabitant');
  let maxTier = 1;
  for (const def of allDefs) {
    if (def.restrictionTags.length !== 0) continue;
    if (def.tier <= 1) continue;
    if (
      researchUnlockIsResearchGated('inhabitant', def.id) &&
      researchUnlockIsUnlocked('inhabitant', def.id)
    ) {
      maxTier = Math.max(maxTier, def.tier);
    }
  }
  return maxTier;
});

/**
 * Signal for the maximum number of total inhabitants allowed.
 */
export const recruitmentMaxInhabitantCount = computed<number>(() => {
  const bonus = researchUnlockGetPassiveBonusWithMastery('maxInhabitants');
  return RECRUITMENT_DEFAULT_MAX_INHABITANTS + Math.floor(bonus);
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
 * Get the required harmony attraction level from restriction tags.
 * 'harmony_attract' requires level >= 1, 'harmony_attract_legendary' requires level >= 2.
 * Returns 0 if the creature has no harmony attraction restriction.
 */
function getRequiredAttractionLevel(restrictionTags: string[]): number {
  let maxRequired = 0;
  for (const tag of restrictionTags) {
    if (tag === 'harmony_attract_legendary') return 2;
    if (tag === 'harmony_attract') maxRequired = Math.max(maxRequired, 1);
  }
  return maxRequired;
}

/**
 * Check if all restriction tags are satisfiable by reputation effects.
 * Returns true if the only restriction tags are harmony attraction tags
 * and the current attraction level meets the requirement.
 */
function areRestrictionTagsSatisfied(
  restrictionTags: string[],
  attractionLevel: number,
): boolean {
  const harmonyTags = new Set(['harmony_attract', 'harmony_attract_legendary']);
  // All restriction tags must be harmony attraction tags
  if (!restrictionTags.every((tag) => harmonyTags.has(tag))) return false;
  const requiredLevel = getRequiredAttractionLevel(restrictionTags);
  return attractionLevel >= requiredLevel;
}

/**
 * Get all inhabitant definitions available for display in the recruitment panel.
 * Filters out inhabitants with restriction tags (except harmony_attract tags
 * which are satisfied by reputation effects) and those gated behind research
 * that hasn't been completed yet. Sorts by tier then name.
 */
export function recruitmentGetRecruitable(): InhabitantContent[] {
  const allDefs = contentGetEntriesByType<InhabitantContent>('inhabitant');
  const reputation = gamestate()?.world?.reputation;
  const attractionLevel = reputation
    ? reputationEffectGetMaxAttractionLevel(reputation)
    : 0;

  return sortBy(
    allDefs.filter((def) => {
      if (def.restrictionTags.length !== 0) {
        if (!areRestrictionTagsSatisfied(def.restrictionTags, attractionLevel))
          return false;
      }
      const gated = researchUnlockIsResearchGated('inhabitant', def.id);
      if (gated && !researchUnlockIsUnlocked('inhabitant', def.id))
        return false;
      return true;
    }),
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
 * Apply season recruitment cost multiplier and research discount to a base cost.
 * Uses Math.ceil to round up adjusted costs, minimum 1 per resource.
 */
export function recruitmentGetAdjustedCost(
  cost: ResourceCost,
  season: Season,
): ResourceCost {
  const seasonMultiplier = seasonBonusGetRecruitmentCostMultiplier(season);
  const researchDiscount = researchUnlockGetPassiveBonusWithMastery(
    'recruitmentCostReduction',
  );
  const combinedMultiplier = seasonMultiplier * (1 - researchDiscount);

  if (combinedMultiplier === 1.0) return cost;

  const adjusted: ResourceCost = {};
  for (const [type, amount] of Object.entries(cost)) {
    if (!amount) continue;
    adjusted[type as ResourceType] = Math.max(
      1,
      Math.ceil(amount * combinedMultiplier),
    );
  }
  return adjusted;
}

/**
 * Recruit a new inhabitant by paying the cost and creating an instance.
 * Returns the result with success/error info.
 */
export async function recruitmentRecruit(
  def: InhabitantContent,
): Promise<{
  success: boolean;
  error?: string;
  instance?: InhabitantInstance;
}> {
  if (!altarRoomCanRecruit()) {
    return { success: false, error: 'Altar required for recruitment' };
  }

  const state = gamestate();
  const totalInhabitants = state.world.inhabitants.length;
  if (totalInhabitants >= recruitmentMaxInhabitantCount()) {
    return { success: false, error: 'Roster full' };
  }

  const gated = researchUnlockIsResearchGated('inhabitant', def.id);
  if (gated && !researchUnlockIsUnlocked('inhabitant', def.id)) {
    return { success: false, error: `Requires research to unlock ${def.name}` };
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
