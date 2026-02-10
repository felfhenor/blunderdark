import type { ResourceCost } from '@interfaces/resource';

export type RoomProduction = Partial<Record<string, number>>;

export type AdjacencyBonus = {
  adjacentRoomType: string;
  bonus: number;
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
  maxInhabitants: number;
  inhabitantRestriction: string | null;
  fearLevel: number | 'variable';
};
