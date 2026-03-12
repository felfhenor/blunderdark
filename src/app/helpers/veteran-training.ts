import { researchUnlockIsFeatureUnlocked } from '@helpers/research-unlocks';
import type { GameState } from '@interfaces';

/**
 * Process veteran training: increment veteranTicks for assigned inhabitants.
 * Resets veteranTicks when an inhabitant becomes unassigned.
 * Only active when the veteran_training feature flag is unlocked.
 */
export function veteranTrainingProcess(
  state: GameState,
  numTicks: number,
): void {
  if (!researchUnlockIsFeatureUnlocked('veteran_training')) return;

  for (const inhabitant of state.world.inhabitants) {
    if (inhabitant.assignedRoomId) {
      inhabitant.veteranTicks = (inhabitant.veteranTicks ?? 0) + numTicks;
    } else if (inhabitant.veteranTicks) {
      inhabitant.veteranTicks = 0;
    }
  }
}

/** Get the veteran bonus level (days of continuous assignment, capped at 10). */
export function veteranTrainingGetLevel(veteranTicks: number | undefined): number {
  if (!veteranTicks || veteranTicks <= 0) return 0;
  const TICKS_PER_DAY = 1440;
  const VETERAN_CAP = 10;
  return Math.min(VETERAN_CAP, Math.floor(veteranTicks / TICKS_PER_DAY));
}
