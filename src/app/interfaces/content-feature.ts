import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { ResourceCost } from '@interfaces/resource';
import type { HasDescription } from '@interfaces/traits';

export type FeatureId = Branded<string, 'FeatureId'>;

export type FeatureCategory = 'environmental' | 'functional' | 'prestige';

export type FeatureBonusType =
  | 'capacity_bonus'
  | 'fear_reduction'
  | 'production_bonus'
  | 'adjacent_production'
  | 'flat_production'
  | 'corruption_generation'
  | 'combat_bonus'
  | 'teleport_link'
  | 'storage_bonus'
  | 'corruption_seal'
  | 'training_xp'
  | 'resource_converter'
  | 'speed_multiplier'
  | 'daily_summon'
  | 'undead_respawn';

export type FeatureBonus = {
  type: FeatureBonusType;
  value: number;
  targetType?: string;
  description: string;
};

export type FeatureContent = IsContentItem &
  HasDescription & {
    id: FeatureId;
    category: FeatureCategory;
    cost: ResourceCost;
    bonuses: FeatureBonus[];
    unique?: boolean;
    maintenanceCost?: ResourceCost;
  };
