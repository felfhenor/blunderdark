import type { BiomeType } from '@interfaces/biome';

export type ProductionModifierType =
  | 'time_of_day'
  | 'biome';

export type ProductionModifierContext = {
  roomTypeId: string;
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
