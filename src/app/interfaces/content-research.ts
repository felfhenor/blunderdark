import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { ResearchBranch } from '@interfaces/research';
import type { ResourceCost } from '@interfaces/resource';
import type { HasDescription } from '@interfaces/traits';

export type ResearchId = Branded<string, 'ResearchId'>;

export type ResearchContent = IsContentItem &
  HasDescription & {
    id: ResearchId;
    branch: ResearchBranch;
    cost: ResourceCost;
    prerequisiteResearchIds: ResearchId[];
    unlocks: string[];
    tier: number;
  };
