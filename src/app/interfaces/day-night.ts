export type DayNightPhase = 'day' | 'night' | 'dawn' | 'dusk';

export type DayNightResourceModifier = {
  source: 'time-of-day';
  resourceType: string;
  multiplier: number;
  phase: DayNightPhase;
  description: string;
};

export type DayNightCreatureModifier = {
  source: 'time-of-day';
  creatureType: string;
  multiplier: number;
  phase: DayNightPhase;
  description: string;
};
