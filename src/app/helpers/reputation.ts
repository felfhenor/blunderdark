import { contentGetEntriesByType, contentGetEntry } from '@helpers/content';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type {
  GameState,
  ReputationActionContent,
  ReputationActionType,
  ReputationLevel,
  ReputationState,
  ReputationType
} from '@interfaces';
import type {
  ReputationAwardEvent,
  ReputationLevelUpEvent,
} from '@interfaces/reputation';
import { REPUTATION_THRESHOLDS } from '@interfaces/reputation';
import { Subject } from 'rxjs';

const reputationAward = new Subject<ReputationAwardEvent>();
export const reputationAward$ = reputationAward.asObservable();

const reputationLevelUp = new Subject<ReputationLevelUpEvent>();
export const reputationLevelUp$ = reputationLevelUp.asObservable();

export function reputationGetLevel(points: number): ReputationLevel {
  if (points >= REPUTATION_THRESHOLDS.legendary) return 'legendary';
  if (points >= REPUTATION_THRESHOLDS.high) return 'high';
  if (points >= REPUTATION_THRESHOLDS.medium) return 'medium';
  if (points >= REPUTATION_THRESHOLDS.low) return 'low';
  return 'none';
}

export function reputationGet(
  state: ReputationState,
  type: ReputationType,
): number {
  return state[type];
}

export function reputationAdd(
  state: ReputationState,
  type: ReputationType,
  points: number,
): ReputationState {
  return {
    ...state,
    [type]: Math.max(0, state[type] + points),
  };
}

export function reputationReset(): ReputationState {
  return {
    terror: 0,
    wealth: 0,
    knowledge: 0,
    harmony: 0,
    chaos: 0,
  };
}

export function reputationGetLevelLabel(level: ReputationLevel): string {
  const labels: Record<ReputationLevel, string> = {
    none: 'None',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    legendary: 'Legendary',
  };
  return labels[level];
}

/**
 * Find a reputation action by its actionType.
 */
function findActionByType(
  actionType: ReputationActionType,
): ReputationActionContent | undefined {
  const all =
    contentGetEntriesByType<ReputationActionContent>('reputationaction');
  return all.find((a) => a.actionType === actionType);
}

/**
 * Awards reputation for a game action by looking up the action in gamedata.
 * Emits reputationAward$ event for UI feedback.
 * Emits reputationLevelUp$ event if any reputation type crosses a level threshold.
 *
 * @param actionType - The strongly-typed action type from gamedata
 * @returns true if the action was found and reputation was awarded, false otherwise
 */
export async function reputationAwardForAction(
  actionType: ReputationActionType,
): Promise<boolean> {
  const action = findActionByType(actionType);
  if (!action) {
    return false;
  }

  const rewards = action.reputationRewards;
  if (!rewards || Object.keys(rewards).length === 0) {
    return false;
  }

  const currentState = gamestate().world.reputation;
  const levelUpEvents: ReputationLevelUpEvent[] = [];

  // Check for level-ups before applying rewards
  for (const [type, points] of Object.entries(rewards) as [
    ReputationType,
    number,
  ][]) {
    const previousPoints = currentState[type];
    const newPoints = Math.max(0, previousPoints + points);
    const previousLevel = reputationGetLevel(previousPoints);
    const newLevel = reputationGetLevel(newPoints);

    if (newLevel !== previousLevel) {
      levelUpEvents.push({
        type,
        previousLevel,
        newLevel,
        points: newPoints,
      });
    }
  }

  // Apply all reputation changes
  await updateGamestate((state) => {
    let newReputation = { ...state.world.reputation };
    for (const [type, points] of Object.entries(rewards) as [
      ReputationType,
      number,
    ][]) {
      newReputation = reputationAdd(newReputation, type, points);
    }
    return {
      ...state,
      world: {
        ...state.world,
        reputation: newReputation,
      },
    };
  });

  // Emit award event
  reputationAward.next({
    actionId: action.id,
    actionName: action.name,
    rewards,
  });

  // Emit level-up events
  for (const event of levelUpEvents) {
    reputationLevelUp.next(event);
  }

  return true;
}

/**
 * Awards reputation for a game action by mutating state in-place.
 * For use inside updateGamestate callbacks (gameloop process functions).
 * Emits reputationAward$ and reputationLevelUp$ events.
 *
 * @param state - The game state to mutate
 * @param actionType - The strongly-typed action type from gamedata
 * @returns true if the action was found and reputation was awarded
 */
export function reputationAwardInPlace(
  state: GameState,
  actionType: ReputationActionType,
): boolean {
  const action = findActionByType(actionType);
  if (!action) return false;

  const rewards = action.reputationRewards;
  if (!rewards || Object.keys(rewards).length === 0) return false;

  const levelUpEvents: ReputationLevelUpEvent[] = [];

  // Check for level-ups before applying rewards
  for (const [type, points] of Object.entries(rewards) as [
    ReputationType,
    number,
  ][]) {
    const previousPoints = state.world.reputation[type];
    const newPoints = Math.max(0, previousPoints + points);
    const previousLevel = reputationGetLevel(previousPoints);
    const newLevel = reputationGetLevel(newPoints);

    if (newLevel !== previousLevel) {
      levelUpEvents.push({ type, previousLevel, newLevel, points: newPoints });
    }
  }

  // Apply changes in-place
  for (const [type, points] of Object.entries(rewards) as [
    ReputationType,
    number,
  ][]) {
    state.world.reputation[type] = Math.max(
      0,
      state.world.reputation[type] + points,
    );
  }

  // Emit events
  reputationAward.next({
    actionId: action.id,
    actionName: action.name,
    rewards,
  });

  for (const event of levelUpEvents) {
    reputationLevelUp.next(event);
  }

  return true;
}

/**
 * Awards reputation by ID or name (for data-driven paths like room placement).
 * Use reputationAwardInPlace or reputationAwardForAction for code-driven triggers.
 */
export function reputationAwardByIdInPlace(
  state: GameState,
  actionIdOrName: string,
): boolean {
  const action = contentGetEntry<ReputationActionContent>(actionIdOrName);
  if (!action) return false;

  const rewards = action.reputationRewards;
  if (!rewards || Object.keys(rewards).length === 0) return false;

  const levelUpEvents: ReputationLevelUpEvent[] = [];

  for (const [type, points] of Object.entries(rewards) as [
    ReputationType,
    number,
  ][]) {
    const previousPoints = state.world.reputation[type];
    const newPoints = Math.max(0, previousPoints + points);
    const previousLevel = reputationGetLevel(previousPoints);
    const newLevel = reputationGetLevel(newPoints);

    if (newLevel !== previousLevel) {
      levelUpEvents.push({ type, previousLevel, newLevel, points: newPoints });
    }
  }

  for (const [type, points] of Object.entries(rewards) as [
    ReputationType,
    number,
  ][]) {
    state.world.reputation[type] = Math.max(
      0,
      state.world.reputation[type] + points,
    );
  }

  reputationAward.next({
    actionId: action.id,
    actionName: action.name,
    rewards,
  });

  for (const event of levelUpEvents) {
    reputationLevelUp.next(event);
  }

  return true;
}

/**
 * Awards reputation by ID or name (async, for data-driven paths like room placement).
 */
export async function reputationAwardByIdForAction(
  actionIdOrName: string,
): Promise<boolean> {
  const action = contentGetEntry<ReputationActionContent>(actionIdOrName);
  if (!action) return false;

  const rewards = action.reputationRewards;
  if (!rewards || Object.keys(rewards).length === 0) return false;

  const currentState = gamestate().world.reputation;
  const levelUpEvents: ReputationLevelUpEvent[] = [];

  for (const [type, points] of Object.entries(rewards) as [
    ReputationType,
    number,
  ][]) {
    const previousPoints = currentState[type];
    const newPoints = Math.max(0, previousPoints + points);
    const previousLevel = reputationGetLevel(previousPoints);
    const newLevel = reputationGetLevel(newPoints);

    if (newLevel !== previousLevel) {
      levelUpEvents.push({ type, previousLevel, newLevel, points: newPoints });
    }
  }

  await updateGamestate((state) => {
    let newReputation = { ...state.world.reputation };
    for (const [type, points] of Object.entries(rewards) as [
      ReputationType,
      number,
    ][]) {
      newReputation = reputationAdd(newReputation, type, points);
    }
    return {
      ...state,
      world: {
        ...state.world,
        reputation: newReputation,
      },
    };
  });

  reputationAward.next({
    actionId: action.id,
    actionName: action.name,
    rewards,
  });

  for (const event of levelUpEvents) {
    reputationLevelUp.next(event);
  }

  return true;
}

/**
 * Get a reputation action by ID or name.
 */
export function reputationGetAction(
  actionIdOrName: string,
): (ReputationActionContent) | undefined {
  return contentGetEntry<ReputationActionContent>(
    actionIdOrName,
  );
}
