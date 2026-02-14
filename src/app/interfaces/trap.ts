import type { TrapId } from '@interfaces/content-trap';
import type { HallwayId } from '@interfaces/hallway';
import type { Branded } from '@interfaces/identifiable';
import type { ResourceCost } from '@interfaces/resource';
import type { PlacedRoomId } from '@interfaces/room-shape';

export type TrapEffectType =
  | 'physical'
  | 'magic'
  | 'debuff'
  | 'fear';

export type TrapDefinition = {
  id: TrapId;
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

export type TrapInstanceId = Branded<string, 'TrapInstanceId'>;

export type TrapInstance = {
  id: TrapInstanceId;
  trapTypeId: TrapId;
  hallwayId: HallwayId;
  tileX: number;
  tileY: number;
  remainingCharges: number;
  isArmed: boolean;
};

export type TrapInventoryEntry = {
  trapTypeId: TrapId;
  count: number;
};

export type TrapCraftingJob = {
  trapTypeId: TrapId;
  progress: number;
  targetTicks: number;
};

export type TrapCraftingQueue = {
  roomId: PlacedRoomId;
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
