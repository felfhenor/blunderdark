import { computed } from '@angular/core';
import { gameEventTimeToMinutes } from '@helpers/game-events';
import type { GameTime } from '@interfaces/game-time';
import { notify } from '@helpers/notify';
import { reputationAwardInPlace } from '@helpers/reputation';
import { rngNumberRange, rngRandom } from '@helpers/rng';
import { victoryRecordDefenseWin } from '@helpers/victory';
import { gamestate } from '@helpers/state-game';
import type {
  GameState,
  InvasionSchedule,
  SpecialInvasionType,
} from '@interfaces';
import type { PRNG } from 'seedrandom';

// --- Constants ---

export const INVASION_TRIGGER_DEFAULT_GRACE_PERIOD = 30;
export const INVASION_TRIGGER_MIN_INTERVAL = 5;
export const INVASION_TRIGGER_MAX_VARIANCE = 2;
export const INVASION_TRIGGER_MIN_DAYS_BETWEEN = 3;
export const INVASION_TRIGGER_WARNING_MINUTES = 2;

// --- Pure functions ---

/**
 * Get the base invasion interval based on the current day.
 * Escalates: 15 days at day 30, 10 at day 60, 7 at day 100, minimum 5.
 */
export function invasionTriggerGetInterval(currentDay: number): number {
  if (currentDay >= 100) return Math.max(7, INVASION_TRIGGER_MIN_INTERVAL);
  if (currentDay >= 60) return 10;
  return 15;
}

export function invasionTriggerIsInGracePeriod(
  currentDay: number,
  gracePeriodEnd: number,
): boolean {
  return currentDay < gracePeriodEnd;
}

export function invasionTriggerGetLastDay(
  schedule: InvasionSchedule,
): number | undefined {
  if (schedule.invasionHistory.length === 0) return undefined;
  return schedule.invasionHistory[schedule.invasionHistory.length - 1].day;
}

/**
 * Calculate the next invasion day with variance and constraints.
 * Variance is determined at scheduling time and not re-rolled.
 */
export function invasionTriggerCalculateNextDay(
  currentDay: number,
  lastInvasionDay: number | undefined,
  gracePeriodEnd: number,
  rng: PRNG,
): { day: number; variance: number } {
  const interval = invasionTriggerGetInterval(currentDay);
  const variance = rngNumberRange(-INVASION_TRIGGER_MAX_VARIANCE, INVASION_TRIGGER_MAX_VARIANCE + 1, rng);

  let nextDay = currentDay + interval + variance;

  // Cannot push before grace period
  if (nextDay < gracePeriodEnd) {
    nextDay = gracePeriodEnd;
  }

  // Min 3 days between consecutive invasions
  if (
    lastInvasionDay !== undefined &&
    nextDay - lastInvasionDay < INVASION_TRIGGER_MIN_DAYS_BETWEEN
  ) {
    nextDay = lastInvasionDay + INVASION_TRIGGER_MIN_DAYS_BETWEEN;
  }

  return { day: nextDay, variance };
}

export function invasionTriggerShouldTrigger(
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
export function invasionTriggerShouldShowWarning(
  schedule: InvasionSchedule,
  currentTime: GameTime,
): boolean {
  if (schedule.nextInvasionDay === undefined) return false;

  const invasionTime: GameTime = {
    day: schedule.nextInvasionDay,
    hour: 0,
    minute: 0,
  };
  const invasionMinutes = gameEventTimeToMinutes(invasionTime);
  const currentMinutes = gameEventTimeToMinutes(currentTime);
  const warningStart = invasionMinutes - INVASION_TRIGGER_WARNING_MINUTES;

  return currentMinutes >= warningStart && currentMinutes < invasionMinutes;
}

/**
 * Add a special invasion that bypasses the normal schedule.
 */
export function invasionTriggerAddSpecial(
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
export function invasionTriggerProcessSchedule(
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
  if (invasionTriggerIsInGracePeriod(currentDay, schedule.gracePeriodEnd)) return;

  // If no invasion scheduled, schedule one
  if (schedule.nextInvasionDay === undefined) {
    const result = invasionTriggerCalculateNextDay(
      currentDay,
      invasionTriggerGetLastDay(schedule),
      schedule.gracePeriodEnd,
      effectiveRng,
    );
    schedule.nextInvasionDay = result.day;
    schedule.nextInvasionVariance = result.variance;
  }

  // Check warning (2 minutes before invasion day start)
  if (invasionTriggerShouldShowWarning(schedule, currentTime) && !schedule.warningDismissed) {
    if (!schedule.warningActive) {
      schedule.warningActive = true;
      notify('Invasion', 'Invasion approaching!');
    }
  } else if (
    !invasionTriggerShouldShowWarning(schedule, currentTime) &&
    !invasionTriggerShouldTrigger(schedule, currentDay)
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
  if (invasionTriggerShouldTrigger(schedule, currentDay)) {
    schedule.invasionHistory.push({ day: currentDay, type: 'scheduled' });
    schedule.warningActive = false;
    schedule.warningDismissed = false;

    reputationAwardInPlace(state, 'Defeat Invader');
    victoryRecordDefenseWin(state);

    // Reschedule next invasion
    const result = invasionTriggerCalculateNextDay(
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

export const invasionTriggerNextDay = computed(
  () => gamestate().world.invasionSchedule.nextInvasionDay,
);

export const invasionTriggerWarningActive = computed(
  () => gamestate().world.invasionSchedule.warningActive,
);

export const invasionTriggerGracePeriodEnd = computed(
  () => gamestate().world.invasionSchedule.gracePeriodEnd,
);

export const invasionTriggerIsInGracePeriodSignal = computed(() =>
  invasionTriggerIsInGracePeriod(
    gamestate().clock.day,
    gamestate().world.invasionSchedule.gracePeriodEnd,
  ),
);

export const invasionTriggerHistory = computed(
  () => gamestate().world.invasionSchedule.invasionHistory,
);
