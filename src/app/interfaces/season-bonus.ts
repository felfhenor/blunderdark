import type { Season } from '@interfaces/season';

export type SeasonResourceModifier = {
  source: 'season';
  season: Season;
  resourceType: string;
  multiplier: number;
  description: string;
};

export type SeasonRecruitmentModifier = {
  source: 'season';
  season: Season;
  multiplier: number;
  description: string;
};

export type SeasonSpawnRateModifier = {
  source: 'season';
  season: Season;
  creatureType: string;
  multiplier: number;
  description: string;
};
