import { computed } from '@angular/core';
import { gameEventTimeToMinutes } from '@helpers/game-events';
import { INVASION_ESCALATION_EXTRA_INVADERS, invasionFindEntryRoom, invasionStart } from '@helpers/invasion-process';
import { invasionCompositionCalculateDungeonProfile, invasionCompositionGenerateParty } from '@helpers/invasion-composition';
import { invasionThreatGetIntervalReduction, invasionThreatGetPartySizeBonus } from '@helpers/invasion-threat';
import { invasionObjectiveAssign } from '@helpers/invasion-objectives';
import type { GameTime } from '@interfaces/game-time';
import { notify } from '@helpers/notify';
import { rngNumberRange, rngRandom } from '@helpers/rng';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type {
  GameState,
  InvasionHistoryEntry,
  InvasionSchedule,
  PlacedRoomId,
  SpecialInvasionType,
} from '@interfaces';
import type { PRNG } from 'seedrandom';

// --- Constants ---

export const INVASION_TRIGGER_DEFAULT_GRACE_PERIOD = 10;
export const INVASION_TRIGGER_MIN_INTERVAL = 5;
export const INVASION_TRIGGER_MAX_VARIANCE = 2;
export const INVASION_TRIGGER_MIN_DAYS_BETWEEN = 3;
export const INVASION_TRIGGER_WARNING_MINUTES = 2;

// Escalation: unreachable objectives make future invasions come sooner
export const INVASION_ESCALATION_INTERVAL_REDUCTION = 2; // days sooner per unreachable objective

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
      if (!schedule.pendingWarning) {
        invasionTriggerGenerateWarning(state, `invasion-${schedule.nextInvasionDay}-scheduled`, 'scheduled');
      }
      notify('Invasion', 'Invasion approaching!');
    }
  } else if (
    !invasionTriggerShouldShowWarning(schedule, currentTime) &&
    !invasionTriggerShouldTrigger(schedule, currentDay) &&
    !schedule.pendingWarning
  ) {
    schedule.warningActive = false;
    schedule.warningDismissed = false;
  }

  // Guard: skip trigger if an active invasion already exists
  if (state.world.activeInvasion && !state.world.activeInvasion.completed) return;

  // Check special invasions
  for (let i = schedule.pendingSpecialInvasions.length - 1; i >= 0; i--) {
    const special = schedule.pendingSpecialInvasions[i];
    if (currentDay >= special.triggerDay) {
      schedule.pendingSpecialInvasions.splice(i, 1);
      schedule.nextInvasionDay = undefined;
      invasionStart(state, `invasion-${currentDay}-${special.type}`, special.type);
      return;
    }
  }

  // Check if scheduled invasion triggers
  if (invasionTriggerShouldTrigger(schedule, currentDay)) {
    const warning = schedule.pendingWarning;
    schedule.warningActive = false;
    schedule.warningDismissed = false;
    schedule.nextInvasionDay = undefined;
    schedule.pendingWarning = undefined;
    invasionStart(state, `invasion-${currentDay}-scheduled`, 'scheduled', warning);
  }
}

/**
 * Record the invasion result in history and reschedule the next invasion.
 * Called after the battle completes (from the UI).
 */
export function invasionTriggerRecordAndReschedule(
  state: GameState,
  historyEntry: InvasionHistoryEntry,
  rng?: PRNG,
): void {
  const schedule = state.world.invasionSchedule;
  const effectiveRng = rng ?? rngRandom();

  schedule.invasionHistory.push(historyEntry);

  const result = invasionTriggerCalculateNextDay(
    historyEntry.day,
    historyEntry.day,
    schedule.gracePeriodEnd,
    effectiveRng,
  );

  // Escalation: unreachable objectives reduce the interval to next invasion
  const unreachable = historyEntry.unreachableObjectiveCount ?? 0;
  const escalationReduction = unreachable * INVASION_ESCALATION_INTERVAL_REDUCTION;

  // Threat: high player threat also reduces the interval
  const dayThreat = Math.min(100, Math.floor((historyEntry.day - 1) / 3));
  const blendedThreat = Math.min(100, Math.round(
    dayThreat * 0.5 + state.world.playerThreat * 0.5,
  ));
  const threatReduction = invasionThreatGetIntervalReduction(blendedThreat);

  const escalatedDay = result.day - escalationReduction - threatReduction;

  // Enforce minimum gap between invasions even with escalation
  schedule.nextInvasionDay = Math.max(
    historyEntry.day + INVASION_TRIGGER_MIN_DAYS_BETWEEN,
    escalatedDay,
  );
  schedule.nextInvasionVariance = result.variance;
}

// --- Warning generation ---

/**
 * Generate a pending invasion warning and store it on the schedule.
 * Pre-computes invaders, objectives, and entry room for display.
 */
export function invasionTriggerGenerateWarning(
  state: GameState,
  seed: string,
  invasionType: 'scheduled' | SpecialInvasionType,
): void {
  const profile = invasionCompositionCalculateDungeonProfile(state);

  // Escalation: add bonus invaders based on last invasion's unreachable objectives
  const lastHistory = state.world.invasionSchedule.invasionHistory;
  const lastUnreachable = lastHistory.length > 0
    ? (lastHistory[lastHistory.length - 1].unreachableObjectiveCount ?? 0)
    : 0;
  const bonusSize = lastUnreachable * INVASION_ESCALATION_EXTRA_INVADERS
    + invasionThreatGetPartySizeBonus(profile.threatLevel);

  const invaders = invasionCompositionGenerateParty(profile, seed, bonusSize);
  const objectives = invasionObjectiveAssign(state, seed);
  const entryRoom = invasionFindEntryRoom(state);

  state.world.invasionSchedule.pendingWarning = {
    seed,
    invasionType,
    invaders,
    objectives,
    entryRoomId: (entryRoom?.id ?? '') as PlacedRoomId,
    profile,
  };
}

// --- Debug ---

/**
 * Two-phase debug invasion trigger.
 * Phase 1: generates warning preview.
 * Phase 2: starts the invasion using the pre-generated warning.
 */
export function debugTriggerInvasion(): void {
  updateGamestate((state) => {
    const schedule = state.world.invasionSchedule;
    if (schedule.pendingWarning) {
      // Phase 2: start invasion from pending warning
      const warning = schedule.pendingWarning;
      schedule.pendingWarning = undefined;
      schedule.warningActive = false;
      invasionStart(state, warning.seed, warning.invasionType, warning);
    } else {
      // Phase 1: generate warning
      const seed = `invasion-${state.clock.day}-debug`;
      invasionTriggerGenerateWarning(state, seed, 'scheduled');
      schedule.warningActive = true;
    }
    return state;
  });
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

export const invasionTriggerPendingWarning = computed(
  () => gamestate().world.invasionSchedule.pendingWarning,
);

export const invasionTriggerWarningInvaders = computed(
  () => gamestate().world.invasionSchedule.pendingWarning?.invaders ?? [],
);

export const invasionTriggerWarningObjectives = computed(
  () => gamestate().world.invasionSchedule.pendingWarning?.objectives ?? [],
);
