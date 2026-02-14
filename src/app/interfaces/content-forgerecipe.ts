import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { InhabitantStats } from '@interfaces/inhabitant';
import type { ResourceType } from '@interfaces/resource';
import type { HasDescription } from '@interfaces/traits';

export type ForgeRecipeId = Branded<string, 'ForgeRecipeId'>;

export type ForgeRecipeContent = IsContentItem &
  HasDescription & {
    id: ForgeRecipeId;
    category: 'equipment' | 'upgrade';
    cost: Partial<Record<ResourceType, number>>;
    timeMultiplier: number;
    statBonuses: Partial<InhabitantStats>;
    tier: 'basic' | 'advanced';
  };
