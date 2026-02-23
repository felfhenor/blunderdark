import { invasionTriggerAddSpecial } from '@helpers/invasion-triggers';
import {
  mutationTraitApply,
  mutationTraitRoll,
} from '@helpers/mutation-traits';
import { reputationAwardInPlace } from '@helpers/reputation';
import { rngChoice, rngRandom } from '@helpers/rng';
import type { GameState, InhabitantInstance } from '@interfaces';
import { Subject } from 'rxjs';
import type { PRNG } from 'seedrandom';
import type { CorruptionEffectEvent } from '@interfaces/corruption-effect';

// --- Constants ---

export const CORRUPTION_EFFECT_THRESHOLD_DARK_UPGRADE = 50;
export const CORRUPTION_EFFECT_THRESHOLD_MUTATION = 100;
export const CORRUPTION_EFFECT_THRESHOLD_CRUSADE = 200;

export const corruptionEffectEvent$ = new Subject<CorruptionEffectEvent>();

// --- Pure functions ---

export function corruptionEffectSelectMutationTarget(
  inhabitants: InhabitantInstance[],
  rng: PRNG,
): InhabitantInstance | undefined {
  if (inhabitants.length === 0) return undefined;
  return rngChoice(inhabitants, rng);
}

/**
 * Roll and apply a mutation trait to a target inhabitant.
 * Corruption mutations include negative traits (corruption is chaotic).
 * Mutates the inhabitants array in-place by replacing the target entry.
 */
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

// --- Process function ---

export function corruptionEffectProcess(
  state: GameState,
  rng?: PRNG,
): void {
  const effectiveRng = rng ?? rngRandom();
  const corruption = state.world.resources.corruption.current;
  const effects = state.world.corruptionEffects;

  // 50 threshold: dark upgrade unlock (one-way)
  if (
    !effects.darkUpgradeUnlocked &&
    corruption >= CORRUPTION_EFFECT_THRESHOLD_DARK_UPGRADE
  ) {
    effects.darkUpgradeUnlocked = true;
    corruptionEffectEvent$.next({
      type: 'dark_upgrade_unlocked',
      description: 'Dark upgrades have been unlocked!',
    });
  }

  // 100 threshold: mutation on crossing
  if (corruption >= CORRUPTION_EFFECT_THRESHOLD_MUTATION) {
    if (
      effects.lastMutationCorruption === undefined ||
      effects.lastMutationCorruption < CORRUPTION_EFFECT_THRESHOLD_MUTATION
    ) {
      reputationAwardInPlace(state, 'Embrace Corruption');
      const target = corruptionEffectSelectMutationTarget(
        state.world.inhabitants,
        effectiveRng,
      );
      if (target) {
        const targetIndex = state.world.inhabitants.indexOf(target);
        const result = corruptionEffectApplyMutationTrait(
          state.world.inhabitants,
          targetIndex,
          effectiveRng,
        );
        if (result) {
          corruptionEffectEvent$.next({
            type: 'mutation_applied',
            description: `${target.name} mutated: gained ${result.traitName}`,
          });
        }
      }
      effects.lastMutationCorruption = corruption;
    }
  } else {
    effects.lastMutationCorruption = undefined;
  }

  // 200 threshold: crusade on crossing
  if (corruption >= CORRUPTION_EFFECT_THRESHOLD_CRUSADE) {
    if (
      effects.lastCrusadeCorruption === undefined ||
      effects.lastCrusadeCorruption < CORRUPTION_EFFECT_THRESHOLD_CRUSADE
    ) {
      state.world.invasionSchedule = invasionTriggerAddSpecial(
        state.world.invasionSchedule,
        'crusade',
        state.clock.day,
      );
      corruptionEffectEvent$.next({
        type: 'crusade_triggered',
        description:
          'A holy crusade has been triggered by overwhelming corruption!',
      });
      effects.lastCrusadeCorruption = corruption;
    }
  } else {
    effects.lastCrusadeCorruption = undefined;
  }
}
