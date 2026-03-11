import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { ResourceType } from '@interfaces/resource';
import type { HasDescription } from '@interfaces/traits';

export type InvasionObjectiveContentId = Branded<
  string,
  'InvasionObjectiveContentId'
>;

export type ObjectiveEligibilityType =
  | 'room'
  | 'inhabitant_tier'
  | 'room_count'
  | 'floor_count'
  | 'always';

export type ObjectiveTargetingType =
  | 'room'
  | 'inhabitant'
  | 'dynamic_path'
  | 'none';

export type ObjectivePenaltyMode = 'flat' | 'percent';

export type ObjectivePenalty = {
  resource: ResourceType;
  mode: ObjectivePenaltyMode;
  value: number;
};

export type InvasionObjectiveContent = IsContentItem &
  HasDescription & {
    id: InvasionObjectiveContentId;
    isPrimary: boolean;
    objectiveType: string;
    eligibility: ObjectiveEligibilityType;
    eligibilityMinTier: number | undefined;
    eligibilityMinCount: number | undefined;
    targeting: ObjectiveTargetingType;
    targetMinTier: number | undefined;
    targetPathPercent: number | undefined;
    penalties: ObjectivePenalty[];
  };
