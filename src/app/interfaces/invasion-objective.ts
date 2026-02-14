import type { Branded } from '@interfaces/identifiable';

export type InvasionObjectiveId = Branded<string, 'InvasionObjectiveId'>;

export type ObjectiveType =
  | 'DestroyAltar'
  | 'SlayMonster'
  | 'RescuePrisoner'
  | 'StealTreasure'
  | 'SealPortal'
  | 'DefileLibrary'
  | 'PlunderVault'
  | 'ScoutDungeon';

export type InvasionObjective = {
  id: InvasionObjectiveId;
  type: ObjectiveType;
  name: string;
  description: string;
  targetId: string | undefined;
  isPrimary: boolean;
  isCompleted: boolean;
  progress: number;
};

export type InvasionResult = {
  outcome: 'victory' | 'defeat';
  altarDestroyed: boolean;
  secondariesCompleted: number;
  secondariesTotal: number;
  rewardMultiplier: number;
};
