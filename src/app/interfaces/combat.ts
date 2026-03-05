import type { CombatAbilityEffectType, CombatAbilityId } from '@interfaces/content-combatability';

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

export type StatusEffectName =
  | 'stunned'
  | 'berserk'
  | 'shielded'
  | 'phased'
  | 'resurrected'
  | 'healing'
  | 'disarm'
  | 'dispel'
  | 'courage'
  | 'scouting'
  | 'marked';

export type StatusEffect = {
  name: StatusEffectName;
  remainingDuration: number;
};

export type AbilityState = {
  abilityId: CombatAbilityId;
  currentCooldown: number;
  isActive: boolean;
  remainingDuration: number;
  passiveActivated: boolean;
};

export type AbilityActivationEffect = {
  effectType: CombatAbilityEffectType;
  targetType: AbilityTargetType;
  damage: number;
  targetsHit: number;
  statusApplied: StatusEffectName | undefined;
  statusDuration: number;
  targetIds: string[];
};

export type AbilityActivation = {
  abilityId: CombatAbilityId;
  abilityName: string;
  effects: AbilityActivationEffect[];
};
