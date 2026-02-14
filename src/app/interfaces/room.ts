import type { Branded } from '@interfaces/identifiable';
import type { ResourceCost } from '@interfaces/resource';

export type RoomProduction = Partial<Record<string, number>>;

export type AdjacencyBonus = {
  adjacentRoomType: string;
  bonus: number;
  description: string;
};

export type RoomUpgradeEffect = {
  type: string;
  value: number;
  resource?: string;
};

export type UpgradePathId = Branded<string, 'UpgradePathId'>;

export type RoomUpgradePath = {
  id: UpgradePathId;
  name: string;
  description: string;
  cost: ResourceCost;
  effects: RoomUpgradeEffect[];
  upgradeLevel?: number;
  requiresDarkUpgrade?: boolean;
};

