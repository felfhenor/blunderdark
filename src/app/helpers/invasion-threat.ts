import type { DetailedInvasionResult, GameState } from '@interfaces';

// --- Constants ---

export const THREAT_MIN = 0;
export const THREAT_MAX = 100;
export const THREAT_DECAY_PER_DAY = 0.2;
export const DAY_THREAT_WEIGHT = 0.5;
export const PLAYER_THREAT_WEIGHT = 0.5;
export const THREAT_VICTORY_MAX_GAIN = 15;
export const THREAT_VICTORY_MIN_GAIN = 3;
export const THREAT_DEFEAT_MAX_LOSS = 20;
export const THREAT_DEFEAT_MIN_LOSS = 10;
export const THREAT_STAT_BONUS_MAX_PERCENT = 0.25;
export const THREAT_PARTY_SIZE_MAX_BONUS = 4;
export const THREAT_INTERVAL_MAX_REDUCTION = 3;

// --- Pure functions ---

/**
 * Calculate a 0–1 composite performance score from a detailed invasion result.
 * Components: kill ratio (0.3), speed (0.2), defender survival (0.3), objectives prevented (0.2).
 */
export function invasionThreatCalculatePerformanceScore(
  result: DetailedInvasionResult,
): number {
  const killRatio =
    result.invaderCount > 0
      ? result.invadersKilled / result.invaderCount
      : 0;

  const speed =
    result.invaderCount > 0
      ? Math.max(0, 1 - result.turnsTaken / (result.invaderCount * 10))
      : 0;

  const defenderSurvival =
    result.defenderCount > 0
      ? 1 - result.defendersLost / result.defenderCount
      : 1;

  const objectivesPrevented =
    result.objectivesTotal > 0
      ? 1 - result.objectivesCompleted / result.objectivesTotal
      : 1;

  const score =
    killRatio * 0.3 +
    speed * 0.2 +
    defenderSurvival * 0.3 +
    objectivesPrevented * 0.2;

  return Math.max(0, Math.min(1, score));
}

/**
 * Calculate the threat adjustment for a victory or defeat.
 * Victory: lerp from MIN_GAIN to MAX_GAIN based on performance.
 * Defeat: lerp from -MIN_LOSS to -MAX_LOSS based on (1 - performance).
 */
export function invasionThreatCalculateAdjustment(
  performanceScore: number,
  outcome: 'victory' | 'defeat',
): number {
  if (outcome === 'victory') {
    return THREAT_VICTORY_MIN_GAIN +
      (THREAT_VICTORY_MAX_GAIN - THREAT_VICTORY_MIN_GAIN) * performanceScore;
  }

  const severityFactor = 1 - performanceScore;
  return -(
    THREAT_DEFEAT_MIN_LOSS +
    (THREAT_DEFEAT_MAX_LOSS - THREAT_DEFEAT_MIN_LOSS) * severityFactor
  );
}

/**
 * Apply daily threat decay. Returns the new threat level.
 */
export function invasionThreatApplyDecay(
  currentThreat: number,
  days: number,
): number {
  return Math.max(THREAT_MIN, currentThreat - THREAT_DECAY_PER_DAY * days);
}

/**
 * Blend day-based threat and player threat into a unified score.
 */
export function invasionThreatBlend(
  dayThreat: number,
  playerThreat: number,
): number {
  return Math.min(
    THREAT_MAX,
    Math.round(dayThreat * DAY_THREAT_WEIGHT + playerThreat * PLAYER_THREAT_WEIGHT),
  );
}

/**
 * Get the stat bonus multiplier (0 to STAT_BONUS_MAX_PERCENT) for a given threat level.
 */
export function invasionThreatGetStatBonus(threatLevel: number): number {
  return THREAT_STAT_BONUS_MAX_PERCENT * (threatLevel / THREAT_MAX);
}

/**
 * Get the extra invader count bonus for a given threat level.
 */
export function invasionThreatGetPartySizeBonus(threatLevel: number): number {
  return Math.floor(THREAT_PARTY_SIZE_MAX_BONUS * threatLevel / THREAT_MAX);
}

/**
 * Get the interval reduction (in days) for a given threat level.
 */
export function invasionThreatGetIntervalReduction(
  threatLevel: number,
): number {
  return Math.floor(THREAT_INTERVAL_MAX_REDUCTION * threatLevel / THREAT_MAX);
}

// --- Decay process (gameloop integration) ---

let threatLastProcessedDay = 0;

export function invasionThreatResetProcessedDay(): void {
  threatLastProcessedDay = 0;
}

/**
 * Daily decay process for player threat. Called from the gameloop.
 * Follows the seasonProcess pattern: processes once per day.
 */
export function invasionThreatDecayProcess(state: GameState): void {
  const currentDay = state.clock.day;

  if (currentDay <= threatLastProcessedDay) return;
  threatLastProcessedDay = currentDay;

  state.world.playerThreat = invasionThreatApplyDecay(
    state.world.playerThreat,
    1,
  );
}
