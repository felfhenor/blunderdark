import type { CombatAbilityId } from '@interfaces/content-combatability';

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

export type AbilityState = {
  abilityId: CombatAbilityId;
  currentCooldown: number;
  isActive: boolean;
  remainingDuration: number;
};

export type AbilityActivation = {
  abilityId: CombatAbilityId;
  abilityName: string;
  effectType: string;
  targetType: AbilityTargetType;
  damage: number;
  targetsHit: number;
  statusApplied: string | undefined;
  statusDuration: number;
};
