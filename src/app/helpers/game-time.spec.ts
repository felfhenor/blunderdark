import { describe, expect, it } from 'vitest';
import {
  gameTimeAdvance,
  GAME_TIME_HOURS_PER_DAY,
  GAME_TIME_MINUTES_PER_HOUR,
  GAME_TIME_TICKS_PER_MINUTE,
} from '@helpers/game-time';
import type { GameTime } from '@interfaces';

function defaultTime(): GameTime {
  return { day: 1, hour: 0, minute: 0 };
}

describe('gameTimeAdvance', () => {
  it('should not advance time for fewer ticks than GAME_TIME_TICKS_PER_MINUTE', () => {
    const result = gameTimeAdvance(defaultTime(), GAME_TIME_TICKS_PER_MINUTE - 1);
    expect(result).toEqual({ day: 1, hour: 0, minute: 0 });
  });

  it('should advance 1 minute for exactly GAME_TIME_TICKS_PER_MINUTE ticks', () => {
    const result = gameTimeAdvance(defaultTime(), GAME_TIME_TICKS_PER_MINUTE);
    expect(result).toEqual({ day: 1, hour: 0, minute: 1 });
  });

  it('should advance multiple minutes', () => {
    const result = gameTimeAdvance(defaultTime(), GAME_TIME_TICKS_PER_MINUTE * 30);
    expect(result).toEqual({ day: 1, hour: 0, minute: 30 });
  });

  it('should roll over minutes to hours at 60 minutes', () => {
    const result = gameTimeAdvance(defaultTime(), GAME_TIME_TICKS_PER_MINUTE * GAME_TIME_MINUTES_PER_HOUR);
    expect(result).toEqual({ day: 1, hour: 1, minute: 0 });
  });

  it('should roll over hours to days at 24 hours', () => {
    const ticksPerDay = GAME_TIME_TICKS_PER_MINUTE * GAME_TIME_MINUTES_PER_HOUR * GAME_TIME_HOURS_PER_DAY;
    const result = gameTimeAdvance(defaultTime(), ticksPerDay);
    expect(result).toEqual({ day: 2, hour: 0, minute: 0 });
  });

  it('should handle multiple day rollovers', () => {
    const ticksPerDay = GAME_TIME_TICKS_PER_MINUTE * GAME_TIME_MINUTES_PER_HOUR * GAME_TIME_HOURS_PER_DAY;
    const result = gameTimeAdvance(defaultTime(), ticksPerDay * 3);
    expect(result).toEqual({ day: 4, hour: 0, minute: 0 });
  });

  it('should correctly handle mixed rollover (e.g., 1 day 2 hours 30 minutes)', () => {
    const ticks =
      GAME_TIME_TICKS_PER_MINUTE * (GAME_TIME_MINUTES_PER_HOUR * GAME_TIME_HOURS_PER_DAY + GAME_TIME_MINUTES_PER_HOUR * 2 + 30);
    const result = gameTimeAdvance(defaultTime(), ticks);
    expect(result).toEqual({ day: 2, hour: 2, minute: 30 });
  });

  it('should accumulate time from a non-zero starting point', () => {
    const start: GameTime = { day: 3, hour: 23, minute: 50 };
    const result = gameTimeAdvance(start, GAME_TIME_TICKS_PER_MINUTE * 15);
    expect(result).toEqual({ day: 4, hour: 0, minute: 5 });
  });

  it('should handle zero ticks', () => {
    const start: GameTime = { day: 5, hour: 12, minute: 30 };
    const result = gameTimeAdvance(start, 0);
    expect(result).toEqual({ day: 5, hour: 12, minute: 30 });
  });

  it('should handle minute-to-hour-to-day cascade in one step', () => {
    const start: GameTime = { day: 1, hour: 23, minute: 59 };
    const result = gameTimeAdvance(start, GAME_TIME_TICKS_PER_MINUTE);
    expect(result).toEqual({ day: 2, hour: 0, minute: 0 });
  });
});
