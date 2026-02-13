import { contentGetEntry } from '@helpers/content';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type {
  IsContentItem,
  ReputationAction,
  ReputationLevel,
  ReputationState,
  ReputationType,
} from '@interfaces';
import { REPUTATION_THRESHOLDS } from '@interfaces/reputation';
import { Subject } from 'rxjs';

/**
 * Event emitted when reputation is awarded for an action.
 */
export type ReputationAwardEvent = {
  actionId: string;
  actionName: string;
  rewards: Partial<Record<ReputationType, number>>;
};

/**
 * Event emitted when a reputation type crosses a level threshold.
 */
export type ReputationLevelUpEvent = {
  type: ReputationType;
  previousLevel: ReputationLevel;
  newLevel: ReputationLevel;
  points: number;
};

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
 * Awards reputation for a game action by looking up the action in gamedata.
 * Emits reputationAward$ event for UI feedback.
 * Emits reputationLevelUp$ event if any reputation type crosses a level threshold.
 *
 * @param actionId - The ID or name of the reputation action from gamedata
 * @returns true if the action was found and reputation was awarded, false otherwise
 */
export async function reputationAwardForAction(
  actionId: string,
): Promise<boolean> {
  const action = contentGetEntry<ReputationAction & IsContentItem>(actionId);
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
 * Get a reputation action by ID or name.
 */
export function reputationGetAction(
  actionIdOrName: string,
): (ReputationAction & IsContentItem) | undefined {
  return contentGetEntry<ReputationAction & IsContentItem>(actionIdOrName);
}
