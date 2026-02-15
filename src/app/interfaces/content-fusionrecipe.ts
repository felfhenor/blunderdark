import type { InhabitantId } from '@interfaces/content-inhabitant';
import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { ResourceType } from '@interfaces/resource';
import type { HasDescription } from '@interfaces/traits';

export type FusionRecipeId = Branded<string, 'FusionRecipeId'>;

export type FusionRecipeContent = IsContentItem &
  HasDescription & {
    id: FusionRecipeId;
    creatureAId: InhabitantId;
    creatureBId: InhabitantId;
    resultHybridId: InhabitantId;
    cost: Partial<Record<ResourceType, number>>;
  };
