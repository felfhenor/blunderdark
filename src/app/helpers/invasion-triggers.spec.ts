import { describe, expect, it, vi, beforeEach } from 'vitest';
import seedrandom from 'seedrandom';
import type { GameState, InvasionSchedule } from '@interfaces';
import type { GameTime } from '@helpers/game-time';
import {
  getInvasionInterval,
  isInGracePeriod,
  getLastInvasionDay,
  calculateNextInvasionDay,
  shouldTriggerInvasion,
  shouldShowWarning,
  addSpecialInvasion,
  processInvasionSchedule,
  DEFAULT_GRACE_PERIOD,
  MIN_INVASION_INTERVAL,
  MAX_VARIANCE,
  MIN_DAYS_BETWEEN_INVASIONS,
  WARNING_MINUTES,
} from '@helpers/invasion-triggers';
import { defaultInvasionSchedule } from '@helpers/defaults';

vi.mock('@helpers/state-game', () => ({
  gamestate: vi.fn(() => ({})),
  updateGamestate: vi.fn(),
}));

vi.mock('@helpers/notify', () => ({
  notify: vi.fn(),
}));

function makeSchedule(
  overrides: Partial<InvasionSchedule> = {},
): InvasionSchedule {
  return { ...defaultInvasionSchedule(), ...overrides };
}

function makeGameState(overrides: {
  day?: number;
  hour?: number;
  minute?: number;
  schedule?: Partial<InvasionSchedule>;
}): GameState {
  return {
    meta: { version: 1, isSetup: true, isPaused: false, createdAt: 0 },
    gameId: 'test-game' as GameState['gameId'],
    clock: {
      numTicks: 0,
      lastSaveTick: 0,
      day: overrides.day ?? 1,
      hour: overrides.hour ?? 0,
      minute: overrides.minute ?? 0,
    },
    world: {
      grid: { tiles: [], width: 0, height: 0 },
      resources: {} as GameState['world']['resources'],
      inhabitants: [],
      hallways: [],
      season: {
        currentSeason: 'growth',
        dayInSeason: 1,
        totalSeasonCycles: 0,
      },
      research: {
        completedNodes: [],
        activeResearch: null,
        activeResearchProgress: 0,
        activeResearchStartTick: 0,
      },
      reputation: { terror: 0, wealth: 0, knowledge: 0, harmony: 0, chaos: 0 },
      floors: [],
      currentFloorIndex: 0,
      trapInventory: [],
      trapCraftingQueues: [],
      invasionSchedule: makeSchedule(overrides.schedule),
    },
  } as unknown as GameState;
}

describe('invasion-triggers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- getInvasionInterval ---

  describe('getInvasionInterval', () => {
    it('should return 15 for days before 60', () => {
      expect(getInvasionInterval(30)).toBe(15);
      expect(getInvasionInterval(45)).toBe(15);
      expect(getInvasionInterval(59)).toBe(15);
    });

    it('should return 10 for days 60-99', () => {
      expect(getInvasionInterval(60)).toBe(10);
      expect(getInvasionInterval(75)).toBe(10);
      expect(getInvasionInterval(99)).toBe(10);
    });

    it('should return 7 for days 100+', () => {
      expect(getInvasionInterval(100)).toBe(7);
      expect(getInvasionInterval(200)).toBe(7);
    });

    it('should never return less than MIN_INVASION_INTERVAL', () => {
      for (const day of [1, 30, 60, 100, 500]) {
        expect(getInvasionInterval(day)).toBeGreaterThanOrEqual(
          MIN_INVASION_INTERVAL,
        );
      }
    });
  });

  // --- isInGracePeriod ---

  describe('isInGracePeriod', () => {
    it('should return true when before grace period end', () => {
      expect(isInGracePeriod(1, 30)).toBe(true);
      expect(isInGracePeriod(29, 30)).toBe(true);
    });

    it('should return false when at or past grace period end', () => {
      expect(isInGracePeriod(30, 30)).toBe(false);
      expect(isInGracePeriod(31, 30)).toBe(false);
    });
  });

  // --- getLastInvasionDay ---

  describe('getLastInvasionDay', () => {
    it('should return null for empty history', () => {
      const schedule = makeSchedule();
      expect(getLastInvasionDay(schedule)).toBeNull();
    });

    it('should return the day of the last invasion', () => {
      const schedule = makeSchedule({
        invasionHistory: [
          { day: 30, type: 'scheduled' },
          { day: 45, type: 'scheduled' },
        ],
      });
      expect(getLastInvasionDay(schedule)).toBe(45);
    });
  });

  // --- calculateNextInvasionDay ---

  describe('calculateNextInvasionDay', () => {
    it('should schedule based on interval + variance', () => {
      const rng = seedrandom('fixed-seed');
      const result = calculateNextInvasionDay(30, null, 30, rng);
      expect(result.day).toBeGreaterThanOrEqual(30 + 15 - MAX_VARIANCE);
      expect(result.day).toBeLessThanOrEqual(30 + 15 + MAX_VARIANCE);
      expect(result.variance).toBeGreaterThanOrEqual(-MAX_VARIANCE);
      expect(result.variance).toBeLessThanOrEqual(MAX_VARIANCE);
    });

    it('should not push invasion before grace period', () => {
      // Use day 28 with a large negative variance — result should be >= 30
      const rng = seedrandom('push-before-grace');
      const result = calculateNextInvasionDay(28, null, 30, rng);
      expect(result.day).toBeGreaterThanOrEqual(30);
    });

    it('should enforce minimum 3 days between invasions', () => {
      const rng = seedrandom('min-gap');
      // Last invasion on day 44, scheduling from day 45
      // Even with 15-day interval, enforce min gap from lastInvasionDay
      const result = calculateNextInvasionDay(45, 44, 30, rng);
      expect(result.day - 44).toBeGreaterThanOrEqual(MIN_DAYS_BETWEEN_INVASIONS);
    });

    it('should use correct interval for day 60+', () => {
      const rng = seedrandom('day-60');
      const result = calculateNextInvasionDay(60, null, 30, rng);
      // Interval is 10 at day 60, so day should be ~70 +/- 2
      expect(result.day).toBeGreaterThanOrEqual(60 + 10 - MAX_VARIANCE);
      expect(result.day).toBeLessThanOrEqual(60 + 10 + MAX_VARIANCE);
    });

    it('should use correct interval for day 100+', () => {
      const rng = seedrandom('day-100');
      const result = calculateNextInvasionDay(100, null, 30, rng);
      // Interval is 7 at day 100, so day should be ~107 +/- 2
      expect(result.day).toBeGreaterThanOrEqual(100 + 7 - MAX_VARIANCE);
      expect(result.day).toBeLessThanOrEqual(100 + 7 + MAX_VARIANCE);
    });

    it('should produce deterministic results with same seed', () => {
      const rng1 = seedrandom('deterministic');
      const rng2 = seedrandom('deterministic');
      const result1 = calculateNextInvasionDay(30, null, 30, rng1);
      const result2 = calculateNextInvasionDay(30, null, 30, rng2);
      expect(result1).toEqual(result2);
    });
  });

  // --- shouldTriggerInvasion ---

  describe('shouldTriggerInvasion', () => {
    it('should return false when no invasion scheduled', () => {
      const schedule = makeSchedule({ nextInvasionDay: null });
      expect(shouldTriggerInvasion(schedule, 50)).toBe(false);
    });

    it('should return false before scheduled day', () => {
      const schedule = makeSchedule({ nextInvasionDay: 45 });
      expect(shouldTriggerInvasion(schedule, 44)).toBe(false);
    });

    it('should return true on scheduled day', () => {
      const schedule = makeSchedule({ nextInvasionDay: 45 });
      expect(shouldTriggerInvasion(schedule, 45)).toBe(true);
    });

    it('should return true after scheduled day (past-due)', () => {
      const schedule = makeSchedule({ nextInvasionDay: 45 });
      expect(shouldTriggerInvasion(schedule, 50)).toBe(true);
    });
  });

  // --- shouldShowWarning ---

  describe('shouldShowWarning', () => {
    it('should return false when no invasion scheduled', () => {
      const schedule = makeSchedule({ nextInvasionDay: null });
      const time: GameTime = { day: 44, hour: 23, minute: 58 };
      expect(shouldShowWarning(schedule, time)).toBe(false);
    });

    it('should return true within warning window', () => {
      const schedule = makeSchedule({ nextInvasionDay: 45 });
      // 2 minutes before day 45 start = day 44, 23:58
      const time: GameTime = { day: 44, hour: 23, minute: 58 };
      expect(shouldShowWarning(schedule, time)).toBe(true);
    });

    it('should return true at exactly warning start', () => {
      const schedule = makeSchedule({ nextInvasionDay: 45 });
      const time: GameTime = { day: 44, hour: 23, minute: 58 };
      expect(shouldShowWarning(schedule, time)).toBe(true);
    });

    it('should return true 1 minute before invasion', () => {
      const schedule = makeSchedule({ nextInvasionDay: 45 });
      const time: GameTime = { day: 44, hour: 23, minute: 59 };
      expect(shouldShowWarning(schedule, time)).toBe(true);
    });

    it('should return false at invasion time', () => {
      const schedule = makeSchedule({ nextInvasionDay: 45 });
      const time: GameTime = { day: 45, hour: 0, minute: 0 };
      expect(shouldShowWarning(schedule, time)).toBe(false);
    });

    it('should return false well before warning window', () => {
      const schedule = makeSchedule({ nextInvasionDay: 45 });
      const time: GameTime = { day: 44, hour: 23, minute: 55 };
      expect(shouldShowWarning(schedule, time)).toBe(false);
    });
  });

  // --- addSpecialInvasion ---

  describe('addSpecialInvasion', () => {
    it('should add a special invasion with default delay of 1', () => {
      const schedule = makeSchedule();
      const result = addSpecialInvasion(schedule, 'crusade', 50);
      expect(result.pendingSpecialInvasions).toHaveLength(1);
      expect(result.pendingSpecialInvasions[0]).toEqual({
        type: 'crusade',
        triggerDay: 51,
      });
    });

    it('should add a special invasion with custom delay', () => {
      const schedule = makeSchedule();
      const result = addSpecialInvasion(schedule, 'raid', 50, 3);
      expect(result.pendingSpecialInvasions[0]).toEqual({
        type: 'raid',
        triggerDay: 53,
      });
    });

    it('should not mutate the original schedule', () => {
      const schedule = makeSchedule();
      addSpecialInvasion(schedule, 'bounty_hunter', 50);
      expect(schedule.pendingSpecialInvasions).toHaveLength(0);
    });
  });

  // --- processInvasionSchedule ---

  describe('processInvasionSchedule', () => {
    it('should do nothing during grace period', () => {
      const state = makeGameState({ day: 15 });
      const rng = seedrandom('grace');
      processInvasionSchedule(state, rng);
      expect(state.world.invasionSchedule.nextInvasionDay).toBeNull();
    });

    it('should schedule first invasion when grace period ends', () => {
      const state = makeGameState({ day: 30 });
      const rng = seedrandom('first-schedule');
      processInvasionSchedule(state, rng);
      expect(state.world.invasionSchedule.nextInvasionDay).not.toBeNull();
      expect(
        state.world.invasionSchedule.nextInvasionDay!,
      ).toBeGreaterThanOrEqual(30);
    });

    it('should not re-schedule if invasion already scheduled', () => {
      const state = makeGameState({
        day: 35,
        schedule: { nextInvasionDay: 45 },
      });
      const rng = seedrandom('no-reschedule');
      processInvasionSchedule(state, rng);
      expect(state.world.invasionSchedule.nextInvasionDay).toBe(45);
    });

    it('should trigger invasion on scheduled day and reschedule', () => {
      const state = makeGameState({
        day: 45,
        schedule: { nextInvasionDay: 45 },
      });
      const rng = seedrandom('trigger');
      processInvasionSchedule(state, rng);
      // Should have recorded the invasion
      expect(state.world.invasionSchedule.invasionHistory).toHaveLength(1);
      expect(state.world.invasionSchedule.invasionHistory[0]).toEqual({
        day: 45,
        type: 'scheduled',
      });
      // Should have rescheduled
      expect(
        state.world.invasionSchedule.nextInvasionDay!,
      ).toBeGreaterThan(45);
    });

    it('should trigger past-due invasion on load', () => {
      const state = makeGameState({
        day: 50,
        schedule: { nextInvasionDay: 45 },
      });
      const rng = seedrandom('past-due');
      processInvasionSchedule(state, rng);
      expect(state.world.invasionSchedule.invasionHistory).toHaveLength(1);
      expect(state.world.invasionSchedule.invasionHistory[0].day).toBe(50);
    });

    it('should activate warning before invasion', () => {
      const state = makeGameState({
        day: 44,
        hour: 23,
        minute: 58,
        schedule: { nextInvasionDay: 45 },
      });
      const rng = seedrandom('warning');
      processInvasionSchedule(state, rng);
      expect(state.world.invasionSchedule.warningActive).toBe(true);
    });

    it('should not activate warning if dismissed', () => {
      const state = makeGameState({
        day: 44,
        hour: 23,
        minute: 58,
        schedule: { nextInvasionDay: 45, warningDismissed: true },
      });
      const rng = seedrandom('warning-dismissed');
      processInvasionSchedule(state, rng);
      // warningActive should remain false since dismissed
      expect(state.world.invasionSchedule.warningActive).toBe(false);
    });

    it('should trigger special invasions on their trigger day', () => {
      const state = makeGameState({
        day: 50,
        schedule: {
          nextInvasionDay: 70,
          pendingSpecialInvasions: [{ type: 'crusade', triggerDay: 50 }],
        },
      });
      const rng = seedrandom('special');
      processInvasionSchedule(state, rng);
      expect(state.world.invasionSchedule.invasionHistory).toHaveLength(1);
      expect(state.world.invasionSchedule.invasionHistory[0]).toEqual({
        day: 50,
        type: 'crusade',
      });
      expect(
        state.world.invasionSchedule.pendingSpecialInvasions,
      ).toHaveLength(0);
    });

    it('should not trigger special invasions before their trigger day', () => {
      const state = makeGameState({
        day: 40,
        schedule: {
          nextInvasionDay: 70,
          pendingSpecialInvasions: [{ type: 'raid', triggerDay: 50 }],
        },
      });
      const rng = seedrandom('special-not-yet');
      processInvasionSchedule(state, rng);
      expect(state.world.invasionSchedule.invasionHistory).toHaveLength(0);
      expect(
        state.world.invasionSchedule.pendingSpecialInvasions,
      ).toHaveLength(1);
    });

    it('should maintain escalating frequency across multiple invasions', () => {
      const rng = seedrandom('escalation');
      const state = makeGameState({ day: 30 });

      // First scheduling
      processInvasionSchedule(state, rng);
      const firstDay = state.world.invasionSchedule.nextInvasionDay!;
      expect(firstDay).toBeGreaterThanOrEqual(30 + 15 - MAX_VARIANCE);
      expect(firstDay).toBeLessThanOrEqual(30 + 15 + MAX_VARIANCE);

      // Advance to first invasion day
      state.clock.day = firstDay;
      const rng2 = seedrandom('escalation-2');
      processInvasionSchedule(state, rng2);

      // Next invasion should be scheduled from a higher day
      const secondDay = state.world.invasionSchedule.nextInvasionDay!;
      expect(secondDay).toBeGreaterThan(firstDay);
    });

    it('should clear warning state after invasion triggers', () => {
      const state = makeGameState({
        day: 45,
        schedule: { nextInvasionDay: 45, warningActive: true },
      });
      const rng = seedrandom('clear-warning');
      processInvasionSchedule(state, rng);
      expect(state.world.invasionSchedule.warningActive).toBe(false);
      expect(state.world.invasionSchedule.warningDismissed).toBe(false);
    });
  });

  // --- Constants ---

  describe('constants', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_GRACE_PERIOD).toBe(30);
      expect(MIN_INVASION_INTERVAL).toBe(5);
      expect(MAX_VARIANCE).toBe(2);
      expect(MIN_DAYS_BETWEEN_INVASIONS).toBe(3);
      expect(WARNING_MINUTES).toBe(2);
    });
  });

  // --- defaultInvasionSchedule ---

  describe('defaultInvasionSchedule', () => {
    it('should have correct defaults', () => {
      const schedule = defaultInvasionSchedule();
      expect(schedule.nextInvasionDay).toBeNull();
      expect(schedule.nextInvasionVariance).toBe(0);
      expect(schedule.gracePeriodEnd).toBe(30);
      expect(schedule.invasionHistory).toEqual([]);
      expect(schedule.pendingSpecialInvasions).toEqual([]);
      expect(schedule.warningActive).toBe(false);
      expect(schedule.warningDismissed).toBe(false);
    });
  });
});
