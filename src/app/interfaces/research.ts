import type { CombatAbilityId } from '@interfaces/content-combatability';
import type { InhabitantId } from '@interfaces/content-inhabitant';
import type { RoomId } from '@interfaces/content-room';
import type { Branded } from '@interfaces/identifiable';
import type { ResourceCost } from '@interfaces/resource';
import type { UpgradePathId } from '@interfaces/room';

export type ResearchBranch = 'dark' | 'arcane' | 'engineering';

export type UnlockEffectType =
  | 'room'
  | 'inhabitant'
  | 'ability'
  | 'upgrade'
  | 'passive_bonus';

export type RoomUnlock = {
  type: 'room';
  targetId: RoomId;
};

export type InhabitantUnlock = {
  type: 'inhabitant';
  targetId: InhabitantId;
};

export type AbilityUnlock = {
  type: 'ability';
  targetId: CombatAbilityId;
};

export type UpgradeUnlock = {
  type: 'upgrade';
  targetId: UpgradePathId;
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
  id: Branded<string, 'ResearchId'>;
  name: string;
  description: string;
  branch: ResearchBranch;
  cost: ResourceCost;
  prerequisiteResearchIds: Branded<string, 'ResearchId'>[];
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
  rooms: RoomId[];
  inhabitants: InhabitantId[];
  abilities: CombatAbilityId[];
  upgrades: UpgradePathId[];
  passiveBonuses: { bonusType: string; value: number; description: string }[];
};

export type ResearchState = {
  completedNodes: Branded<string, 'ResearchId'>[];
  activeResearch: Branded<string, 'ResearchId'> | undefined;
  activeResearchProgress: number;
  activeResearchStartTick: number;
  unlockedContent: UnlockedContent;
};
