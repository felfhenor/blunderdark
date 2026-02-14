import type { Branded } from '@interfaces/identifiable';

export type ReputationType =
  | 'terror'
  | 'wealth'
  | 'knowledge'
  | 'harmony'
  | 'chaos';

export type ReputationLevel =
  | 'none'
  | 'low'
  | 'medium'
  | 'high'
  | 'legendary';

export type ReputationState = Record<ReputationType, number>;

export const REPUTATION_THRESHOLDS: Record<ReputationLevel, number> = {
  none: 0,
  low: 50,
  medium: 150,
  high: 350,
  legendary: 700,
};

/**
 * Defines a game action that awards reputation points.
 * Loaded from gamedata/reputationaction/ YAML files.
 */
export type ReputationAction = {
  id: Branded<string, 'ReputationActionId'>;
  name: string;
  description: string;
  reputationRewards: Partial<Record<ReputationType, number>>;
};

/**
 * Event emitted when reputation is awarded for an action.
 */
export type ReputationAwardEvent = {
  actionId: Branded<string, 'ReputationActionId'>;
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
