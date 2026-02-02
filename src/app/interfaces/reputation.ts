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
