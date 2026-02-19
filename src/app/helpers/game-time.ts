import { computed } from '@angular/core';
import { gamestate } from '@helpers/state-game';
import { optionsGet, optionsSet } from '@helpers/state-options';
import type { GameSpeed, GameStateClock } from '@interfaces';
import type { GameTime } from '@interfaces/game-time';

export const GAME_TIME_MINUTES_PER_HOUR = 60;
export const GAME_TIME_HOURS_PER_DAY = 24;
export const GAME_TIME_TICKS_PER_MINUTE = 1;

export function gameTimeAdvance(
  clock: GameTime,
  numTicks: number,
): GameTime {
  let { day, hour, minute } = clock;

  const minutesToAdd = Math.floor(numTicks / GAME_TIME_TICKS_PER_MINUTE);
  minute += minutesToAdd;

  if (minute >= GAME_TIME_MINUTES_PER_HOUR) {
    hour += Math.floor(minute / GAME_TIME_MINUTES_PER_HOUR);
    minute = minute % GAME_TIME_MINUTES_PER_HOUR;
  }

  if (hour >= GAME_TIME_HOURS_PER_DAY) {
    day += Math.floor(hour / GAME_TIME_HOURS_PER_DAY);
    hour = hour % GAME_TIME_HOURS_PER_DAY;
  }

  return { day, hour, minute };
}

export function gameTimeAdvanceClock(
  clock: GameStateClock,
  numTicks: number,
): GameStateClock {
  const { day, hour, minute } = gameTimeAdvance(clock, numTicks);
  return { ...clock, day, hour, minute };
}

export const gameTimeDay = computed(() => gamestate().clock.day);
export const gameTimeHour = computed(() => gamestate().clock.hour);
export const gameTimeMinute = computed(() => gamestate().clock.minute);

export const gameTimeFormatted = computed(() => {
  const d = gameTimeDay();
  const h = gameTimeHour();
  const m = gameTimeMinute();
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `Day ${d} - ${hh}:${mm}`;
});

/**
 * Convert ticks to real wall-clock seconds at the current game speed.
 */
export function ticksToRealSeconds(ticks: number): number {
  return ticks / optionsGet('gameSpeed');
}

/**
 * Format a tick-based duration as real wall-clock time.
 * Accounts for current game speed.
 */
export function formatRealDuration(ticks: number): string {
  const realSeconds = ticksToRealSeconds(ticks);
  if (realSeconds < 1) return '< 1 sec';
  if (realSeconds < 60) return `${Math.ceil(realSeconds)} sec`;
  const minutes = Math.floor(realSeconds / 60);
  let secs = Math.ceil(realSeconds % 60);
  if (secs === 60) return `${minutes + 1} min`;
  if (secs === 0) return `${minutes} min`;
  return `${minutes} min ${secs} sec`;
}

export const GAME_TIME_SPEEDS: GameSpeed[] = [1, 2, 4];

export const gameTimeSpeed = computed(() => optionsGet('gameSpeed'));

export function gameTimeSetSpeed(speed: GameSpeed): void {
  optionsSet('gameSpeed', speed);
}
