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

export type RoomUpgradePath = {
  id: string;
  name: string;
  description: string;
  cost: ResourceCost;
  effects: RoomUpgradeEffect[];
  upgradeLevel?: number;
};

export type RoomDefinition = {
  id: string;
  name: string;
  description: string;
  shapeId: string;
  cost: ResourceCost;
  production: RoomProduction;
  requiresWorkers: boolean;
  adjacencyBonuses: AdjacencyBonus[];
  isUnique: boolean;
  removable: boolean;
  maxInhabitants: number;
  inhabitantRestriction: string | null;
  fearLevel: number | 'variable';
  fearReductionAura: number;
  upgradePaths: RoomUpgradePath[];
  autoPlace: boolean;
  role?: string;
  timeOfDayBonus?: { period: 'day' | 'night'; bonus: number };
  biomeBonuses?: Partial<Record<string, number>>;
  invasionProfile?: { dimension: string; weight: number };
  objectiveTypes?: string[];
  trainingAdjacencyEffects?: { timeReduction?: number; statBonus?: number };
  throneAdjacencyEffects?: { goldProductionBonus?: number };
};
