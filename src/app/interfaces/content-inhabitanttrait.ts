import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { HasDescription } from '@interfaces/traits';

export type InhabitantTraitId = Branded<string, 'InhabitantTraitId'>;

export type TraitEffect = {
  effectType: string;
  effectValue: number;
  targetResourceType?: string;
  targetRoomId?: string;
};

export type InhabitantTraitContent = IsContentItem &
  HasDescription & {
    id: InhabitantTraitId;
    effects: TraitEffect[];
    fusionPassChance: number;
    isFromTraining: boolean;
  };
