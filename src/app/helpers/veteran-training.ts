import { connectivityGetDisconnectedRoomIds } from '@helpers/connectivity';
import { researchUnlockIsFeatureUnlocked } from '@helpers/research-unlocks';
import type { GameState, PlacedRoomId } from '@interfaces';

/**
 * Process veteran training: increment veteranTicks for assigned inhabitants.
 * Resets veteranTicks when an inhabitant becomes unassigned.
 * Inhabitants in disconnected rooms do not gain veteran ticks.
 * Only active when the veteran_training feature flag is unlocked.
 */
export function veteranTrainingProcess(
  state: GameState,
  numTicks: number,
): void {
  if (!researchUnlockIsFeatureUnlocked('veteran_training')) return;

  // Collect all disconnected room IDs across all floors
  const allDisconnected = new Set<PlacedRoomId>();
  for (const floor of state.world.floors) {
    const disconnected = connectivityGetDisconnectedRoomIds(floor, state.world.floors);
    for (const id of disconnected) {
      allDisconnected.add(id);
    }
  }

  for (const inhabitant of state.world.inhabitants) {
    if (inhabitant.assignedRoomId && !allDisconnected.has(inhabitant.assignedRoomId)) {
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
