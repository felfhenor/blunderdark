import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { AbilityTargetType } from '@interfaces/combat';
import type { HasDescription } from '@interfaces/traits';

export type CombatAbilityId = Branded<string, 'CombatAbilityId'>;

export type CombatAbilityContent = IsContentItem &
  HasDescription & {
    id: CombatAbilityId;
    effectType: string;
    value: number;
    chance: number;
    cooldown: number;
    targetType: AbilityTargetType;
    duration: number;
  };
