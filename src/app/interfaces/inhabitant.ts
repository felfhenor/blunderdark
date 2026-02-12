import type { ResourceType } from '@interfaces/resource';

export type InhabitantTrait = {
  id: string;
  name: string;
  description: string;
  effectType: string;
  effectValue: number;
  targetResourceType?: string;
};

export type InhabitantStats = {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  workerEfficiency: number;
};

export type RulerBonuses = Record<string, number>;

export type InhabitantDefinition = {
  id: string;
  name: string;
  type: string;
  tier: number;
  description: string;
  cost: Partial<Record<ResourceType, number>>;
  stats: InhabitantStats;
  traits: InhabitantTrait[];
  restrictionTags: string[];
  rulerBonuses: RulerBonuses;
  rulerFearLevel: number;
};

export type InhabitantState = 'normal' | 'scared' | 'hungry';

export type TrainingBonuses = {
  defense: number;
  attack: number;
};

export type InhabitantInstance = {
  instanceId: string;
  definitionId: string;
  name: string;
  state: InhabitantState;
  assignedRoomId: string | null;
  trained?: boolean;
  trainingProgress?: number;
  trainingBonuses?: TrainingBonuses;
};
