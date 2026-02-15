import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type {
  InhabitantState,
  InhabitantStats,
  InhabitantTrait,
  RecruitmentRequirement,
  RulerBonuses,
  StateModifier,
} from '@interfaces/inhabitant';
import type { ResourceType } from '@interfaces/resource';
import type { HasDescription } from '@interfaces/traits';

export type InhabitantId = Branded<string, 'InhabitantId'>;

export type InhabitantContent = IsContentItem &
  HasDescription & {
    id: InhabitantId;
    type: string;
    tier: number;
    cost: Partial<Record<ResourceType, number>>;
    stats: InhabitantStats;
    traits: InhabitantTrait[];
    restrictionTags: string[];
    rulerBonuses: RulerBonuses;
    rulerFearLevel: number;
    fearTolerance?: number;
    fearModifier?: number;
    fearPropagationDistance?: number;
    foodConsumptionRate?: number;
    corruptionGeneration?: number;
    stateModifiers?: Partial<Record<InhabitantState, StateModifier>>;
    upkeepCost?: Partial<Record<ResourceType, number>>;
    recruitmentRequirements?: RecruitmentRequirement[];
    statOverrides?: Partial<InhabitantStats>;
  };
