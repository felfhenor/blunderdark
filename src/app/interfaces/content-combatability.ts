import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { AbilityTargetType } from '@interfaces/combat';
import type { HasDescription } from '@interfaces/traits';

export type CombatAbilityId = Branded<string, 'CombatAbilityId'>;

export type CombatAbilityEffectType =
  | 'Damage'
  | 'Stun'
  | 'Buff Attack'
  | 'Buff Defense'
  | 'Evasion'
  | 'Resurrect'
  | 'Heal Effect'
  | 'Disarm'
  | 'Magic Damage'
  | 'Dispel Effect'
  | 'Fear Immunity'
  | 'Scout Effect'
  | 'Mark';

export type CombatAbilityEffect = {
  effectType: CombatAbilityEffectType;
  value: number;
  targetType: AbilityTargetType;
  duration: number;
};

export type CombatAbilityContent = IsContentItem &
  HasDescription & {
    id: CombatAbilityId;
    chance: number;
    cooldown: number;
    effects: CombatAbilityEffect[];
  };
