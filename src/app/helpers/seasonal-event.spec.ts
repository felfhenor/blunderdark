import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GameState, ActiveSeasonalEffect, SeasonalEventState } from '@interfaces';
import type {
  SeasonalEventContent,
  SeasonalEventId,
  EventEffect,
} from '@interfaces/content-seasonalevent';

// --- Mocks ---

vi.mock('@helpers/content', () => ({
  contentGetEntriesByType: vi.fn(),
}));

vi.mock('@helpers/notify', () => ({
  notify: vi.fn(),
}));

// --- Import after mocks ---

import {
  seasonalEventGetEligible,
  seasonalEventSelectWeighted,
  seasonalEventCheckCycleReset,
  seasonalEventTickActiveEffects,
  seasonalEventGetProductionModifier,
  seasonalEventApplyEffects,
  seasonalEventProcess,
  seasonalEventResetLastProcessedDay,
} from '@helpers/seasonal-event';
import { contentGetEntriesByType } from '@helpers/content';
import { rngSeeded } from '@helpers/rng';

const EVENT_1 = 'event-1' as SeasonalEventId;
const EVENT_2 = 'event-2' as SeasonalEventId;
const EVENT_3 = 'event-3' as SeasonalEventId;

function makeEvent(
  id: SeasonalEventId,
  season: 'growth' | 'harvest' | 'darkness' | 'storms',
  weight = 10,
): SeasonalEventContent {
  return {
    id,
    name: `Event ${id}`,
    __type: 'seasonalevent',
    description: `Test event ${id}`,
    season,
    weight,
    flavorText: 'Test flavor text',
    effects: [],
    choices: [],
  };
}

function makeDefaultSeasonalEventState(): SeasonalEventState {
  return {
    triggeredEventIds: [],
    activeEffects: [],
    pendingEvent: undefined,
    lastSeasonCycleForReset: 0,
  };
}

function makeGameState(overrides: {
  day?: number;
  season?: string;
  seasonalEvent?: Partial<SeasonalEventState>;
  totalSeasonCycles?: number;
}): GameState {
  return {
    meta: { version: 1, isSetup: true, isPaused: false, createdAt: 0 },
    gameId: 'test-game' as GameState['gameId'],
    clock: {
      numTicks: 0,
      lastSaveTick: 0,
      day: overrides.day ?? 1,
      hour: 0,
      minute: 0,
    },
    world: {
      grid: { tiles: [], width: 0, height: 0 },
      resources: {
        crystals: { current: 100, max: 500 },
        food: { current: 50, max: 500 },
        gold: { current: 200, max: 1000 },
        flux: { current: 30, max: 200 },
        research: { current: 0, max: 300 },
        essence: { current: 0, max: 200 },
        corruption: { current: 0, max: Number.MAX_SAFE_INTEGER },
      },
      inhabitants: [],
      hallways: [],
      season: {
        currentSeason: (overrides.season ?? 'growth') as 'growth',
        dayInSeason: 1,
        totalSeasonCycles: overrides.totalSeasonCycles ?? 0,
      },
      research: {
        completedNodes: [],
        activeResearch: undefined,
        activeResearchProgress: 0,
        activeResearchStartTick: 0,
        unlockedContent: {
          rooms: [],
          inhabitants: [],
          abilities: [],
          upgrades: [],
          passiveBonuses: [],
        },
      },
      reputation: { terror: 0, wealth: 0, knowledge: 0, harmony: 0, chaos: 0 },
      floors: [],
      currentFloorIndex: 0,
      trapInventory: [],
      trapCraftingQueues: [],
      forgeInventory: [],
      forgeCraftingQueues: [],
      alchemyConversions: [],
      prisoners: [],
      invasionSchedule: {
        nextInvasionDay: undefined,
        nextInvasionVariance: 0,
        gracePeriodEnd: 30,
        invasionHistory: [],
        pendingSpecialInvasions: [],
        warningActive: false,
        warningDismissed: false,
      },
      corruptionEffects: {
        darkUpgradeUnlocked: false,
        lastMutationCorruption: undefined,
        lastCrusadeCorruption: undefined,
        warnedThresholds: [],
      },
      stairs: [],
      elevators: [],
      portals: [],
      victoryProgress: {
        consecutivePeacefulDays: 0,
        lastPeacefulCheckDay: 0,
        consecutiveZeroCorruptionDays: 0,
        lastZeroCorruptionCheckDay: 0,
        totalInvasionDefenseWins: 0,
      },
      merchant: {
        isPresent: false,
        arrivalDay: 0,
        departureDayRemaining: 0,
        inventory: [],
      },
      seasonalEvent: {
        ...makeDefaultSeasonalEventState(),
        ...overrides.seasonalEvent,
      },
    },
  } as unknown as GameState;
}

beforeEach(() => {
  vi.clearAllMocks();
  seasonalEventResetLastProcessedDay();
});

// --- seasonalEventGetEligible ---

describe('seasonalEventGetEligible', () => {
  it('should filter events by season', () => {
    const events = [
      makeEvent(EVENT_1, 'growth'),
      makeEvent(EVENT_2, 'harvest'),
      makeEvent(EVENT_3, 'growth'),
    ];

    const result = seasonalEventGetEligible(events, 'growth', []);
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.id)).toEqual([EVENT_1, EVENT_3]);
  });

  it('should exclude already triggered events', () => {
    const events = [
      makeEvent(EVENT_1, 'growth'),
      makeEvent(EVENT_2, 'growth'),
    ];

    const result = seasonalEventGetEligible(events, 'growth', [EVENT_1]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(EVENT_2);
  });

  it('should return empty when no events match', () => {
    const events = [makeEvent(EVENT_1, 'harvest')];
    const result = seasonalEventGetEligible(events, 'growth', []);
    expect(result).toHaveLength(0);
  });
});

// --- seasonalEventSelectWeighted ---

describe('seasonalEventSelectWeighted', () => {
  it('should return undefined for empty array', () => {
    expect(seasonalEventSelectWeighted([])).toBeUndefined();
  });

  it('should return the only event when one available', () => {
    const events = [makeEvent(EVENT_1, 'growth')];
    const result = seasonalEventSelectWeighted(events);
    expect(result?.id).toBe(EVENT_1);
  });

  it('should return a valid event with seeded rng', () => {
    const events = [
      makeEvent(EVENT_1, 'growth', 10),
      makeEvent(EVENT_2, 'growth', 10),
    ];
    const rng = rngSeeded('test-seed');
    const result = seasonalEventSelectWeighted(events, rng);
    expect(result).toBeDefined();
    expect([EVENT_1, EVENT_2]).toContain(result!.id);
  });

  it('should heavily favor high-weight events', () => {
    const events = [
      makeEvent(EVENT_1, 'growth', 100),
      makeEvent(EVENT_2, 'growth', 1),
    ];

    let event1Count = 0;
    for (let i = 0; i < 100; i++) {
      const rng = rngSeeded(`seed-${i}`);
      const result = seasonalEventSelectWeighted(events, rng);
      if (result?.id === EVENT_1) event1Count++;
    }

    expect(event1Count).toBeGreaterThan(80);
  });
});

// --- seasonalEventCheckCycleReset ---

describe('seasonalEventCheckCycleReset', () => {
  it('should reset triggered ids on new cycle', () => {
    const state: SeasonalEventState = {
      triggeredEventIds: [EVENT_1, EVENT_2],
      activeEffects: [],
      lastSeasonCycleForReset: 0,
    };

    const didReset = seasonalEventCheckCycleReset(state, 1);
    expect(didReset).toBe(true);
    expect(state.triggeredEventIds).toEqual([]);
    expect(state.lastSeasonCycleForReset).toBe(1);
  });

  it('should not reset on same cycle', () => {
    const state: SeasonalEventState = {
      triggeredEventIds: [EVENT_1],
      activeEffects: [],
      lastSeasonCycleForReset: 1,
    };

    const didReset = seasonalEventCheckCycleReset(state, 1);
    expect(didReset).toBe(false);
    expect(state.triggeredEventIds).toEqual([EVENT_1]);
  });
});

// --- seasonalEventTickActiveEffects ---

describe('seasonalEventTickActiveEffects', () => {
  it('should decrement remaining days', () => {
    const effects: ActiveSeasonalEffect[] = [
      {
        eventId: EVENT_1,
        resourceType: 'gold',
        multiplier: 1.2,
        remainingDays: 3,
        description: 'test',
      },
    ];

    const result = seasonalEventTickActiveEffects(effects);
    expect(result).toHaveLength(1);
    expect(result[0].remainingDays).toBe(2);
  });

  it('should remove expired effects', () => {
    const effects: ActiveSeasonalEffect[] = [
      {
        eventId: EVENT_1,
        resourceType: 'gold',
        multiplier: 1.2,
        remainingDays: 1,
        description: 'test',
      },
    ];

    const result = seasonalEventTickActiveEffects(effects);
    expect(result).toHaveLength(0);
  });

  it('should handle mixed expired and active effects', () => {
    const effects: ActiveSeasonalEffect[] = [
      {
        eventId: EVENT_1,
        resourceType: 'gold',
        multiplier: 1.2,
        remainingDays: 1,
        description: 'expires',
      },
      {
        eventId: EVENT_2,
        resourceType: 'crystals',
        multiplier: 1.5,
        remainingDays: 3,
        description: 'stays',
      },
    ];

    const result = seasonalEventTickActiveEffects(effects);
    expect(result).toHaveLength(1);
    expect(result[0].eventId).toBe(EVENT_2);
    expect(result[0].remainingDays).toBe(2);
  });
});

// --- seasonalEventGetProductionModifier ---

describe('seasonalEventGetProductionModifier', () => {
  it('should return 1.0 when no effects', () => {
    expect(seasonalEventGetProductionModifier([], 'gold')).toBe(1.0);
  });

  it('should return multiplier for matching resource', () => {
    const effects: ActiveSeasonalEffect[] = [
      {
        eventId: EVENT_1,
        resourceType: 'gold',
        multiplier: 1.3,
        remainingDays: 2,
        description: 'test',
      },
    ];
    expect(seasonalEventGetProductionModifier(effects, 'gold')).toBe(1.3);
  });

  it('should ignore non-matching resource types', () => {
    const effects: ActiveSeasonalEffect[] = [
      {
        eventId: EVENT_1,
        resourceType: 'gold',
        multiplier: 1.3,
        remainingDays: 2,
        description: 'test',
      },
    ];
    expect(seasonalEventGetProductionModifier(effects, 'crystals')).toBe(1.0);
  });

  it('should multiply multiple effects for same resource', () => {
    const effects: ActiveSeasonalEffect[] = [
      {
        eventId: EVENT_1,
        resourceType: 'gold',
        multiplier: 1.2,
        remainingDays: 2,
        description: 'test1',
      },
      {
        eventId: EVENT_2,
        resourceType: 'gold',
        multiplier: 1.5,
        remainingDays: 3,
        description: 'test2',
      },
    ];
    expect(seasonalEventGetProductionModifier(effects, 'gold')).toBeCloseTo(1.8);
  });
});

// --- seasonalEventApplyEffects ---

describe('seasonalEventApplyEffects', () => {
  it('should apply resource_gain effect', () => {
    const state = makeGameState({ day: 1 });
    const effects: EventEffect[] = [
      {
        type: 'resource_gain',
        resourceType: 'gold',
        amount: 50,
        description: 'test gain',
      },
    ];

    seasonalEventApplyEffects(state, effects);
    expect(state.world.resources.gold.current).toBe(250);
  });

  it('should cap resource_gain at max', () => {
    const state = makeGameState({ day: 1 });
    state.world.resources.gold.current = 990;

    const effects: EventEffect[] = [
      {
        type: 'resource_gain',
        resourceType: 'gold',
        amount: 50,
        description: 'test gain',
      },
    ];

    seasonalEventApplyEffects(state, effects);
    expect(state.world.resources.gold.current).toBe(1000);
  });

  it('should apply resource_loss with flat amount', () => {
    const state = makeGameState({ day: 1 });
    const effects: EventEffect[] = [
      {
        type: 'resource_loss',
        resourceType: 'gold',
        amount: 50,
        description: 'test loss',
      },
    ];

    seasonalEventApplyEffects(state, effects);
    expect(state.world.resources.gold.current).toBe(150);
  });

  it('should not go below 0 on resource_loss', () => {
    const state = makeGameState({ day: 1 });
    state.world.resources.gold.current = 10;

    const effects: EventEffect[] = [
      {
        type: 'resource_loss',
        resourceType: 'gold',
        amount: 50,
        description: 'test loss',
      },
    ];

    seasonalEventApplyEffects(state, effects);
    expect(state.world.resources.gold.current).toBe(0);
  });

  it('should apply resource_loss with percentage', () => {
    const state = makeGameState({ day: 1 });
    state.world.resources.gold.current = 200;

    const effects: EventEffect[] = [
      {
        type: 'resource_loss',
        resourceType: 'gold',
        percentage: 25,
        description: 'test loss',
      },
    ];

    seasonalEventApplyEffects(state, effects);
    expect(state.world.resources.gold.current).toBe(150);
  });

  it('should add active effect for production_modifier', () => {
    const state = makeGameState({
      day: 1,
      seasonalEvent: {
        pendingEvent: { eventId: EVENT_1, triggeredOnDay: 1 },
      },
    });

    const effects: EventEffect[] = [
      {
        type: 'production_modifier',
        resourceType: 'gold',
        multiplier: 1.3,
        durationDays: 3,
        description: 'test modifier',
      },
    ];

    seasonalEventApplyEffects(state, effects);
    expect(state.world.seasonalEvent.activeEffects).toHaveLength(1);
    expect(state.world.seasonalEvent.activeEffects[0].multiplier).toBe(1.3);
    expect(state.world.seasonalEvent.activeEffects[0].remainingDays).toBe(3);
  });
});

// --- seasonalEventProcess ---

describe('seasonalEventProcess', () => {
  it('should not process same day twice', () => {
    const events = [makeEvent(EVENT_1, 'growth', 10)];
    vi.mocked(contentGetEntriesByType).mockReturnValue(events);

    const state = makeGameState({ day: 1, season: 'growth' });
    seasonalEventProcess(state);

    const hadPending = state.world.seasonalEvent.pendingEvent !== undefined;
    state.world.seasonalEvent.pendingEvent = undefined;
    state.world.seasonalEvent.triggeredEventIds = [];

    seasonalEventProcess(state);
    // second call should be no-op
    expect(state.world.seasonalEvent.pendingEvent).toBeUndefined();

    // cleanup for other tests
    if (hadPending) {
      expect(state.world.seasonalEvent.triggeredEventIds).toEqual([]);
    }
  });

  it('should tick active effects each day', () => {
    const state = makeGameState({
      day: 1,
      season: 'growth',
      seasonalEvent: {
        activeEffects: [
          {
            eventId: EVENT_1,
            resourceType: 'gold',
            multiplier: 1.2,
            remainingDays: 3,
            description: 'test',
          },
        ],
      },
    });

    vi.mocked(contentGetEntriesByType).mockReturnValue([]);
    seasonalEventProcess(state);

    expect(state.world.seasonalEvent.activeEffects[0].remainingDays).toBe(2);
  });

  it('should not trigger when event already pending', () => {
    const events = [makeEvent(EVENT_1, 'growth', 10)];
    vi.mocked(contentGetEntriesByType).mockReturnValue(events);

    const state = makeGameState({
      day: 1,
      season: 'growth',
      seasonalEvent: {
        pendingEvent: { eventId: EVENT_2, triggeredOnDay: 0 },
      },
    });

    seasonalEventProcess(state);
    expect(state.world.seasonalEvent.pendingEvent?.eventId).toBe(EVENT_2);
  });

  it('should reset triggered ids on new cycle', () => {
    vi.mocked(contentGetEntriesByType).mockReturnValue([]);

    const state = makeGameState({
      day: 1,
      season: 'growth',
      totalSeasonCycles: 1,
      seasonalEvent: {
        triggeredEventIds: [EVENT_1, EVENT_2],
        lastSeasonCycleForReset: 0,
      },
    });

    seasonalEventProcess(state);
    expect(state.world.seasonalEvent.triggeredEventIds).toEqual([]);
    expect(state.world.seasonalEvent.lastSeasonCycleForReset).toBe(1);
  });
});
