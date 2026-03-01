import type { BiomeType } from '@interfaces/biome';
import type { CombatAbilityId } from '@interfaces/content-combatability';
import type { FeatureId } from '@interfaces/content-feature';
import type { InhabitantId } from '@interfaces/content-inhabitant';
import type { ResearchId } from '@interfaces/content-research';
import type { RoomId } from '@interfaces/content-room';
import type { RoomUpgradeId } from '@interfaces/content-roomupgrade';

export type ResearchBranch =
  | 'dark'
  | 'nether'
  | 'arcane'
  | 'engineering'
  | 'dominion'
  | 'architecture';

export type ResearchNodeState = 'completed' | 'active' | 'available' | 'locked';

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

export type RoomUpgradeUnlock = {
  type: 'roomupgrade';
  targetRoomupgradeId: RoomUpgradeId;
};

export type PassiveBonusUnlock = {
  type: 'passive_bonus';
  bonusType: string;
  value: number;
  description: string;
};

export type FeatureFlagUnlock = {
  type: 'feature_flag';
  featureFlag: string;
  description: string;
};

export type RoomFeatureUnlock = {
  type: 'roomfeature';
  targetFeatureId: FeatureId;
};

export type BiomeUnlock = {
  type: 'biome';
  targetBiome: BiomeType;
};

export type UnlockEffect =
  | RoomUnlock
  | InhabitantUnlock
  | AbilityUnlock
  | RoomUpgradeUnlock
  | PassiveBonusUnlock
  | FeatureFlagUnlock
  | RoomFeatureUnlock
  | BiomeUnlock;

/**
 * Content-targeting unlock types (i.e., those that reference a specific ID).
 * When adding a new UnlockEffect variant, add it here if it targets a content
 * ID or typed identifier (like BiomeType), and update all switch statements
 * that consume UnlockContentType (researchUnlockIsUnlocked, UNLOCK_LABELS, etc.).
 */
export type UnlockContentType = Extract<
  UnlockEffect,
  {
    type:
      | 'room'
      | 'inhabitant'
      | 'ability'
      | 'roomupgrade'
      | 'roomfeature'
      | 'biome';
  }
>['type'];

export type UnlockedContent = {
  rooms: RoomId[];
  inhabitants: InhabitantId[];
  abilities: CombatAbilityId[];
  roomupgrades: RoomUpgradeId[];
  passiveBonuses: { bonusType: string; value: number; description: string }[];
  featureFlags: string[];
  roomfeatures: FeatureId[];
  biomes: BiomeType[];
};

export function getUnlockTargetId(unlock: UnlockEffect): string | undefined {
  switch (unlock.type) {
    case 'room':
      return unlock.targetRoomId;
    case 'inhabitant':
      return unlock.targetInhabitantId;
    case 'ability':
      return unlock.targetCombatabilityId;
    case 'roomupgrade':
      return unlock.targetRoomupgradeId;
    case 'roomfeature':
      return unlock.targetFeatureId;
    case 'biome':
      return unlock.targetBiome;
    case 'passive_bonus':
    case 'feature_flag':
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
