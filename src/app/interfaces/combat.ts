import type { IsContentItem } from '@interfaces/identifiable';

export type CombatUnit = {
  attack: number;
  defense: number;
  hp: number;
  maxHp: number;
};

export type CombatResult = {
  hit: boolean;
  roll: number;
  damage: number;
  defenderHp: number;
  defenderDead: boolean;
};

export type AbilityTargetType = 'single' | 'aoe' | 'self';

export type AbilityEffectDefinition = IsContentItem & {
  __type: 'abilityeffect';
  dealsDamage: boolean;
  statusName: string | null;
  overrideTargetsHit: number | null;
};

export type CombatAbility = IsContentItem & {
  __type: 'combatability';
  description: string;
  effectType: string;
  value: number;
  chance: number;
  cooldown: number;
  targetType: AbilityTargetType;
  duration: number;
};

export type AbilityState = {
  abilityId: string;
  currentCooldown: number;
  isActive: boolean;
  remainingDuration: number;
};

export type AbilityActivation = {
  abilityId: string;
  abilityName: string;
  effectType: string;
  targetType: AbilityTargetType;
  damage: number;
  targetsHit: number;
  statusApplied: string | null;
  statusDuration: number;
};
