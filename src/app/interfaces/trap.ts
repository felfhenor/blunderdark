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

export type TrapCraftingJob = {
  trapTypeId: string;
  progress: number;
  targetTicks: number;
};

export type TrapCraftingQueue = {
  roomId: string;
  jobs: TrapCraftingJob[];
};

export type TrapTriggerResult = {
  triggered: boolean;
  disarmed: boolean;
  damage: number;
  effectType: string;
  duration: number;
  trapDestroyed: boolean;
  trapName: string;
  moralePenalty: number;
};
