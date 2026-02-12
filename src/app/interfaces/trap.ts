import type { ResourceCost } from '@interfaces/resource';

export type TrapEffectType =
  | 'physical'
  | 'magic'
  | 'debuff'
  | 'fear';

export type TrapDefinition = {
  id: string;
  name: string;
  description: string;
  effectType: TrapEffectType;
  damage: number;
  duration: number;
  charges: number;
  craftCost: ResourceCost;
  triggerChance: number;
  canBeDisarmed: boolean;
  sprite: string;
};

export type TrapInstance = {
  id: string;
  trapTypeId: string;
  hallwayId: string;
  tileX: number;
  tileY: number;
  remainingCharges: number;
  isArmed: boolean;
};

export type TrapInventoryEntry = {
  trapTypeId: string;
  count: number;
};
