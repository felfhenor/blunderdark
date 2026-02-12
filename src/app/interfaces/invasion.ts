export type SpecialInvasionType = 'crusade' | 'raid' | 'bounty_hunter';

export type InvasionHistoryEntry = {
  day: number;
  type: 'scheduled' | SpecialInvasionType;
};

export type PendingSpecialInvasion = {
  type: SpecialInvasionType;
  triggerDay: number;
};

export type InvasionSchedule = {
  nextInvasionDay: number | null;
  nextInvasionVariance: number;
  gracePeriodEnd: number;
  invasionHistory: InvasionHistoryEntry[];
  pendingSpecialInvasions: PendingSpecialInvasion[];
  warningActive: boolean;
  warningDismissed: boolean;
};

// --- Composition types ---

import type { InvaderClassType } from '@interfaces/invader';

export type InvaderClassWeights = Record<InvaderClassType, number>;

export type CompositionWeightConfig = {
  id: string;
  name: string;
  balanced: InvaderClassWeights;
  highCorruption: InvaderClassWeights;
  highWealth: InvaderClassWeights;
  highKnowledge: InvaderClassWeights;
};

export type DungeonProfile = {
  corruption: number;
  wealth: number;
  knowledge: number;
  size: number;
  threatLevel: number;
};

// --- Win/Loss types ---

import type { InvaderInstance } from '@interfaces/invader';
import type { InvasionObjective } from '@interfaces/invasion-objective';

export type InvasionEndReason =
  | 'all_invaders_eliminated'
  | 'turn_limit_reached'
  | 'altar_destroyed'
  | 'objectives_completed';

export type InvasionState = {
  invasionId: string;
  currentTurn: number;
  maxTurns: number;
  altarHp: number;
  altarMaxHp: number;
  invaders: InvaderInstance[];
  objectives: InvasionObjective[];
  defenderCount: number;
  defendersLost: number;
  invadersKilled: number;
  isActive: boolean;
};

export type DetailedInvasionResult = {
  invasionId: string;
  day: number;
  outcome: 'victory' | 'defeat';
  endReason: InvasionEndReason;
  turnsTaken: number;
  invaderCount: number;
  invadersKilled: number;
  defenderCount: number;
  defendersLost: number;
  objectivesCompleted: number;
  objectivesTotal: number;
  rewardMultiplier: number;
};

// --- Rewards types ---

import type { InvaderStats } from '@interfaces/invader';
import type { ResourceType } from '@interfaces/resource';

export type DefenseRewards = {
  reputationGain: number;
  experienceGain: number;
  goldGain: number;
  resourceGains: Partial<Record<ResourceType, number>>;
  capturedPrisoners: CapturedPrisoner[];
};

export type DefensePenalties = {
  reputationLoss: number;
  goldLost: number;
  resourceLosses: Partial<Record<ResourceType, number>>;
  killedInhabitantIds: string[];
};

export type CapturedPrisoner = {
  id: string;
  invaderClass: InvaderClassType;
  name: string;
  stats: InvaderStats;
  captureDay: number;
};

export type PrisonerAction =
  | 'execute'
  | 'ransom'
  | 'convert'
  | 'sacrifice'
  | 'experiment';

export type PrisonerHandlingResult = {
  action: PrisonerAction;
  success: boolean;
  resourceChanges: Partial<Record<ResourceType, number>>;
  reputationChange: number;
  corruptionChange: number;
  fearChange: number;
};
