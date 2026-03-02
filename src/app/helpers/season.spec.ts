import type { SeasonState } from '@interfaces';
import { DAYS_PER_SEASON, SEASON_ORDER } from '@interfaces/season';
import { describe, expect, it } from 'vitest';
import { seasonAdvanceDay, seasonGetLabel, seasonGetProductionMultiplier } from '@helpers/season';

describe('seasonAdvanceDay', () => {
  it('should advance day within a season', () => {
    const state: SeasonState = {
      currentSeason: 'growth',
      dayInSeason: 1,
      totalSeasonCycles: 0,
    };
    const result = seasonAdvanceDay(state);
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
    const result = seasonAdvanceDay(state);
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
    state = seasonAdvanceDay(state);
    expect(state.currentSeason).toBe('harvest');

    // harvest -> darkness
    state = { ...state, dayInSeason: DAYS_PER_SEASON };
    state = seasonAdvanceDay(state);
    expect(state.currentSeason).toBe('darkness');

    // darkness -> storms
    state = { ...state, dayInSeason: DAYS_PER_SEASON };
    state = seasonAdvanceDay(state);
    expect(state.currentSeason).toBe('storms');
  });

  it('should wrap from last season to first and increment seasonTotalCycles', () => {
    const state: SeasonState = {
      currentSeason: 'storms',
      dayInSeason: DAYS_PER_SEASON,
      totalSeasonCycles: 2,
    };
    const result = seasonAdvanceDay(state);
    expect(result.currentSeason).toBe('growth');
    expect(result.dayInSeason).toBe(1);
    expect(result.totalSeasonCycles).toBe(3);
  });

  it('should not increment seasonTotalCycles on mid-cycle transitions', () => {
    const state: SeasonState = {
      currentSeason: 'harvest',
      dayInSeason: DAYS_PER_SEASON,
      totalSeasonCycles: 5,
    };
    const result = seasonAdvanceDay(state);
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
      state = seasonAdvanceDay(state);
    }

    // Should be back to growth, day 1, cycle 1
    expect(state.currentSeason).toBe('growth');
    expect(state.dayInSeason).toBe(1);
    expect(state.totalSeasonCycles).toBe(1);
  });
});

describe('seasonGetLabel', () => {
  it('should return human-readable labels', () => {
    expect(seasonGetLabel('growth')).toBe('Growth');
    expect(seasonGetLabel('harvest')).toBe('Harvest');
    expect(seasonGetLabel('darkness')).toBe('Darkness');
    expect(seasonGetLabel('storms')).toBe('Storms');
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

describe('seasonGetProductionMultiplier', () => {
  it('growth should give 1.5x food and 1.0x other resources', () => {
    expect(seasonGetProductionMultiplier('growth', 'food')).toBe(1.5);
    expect(seasonGetProductionMultiplier('growth', 'gold')).toBe(1.0);
    expect(seasonGetProductionMultiplier('growth', 'corruption')).toBe(1.0);
    expect(seasonGetProductionMultiplier('growth', 'flux')).toBe(1.0);
  });

  it('harvest should give 1.2x all resources', () => {
    expect(seasonGetProductionMultiplier('harvest', 'food')).toBe(1.2);
    expect(seasonGetProductionMultiplier('harvest', 'gold')).toBe(1.2);
    expect(seasonGetProductionMultiplier('harvest', 'corruption')).toBe(1.2);
    expect(seasonGetProductionMultiplier('harvest', 'flux')).toBe(1.2);
    expect(seasonGetProductionMultiplier('harvest', 'crystals')).toBe(1.2);
  });

  it('darkness should give 2.0x corruption and 1.0x other resources', () => {
    expect(seasonGetProductionMultiplier('darkness', 'corruption')).toBe(2.0);
    expect(seasonGetProductionMultiplier('darkness', 'food')).toBe(1.0);
    expect(seasonGetProductionMultiplier('darkness', 'gold')).toBe(1.0);
    expect(seasonGetProductionMultiplier('darkness', 'flux')).toBe(1.0);
  });

  it('storms should give 1.8x flux and 1.0x other resources', () => {
    expect(seasonGetProductionMultiplier('storms', 'flux')).toBe(1.8);
    expect(seasonGetProductionMultiplier('storms', 'food')).toBe(1.0);
    expect(seasonGetProductionMultiplier('storms', 'gold')).toBe(1.0);
    expect(seasonGetProductionMultiplier('storms', 'corruption')).toBe(1.0);
  });
});
