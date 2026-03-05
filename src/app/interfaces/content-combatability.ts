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
  | 'Heal'
  | 'Disarm'
  | 'Magic Damage'
  | 'Dispel Effect'
  | 'Dispel'
  | 'Fear Immunity'
  | 'Scout Effect'
  | 'Scout'
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
