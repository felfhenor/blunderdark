import type { RoomId } from '@interfaces/content-room';
import type { SynergyContent } from '@interfaces/content-synergy';

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

export type PotentialSynergy = {
  synergy: SynergyContent;
  missingConditions: string[];
};
