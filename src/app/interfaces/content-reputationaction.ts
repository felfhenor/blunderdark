import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { ReputationType } from '@interfaces/reputation';
import type { HasDescription } from '@interfaces/traits';

export type ReputationActionId = Branded<string, 'ReputationActionId'>;

export type ReputationActionContent = IsContentItem &
  HasDescription & {
    id: ReputationActionId;
    reputationRewards: Partial<Record<ReputationType, number>>;
  };
