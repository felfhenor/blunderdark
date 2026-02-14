import type { RoomId } from '@interfaces/content-room';
import type { PlacedRoomId } from '@interfaces/room-shape';

export type SynergyConditionType =
  | 'roomType'
  | 'adjacentRoomType'
  | 'connectedRoomType'
  | 'inhabitantType'
  | 'minInhabitants';

export type SynergyCondition = {
  type: SynergyConditionType;
  roomTypeId?: RoomId;
  inhabitantType?: string;
  count?: number;
};

export type SynergyEffectType = 'productionBonus' | 'fearReduction';

export type SynergyEffect = {
  type: SynergyEffectType;
  value: number;
  resource?: string;
};

export type SynergyDefinition = {
  id: string;
  name: string;
  description: string;
  conditions: SynergyCondition[];
  effects: SynergyEffect[];
};

export type ActiveSynergy = {
  synergyId: string;
  roomId: PlacedRoomId;
};

export type PotentialSynergy = {
  synergy: SynergyDefinition;
  missingConditions: string[];
};
