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

export type AbilityEffectType =
  | 'damage'
  | 'stun'
  | 'buff_attack'
  | 'buff_defense'
  | 'evasion'
  | 'resurrect';

export type CombatAbility = {
  id: string;
  name: string;
  description: string;
  effectType: AbilityEffectType;
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
  effectType: AbilityEffectType;
  targetType: AbilityTargetType;
  damage: number;
  targetsHit: number;
  statusApplied: string | null;
  statusDuration: number;
};
