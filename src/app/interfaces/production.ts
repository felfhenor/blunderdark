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
