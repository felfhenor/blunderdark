import type { AbilityState, StatusEffect } from '@interfaces/combat';
import type { CombatStats } from '@interfaces/combat-stats';
import type { ForgeRecipeId } from '@interfaces/content-forgerecipe';
import type { InhabitantId } from '@interfaces/content-inhabitant';
import type { Branded } from '@interfaces/identifiable';
import type { PlacedRoomId } from '@interfaces/room-shape';
import type { TraitRuneInstanceId } from '@interfaces/traitrune';

import type { TraitEffect } from '@interfaces/content-inhabitanttrait';

export type InhabitantTrait = {
  id: string;
  name: string;
  description: string;
  effects: TraitEffect[];
};

export type InhabitantStats = CombatStats & {
  workerEfficiency: number;
};

export type RulerBonuses = Record<string, number>;

export type RecruitmentRequirement = {
  requirementType: 'room' | 'room_level' | 'resource' | 'item';
  targetName: string;
  value?: number;
  description: string;
};

export type InhabitantInstanceId = Branded<string, 'InhabitantInstanceId'>;

export type InhabitantState = 'normal' | 'scared' | 'hungry' | 'starving';

export type StateModifier = {
  productionMultiplier: number;
  foodConsumptionMultiplier: number;
  attackMultiplier?: number;
  defenseMultiplier?: number;
};

export type InhabitantInstance = {
  instanceId: InhabitantInstanceId;
  definitionId: InhabitantId;
  name: string;
  state: InhabitantState;
  assignedRoomId: PlacedRoomId | undefined;
  trainingProgress?: number;
  hungerTicksWithoutFood?: number;
  instanceStatBonuses?: Partial<InhabitantStats>;
  mutated?: boolean;
  mutationTraitIds?: string[];
  isHybrid?: boolean;
  hybridParentIds?: InhabitantInstanceId[];
  instanceTraitIds?: string[];
  isSummoned?: boolean;
  travelTicksRemaining?: number;
  discontentedTicks?: number;

  equippedRuneId?: TraitRuneInstanceId;
  equippedForgeItemRecipeId?: ForgeRecipeId;
  equippedStatBonuses?: Partial<InhabitantStats>;

  abilityStates?: AbilityState[];
  statusEffects?: StatusEffect[];
};
