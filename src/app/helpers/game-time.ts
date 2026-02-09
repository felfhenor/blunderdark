import { computed } from '@angular/core';
import { gamestate } from '@helpers/state-game';
import type { GameStateClock } from '@interfaces';

export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const TICKS_PER_MINUTE = 5;

export type GameTime = {
  day: number;
  hour: number;
  minute: number;
};

export function advanceTime(
  clock: GameTime,
  numTicks: number,
): GameTime {
  let { day, hour, minute } = clock;

  const minutesToAdd = Math.floor(numTicks / TICKS_PER_MINUTE);
  minute += minutesToAdd;

  if (minute >= MINUTES_PER_HOUR) {
    hour += Math.floor(minute / MINUTES_PER_HOUR);
    minute = minute % MINUTES_PER_HOUR;
  }

  if (hour >= HOURS_PER_DAY) {
    day += Math.floor(hour / HOURS_PER_DAY);
    hour = hour % HOURS_PER_DAY;
  }

  return { day, hour, minute };
}

export function advanceClockTime(
  clock: GameStateClock,
  numTicks: number,
): GameStateClock {
  const { day, hour, minute } = advanceTime(clock, numTicks);
  return { ...clock, day, hour, minute };
}

export const gameDay = computed(() => gamestate().clock.day);
export const gameHour = computed(() => gamestate().clock.hour);
export const gameMinute = computed(() => gamestate().clock.minute);

export const formattedGameTime = computed(() => {
  const d = gameDay();
  const h = gameHour();
  const m = gameMinute();
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `Day ${d} - ${hh}:${mm}`;
});
