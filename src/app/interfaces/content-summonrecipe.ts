import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { InhabitantStats } from '@interfaces/inhabitant';
import type { ResourceType } from '@interfaces/resource';
import type { HasDescription } from '@interfaces/traits';

export type SummonRecipeId = Branded<string, 'SummonRecipeId'>;

export type SummonRecipeContent = IsContentItem &
  HasDescription & {
    id: SummonRecipeId;
    resultInhabitantId: string;
    summonType: 'permanent' | 'temporary';
    duration?: number;
    cost: Partial<Record<ResourceType, number>>;
    timeMultiplier: number;
    statBonuses: Partial<InhabitantStats>;
    tier: 'rare' | 'advanced';
  };
