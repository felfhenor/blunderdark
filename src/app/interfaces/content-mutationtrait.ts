import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { InhabitantStats } from '@interfaces/inhabitant';
import type { HasDescription, HasRarity } from '@interfaces/traits';

export type MutationTraitId = Branded<string, 'MutationTraitId'>;

export type MutationTraitModifier = {
  stat: keyof InhabitantStats;
  bonus: number;
};

export type MutationTraitContent = IsContentItem &
  HasDescription &
  HasRarity & {
    id: MutationTraitId;
    modifiers: MutationTraitModifier[];
    isNegative?: boolean;
  };
