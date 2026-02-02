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
