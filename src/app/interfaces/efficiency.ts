import type { InhabitantInstanceId } from '@interfaces/inhabitant';

export type EfficiencyTrait = {
  traitName: string;
  effectValue: number;
  targetResourceType: string | undefined;
};

export type InhabitantContribution = {
  instanceId: InhabitantInstanceId;
  name: string;
  workerEfficiencyBonus: number;
  traitBonuses: Array<{
    traitName: string;
    bonus: number;
    applies: boolean;
  }>;
  totalBonus: number;
};

export type RoomEfficiencyBreakdown = {
  baseEfficiency: number;
  inhabitantBonuses: InhabitantContribution[];
  totalMultiplier: number;
};
