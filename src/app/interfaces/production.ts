export type InhabitantBonusResult = {
  bonus: number;
  hasWorkers: boolean;
};

export type ActiveAdjacencyBonus = {
  sourceRoomId: string;
  sourceRoomName: string;
  bonus: number;
  description: string;
};

export type ResourceProductionBreakdown = {
  base: number;
  inhabitantBonus: number;
  adjacencyBonus: number;
  modifierEffect: number;
  researchBonus: number;
  reputationBonus: number;
  final: number;
};

export type ResourceConsumptionBreakdown = {
  /** Per-tick food consumption from inhabitants (food resource only) */
  inhabitantFood: number;
  /** Per-tick legendary inhabitant upkeep */
  legendaryUpkeep: number;
  /** Per-tick feature maintenance cost */
  featureMaintenance: number;
  /** Per-tick total consumption */
  total: number;
};

export type ModifierDetail = {
  name: string;
  multiplier: number;
};

export type RoomProductionDetail = {
  roomId: string;
  roomName: string;
  floorDepth: number;
  base: number;
  inhabitantBonus: number;
  workerCount: number;
  adjacencyBonus: number;
  featureBonus: number;
  synergyBonus: number;
  researchBonus: number;
  reputationBonus: number;
  modifierEffect: number;
  modifierDetails: ModifierDetail[];
  flatFeatureProduction: number;
  upgradeSecondaryProduction: number;
  upgradeMultiplier: number;
  final: number;
};

export type ConsumptionDetail = {
  sourceName: string;
  category: 'feeding' | 'legendary_upkeep' | 'feature_maintenance' | 'alchemy_input';
  amount: number;
  roomName?: string;
};

export type AlchemyConversionDetail = {
  recipeName: string;
  roomName: string;
  floorDepth: number;
  perTick: number;
};

export type ResourceDetailedBreakdown = {
  production: RoomProductionDetail[];
  alchemyProduction: AlchemyConversionDetail[];
  consumption: ConsumptionDetail[];
  totals: {
    base: number;
    inhabitantBonus: number;
    adjacencyBonus: number;
    modifierEffect: number;
    totalProduction: number;
    alchemyProduction: number;
    totalConsumption: number;
    alchemyConsumption: number;
    net: number;
  };
};
