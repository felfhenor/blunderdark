import type { VictoryPathId } from '@interfaces/content-victorypath';

export type VictoryConditionProgress = {
  conditionId: string;
  currentValue: number;
  met: boolean;
};

export type VictoryPathProgress = {
  pathId: VictoryPathId;
  conditions: VictoryConditionProgress[];
  complete: boolean;
};

export type VictoryProgress = {
  consecutivePeacefulDays: number;
  lastPeacefulCheckDay: number;
  consecutiveZeroCorruptionDays: number;
  lastZeroCorruptionCheckDay: number;
  totalInvasionDefenseWins: number;
  achievedVictoryPathId?: VictoryPathId;
  achievedVictoryDay?: number;
};
