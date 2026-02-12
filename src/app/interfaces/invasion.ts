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
