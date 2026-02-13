import type { HasSprite } from '@interfaces/artable';
import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { InvaderClassType, InvaderStats } from '@interfaces/invader';
import type { HasDescription } from '@interfaces/traits';

export type InvaderId = Branded<string, 'InvaderId'>;

export type InvaderContent = IsContentItem &
  HasDescription &
  HasSprite & {
    id: InvaderId;
    invaderClass: InvaderClassType;
    baseStats: InvaderStats;
    abilityIds: string[];
  };
