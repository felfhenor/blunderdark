import type { BiomeType } from '@interfaces/biome';
import type { RoomId } from '@interfaces/content-room';

export type ProductionModifierType =
  | 'time_of_day'
  | 'biome';

export type ProductionModifierContext = {
  roomTypeId: RoomId;
  floorDepth: number;
  floorBiome: BiomeType;
  hour: number;
};

export type ProductionModifierResult = {
  type: ProductionModifierType;
  multiplier: number;
  description: string;
};

export type ProductionModifierDefinition = {
  id: string;
  type: ProductionModifierType;
  description: string;
  evaluate: (context: ProductionModifierContext) => number;
};
