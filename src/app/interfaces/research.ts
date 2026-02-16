import type { CombatAbilityId } from '@interfaces/content-combatability';
import type { InhabitantId } from '@interfaces/content-inhabitant';
import type { ResearchId } from '@interfaces/content-research';
import type { RoomId } from '@interfaces/content-room';
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

export type UnlockedContent = {
  rooms: RoomId[];
  inhabitants: InhabitantId[];
  abilities: CombatAbilityId[];
  upgrades: UpgradePathId[];
  passiveBonuses: { bonusType: string; value: number; description: string }[];
};

export type ResearchState = {
  completedNodes: ResearchId[];
  activeResearch: ResearchId | undefined;
  activeResearchProgress: number;
  activeResearchStartTick: number;
  unlockedContent: UnlockedContent;
};
