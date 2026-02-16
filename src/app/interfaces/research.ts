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
  targetRoomId: RoomId;
};

export type InhabitantUnlock = {
  type: 'inhabitant';
  targetInhabitantId: InhabitantId;
};

export type AbilityUnlock = {
  type: 'ability';
  targetCombatabilityId: CombatAbilityId;
};

export type UpgradeUnlock = {
  type: 'upgrade';
  targetUpgradepathId: UpgradePathId;
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

export function getUnlockTargetId(
  unlock: UnlockEffect,
): string | undefined {
  switch (unlock.type) {
    case 'room':
      return unlock.targetRoomId;
    case 'inhabitant':
      return unlock.targetInhabitantId;
    case 'ability':
      return unlock.targetCombatabilityId;
    case 'upgrade':
      return unlock.targetUpgradepathId;
    case 'passive_bonus':
      return undefined;
  }
}

export type ResearchState = {
  completedNodes: ResearchId[];
  activeResearch: ResearchId | undefined;
  activeResearchProgress: number;
  activeResearchStartTick: number;
  unlockedContent: UnlockedContent;
};
