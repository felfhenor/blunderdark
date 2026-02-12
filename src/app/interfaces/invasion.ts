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
