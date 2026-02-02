import type { ReputationLevel, ReputationState, ReputationType } from '@interfaces';
import { REPUTATION_THRESHOLDS } from '@interfaces/reputation';

export function getReputationLevel(points: number): ReputationLevel {
  if (points >= REPUTATION_THRESHOLDS.legendary) return 'legendary';
  if (points >= REPUTATION_THRESHOLDS.high) return 'high';
  if (points >= REPUTATION_THRESHOLDS.medium) return 'medium';
  if (points >= REPUTATION_THRESHOLDS.low) return 'low';
  return 'none';
}

export function getReputation(
  state: ReputationState,
  type: ReputationType,
): number {
  return state[type];
}

export function addReputation(
  state: ReputationState,
  type: ReputationType,
  points: number,
): ReputationState {
  return {
    ...state,
    [type]: Math.max(0, state[type] + points),
  };
}

export function resetReputation(): ReputationState {
  return {
    terror: 0,
    wealth: 0,
    knowledge: 0,
    harmony: 0,
    chaos: 0,
  };
}

export function getReputationLevelLabel(level: ReputationLevel): string {
  const labels: Record<ReputationLevel, string> = {
    none: 'None',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    legendary: 'Legendary',
  };
  return labels[level];
}
