import type { HasSprite } from '@interfaces/artable';
import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { ResourceCost } from '@interfaces/resource';
import type { TrapEffectType } from '@interfaces/trap';
import type { HasDescription } from '@interfaces/traits';

export type TrapId = Branded<string, 'TrapId'>;

export type TrapContent = IsContentItem &
  HasDescription &
  HasSprite & {
    id: TrapId;
    effectType: TrapEffectType;
    damage: number;
    duration: number;
    charges: number;
    craftCost: ResourceCost;
    triggerChance: number;
    canBeDisarmed: boolean;
  };
