import type { SeasonState } from '@interfaces';
import { DAYS_PER_SEASON, SEASON_ORDER } from '@interfaces/season';
import { describe, expect, it } from 'vitest';
import { advanceDay, getSeasonLabel } from '@helpers/season';

describe('advanceDay', () => {
  it('should advance day within a season', () => {
    const state: SeasonState = {
      currentSeason: 'growth',
      dayInSeason: 1,
      totalSeasonCycles: 0,
    };
    const result = advanceDay(state);
    expect(result.dayInSeason).toBe(2);
    expect(result.currentSeason).toBe('growth');
    expect(result.totalSeasonCycles).toBe(0);
  });

  it('should transition to next season when day exceeds DAYS_PER_SEASON', () => {
    const state: SeasonState = {
      currentSeason: 'growth',
      dayInSeason: DAYS_PER_SEASON,
      totalSeasonCycles: 0,
    };
    const result = advanceDay(state);
    expect(result.dayInSeason).toBe(1);
    expect(result.currentSeason).toBe('harvest');
    expect(result.totalSeasonCycles).toBe(0);
  });

  it('should follow SEASON_ORDER for transitions', () => {
    let state: SeasonState = {
      currentSeason: 'growth',
      dayInSeason: DAYS_PER_SEASON,
      totalSeasonCycles: 0,
    };

    // growth -> harvest
    state = advanceDay(state);
    expect(state.currentSeason).toBe('harvest');

    // harvest -> darkness
    state = { ...state, dayInSeason: DAYS_PER_SEASON };
    state = advanceDay(state);
    expect(state.currentSeason).toBe('darkness');

    // darkness -> storms
    state = { ...state, dayInSeason: DAYS_PER_SEASON };
    state = advanceDay(state);
    expect(state.currentSeason).toBe('storms');
  });

  it('should wrap from last season to first and increment totalSeasonCycles', () => {
    const state: SeasonState = {
      currentSeason: 'storms',
      dayInSeason: DAYS_PER_SEASON,
      totalSeasonCycles: 2,
    };
    const result = advanceDay(state);
    expect(result.currentSeason).toBe('growth');
    expect(result.dayInSeason).toBe(1);
    expect(result.totalSeasonCycles).toBe(3);
  });

  it('should not increment totalSeasonCycles on mid-cycle transitions', () => {
    const state: SeasonState = {
      currentSeason: 'harvest',
      dayInSeason: DAYS_PER_SEASON,
      totalSeasonCycles: 5,
    };
    const result = advanceDay(state);
    expect(result.currentSeason).toBe('darkness');
    expect(result.totalSeasonCycles).toBe(5);
  });

  it('should handle a full cycle of all seasons', () => {
    let state: SeasonState = {
      currentSeason: 'growth',
      dayInSeason: 1,
      totalSeasonCycles: 0,
    };

    // Advance through all days of all 4 seasons
    const totalDays = DAYS_PER_SEASON * SEASON_ORDER.length;
    for (let i = 0; i < totalDays; i++) {
      state = advanceDay(state);
    }

    // Should be back to growth, day 1, cycle 1
    expect(state.currentSeason).toBe('growth');
    expect(state.dayInSeason).toBe(1);
    expect(state.totalSeasonCycles).toBe(1);
  });
});

describe('getSeasonLabel', () => {
  it('should return human-readable labels', () => {
    expect(getSeasonLabel('growth')).toBe('Growth');
    expect(getSeasonLabel('harvest')).toBe('Harvest');
    expect(getSeasonLabel('darkness')).toBe('Darkness');
    expect(getSeasonLabel('storms')).toBe('Storms');
  });
});

describe('SeasonState serialization', () => {
  it('should survive JSON round-trip', () => {
    const state: SeasonState = {
      currentSeason: 'darkness',
      dayInSeason: 5,
      totalSeasonCycles: 3,
    };

    const serialized = JSON.stringify(state);
    const deserialized: SeasonState = JSON.parse(serialized);

    expect(deserialized.currentSeason).toBe('darkness');
    expect(deserialized.dayInSeason).toBe(5);
    expect(deserialized.totalSeasonCycles).toBe(3);
  });
});

describe('SEASON_ORDER', () => {
  it('should have 4 seasons in the correct order', () => {
    expect(SEASON_ORDER).toEqual(['growth', 'harvest', 'darkness', 'storms']);
    expect(SEASON_ORDER).toHaveLength(4);
  });
});

describe('DAYS_PER_SEASON', () => {
  it('should be 7', () => {
    expect(DAYS_PER_SEASON).toBe(7);
  });
});
