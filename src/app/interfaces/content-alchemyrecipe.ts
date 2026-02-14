import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { ResourceType } from '@interfaces/resource';
import type { HasDescription } from '@interfaces/traits';

export type AlchemyRecipeId = Branded<string, 'AlchemyRecipeId'>;

export type AlchemyRecipeContent = IsContentItem &
  HasDescription & {
    id: AlchemyRecipeId;
    inputCost: Partial<Record<ResourceType, number>>;
    outputResource: ResourceType;
    outputAmount: number;
    baseTicks: number;
    tier: 'basic' | 'advanced';
  };
