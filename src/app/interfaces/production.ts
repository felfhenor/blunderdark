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
