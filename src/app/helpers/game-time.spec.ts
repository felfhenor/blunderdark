import { describe, expect, it } from 'vitest';
import {
  advanceTime,
  HOURS_PER_DAY,
  MINUTES_PER_HOUR,
  TICKS_PER_MINUTE,
  type GameTime,
} from '@helpers/game-time';

function defaultTime(): GameTime {
  return { day: 1, hour: 0, minute: 0 };
}

describe('advanceTime', () => {
  it('should not advance time for fewer ticks than TICKS_PER_MINUTE', () => {
    const result = advanceTime(defaultTime(), TICKS_PER_MINUTE - 1);
    expect(result).toEqual({ day: 1, hour: 0, minute: 0 });
  });

  it('should advance 1 minute for exactly TICKS_PER_MINUTE ticks', () => {
    const result = advanceTime(defaultTime(), TICKS_PER_MINUTE);
    expect(result).toEqual({ day: 1, hour: 0, minute: 1 });
  });

  it('should advance multiple minutes', () => {
    const result = advanceTime(defaultTime(), TICKS_PER_MINUTE * 30);
    expect(result).toEqual({ day: 1, hour: 0, minute: 30 });
  });

  it('should roll over minutes to hours at 60 minutes', () => {
    const result = advanceTime(defaultTime(), TICKS_PER_MINUTE * MINUTES_PER_HOUR);
    expect(result).toEqual({ day: 1, hour: 1, minute: 0 });
  });

  it('should roll over hours to days at 24 hours', () => {
    const ticksPerDay = TICKS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY;
    const result = advanceTime(defaultTime(), ticksPerDay);
    expect(result).toEqual({ day: 2, hour: 0, minute: 0 });
  });

  it('should handle multiple day rollovers', () => {
    const ticksPerDay = TICKS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY;
    const result = advanceTime(defaultTime(), ticksPerDay * 3);
    expect(result).toEqual({ day: 4, hour: 0, minute: 0 });
  });

  it('should correctly handle mixed rollover (e.g., 1 day 2 hours 30 minutes)', () => {
    const ticks =
      TICKS_PER_MINUTE * (MINUTES_PER_HOUR * HOURS_PER_DAY + MINUTES_PER_HOUR * 2 + 30);
    const result = advanceTime(defaultTime(), ticks);
    expect(result).toEqual({ day: 2, hour: 2, minute: 30 });
  });

  it('should accumulate time from a non-zero starting point', () => {
    const start: GameTime = { day: 3, hour: 23, minute: 50 };
    const result = advanceTime(start, TICKS_PER_MINUTE * 15);
    expect(result).toEqual({ day: 4, hour: 0, minute: 5 });
  });

  it('should handle zero ticks', () => {
    const start: GameTime = { day: 5, hour: 12, minute: 30 };
    const result = advanceTime(start, 0);
    expect(result).toEqual({ day: 5, hour: 12, minute: 30 });
  });

  it('should handle minute-to-hour-to-day cascade in one step', () => {
    const start: GameTime = { day: 1, hour: 23, minute: 59 };
    const result = advanceTime(start, TICKS_PER_MINUTE);
    expect(result).toEqual({ day: 2, hour: 0, minute: 0 });
  });
});
