import type { HasSprite } from '@interfaces/artable';
import type { CombatAbilityId } from '@interfaces/content-combatability';
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
    combatAbilityIds: CombatAbilityId[];
  };
