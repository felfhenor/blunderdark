import type { AbilityState } from '@interfaces/combat';

export type InvaderClassType =
  | 'warrior'
  | 'rogue'
  | 'mage'
  | 'cleric'
  | 'paladin'
  | 'ranger';

export type InvaderStats = {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
};

export type InvaderDefinition = {
  id: string;
  name: string;
  description: string;
  invaderClass: InvaderClassType;
  baseStats: InvaderStats;
  combatAbilityIds: string[];
  sprite: string;
};

export type StatusEffect = {
  name: string;
  remainingDuration: number;
};

export type InvaderInstance = {
  id: string;
  definitionId: string;
  currentHp: number;
  maxHp: number;
  statusEffects: StatusEffect[];
  abilityStates: AbilityState[];
};

export type AbilityResult = {
  effectType: string;
  value: number;
  duration: number;
  targetIds: string[];
  cooldownApplied: number;
};
