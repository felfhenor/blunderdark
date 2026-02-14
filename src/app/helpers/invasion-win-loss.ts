import { invasionObjectiveResolveOutcome } from '@helpers/invasion-objectives';
import { moraleIsRetreating } from '@helpers/morale';
import { rngUuid } from '@helpers/rng';
import type { InvasionId } from '@interfaces/content-invasion';
import type { InvaderInstance } from '@interfaces/invader';
import type {
  DetailedInvasionResult,
  InvasionEndReason,
  InvasionState,
} from '@interfaces/invasion';
import type { InvasionObjective } from '@interfaces/invasion-objective';

// --- Constants ---

export const INVASION_WIN_LOSS_ALTAR_MAX_HP = 100;
export const INVASION_WIN_LOSS_MAX_TURNS = 30;
export const INVASION_WIN_LOSS_SECONDARY_OBJECTIVES_FOR_VICTORY = 2;

// --- State creation ---

/**
 * Create initial invasion state for a new invasion.
 */
export function invasionWinLossCreateState(
  invaders: InvaderInstance[],
  objectives: InvasionObjective[],
  defenderCount: number,
): InvasionState {
  return {
    invasionId: rngUuid<InvasionId>(),
    currentTurn: 0,
    maxTurns: INVASION_WIN_LOSS_MAX_TURNS,
    altarHp: INVASION_WIN_LOSS_ALTAR_MAX_HP,
    altarMaxHp: INVASION_WIN_LOSS_ALTAR_MAX_HP,
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
export function invasionWinLossAreAllEliminated(state: InvasionState): boolean {
  return state.invaders.every((i) => i.currentHp <= 0);
}

/**
 * Check if the altar has been destroyed (HP <= 0).
 */
export function invasionWinLossIsAltarDestroyed(state: InvasionState): boolean {
  return state.altarHp <= 0;
}

/**
 * Check if invaders completed enough secondary objectives to win.
 * Requires INVASION_WIN_LOSS_SECONDARY_OBJECTIVES_FOR_VICTORY (2) completed secondaries.
 */
export function invasionWinLossAreSecondaryObjectivesCompleted(
  state: InvasionState,
): boolean {
  const secondaries = state.objectives.filter((o) => !o.isPrimary);
  const completedCount = secondaries.filter((o) => o.isCompleted).length;
  return completedCount >= INVASION_WIN_LOSS_SECONDARY_OBJECTIVES_FOR_VICTORY;
}

/**
 * Check if the turn limit has been reached.
 */
export function invasionWinLossIsTurnLimitReached(
  state: InvasionState,
): boolean {
  return state.currentTurn >= state.maxTurns;
}

/**
 * Check if invader morale has broken (retreat signal active and all alive invaders retreating).
 * Reads the moraleIsRetreating signal. For pure function testing, use the parameter override.
 */
export function invasionWinLossIsMoraleBroken(
  state: InvasionState,
  retreating?: boolean,
): boolean {
  const isRetreating = retreating ?? moraleIsRetreating();
  if (!isRetreating) return false;

  // Morale broken — check if all living invaders have exited (HP <= 0 means killed or exited)
  return state.invaders.every((i) => i.currentHp <= 0);
}

// --- Main win/loss check ---

/**
 * Check if the invasion should end. Returns the end reason, or undefined if ongoing.
 * Priority: altar destroyed > objectives completed > morale broken > all invaders eliminated > turn limit.
 */
export function invasionWinLossCheckEnd(
  state: InvasionState,
): InvasionEndReason | undefined {
  if (!state.isActive) return undefined;

  // Invader victory conditions (checked first — losing takes priority)
  if (invasionWinLossIsAltarDestroyed(state)) return 'altar_destroyed';
  if (invasionWinLossAreSecondaryObjectivesCompleted(state))
    return 'objectives_completed';

  // Defender victory conditions
  if (invasionWinLossAreAllEliminated(state)) return 'all_invaders_eliminated';
  if (invasionWinLossIsMoraleBroken(state)) return 'morale_broken';
  if (invasionWinLossIsTurnLimitReached(state)) return 'turn_limit_reached';

  return undefined;
}

// --- State mutations (pure, return new state) ---

/**
 * Apply damage to the altar. Clamps HP to 0 minimum.
 * Returns a new InvasionState (does not mutate).
 */
export function invasionWinLossDamageAltar(
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
export function invasionWinLossAdvanceTurn(
  state: InvasionState,
): InvasionState {
  return {
    ...state,
    currentTurn: state.currentTurn + 1,
  };
}

/**
 * Mark an invader as killed (HP set to 0) and increment kill counter.
 * Returns a new InvasionState (does not mutate).
 */
export function invasionWinLossMarkKilled(
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
export function invasionWinLossRecordDefenderLoss(
  state: InvasionState,
): InvasionState {
  return {
    ...state,
    defendersLost: state.defendersLost + 1,
  };
}

/**
 * End the invasion (mark as inactive).
 * Returns a new InvasionState (does not mutate).
 */
export function invasionWinLossEnd(state: InvasionState): InvasionState {
  return {
    ...state,
    isActive: false,
  };
}

// --- Result resolution ---

/**
 * Resolve the final detailed result for an invasion.
 * Uses invasionObjectiveResolveOutcome from objectives system for reward multiplier.
 */
export function invasionWinLossResolveDetailedResult(
  state: InvasionState,
  day: number,
  endReason: InvasionEndReason,
): DetailedInvasionResult {
  const objectiveResult = invasionObjectiveResolveOutcome(state.objectives);
  const secondaries = state.objectives.filter((o) => !o.isPrimary);
  const completedSecondaries = secondaries.filter((o) => o.isCompleted).length;

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
export function invasionWinLossCreateHistoryEntry(
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
