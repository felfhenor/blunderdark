import { computed } from '@angular/core';
import { gameTimeToMinutes } from '@helpers/game-events';
import type { GameTime } from '@helpers/game-time';
import { notify } from '@helpers/notify';
import { rngNumberRange, rngRandom } from '@helpers/rng';
import { gamestate } from '@helpers/state-game';
import type {
  GameState,
  InvasionSchedule,
  SpecialInvasionType,
} from '@interfaces';
import type { PRNG } from 'seedrandom';

// --- Constants ---

export const DEFAULT_GRACE_PERIOD = 30;
export const MIN_INVASION_INTERVAL = 5;
export const MAX_VARIANCE = 2;
export const MIN_DAYS_BETWEEN_INVASIONS = 3;
export const WARNING_MINUTES = 2;

// --- Pure functions ---

/**
 * Get the base invasion interval based on the current day.
 * Escalates: 15 days at day 30, 10 at day 60, 7 at day 100, minimum 5.
 */
export function getInvasionInterval(currentDay: number): number {
  if (currentDay >= 100) return Math.max(7, MIN_INVASION_INTERVAL);
  if (currentDay >= 60) return 10;
  return 15;
}

export function isInGracePeriod(
  currentDay: number,
  gracePeriodEnd: number,
): boolean {
  return currentDay < gracePeriodEnd;
}

export function getLastInvasionDay(
  schedule: InvasionSchedule,
): number | undefined {
  if (schedule.invasionHistory.length === 0) return undefined;
  return schedule.invasionHistory[schedule.invasionHistory.length - 1].day;
}

/**
 * Calculate the next invasion day with variance and constraints.
 * Variance is determined at scheduling time and not re-rolled.
 */
export function calculateNextInvasionDay(
  currentDay: number,
  lastInvasionDay: number | undefined,
  gracePeriodEnd: number,
  rng: PRNG,
): { day: number; variance: number } {
  const interval = getInvasionInterval(currentDay);
  const variance = rngNumberRange(-MAX_VARIANCE, MAX_VARIANCE + 1, rng);

  let nextDay = currentDay + interval + variance;

  // Cannot push before grace period
  if (nextDay < gracePeriodEnd) {
    nextDay = gracePeriodEnd;
  }

  // Min 3 days between consecutive invasions
  if (
    lastInvasionDay !== undefined &&
    nextDay - lastInvasionDay < MIN_DAYS_BETWEEN_INVASIONS
  ) {
    nextDay = lastInvasionDay + MIN_DAYS_BETWEEN_INVASIONS;
  }

  return { day: nextDay, variance };
}

export function shouldTriggerInvasion(
  schedule: InvasionSchedule,
  currentDay: number,
): boolean {
  if (schedule.nextInvasionDay === undefined) return false;
  return currentDay >= schedule.nextInvasionDay;
}

/**
 * Check if the invasion warning should be active.
 * Warning fires 2 game-minutes before invasion start (day start = hour 0, minute 0).
 */
export function shouldShowWarning(
  schedule: InvasionSchedule,
  currentTime: GameTime,
): boolean {
  if (schedule.nextInvasionDay === undefined) return false;

  const invasionTime: GameTime = {
    day: schedule.nextInvasionDay,
    hour: 0,
    minute: 0,
  };
  const invasionMinutes = gameTimeToMinutes(invasionTime);
  const currentMinutes = gameTimeToMinutes(currentTime);
  const warningStart = invasionMinutes - WARNING_MINUTES;

  return currentMinutes >= warningStart && currentMinutes < invasionMinutes;
}

/**
 * Add a special invasion that bypasses the normal schedule.
 */
export function addSpecialInvasion(
  schedule: InvasionSchedule,
  type: SpecialInvasionType,
  currentDay: number,
  delay: number = 1,
): InvasionSchedule {
  return {
    ...schedule,
    pendingSpecialInvasions: [
      ...schedule.pendingSpecialInvasions,
      { type, triggerDay: currentDay + delay },
    ],
  };
}

// --- Gameloop processor ---

/**
 * Process invasion scheduling each tick. Called inside updateGamestate.
 * Handles grace period, scheduling, triggering, warnings, and special invasions.
 */
export function processInvasionSchedule(
  state: GameState,
  rng?: PRNG,
): void {
  const schedule = state.world.invasionSchedule;
  const currentDay = state.clock.day;
  const currentTime: GameTime = {
    day: state.clock.day,
    hour: state.clock.hour,
    minute: state.clock.minute,
  };

  const effectiveRng = rng ?? rngRandom();

  // If in grace period, nothing to do
  if (isInGracePeriod(currentDay, schedule.gracePeriodEnd)) return;

  // If no invasion scheduled, schedule one
  if (schedule.nextInvasionDay === undefined) {
    const result = calculateNextInvasionDay(
      currentDay,
      getLastInvasionDay(schedule),
      schedule.gracePeriodEnd,
      effectiveRng,
    );
    schedule.nextInvasionDay = result.day;
    schedule.nextInvasionVariance = result.variance;
  }

  // Check warning (2 minutes before invasion day start)
  if (shouldShowWarning(schedule, currentTime) && !schedule.warningDismissed) {
    if (!schedule.warningActive) {
      schedule.warningActive = true;
      notify('Invasion', 'Invasion approaching!');
    }
  } else if (
    !shouldShowWarning(schedule, currentTime) &&
    !shouldTriggerInvasion(schedule, currentDay)
  ) {
    schedule.warningActive = false;
    schedule.warningDismissed = false;
  }

  // Check special invasions
  for (let i = schedule.pendingSpecialInvasions.length - 1; i >= 0; i--) {
    const special = schedule.pendingSpecialInvasions[i];
    if (currentDay >= special.triggerDay) {
      schedule.invasionHistory.push({ day: currentDay, type: special.type });
      schedule.pendingSpecialInvasions.splice(i, 1);
    }
  }

  // Check if scheduled invasion triggers
  if (shouldTriggerInvasion(schedule, currentDay)) {
    schedule.invasionHistory.push({ day: currentDay, type: 'scheduled' });
    schedule.warningActive = false;
    schedule.warningDismissed = false;

    // Reschedule next invasion
    const result = calculateNextInvasionDay(
      currentDay,
      currentDay,
      schedule.gracePeriodEnd,
      effectiveRng,
    );
    schedule.nextInvasionDay = result.day;
    schedule.nextInvasionVariance = result.variance;
  }
}

// --- Computed signals ---

export const nextInvasionDay = computed(
  () => gamestate().world.invasionSchedule.nextInvasionDay,
);

export const invasionWarningActive = computed(
  () => gamestate().world.invasionSchedule.warningActive,
);

export const invasionGracePeriodEnd = computed(
  () => gamestate().world.invasionSchedule.gracePeriodEnd,
);

export const isInGracePeriodSignal = computed(() =>
  isInGracePeriod(
    gamestate().clock.day,
    gamestate().world.invasionSchedule.gracePeriodEnd,
  ),
);

export const invasionHistory = computed(
  () => gamestate().world.invasionSchedule.invasionHistory,
);
