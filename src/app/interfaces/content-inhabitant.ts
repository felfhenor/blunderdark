import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { CombatAbilityId } from '@interfaces/content-combatability';
import type { InhabitantTraitId } from '@interfaces/content-inhabitanttrait';
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

export type InhabitantCreatureType =
  | 'creature'
  | 'undead'
  | 'demon'
  | 'dragon'
  | 'aberration'
  | 'fungal'
  | 'ooze';

export type InhabitantRestrictionTag =
  | 'unique'
  | 'hybrid'
  | 'summoned'
  | 'converted'
  | 'harmony_attract'
  | 'harmony_attract_legendary';

export type InhabitantContent = IsContentItem &
  HasDescription & {
    id: InhabitantId;
    type: InhabitantCreatureType;
    tier: number;
    cost: Partial<Record<ResourceType, number>>;
    stats: InhabitantStats;
    inhabitantTraitIds: InhabitantTraitId[];
    traits: InhabitantTrait[];
    restrictionTags: InhabitantRestrictionTag[];
    rulerBonuses: RulerBonuses;
    rulerFearLevel: number;
    fearTolerance: number | undefined;
    fearModifier: number;
    fearPropagationDistance: number;
    foodConsumptionRate: number;
    corruptionGeneration: number;
    stateModifiers: Partial<Record<InhabitantState, StateModifier>>;
    upkeepCost: Partial<Record<ResourceType, number>>;
    recruitmentRequirements: RecruitmentRequirement[];
    statOverrides: Partial<InhabitantStats>;
    combatAbilityIds: CombatAbilityId[];
  };
