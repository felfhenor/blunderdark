import type { ResourceType } from '@interfaces/resource';

export type InhabitantTrait = {
  id: string;
  name: string;
  description: string;
  effectType: string;
  effectValue: number;
};

export type InhabitantStats = {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  workerEfficiency: number;
};

export type InhabitantDefinition = {
  id: string;
  name: string;
  type: string;
  tier: number;
  description: string;
  cost: Partial<Record<ResourceType, number>>;
  stats: InhabitantStats;
  traits: InhabitantTrait[];
};

export type InhabitantState = 'normal' | 'scared' | 'hungry';

export type InhabitantInstance = {
  instanceId: string;
  definitionId: string;
  name: string;
  state: InhabitantState;
  assignedRoomId: string | null;
};
