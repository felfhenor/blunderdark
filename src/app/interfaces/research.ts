import type { ResourceCost } from '@interfaces/resource';

export type ResearchBranch = 'dark' | 'arcane' | 'engineering';

export type ResearchNode = {
  id: string;
  name: string;
  description: string;
  branch: ResearchBranch;
  cost: ResourceCost;
  prerequisiteResearchIds: string[];
  unlocks: string[];
  tier: number;
  requiredTicks: number;
};

export type ResearchTree = {
  dark: ResearchNode[];
  arcane: ResearchNode[];
  engineering: ResearchNode[];
};

export type ResearchState = {
  completedNodes: string[];
  activeResearch: string | undefined;
  activeResearchProgress: number;
  activeResearchStartTick: number;
};
