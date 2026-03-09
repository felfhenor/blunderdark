import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { ResourceType } from '@interfaces/resource';
import type { HasDescription } from '@interfaces/traits';

export type AlchemyRecipeId = Branded<string, 'AlchemyRecipeId'>;

export type AlchemyResourceEntry = {
  resource: ResourceType;
  amount: number;
};

export type AlchemyRecipeContent = IsContentItem &
  HasDescription & {
    id: AlchemyRecipeId;
    inputCost: AlchemyResourceEntry[];
    outputCost: AlchemyResourceEntry[];
    baseTicks: number;
    tier: 'basic' | 'advanced';
  };
