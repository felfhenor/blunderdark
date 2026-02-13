import { invasionTriggerAddSpecial } from '@helpers/invasion-triggers';
import { rngChoice, rngNumberRange, rngRandom } from '@helpers/rng';
import type {
  CorruptionEffectMutation,
  GameState,
  InhabitantInstance,
  InhabitantStats,
} from '@interfaces';
import { Subject } from 'rxjs';
import type { PRNG } from 'seedrandom';

// --- Constants ---

export const CORRUPTION_EFFECT_MUTATION_STATS: (keyof InhabitantStats)[] = [
  'hp',
  'attack',
  'defense',
  'speed',
  'workerEfficiency',
];

export const CORRUPTION_EFFECT_MUTATION_MIN_DELTA = -3;
export const CORRUPTION_EFFECT_MUTATION_MAX_DELTA = 5;

export const CORRUPTION_EFFECT_THRESHOLD_DARK_UPGRADE = 50;
export const CORRUPTION_EFFECT_THRESHOLD_MUTATION = 100;
export const CORRUPTION_EFFECT_THRESHOLD_CRUSADE = 200;

// --- Event subject ---

export type CorruptionEffectEventType =
  | 'dark_upgrade_unlocked'
  | 'mutation_applied'
  | 'crusade_triggered';

export type CorruptionEffectEvent = {
  type: CorruptionEffectEventType;
  description: string;
};

export const corruptionEffectEvent$ = new Subject<CorruptionEffectEvent>();

// --- Pure functions ---

export function corruptionEffectRollMutation(
  rng: PRNG,
): CorruptionEffectMutation {
  const stat = rngChoice(CORRUPTION_EFFECT_MUTATION_STATS, rng);
  let delta = rngNumberRange(
    CORRUPTION_EFFECT_MUTATION_MIN_DELTA,
    CORRUPTION_EFFECT_MUTATION_MAX_DELTA + 1,
    rng,
  );
  if (delta === 0) delta = 1;
  return { stat, delta };
}

export function corruptionEffectApplyMutation(
  inhabitant: InhabitantInstance,
  mutation: CorruptionEffectMutation,
): void {
  if (!inhabitant.mutationBonuses) {
    inhabitant.mutationBonuses = {};
  }
  const current = inhabitant.mutationBonuses[mutation.stat] ?? 0;
  inhabitant.mutationBonuses[mutation.stat] = current + mutation.delta;
}

export function corruptionEffectSelectMutationTarget(
  inhabitants: InhabitantInstance[],
  rng: PRNG,
): InhabitantInstance | undefined {
  if (inhabitants.length === 0) return undefined;
  return rngChoice(inhabitants, rng);
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
      const target = corruptionEffectSelectMutationTarget(
        state.world.inhabitants,
        effectiveRng,
      );
      if (target) {
        const mutation = corruptionEffectRollMutation(effectiveRng);
        corruptionEffectApplyMutation(target, mutation);
        corruptionEffectEvent$.next({
          type: 'mutation_applied',
          description: `${target.name} mutated: ${mutation.stat} ${mutation.delta > 0 ? '+' : ''}${mutation.delta}`,
        });
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
        description: 'A holy crusade has been triggered by overwhelming corruption!',
      });
      effects.lastCrusadeCorruption = corruption;
    }
  } else {
    effects.lastCrusadeCorruption = undefined;
  }
}
