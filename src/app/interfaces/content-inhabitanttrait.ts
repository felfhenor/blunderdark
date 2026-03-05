import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { ResourceType } from '@interfaces/resource';
import type { HasDescription } from '@interfaces/traits';

export type InhabitantTraitId = Branded<string, 'InhabitantTraitId'>;

export type TraitEffectType =
  | 'production_multiplier'
  | 'defense_multiplier'
  | 'attack_multiplier'
  | 'worker_efficiency_multiplier'
  | 'attack_flat'
  | 'defense_flat'
  | 'fear_flat'
  | 'aura_fear_multiplier'
  | 'aura_trap_bonus'
  | 'aura_negate_scout'
  | 'aura_reveal_invaders'
  | 'aura_petrify'
  | 'aura_fear_bonus'
  | 'aura_food_bonus'
  | 'aura_gathering_bonus'
  | 'aura_room_regen'
  | 'undead_master';

export type TraitEffect = {
  effectType: TraitEffectType;
  effectValue: number;
  targetResourceType?: ResourceType | 'all';
  targetRoomId?: string;
};

export type InhabitantTraitContent = IsContentItem &
  HasDescription & {
    id: InhabitantTraitId;
    effects: TraitEffect[];
    fusionPassChance: number;
    isFromTraining: boolean;
  };
