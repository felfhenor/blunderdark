import type { InhabitantId } from '@interfaces/content-inhabitant';
import type { Branded } from '@interfaces/identifiable';
import type { PlacedRoomId } from '@interfaces/room-shape';

export type InhabitantTrait = {
  id: string;
  name: string;
  description: string;
  effectType: string;
  effectValue: number;
  targetResourceType?: string;
  targetRoomName?: string;
};

export type InhabitantStats = {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
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

export type TrainingBonuses = {
  defense: number;
  attack: number;
};

export type InhabitantInstance = {
  instanceId: InhabitantInstanceId;
  definitionId: InhabitantId;
  name: string;
  state: InhabitantState;
  assignedRoomId: PlacedRoomId | undefined;
  trained?: boolean;
  trainingProgress?: number;
  trainingBonuses?: TrainingBonuses;
  hungerTicksWithoutFood?: number;
  mutationBonuses?: Partial<InhabitantStats>;
  mutated?: boolean;
  isHybrid?: boolean;
  hybridParentIds?: InhabitantInstanceId[];
  isSummoned?: boolean;
  isTemporary?: boolean;
  temporaryTicksRemaining?: number;
  travelTicksRemaining?: number;
  discontentedTicks?: number;
  xp?: number;
};
