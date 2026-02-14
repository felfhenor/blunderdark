export type Season = 'growth' | 'harvest' | 'darkness' | 'storms';

export type SeasonState = {
  currentSeason: Season;
  dayInSeason: number;
  totalSeasonCycles: number;
};

export const SEASON_ORDER: readonly Season[] = [
  'growth',
  'harvest',
  'darkness',
  'storms',
] as const;

export const DAYS_PER_SEASON = 7;

export type SeasonBonusModifier = {
  resourceType: string;
  multiplier: number;
  description: string;
};

export type SeasonTransitionEvent = {
  previousSeason: Season;
  newSeason: Season;
};
