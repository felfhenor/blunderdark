import { computed } from '@angular/core';
import {
  CORRUPTION_THRESHOLD_CRITICAL,
  CORRUPTION_THRESHOLD_HIGH,
  CORRUPTION_THRESHOLD_MEDIUM,
  corruptionCurrent,
} from '@helpers/corruption';
import type { CorruptionEffectState, GameState } from '@interfaces';
import { Subject } from 'rxjs';

// --- Constants ---

export const CORRUPTION_THRESHOLD_ALL = [
  CORRUPTION_THRESHOLD_MEDIUM,
  CORRUPTION_THRESHOLD_HIGH,
  CORRUPTION_THRESHOLD_CRITICAL,
] as const;

export const CORRUPTION_THRESHOLD_WARNING_FACTOR = 0.8;

// --- Types ---

export type CorruptionThresholdWarning = {
  threshold: number;
  warningLevel: number;
  currentCorruption: number;
  effectDescription: string;
};

// --- Event subject (consumed by NotifyService for UI notifications) ---

export const corruptionThresholdWarning$ =
  new Subject<CorruptionThresholdWarning>();

// --- Pure functions ---

export function corruptionThresholdGetEffectDescription(
  threshold: number,
): string {
  switch (threshold) {
    case CORRUPTION_THRESHOLD_MEDIUM:
      return 'Dark upgrades will be unlocked';
    case CORRUPTION_THRESHOLD_HIGH:
      return 'Inhabitants may be mutated';
    case CORRUPTION_THRESHOLD_CRITICAL:
      return 'A holy crusade will be triggered';
    default:
      return 'Unknown corruption effect';
  }
}

export function corruptionThresholdGetNext(
  corruption: number,
): number | undefined {
  for (const threshold of CORRUPTION_THRESHOLD_ALL) {
    if (corruption < threshold) return threshold;
  }
  return undefined;
}

/**
 * Check if a specific threshold's effect has already been triggered.
 * Uses the existing CorruptionEffectState tracking from corruption-effects.ts.
 */
function isThresholdTriggered(
  threshold: number,
  effects: CorruptionEffectState,
): boolean {
  switch (threshold) {
    case CORRUPTION_THRESHOLD_MEDIUM:
      return effects.darkUpgradeUnlocked;
    case CORRUPTION_THRESHOLD_HIGH:
      return (
        effects.lastMutationCorruption !== undefined &&
        effects.lastMutationCorruption >= CORRUPTION_THRESHOLD_HIGH
      );
    case CORRUPTION_THRESHOLD_CRITICAL:
      return (
        effects.lastCrusadeCorruption !== undefined &&
        effects.lastCrusadeCorruption >= CORRUPTION_THRESHOLD_CRITICAL
      );
    default:
      return false;
  }
}

/**
 * Pure function: determine which warnings should fire and update warned set.
 *
 * Warning fires when:
 * - corruption >= 80% of threshold
 * - corruption < threshold (not yet crossed)
 * - threshold not already warned
 * - threshold effect not already triggered
 *
 * Warning clears when:
 * - corruption drops below 80% of threshold
 * - corruption crosses the threshold (effect fires)
 */
export function corruptionThresholdCheckWarnings(
  corruption: number,
  warnedThresholds: number[],
  effects: CorruptionEffectState,
): {
  newWarnings: CorruptionThresholdWarning[];
  updatedWarnedThresholds: number[];
} {
  const newWarnings: CorruptionThresholdWarning[] = [];
  const updatedWarnedThresholds = [...warnedThresholds];

  for (const threshold of CORRUPTION_THRESHOLD_ALL) {
    const warningLevel = threshold * CORRUPTION_THRESHOLD_WARNING_FACTOR;
    const alreadyWarned = updatedWarnedThresholds.includes(threshold);
    const alreadyTriggered = isThresholdTriggered(threshold, effects);

    // Clear warning if corruption dropped below warning level
    if (corruption < warningLevel) {
      const idx = updatedWarnedThresholds.indexOf(threshold);
      if (idx >= 0) updatedWarnedThresholds.splice(idx, 1);
      continue;
    }

    // Clear warning if threshold was crossed (effect already fired)
    if (corruption >= threshold) {
      const idx = updatedWarnedThresholds.indexOf(threshold);
      if (idx >= 0) updatedWarnedThresholds.splice(idx, 1);
      continue;
    }

    // Fire warning: in the warning zone, not yet warned, effect not yet triggered
    if (!alreadyWarned && !alreadyTriggered) {
      newWarnings.push({
        threshold,
        warningLevel,
        currentCorruption: corruption,
        effectDescription: corruptionThresholdGetEffectDescription(threshold),
      });
      updatedWarnedThresholds.push(threshold);
    }
  }

  return { newWarnings, updatedWarnedThresholds };
}

// --- Computed signals ---

export const corruptionThresholdNext = computed(() =>
  corruptionThresholdGetNext(corruptionCurrent()),
);

// --- Process function (called each tick in gameloop) ---

/**
 * Check corruption thresholds for pre-crossing warnings.
 * Mutates state.world.corruptionEffects.warnedThresholds in-place.
 * Emits warning events via corruptionThresholdWarning$ for UI consumption.
 *
 * The actual effect triggering (dark upgrades, mutations, crusades) is handled
 * by corruptionEffectProcess() in corruption-effects.ts.
 *
 * Available corruption reduction methods:
 * - Dryad inhabitant (planned): negative corruptionGeneration
 * - Purification rooms (planned): negative corruption production in YAML
 * - corruptionSpend(): manual corruption expenditure on dark upgrades
 */
export function corruptionThresholdProcess(state: GameState): void {
  const corruption = state.world.resources.corruption.current;
  const effects = state.world.corruptionEffects;

  const { newWarnings, updatedWarnedThresholds } =
    corruptionThresholdCheckWarnings(
      corruption,
      effects.warnedThresholds,
      effects,
    );

  effects.warnedThresholds = updatedWarnedThresholds;

  for (const warning of newWarnings) {
    corruptionThresholdWarning$.next(warning);
  }
}
