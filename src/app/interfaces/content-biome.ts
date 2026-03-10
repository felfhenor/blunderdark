import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { InhabitantCreatureType } from '@interfaces/content-inhabitant';
import type { ResourceType } from '@interfaces/resource';
import type { HasDescription } from '@interfaces/traits';

export type BiomeId = Branded<string, 'BiomeId'>;

export type BiomeEffectType =
  | 'resource_production_multiplier'
  | 'creature_production_multiplier'
  | 'defender_attack_multiplier'
  | 'defender_defense_multiplier'
  | 'invader_attack_multiplier'
  | 'invader_defense_multiplier'
  | 'fear_reduction'
  | 'corruption_multiplier';

export type BiomeEffect = {
  effectType: BiomeEffectType;
  effectValue: number;
  description: string;
  targetResourceType?: ResourceType;
  targetCreatureType?: InhabitantCreatureType;
};

export type BiomeRoomRestriction = {
  roomId: string;
  blocked?: boolean;
  maxPerFloor?: number;
};

export type BiomeContent = IsContentItem &
  HasDescription & {
    id: BiomeId;
    biomeType: string;
    color: string;
    icon: string;
    requiresResearch: boolean;
    effects: BiomeEffect[];
    roomRestrictions: BiomeRoomRestriction[];
  };
