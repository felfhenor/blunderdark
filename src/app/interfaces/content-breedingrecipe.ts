import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { InhabitantStats } from '@interfaces/inhabitant';
import type { HasDescription } from '@interfaces/traits';

export type BreedingRecipeId = Branded<string, 'BreedingRecipeId'>;

export type BreedingRecipeContent = IsContentItem &
  HasDescription & {
    id: BreedingRecipeId;
    parentInhabitantAId: string;
    parentInhabitantBId: string;
    resultName: string;
    statBonuses: Partial<InhabitantStats>;
    timeMultiplier: number;
  };
