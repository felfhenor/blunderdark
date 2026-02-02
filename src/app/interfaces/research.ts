import type { ResourceCost } from '@interfaces/resource';

export type ResearchBranch = 'dark' | 'arcane' | 'engineering';

export type ResearchNode = {
  id: string;
  name: string;
  description: string;
  branch: ResearchBranch;
  cost: ResourceCost;
  prerequisites: string[];
  unlocks: string[];
  tier: number;
};

export type ResearchTree = {
  dark: ResearchNode[];
  arcane: ResearchNode[];
  engineering: ResearchNode[];
};

export type ResearchState = {
  completedNodes: string[];
  activeResearch: string | null;
  activeResearchProgress: number;
  activeResearchStartTick: number;
};
