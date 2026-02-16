import { computed } from '@angular/core';
import { contentGetEntriesByType } from '@helpers/content';
import { reputationGetLevel } from '@helpers/reputation';
import { gamestate } from '@helpers/state-game';
import type {
  ReputationEffectContent,
  ReputationEffectType,
  ReputationLevel,
  ReputationType,
} from '@interfaces';

const REPUTATION_LEVEL_ORDER: ReputationLevel[] = [
  'none',
  'low',
  'medium',
  'high',
  'legendary',
];

function levelMeetsMinimum(
  current: ReputationLevel,
  minimum: ReputationLevel,
): boolean {
  return (
    REPUTATION_LEVEL_ORDER.indexOf(current) >=
    REPUTATION_LEVEL_ORDER.indexOf(minimum)
  );
}

/**
 * Pure function: given reputation state, returns all active effects.
 */
export function reputationEffectGetActive(
  reputation: Record<ReputationType, number>,
  allEffects?: (ReputationEffectContent)[],
): (ReputationEffectContent)[] {
  const effects =
    allEffects ??
    contentGetEntriesByType<ReputationEffectContent>(
      'reputationeffect',
    );

  return effects.filter((effect) => {
    const currentLevel = reputationGetLevel(
      reputation[effect.reputationType] ?? 0,
    );
    return levelMeetsMinimum(currentLevel, effect.minimumLevel);
  });
}

/**
 * Pure function: checks if a specific effect is active.
 */
export function reputationEffectHas(
  effectName: string,
  reputation: Record<ReputationType, number>,
  allEffects?: (ReputationEffectContent)[],
): boolean {
  const active = reputationEffectGetActive(reputation, allEffects);
  return active.some((e) => e.name === effectName);
}

/**
 * Pure function: get all active effects of a given type.
 */
export function reputationEffectGetByType(
  effectType: ReputationEffectType,
  reputation: Record<ReputationType, number>,
  allEffects?: (ReputationEffectContent)[],
): (ReputationEffectContent)[] {
  return reputationEffectGetActive(reputation, allEffects).filter(
    (e) => e.effectType === effectType,
  );
}

/**
 * Pure function: get the combined invasion rate multiplier from all active effects.
 * Values >1 increase invasion frequency, <1 decrease it.
 * When both Terror (increase) and Harmony (decrease) are active,
 * effects are multiplied together.
 */
export function reputationEffectGetInvasionRateMultiplier(
  reputation: Record<ReputationType, number>,
  allEffects?: (ReputationEffectContent)[],
): number {
  const invasionEffects = reputationEffectGetByType(
    'modify_invasion_rate',
    reputation,
    allEffects,
  );

  // Group by reputation type: take the strongest (highest or lowest) per type
  const byType = new Map<ReputationType, number>();
  for (const effect of invasionEffects) {
    const existing = byType.get(effect.reputationType);
    if (existing === undefined) {
      byType.set(effect.reputationType, effect.effectValue);
    } else if (effect.effectValue > 1) {
      // For increases, take the higher multiplier
      byType.set(effect.reputationType, Math.max(existing, effect.effectValue));
    } else {
      // For decreases, take the lower multiplier
      byType.set(effect.reputationType, Math.min(existing, effect.effectValue));
    }
  }

  let combined = 1.0;
  for (const multiplier of byType.values()) {
    combined *= multiplier;
  }
  return combined;
}

/**
 * Pure function: get the production multiplier for a specific resource type.
 */
export function reputationEffectGetProductionMultiplier(
  resourceType: string,
  reputation: Record<ReputationType, number>,
  allEffects?: (ReputationEffectContent)[],
): number {
  const productionEffects = reputationEffectGetByType(
    'modify_production',
    reputation,
    allEffects,
  );

  let multiplier = 1.0;
  for (const effect of productionEffects) {
    if (effect.targetId === resourceType) {
      multiplier *= effect.effectValue;
    }
  }
  return multiplier;
}

/**
 * Computed signal: all currently active reputation effects.
 * Recalculates whenever reputation state changes.
 */
export const reputationEffectActive = computed(() => {
  const reputation = gamestate().world.reputation;
  return reputationEffectGetActive(reputation);
});

/**
 * Computed signal: set of active effect names for quick lookup.
 */
export const reputationEffectActiveNames = computed(() => {
  return new Set(reputationEffectActive().map((e) => e.name));
});
