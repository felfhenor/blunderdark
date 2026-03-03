import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { ResourceType } from '@interfaces/resource';
import type { HasDescription } from '@interfaces/traits';

export type VictoryPathId = Branded<string, 'VictoryPathId'>;

export type VictoryReward = {
  resource: ResourceType;
  amount: number;
};

export type VictoryCheckType =
  | 'resource_threshold'
  | 'flag'
  | 'duration'
  | 'count';

export type VictoryCondition = {
  id: string;
  description: string;
  checkType: VictoryCheckType;
  target: number;
};

export type VictoryPathContent = IsContentItem &
  HasDescription & {
    id: VictoryPathId;
    conditions: VictoryCondition[];
    victoryReward: VictoryReward[];
  };
