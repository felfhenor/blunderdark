export type SynergyConditionType =
  | 'roomType'
  | 'adjacentRoomType'
  | 'connectedRoomType'
  | 'inhabitantType'
  | 'minInhabitants';

export type SynergyCondition = {
  type: SynergyConditionType;
  roomTypeId?: string;
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
  roomId: string;
};
