import type { InhabitantId } from '@interfaces/content-inhabitant';
import type { InhabitantTraitId } from '@interfaces/content-inhabitanttrait';
import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { HasDescription } from '@interfaces/traits';

export type BreedingRecipeId = Branded<string, 'BreedingRecipeId'>;

export type BreedingRecipeContent = IsContentItem &
  HasDescription & {
    id: BreedingRecipeId;
    parentInhabitantAId: InhabitantId;
    parentInhabitantBId: InhabitantId;
    resultInhabitantTraitId: InhabitantTraitId;
    timeMultiplier: number;
    inhabitantTraitIds: InhabitantTraitId[];
  };
