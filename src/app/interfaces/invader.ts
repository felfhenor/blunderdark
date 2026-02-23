import type { AbilityState } from '@interfaces/combat';
import type { CombatStats } from '@interfaces/combat-stats';
import type { InvaderId } from '@interfaces/content-invader';
import type { Branded } from '@interfaces/identifiable';
import type { CombatantId } from '@interfaces/invasion';

export type InvaderClassType =
  | 'warrior'
  | 'rogue'
  | 'mage'
  | 'cleric'
  | 'paladin'
  | 'ranger';

export type InvaderStats = CombatStats;

export type StatusEffect = {
  name: string;
  remainingDuration: number;
};

export type InvaderInstanceId = Branded<string, 'InvaderInstanceId'>;

export type InvaderInstance = {
  id: InvaderInstanceId;
  definitionId: InvaderId;
  currentHp: number;
  maxHp: number;
  statusEffects: StatusEffect[];
  abilityStates: AbilityState[];
};

export type AbilityResult = {
  effectType: string;
  value: number;
  duration: number;
  targetIds: CombatantId[];
  cooldownApplied: number;
};
