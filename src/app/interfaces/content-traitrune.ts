import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { InvaderClassType } from '@interfaces/invader';
import type { HasDescription } from '@interfaces/traits';

export type TraitRuneId = Branded<string, 'TraitRuneId'>;

export type TraitRuneContent = IsContentItem &
  HasDescription & {
    id: TraitRuneId;
    invaderClass: InvaderClassType;
    effects: TraitRuneEffect[];
  };

export type TraitRuneEffect = {
  type: string;
  value: number;
};
