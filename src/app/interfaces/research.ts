import type { ResourceCost } from '@interfaces/resource';

export type ResearchBranch = 'dark' | 'arcane' | 'engineering';

export type UnlockEffectType =
  | 'room'
  | 'inhabitant'
  | 'ability'
  | 'upgrade'
  | 'passive_bonus';

export type RoomUnlock = {
  type: 'room';
  targetId: string;
};

export type InhabitantUnlock = {
  type: 'inhabitant';
  targetId: string;
};

export type AbilityUnlock = {
  type: 'ability';
  targetId: string;
};

export type UpgradeUnlock = {
  type: 'upgrade';
  targetId: string;
};

export type PassiveBonusUnlock = {
  type: 'passive_bonus';
  bonusType: string;
  value: number;
  description: string;
};

export type UnlockEffect =
  | RoomUnlock
  | InhabitantUnlock
  | AbilityUnlock
  | UpgradeUnlock
  | PassiveBonusUnlock;

export type ResearchNode = {
  id: string;
  name: string;
  description: string;
  branch: ResearchBranch;
  cost: ResourceCost;
  prerequisiteResearchIds: string[];
  unlocks: UnlockEffect[];
  tier: number;
  requiredTicks: number;
};

export type ResearchTree = {
  dark: ResearchNode[];
  arcane: ResearchNode[];
  engineering: ResearchNode[];
};

export type UnlockedContent = {
  rooms: string[];
  inhabitants: string[];
  abilities: string[];
  upgrades: string[];
  passiveBonuses: { bonusType: string; value: number; description: string }[];
};

export type ResearchState = {
  completedNodes: string[];
  activeResearch: string | undefined;
  activeResearchProgress: number;
  activeResearchStartTick: number;
  unlockedContent: UnlockedContent;
};
