import { computed } from '@angular/core';
import { contentGetEntriesByType } from '@helpers/content';
import { corruptionCurrent } from '@helpers/corruption';
import { invasionTriggerAddSpecial } from '@helpers/invasion-triggers';
import {
  mutationTraitApply,
  mutationTraitRoll,
} from '@helpers/mutation-traits';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import { reputationAwardInPlace } from '@helpers/reputation';
import { researchUnlockGetPassiveBonusWithMastery } from '@helpers/research-unlocks';
import { rngChoice, rngRandom } from '@helpers/rng';
import type {
  CorruptionEffectState,
  GameState,
  InhabitantInstance,
  SpecialInvasionType,
} from '@interfaces';
import type {
  CorruptionEffectContent,
  CorruptionEffectType,
} from '@interfaces/content-corruptioneffect';
import type { CorruptionEffectEvent } from '@interfaces/corruption-effect';
import type { ResourceType } from '@interfaces/resource';
import { Subject } from 'rxjs';
import type { PRNG } from 'seedrandom';

// --- Event subject (consumed by NotifyService for UI notifications) ---

export const corruptionEffectEvent$ = new Subject<CorruptionEffectEvent>();

// --- All corruption effects from gamedata ---

export function corruptionEffectGetAll(): CorruptionEffectContent[] {
  return contentGetEntriesByType<CorruptionEffectContent>('corruptioneffect');
}

// --- Resistance scaling ---

export function corruptionEffectGetScaledTriggerValue(
  effect: CorruptionEffectContent,
): number {
  const resistance = researchUnlockGetPassiveBonusWithMastery('corruptionResistance');
  return effect.triggerValue * (1 + resistance);
}

// --- Active passive effects ---

export const corruptionActivePassiveEffects = computed(
  (): CorruptionEffectContent[] => {
    const current = corruptionCurrent();
    const allEffects = corruptionEffectGetAll();
    return allEffects.filter(
      (e) =>
        e.behavior === 'passive' &&
        e.triggerType === 'threshold' &&
        current >= corruptionEffectGetScaledTriggerValue(e),
    );
  },
);

// --- Active visual effects ---

export const corruptionActiveVisualEffects = computed(
  (): CorruptionEffectContent[] => {
    return corruptionActivePassiveEffects().filter(
      (e) => e.effectType === 'visual',
    );
  },
);

// --- Grid classes from active visual effects ---

export const corruptionActiveGridClasses = computed((): string[] => {
  return corruptionActiveVisualEffects()
    .filter((e) => e.visualEffect?.gridClass)
    .map((e) => e.visualEffect!.gridClass!);
});

// --- Highest active progress bar class ---

export const corruptionProgressBarClass = computed((): string => {
  const visuals = corruptionActiveVisualEffects();
  for (let i = visuals.length - 1; i >= 0; i--) {
    if (visuals[i].visualEffect?.progressBarClass) {
      return visuals[i].visualEffect!.progressBarClass!;
    }
  }
  return 'progress-error';
});

// --- Corruption color class (for text/badges) ---

export const corruptionColorClass = computed((): string => {
  const visuals = corruptionActiveVisualEffects();
  if (visuals.length === 0) return 'text-success';
  const highest = visuals[visuals.length - 1];
  if (highest.visualEffect?.progressBarClass === 'progress-error') return 'text-error';
  if (highest.visualEffect?.progressBarClass === 'progress-warning') return 'text-warning';
  return 'text-success';
});

// --- Corruption badge class ---

export const corruptionBadgeClass = computed((): string => {
  const visuals = corruptionActiveVisualEffects();
  if (visuals.length === 0) return 'badge-success';
  const highest = visuals[visuals.length - 1];
  if (highest.visualEffect?.progressBarClass === 'progress-error') return 'badge-error';
  if (highest.visualEffect?.progressBarClass === 'progress-warning') return 'badge-warning';
  return 'badge-success';
});

// --- Get active modifier multiplier for a given effect type ---

export function corruptionEffectGetActiveModifier(
  effectType: CorruptionEffectType,
  filterFn?: (effect: CorruptionEffectContent) => boolean,
): number {
  const active = corruptionActivePassiveEffects();
  let multiplier = 1;
  for (const effect of active) {
    if (effect.effectType !== effectType) continue;
    if (filterFn && !filterFn(effect)) continue;
    const m = (effect.effectParams as Record<string, number> | undefined)?.['multiplier'];
    if (m !== undefined) {
      multiplier *= m;
    }
  }
  return multiplier;
}

// --- Check if dark upgrades are unlocked ---

export function corruptionEffectIsDarkUpgradeUnlocked(
  effects: CorruptionEffectState,
): boolean {
  const entry = corruptionEffectGetAll().find(
    (e) => e.effectType === 'unlock' && (e.effectParams as Record<string, unknown>)?.['feature'] === 'dark_upgrades',
  );
  if (!entry) return false;
  return effects.firedOneTimeEffects.includes(entry.id);
}

// --- Condition checking ---

function conditionsMet(
  effect: CorruptionEffectContent,
  state: GameState,
): boolean {
  if (!effect.conditions) return true;

  if (effect.conditions.minFloorDepth !== undefined) {
    const maxDepth = Math.max(...state.world.floors.map((f) => f.depth), 0);
    if (maxDepth < effect.conditions.minFloorDepth) return false;
  }

  if (effect.conditions.minInhabitants !== undefined) {
    if (state.world.inhabitants.length < effect.conditions.minInhabitants) return false;
  }

  // requiresResearch is checked against research completed nodes
  // For now this is a placeholder — condition names would need to be matched
  // against completed research node names

  return true;
}

// --- Mutation helpers (migrated from old code) ---

export function corruptionEffectSelectMutationTarget(
  inhabitants: InhabitantInstance[],
  rng: PRNG,
): InhabitantInstance | undefined {
  if (inhabitants.length === 0) return undefined;
  return rngChoice(inhabitants, rng);
}

export function corruptionEffectApplyMutationTrait(
  inhabitants: InhabitantInstance[],
  targetIndex: number,
  rng: PRNG,
): { traitName: string } | undefined {
  const target = inhabitants[targetIndex];
  const trait = mutationTraitRoll(
    true,
    target.mutationTraitIds ?? [],
    rng,
  );
  if (!trait) return undefined;

  inhabitants[targetIndex] = mutationTraitApply(target, trait);
  return { traitName: trait.name };
}

// --- Effect handler registry ---

function handleTriggerInvasion(
  effect: CorruptionEffectContent,
  state: GameState,
): void {
  const params = effect.effectParams as Record<string, unknown> | undefined;
  const invasionType = (params?.['invasionType'] ?? 'crusade') as SpecialInvasionType;
  state.world.invasionSchedule = invasionTriggerAddSpecial(
    state.world.invasionSchedule,
    invasionType,
    state.clock.day,
  );
}

function handleMutateInhabitant(
  effect: CorruptionEffectContent,
  state: GameState,
  rng: PRNG,
): void {
  reputationAwardInPlace(state, 'Embrace Corruption');
  const target = corruptionEffectSelectMutationTarget(
    state.world.inhabitants,
    rng,
  );
  if (target) {
    const targetIndex = state.world.inhabitants.indexOf(target);
    const result = corruptionEffectApplyMutationTrait(
      state.world.inhabitants,
      targetIndex,
      rng,
    );
    if (result && effect.notification) {
      corruptionEffectEvent$.next({
        title: effect.notification.title,
        description: `${target.name} mutated: gained ${result.traitName}`,
        severity: effect.notification.severity,
      });
      return; // skip default notification
    }
  }
}

function handleResourceGrant(
  effect: CorruptionEffectContent,
  state: GameState,
): void {
  const params = effect.effectParams as Record<string, unknown> | undefined;
  const resource = (params?.['resource'] ?? 'essence') as ResourceType;
  const amount = (params?.['amount'] ?? 0) as number;
  if (amount > 0) {
    const res = state.world.resources[resource];
    const available = res.max - res.current;
    res.current += Math.min(amount, available);
  }
}

function executeEventEffect(
  effect: CorruptionEffectContent,
  state: GameState,
  rng: PRNG,
): void {
  switch (effect.effectType) {
    case 'unlock':
      // unlock effects are tracked purely via firedOneTimeEffects — no action needed
      break;
    case 'trigger_invasion':
      handleTriggerInvasion(effect, state);
      break;
    case 'mutate_inhabitant':
      handleMutateInhabitant(effect, state, rng);
      return; // mutation handler sends its own notification
    case 'resource_grant':
      handleResourceGrant(effect, state);
      break;
    default:
      break;
  }

  // Send notification for non-mutation effects
  if (effect.notification) {
    corruptionEffectEvent$.next({
      title: effect.notification.title,
      description: effect.notification.message,
      severity: effect.notification.severity,
    });
  }
}

// --- Main processing function ---

export function corruptionEffectProcessAll(
  state: GameState,
  rng?: PRNG,
): void {
  const effectiveRng = rng ?? rngRandom();
  const corruption = state.world.resources.corruption.current;
  const effects = state.world.corruptionEffects;
  const allEffects = corruptionEffectGetAll();
  const resistance = researchUnlockGetPassiveBonusWithMastery('corruptionResistance');

  for (const effect of allEffects) {
    // Skip passive effects — they are computed reactively, not processed per-tick
    if (effect.behavior === 'passive') continue;

    // Check conditions
    if (!conditionsMet(effect, state)) continue;

    const scaledTriggerValue = effect.triggerValue * (1 + resistance);

    if (effect.triggerType === 'threshold') {
      processThresholdEffect(effect, corruption, scaledTriggerValue, effects, state, effectiveRng);
    } else if (effect.triggerType === 'interval') {
      processIntervalEffect(effect, corruption, scaledTriggerValue, effects, state, effectiveRng);
    }
  }
}

function processThresholdEffect(
  effect: CorruptionEffectContent,
  corruption: number,
  scaledTriggerValue: number,
  effects: CorruptionEffectState,
  state: GameState,
  rng: PRNG,
): void {
  // One-time effects
  if (effect.oneTime) {
    if (effects.firedOneTimeEffects.includes(effect.id)) return;
    if (corruption >= scaledTriggerValue) {
      if (shouldFire(effect, effects, state)) {
        effects.firedOneTimeEffects.push(effect.id);
        executeEventEffect(effect, state, rng);
      }
    }
    return;
  }

  // Retriggerable effects
  if (effect.retriggerable) {
    if (corruption >= scaledTriggerValue) {
      // Only fire if we haven't already fired since last crossing
      if (effects.retriggeredEffects[effect.id] !== false) {
        if (shouldFire(effect, effects, state)) {
          effects.retriggeredEffects[effect.id] = false;
          executeEventEffect(effect, state, rng);
        }
      }
    } else {
      // Corruption dropped below threshold — arm it to fire again
      effects.retriggeredEffects[effect.id] = true;
    }
    return;
  }
}

function processIntervalEffect(
  effect: CorruptionEffectContent,
  corruption: number,
  scaledTriggerValue: number,
  effects: CorruptionEffectState,
  state: GameState,
  rng: PRNG,
): void {
  if (scaledTriggerValue <= 0) return;

  const currentMilestone =
    Math.floor(corruption / scaledTriggerValue) * scaledTriggerValue;
  const lastMilestone = effects.lastIntervalValues[effect.id] ?? 0;

  if (
    currentMilestone >= scaledTriggerValue &&
    currentMilestone > lastMilestone
  ) {
    if (shouldFire(effect, effects, state)) {
      effects.lastIntervalValues[effect.id] = currentMilestone;
      executeEventEffect(effect, state, rng);
    }
  }
}

function shouldFire(
  effect: CorruptionEffectContent,
  effects: CorruptionEffectState,
  state: GameState,
): boolean {
  // Check cooldown
  if (effect.cooldownMinutes !== undefined && effect.cooldownMinutes > 0) {
    const lastTrigger = effects.lastTriggerTimes[effect.id];
    if (lastTrigger !== undefined) {
      const gameMinutes = state.clock.numTicks / GAME_TIME_TICKS_PER_MINUTE;
      const elapsed = gameMinutes - lastTrigger;
      if (elapsed < effect.cooldownMinutes) return false;
    }
  }

  // Check probability
  if (effect.probability !== undefined && effect.probability < 1) {
    if (Math.random() > effect.probability) return false;
  }

  // Record trigger time
  if (effect.cooldownMinutes !== undefined) {
    const gameMinutes = state.clock.numTicks / GAME_TIME_TICKS_PER_MINUTE;
    effects.lastTriggerTimes[effect.id] = gameMinutes;
  }

  return true;
}

// --- Next threshold/interval info for UI ---

export type NextCorruptionEffect = {
  effect: CorruptionEffectContent;
  scaledTriggerValue: number;
};

export const corruptionNextEffect = computed(
  (): NextCorruptionEffect | undefined => {
    const current = corruptionCurrent();
    const allEffects = corruptionEffectGetAll();

    let closest: NextCorruptionEffect | undefined;

    for (const effect of allEffects) {
      if (effect.triggerType !== 'threshold') continue;
      const scaled = corruptionEffectGetScaledTriggerValue(effect);
      if (current >= scaled) continue;
      if (!closest || scaled < closest.scaledTriggerValue) {
        closest = { effect, scaledTriggerValue: scaled };
      }
    }

    return closest;
  },
);
