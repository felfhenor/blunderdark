import { resolveInvasionOutcome } from '@helpers/invasion-objectives';
import { rngUuid } from '@helpers/rng';
import type {
  DetailedInvasionResult,
  InvasionEndReason,
  InvasionState,
} from '@interfaces/invasion';
import type { InvaderInstance } from '@interfaces/invader';
import type { InvasionObjective } from '@interfaces/invasion-objective';

// --- Constants ---

export const ALTAR_MAX_HP = 100;
export const MAX_INVASION_TURNS = 30;
export const SECONDARY_OBJECTIVES_FOR_VICTORY = 2;

// --- State creation ---

/**
 * Create initial invasion state for a new invasion.
 */
export function createInvasionState(
  invaders: InvaderInstance[],
  objectives: InvasionObjective[],
  defenderCount: number,
): InvasionState {
  return {
    invasionId: rngUuid(),
    currentTurn: 0,
    maxTurns: MAX_INVASION_TURNS,
    altarHp: ALTAR_MAX_HP,
    altarMaxHp: ALTAR_MAX_HP,
    invaders: [...invaders],
    objectives: [...objectives],
    defenderCount,
    defendersLost: 0,
    invadersKilled: 0,
    isActive: true,
  };
}

// --- Condition checks ---

/**
 * Check if all invaders are eliminated (dead: HP <= 0).
 */
export function areAllInvadersEliminated(state: InvasionState): boolean {
  return state.invaders.every((i) => i.currentHp <= 0);
}

/**
 * Check if the altar has been destroyed (HP <= 0).
 */
export function isAltarDestroyed(state: InvasionState): boolean {
  return state.altarHp <= 0;
}

/**
 * Check if invaders completed enough secondary objectives to win.
 * Requires SECONDARY_OBJECTIVES_FOR_VICTORY (2) completed secondaries.
 */
export function areSecondaryObjectivesCompleted(
  state: InvasionState,
): boolean {
  const secondaries = state.objectives.filter((o) => !o.isPrimary);
  const completedCount = secondaries.filter((o) => o.isCompleted).length;
  return completedCount >= SECONDARY_OBJECTIVES_FOR_VICTORY;
}

/**
 * Check if the turn limit has been reached.
 */
export function isTurnLimitReached(state: InvasionState): boolean {
  return state.currentTurn >= state.maxTurns;
}

// --- Main win/loss check ---

/**
 * Check if the invasion should end. Returns the end reason, or undefined if ongoing.
 * Priority: altar destroyed > objectives completed > all invaders eliminated > turn limit.
 */
export function checkInvasionEnd(
  state: InvasionState,
): InvasionEndReason | undefined {
  if (!state.isActive) return undefined;

  // Invader victory conditions (checked first — losing takes priority)
  if (isAltarDestroyed(state)) return 'altar_destroyed';
  if (areSecondaryObjectivesCompleted(state)) return 'objectives_completed';

  // Defender victory conditions
  if (areAllInvadersEliminated(state)) return 'all_invaders_eliminated';
  if (isTurnLimitReached(state)) return 'turn_limit_reached';

  return undefined;
}

// --- State mutations (pure, return new state) ---

/**
 * Apply damage to the altar. Clamps HP to 0 minimum.
 * Returns a new InvasionState (does not mutate).
 */
export function damageAltar(
  state: InvasionState,
  damage: number,
): InvasionState {
  const newHp = Math.max(0, state.altarHp - damage);
  const altarObjective = state.objectives.find(
    (o) => o.type === 'DestroyAltar',
  );

  const updatedObjectives = state.objectives.map((o) => {
    if (o.type !== 'DestroyAltar') return o;
    const progress = Math.round(
      ((state.altarMaxHp - newHp) / state.altarMaxHp) * 100,
    );
    return { ...o, progress, isCompleted: newHp <= 0 };
  });

  return {
    ...state,
    altarHp: newHp,
    objectives: altarObjective ? updatedObjectives : state.objectives,
  };
}

/**
 * Advance the invasion turn counter by 1.
 * Returns a new InvasionState (does not mutate).
 */
export function advanceInvasionTurn(state: InvasionState): InvasionState {
  return {
    ...state,
    currentTurn: state.currentTurn + 1,
  };
}

/**
 * Mark an invader as killed (HP set to 0) and increment kill counter.
 * Returns a new InvasionState (does not mutate).
 */
export function markInvaderKilled(
  state: InvasionState,
  invaderId: string,
): InvasionState {
  const invader = state.invaders.find((i) => i.id === invaderId);
  if (!invader || invader.currentHp <= 0) return state;

  return {
    ...state,
    invaders: state.invaders.map((i) =>
      i.id === invaderId ? { ...i, currentHp: 0 } : i,
    ),
    invadersKilled: state.invadersKilled + 1,
  };
}

/**
 * Record a defender loss.
 * Returns a new InvasionState (does not mutate).
 */
export function recordDefenderLoss(state: InvasionState): InvasionState {
  return {
    ...state,
    defendersLost: state.defendersLost + 1,
  };
}

/**
 * End the invasion (mark as inactive).
 * Returns a new InvasionState (does not mutate).
 */
export function endInvasion(state: InvasionState): InvasionState {
  return {
    ...state,
    isActive: false,
  };
}

// --- Result resolution ---

/**
 * Resolve the final detailed result for an invasion.
 * Uses resolveInvasionOutcome from objectives system for reward multiplier.
 */
export function resolveDetailedResult(
  state: InvasionState,
  day: number,
  endReason: InvasionEndReason,
): DetailedInvasionResult {
  const objectiveResult = resolveInvasionOutcome(state.objectives);
  const secondaries = state.objectives.filter((o) => !o.isPrimary);
  const completedSecondaries = secondaries.filter(
    (o) => o.isCompleted,
  ).length;

  return {
    invasionId: state.invasionId,
    day,
    outcome: objectiveResult.outcome,
    endReason,
    turnsTaken: state.currentTurn,
    invaderCount: state.invaders.length,
    invadersKilled: state.invadersKilled,
    defenderCount: state.defenderCount,
    defendersLost: state.defendersLost,
    objectivesCompleted: completedSecondaries,
    objectivesTotal: secondaries.length,
    rewardMultiplier: objectiveResult.rewardMultiplier,
  };
}

/**
 * Append a detailed result to the invasion schedule's history.
 * Returns a new history entry for the schedule system.
 */
export function createHistoryEntry(
  result: DetailedInvasionResult,
): {
  day: number;
  type: 'scheduled';
  outcome: 'victory' | 'defeat';
  endReason: InvasionEndReason;
  invaderCount: number;
  invadersKilled: number;
  defenderCount: number;
  defendersLost: number;
  turnsTaken: number;
} {
  return {
    day: result.day,
    type: 'scheduled',
    outcome: result.outcome,
    endReason: result.endReason,
    invaderCount: result.invaderCount,
    invadersKilled: result.invadersKilled,
    defenderCount: result.defenderCount,
    defendersLost: result.defendersLost,
    turnsTaken: result.turnsTaken,
  };
}
