import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GameState, InhabitantInstance } from '@interfaces';

// --- Mocks ---

const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  contentGetEntry: vi.fn((id: string) => mockContent.get(id)),
}));

vi.mock('@helpers/state-modifiers', () => ({
  stateModifierGetFoodConsumptionMultiplier: vi.fn(() => 1.0),
}));

// --- Import after mocks ---

import {
  HUNGER_RECOVERY_RATE,
  HUNGER_TICKS_PER_HOUR,
  HUNGER_TICKS_TO_HUNGRY,
  HUNGER_TICKS_TO_STARVING,
  HUNGER_WARNING_MINUTES,
  hungerCalculateState,
  hungerCalculateTotalConsumption,
  hungerGetConsumptionRate,
  hungerGetPerTickConsumption,
  hungerIsInappetent,
  hungerGetWarningLevel,
  hungerProcess,
  hungerResetWarnings,
} from '@helpers/hunger';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import { stateModifierGetFoodConsumptionMultiplier } from '@helpers/state-modifiers';

// --- Test helpers ---

function makeInhabitant(overrides: Partial<InhabitantInstance> = {}): InhabitantInstance {
  return {
    instanceId: overrides.instanceId ?? 'inst-1',
    definitionId: overrides.definitionId ?? 'def-goblin',
    name: overrides.name ?? 'Goblin',
    state: overrides.state ?? 'normal',
    assignedRoomId: overrides.assignedRoomId ?? undefined,
    hungerTicksWithoutFood: overrides.hungerTicksWithoutFood ?? 0,
  };
}

function makeGameState(overrides: {
  inhabitants?: InhabitantInstance[];
  floorInhabitants?: InhabitantInstance[];
  foodCurrent?: number;
  foodMax?: number;
} = {}): GameState {
  const inhabitants = overrides.inhabitants ?? [];
  const floorInhabitants = overrides.floorInhabitants ?? [];

  return {
    meta: { version: 1, isSetup: true, isPaused: false, createdAt: 0 },
    gameId: 'test-game' as GameState['gameId'],
    clock: { numTicks: 0, lastSaveTick: 0, day: 1, hour: 0, minute: 0 },
    world: {
      grid: { tiles: [], width: 0, height: 0 },
      resources: {
        crystals: { current: 0, max: 500 },
        food: { current: overrides.foodCurrent ?? 100, max: overrides.foodMax ?? 500 },
        gold: { current: 0, max: 1000 },
        flux: { current: 0, max: 200 },
        research: { current: 0, max: 300 },
        essence: { current: 0, max: 200 },
        corruption: { current: 0, max: 100 },
      },
      inhabitants,
      hallways: [],
      season: { currentSeason: 'growth', dayInSeason: 1, totalSeasonCycles: 0 },
      research: { completedNodes: [], activeResearch: undefined, activeResearchProgress: 0, activeResearchStartTick: 0, unlockedContent: { rooms: [], inhabitants: [], abilities: [], upgrades: [], passiveBonuses: [] } },
      reputation: { terror: 0, wealth: 0, knowledge: 0, harmony: 0, chaos: 0 },
      floors: [{
        id: 'floor-1',
        name: 'Floor 1',
        depth: 1,
        biome: 'neutral',
        grid: { tiles: [], width: 0, height: 0 },
        rooms: [],
        hallways: [],
        inhabitants: floorInhabitants,
        connections: [],
        traps: [],
      }],
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
    },
  } as unknown as GameState;
}

function registerDef(id: string, foodConsumptionRate: number): void {
  mockContent.set(id, {
    id,
    name: id,
    __type: 'inhabitant',
    foodConsumptionRate,
  });
}

// --- Setup ---

beforeEach(() => {
  mockContent.clear();
  hungerResetWarnings();
  vi.mocked(stateModifierGetFoodConsumptionMultiplier).mockReturnValue(1.0);

  // Default inhabitant definitions
  registerDef('def-goblin', 2);       // 2 food/hr
  registerDef('def-skeleton', 0);     // inappetent
  registerDef('def-myconid', 1);      // 1 food/hr
  registerDef('def-slime', 0.5);      // 0.5 food/hr
  registerDef('def-dragon', 5);       // 5 food/hr
});

// --- Constants ---

describe('Constants', () => {
  it('should have correct ticks per hour', () => {
    expect(HUNGER_TICKS_PER_HOUR).toBe(60 * GAME_TIME_TICKS_PER_MINUTE);
  });

  it('should have hungry threshold at 30 game-minutes', () => {
    expect(HUNGER_TICKS_TO_HUNGRY).toBe(GAME_TIME_TICKS_PER_MINUTE * 30);
  });

  it('should have starving threshold at 60 game-minutes', () => {
    expect(HUNGER_TICKS_TO_STARVING).toBe(GAME_TIME_TICKS_PER_MINUTE * 60);
  });

  it('should have starving threshold greater than hungry threshold', () => {
    expect(HUNGER_TICKS_TO_STARVING).toBeGreaterThan(HUNGER_TICKS_TO_HUNGRY);
  });
});

// --- Pure functions ---

describe('hungerGetPerTickConsumption', () => {
  it('should convert hourly rate to per-tick rate', () => {
    expect(hungerGetPerTickConsumption(300)).toBeCloseTo(1.0);
    expect(hungerGetPerTickConsumption(0)).toBe(0);
    expect(hungerGetPerTickConsumption(2)).toBeCloseTo(2 / HUNGER_TICKS_PER_HOUR);
  });
});

describe('hungerCalculateState', () => {
  it('should return normal when ticks below hungry threshold', () => {
    expect(hungerCalculateState(0)).toBe('normal');
    expect(hungerCalculateState(HUNGER_TICKS_TO_HUNGRY - 1)).toBe('normal');
  });

  it('should return hungry at threshold', () => {
    expect(hungerCalculateState(HUNGER_TICKS_TO_HUNGRY)).toBe('hungry');
  });

  it('should return hungry between thresholds', () => {
    expect(hungerCalculateState(HUNGER_TICKS_TO_HUNGRY + 1)).toBe('hungry');
    expect(hungerCalculateState(HUNGER_TICKS_TO_STARVING - 1)).toBe('hungry');
  });

  it('should return starving at threshold', () => {
    expect(hungerCalculateState(HUNGER_TICKS_TO_STARVING)).toBe('starving');
  });

  it('should return starving above threshold', () => {
    expect(hungerCalculateState(HUNGER_TICKS_TO_STARVING + 100)).toBe('starving');
  });
});

describe('hungerIsInappetent', () => {
  it('should return true for zero consumption', () => {
    expect(hungerIsInappetent(0)).toBe(true);
  });

  it('should return true for negative consumption', () => {
    expect(hungerIsInappetent(-1)).toBe(true);
  });

  it('should return false for positive consumption', () => {
    expect(hungerIsInappetent(0.5)).toBe(false);
    expect(hungerIsInappetent(2)).toBe(false);
  });
});

describe('hungerGetConsumptionRate', () => {
  it('should return rate from definition', () => {
    expect(hungerGetConsumptionRate('def-goblin')).toBe(2);
    expect(hungerGetConsumptionRate('def-skeleton')).toBe(0);
    expect(hungerGetConsumptionRate('def-dragon')).toBe(5);
  });

  it('should return 0 for unknown definition', () => {
    expect(hungerGetConsumptionRate('def-unknown')).toBe(0);
  });
});

// --- Total consumption ---

describe('hungerCalculateTotalConsumption', () => {
  it('should return 0 for no inhabitants', () => {
    expect(hungerCalculateTotalConsumption([])).toBe(0);
  });

  it('should return 0 for inappetent inhabitants only', () => {
    const inhabitants = [
      makeInhabitant({ definitionId: 'def-skeleton' }),
      makeInhabitant({ instanceId: 'inst-2', definitionId: 'def-skeleton' }),
    ];
    expect(hungerCalculateTotalConsumption(inhabitants)).toBe(0);
  });

  it('should sum per-tick consumption for all inhabitants', () => {
    const inhabitants = [
      makeInhabitant({ definitionId: 'def-goblin' }),  // 2/hr
      makeInhabitant({ instanceId: 'inst-2', definitionId: 'def-myconid' }),  // 1/hr
    ];
    const expected = (2 + 1) / HUNGER_TICKS_PER_HOUR;
    expect(hungerCalculateTotalConsumption(inhabitants)).toBeCloseTo(expected);
  });

  it('should skip inappetent inhabitants in sum', () => {
    const inhabitants = [
      makeInhabitant({ definitionId: 'def-goblin' }),   // 2/hr
      makeInhabitant({ instanceId: 'inst-2', definitionId: 'def-skeleton' }),  // 0/hr
    ];
    const expected = 2 / HUNGER_TICKS_PER_HOUR;
    expect(hungerCalculateTotalConsumption(inhabitants)).toBeCloseTo(expected);
  });

  it('should apply food consumption multiplier from state modifiers', () => {
    vi.mocked(stateModifierGetFoodConsumptionMultiplier).mockReturnValue(1.5);
    const inhabitants = [
      makeInhabitant({ definitionId: 'def-goblin' }),  // 2/hr * 1.5 = 3/hr
    ];
    const expected = (2 * 1.5) / HUNGER_TICKS_PER_HOUR;
    expect(hungerCalculateTotalConsumption(inhabitants)).toBeCloseTo(expected);
  });
});

// --- hungerProcess ---

describe('hungerProcess', () => {
  describe('food deduction', () => {
    it('should deduct food from resources', () => {
      const goblin = makeInhabitant({ definitionId: 'def-goblin' });
      const state = makeGameState({ inhabitants: [goblin], foodCurrent: 100 });

      hungerProcess(state);

      const expectedConsumption = 2 / HUNGER_TICKS_PER_HOUR;
      expect(state.world.resources.food.current).toBeCloseTo(100 - expectedConsumption);
    });

    it('should not deduct below zero', () => {
      const goblin = makeInhabitant({ definitionId: 'def-goblin' });
      const state = makeGameState({ inhabitants: [goblin], foodCurrent: 0 });

      hungerProcess(state);

      expect(state.world.resources.food.current).toBe(0);
    });

    it('should set food to zero when consumption exceeds available', () => {
      const goblin = makeInhabitant({ definitionId: 'def-goblin' });
      const state = makeGameState({ inhabitants: [goblin], foodCurrent: 0.001 });

      hungerProcess(state);

      expect(state.world.resources.food.current).toBe(0);
    });

    it('should not deduct food for inappetent inhabitants', () => {
      const skeleton = makeInhabitant({ definitionId: 'def-skeleton' });
      const state = makeGameState({ inhabitants: [skeleton], foodCurrent: 100 });

      hungerProcess(state);

      expect(state.world.resources.food.current).toBe(100);
    });

    it('should not change food when no inhabitants', () => {
      const state = makeGameState({ inhabitants: [], foodCurrent: 100 });

      hungerProcess(state);

      expect(state.world.resources.food.current).toBe(100);
    });
  });

  describe('state transitions - starvation', () => {
    it('should increment hunger ticks when food runs out', () => {
      const goblin = makeInhabitant({ definitionId: 'def-goblin', hungerTicksWithoutFood: 0 });
      const state = makeGameState({ inhabitants: [goblin], foodCurrent: 0 });

      hungerProcess(state);

      expect(goblin.hungerTicksWithoutFood).toBe(1);
    });

    it('should transition to hungry after enough ticks', () => {
      const goblin = makeInhabitant({
        definitionId: 'def-goblin',
        hungerTicksWithoutFood: HUNGER_TICKS_TO_HUNGRY - 1,
      });
      const state = makeGameState({ inhabitants: [goblin], foodCurrent: 0 });

      hungerProcess(state);

      expect(goblin.state).toBe('hungry');
      expect(goblin.hungerTicksWithoutFood).toBe(HUNGER_TICKS_TO_HUNGRY);
    });

    it('should transition to starving after enough ticks', () => {
      const goblin = makeInhabitant({
        definitionId: 'def-goblin',
        hungerTicksWithoutFood: HUNGER_TICKS_TO_STARVING - 1,
      });
      const state = makeGameState({ inhabitants: [goblin], foodCurrent: 0 });

      hungerProcess(state);

      expect(goblin.state).toBe('starving');
      expect(goblin.hungerTicksWithoutFood).toBe(HUNGER_TICKS_TO_STARVING);
    });

    it('should keep starving state beyond threshold', () => {
      const goblin = makeInhabitant({
        definitionId: 'def-goblin',
        state: 'starving',
        hungerTicksWithoutFood: HUNGER_TICKS_TO_STARVING + 50,
      });
      const state = makeGameState({ inhabitants: [goblin], foodCurrent: 0 });

      hungerProcess(state);

      expect(goblin.state).toBe('starving');
      expect(goblin.hungerTicksWithoutFood).toBe(HUNGER_TICKS_TO_STARVING + 51);
    });
  });

  describe('state transitions - recovery', () => {
    it('should decrement hunger ticks when food is available', () => {
      const goblin = makeInhabitant({
        definitionId: 'def-goblin',
        hungerTicksWithoutFood: 10,
      });
      const state = makeGameState({ inhabitants: [goblin], foodCurrent: 100 });

      hungerProcess(state);

      expect(goblin.hungerTicksWithoutFood).toBe(10 - HUNGER_RECOVERY_RATE);
    });

    it('should not decrement below zero', () => {
      const goblin = makeInhabitant({
        definitionId: 'def-goblin',
        hungerTicksWithoutFood: 1,
      });
      const state = makeGameState({ inhabitants: [goblin], foodCurrent: 100 });

      hungerProcess(state);

      expect(goblin.hungerTicksWithoutFood).toBe(0);
    });

    it('should transition from starving to hungry during recovery', () => {
      const goblin = makeInhabitant({
        definitionId: 'def-goblin',
        state: 'starving',
        hungerTicksWithoutFood: HUNGER_TICKS_TO_STARVING,
      });
      const state = makeGameState({ inhabitants: [goblin], foodCurrent: 100 });

      hungerProcess(state);

      // After decrementing by RECOVERY_RATE, ticks should be below starving threshold
      expect(goblin.hungerTicksWithoutFood).toBe(HUNGER_TICKS_TO_STARVING - HUNGER_RECOVERY_RATE);
      expect(goblin.state).toBe('hungry');
    });

    it('should stay hungry when still above threshold after recovery', () => {
      // Use a tick count well above the hungry threshold so recovery doesn't drop below it
      const ticks = HUNGER_TICKS_TO_HUNGRY + HUNGER_RECOVERY_RATE + 10;
      const goblin = makeInhabitant({
        definitionId: 'def-goblin',
        state: 'hungry',
        hungerTicksWithoutFood: ticks,
      });
      const state = makeGameState({ inhabitants: [goblin], foodCurrent: 100 });

      hungerProcess(state);

      expect(goblin.hungerTicksWithoutFood).toBe(ticks - HUNGER_RECOVERY_RATE);
      expect(goblin.state).toBe('hungry');
    });

    it('should fully recover to normal', () => {
      const goblin = makeInhabitant({
        definitionId: 'def-goblin',
        state: 'hungry',
        hungerTicksWithoutFood: HUNGER_RECOVERY_RATE,
      });
      const state = makeGameState({ inhabitants: [goblin], foodCurrent: 100 });

      hungerProcess(state);

      expect(goblin.hungerTicksWithoutFood).toBe(0);
      expect(goblin.state).toBe('normal');
    });
  });

  describe('inappetent inhabitants', () => {
    it('should keep skeleton at normal state regardless of food', () => {
      const skeleton = makeInhabitant({
        definitionId: 'def-skeleton',
        state: 'normal',
      });
      const state = makeGameState({ inhabitants: [skeleton], foodCurrent: 0 });

      hungerProcess(state);

      expect(skeleton.state).toBe('normal');
      expect(skeleton.hungerTicksWithoutFood).toBe(0);
    });

    it('should reset hungry inappetent inhabitant to normal', () => {
      const skeleton = makeInhabitant({
        definitionId: 'def-skeleton',
        state: 'hungry',
        hungerTicksWithoutFood: 100,
      });
      const state = makeGameState({ inhabitants: [skeleton], foodCurrent: 0 });

      hungerProcess(state);

      expect(skeleton.state).toBe('normal');
      expect(skeleton.hungerTicksWithoutFood).toBe(0);
    });

    it('should reset starving inappetent inhabitant to normal', () => {
      const skeleton = makeInhabitant({
        definitionId: 'def-skeleton',
        state: 'starving',
        hungerTicksWithoutFood: 500,
      });
      const state = makeGameState({ inhabitants: [skeleton], foodCurrent: 0 });

      hungerProcess(state);

      expect(skeleton.state).toBe('normal');
      expect(skeleton.hungerTicksWithoutFood).toBe(0);
    });
  });

  describe('scared state preservation', () => {
    it('should not override scared state when food is available', () => {
      const goblin = makeInhabitant({
        definitionId: 'def-goblin',
        state: 'scared',
        hungerTicksWithoutFood: 0,
      });
      const state = makeGameState({ inhabitants: [goblin], foodCurrent: 100 });

      hungerProcess(state);

      expect(goblin.state).toBe('scared');
    });
  });

  describe('mixed inhabitants', () => {
    it('should process each inhabitant independently', () => {
      const goblin = makeInhabitant({
        definitionId: 'def-goblin',
        hungerTicksWithoutFood: HUNGER_TICKS_TO_HUNGRY - 1,
      });
      const skeleton = makeInhabitant({
        instanceId: 'inst-2',
        definitionId: 'def-skeleton',
        state: 'normal',
      });
      const state = makeGameState({
        inhabitants: [goblin, skeleton],
        foodCurrent: 0,
      });

      hungerProcess(state);

      // Goblin becomes hungry
      expect(goblin.state).toBe('hungry');
      expect(goblin.hungerTicksWithoutFood).toBe(HUNGER_TICKS_TO_HUNGRY);

      // Skeleton stays normal
      expect(skeleton.state).toBe('normal');
      expect(skeleton.hungerTicksWithoutFood).toBe(0);
    });
  });

  describe('floor inhabitant sync', () => {
    it('should sync state changes to floor inhabitants', () => {
      const goblin = makeInhabitant({
        definitionId: 'def-goblin',
        hungerTicksWithoutFood: HUNGER_TICKS_TO_HUNGRY - 1,
      });
      // Create a separate floor inhabitant with the same instanceId
      const floorGoblin = makeInhabitant({
        definitionId: 'def-goblin',
        hungerTicksWithoutFood: HUNGER_TICKS_TO_HUNGRY - 1,
      });
      const state = makeGameState({
        inhabitants: [goblin],
        floorInhabitants: [floorGoblin],
        foodCurrent: 0,
      });

      hungerProcess(state);

      // Both should be updated
      expect(goblin.state).toBe('hungry');
      expect(floorGoblin.state).toBe('hungry');
      expect(floorGoblin.hungerTicksWithoutFood).toBe(HUNGER_TICKS_TO_HUNGRY);
    });
  });
});

// --- Warning level ---

describe('hungerGetWarningLevel', () => {
  it('should return critical when food is zero', () => {
    const consumptionPerTick = 2 / HUNGER_TICKS_PER_HOUR;
    expect(hungerGetWarningLevel(0, consumptionPerTick)).toBe('critical');
  });

  it('should return low when food is below threshold', () => {
    const consumptionPerTick = 2 / HUNGER_TICKS_PER_HOUR;
    const warningTicks = HUNGER_WARNING_MINUTES * GAME_TIME_TICKS_PER_MINUTE;
    const lowFood = consumptionPerTick * warningTicks * 0.5; // Half the threshold
    expect(hungerGetWarningLevel(lowFood, consumptionPerTick)).toBe('low');
  });

  it('should return undefined when food is sufficient', () => {
    const consumptionPerTick = 2 / HUNGER_TICKS_PER_HOUR;
    expect(hungerGetWarningLevel(100, consumptionPerTick)).toBeUndefined();
  });

  it('should return undefined when no consumption', () => {
    expect(hungerGetWarningLevel(0, 0)).toBeUndefined();
    expect(hungerGetWarningLevel(100, 0)).toBeUndefined();
  });

  it('should return low at exactly the threshold boundary', () => {
    const consumptionPerTick = 2 / HUNGER_TICKS_PER_HOUR;
    const warningTicks = HUNGER_WARNING_MINUTES * GAME_TIME_TICKS_PER_MINUTE;
    // Just under the threshold
    const food = consumptionPerTick * warningTicks - 0.001;
    expect(hungerGetWarningLevel(food, consumptionPerTick)).toBe('low');
  });

  it('should return undefined at exactly the threshold', () => {
    const consumptionPerTick = 2 / HUNGER_TICKS_PER_HOUR;
    const warningTicks = HUNGER_WARNING_MINUTES * GAME_TIME_TICKS_PER_MINUTE;
    const food = consumptionPerTick * warningTicks;
    expect(hungerGetWarningLevel(food, consumptionPerTick)).toBeUndefined();
  });
});

// --- Edge cases ---

describe('Edge cases', () => {
  it('should handle unknown definition gracefully', () => {
    const unknown = makeInhabitant({ definitionId: 'def-nonexistent' });
    const state = makeGameState({ inhabitants: [unknown], foodCurrent: 100 });

    // Should not throw
    hungerProcess(state);

    // Unknown definition = 0 consumption rate = inappetent
    expect(unknown.state).toBe('normal');
    expect(state.world.resources.food.current).toBe(100);
  });

  it('should handle missing hungerTicksWithoutFood field', () => {
    const goblin = makeInhabitant({ definitionId: 'def-goblin' });
    delete (goblin as Record<string, unknown>)['hungerTicksWithoutFood'];
    const state = makeGameState({ inhabitants: [goblin], foodCurrent: 0 });

    hungerProcess(state);

    expect(goblin.hungerTicksWithoutFood).toBe(1);
    expect(goblin.state).toBe('normal'); // Only 1 tick, not yet hungry
  });

  it('should handle very large number of inhabitants', () => {
    const inhabitants: InhabitantInstance[] = [];
    for (let i = 0; i < 50; i++) {
      inhabitants.push(makeInhabitant({
        instanceId: `inst-${i}`,
        definitionId: 'def-goblin',
      }));
    }
    const state = makeGameState({ inhabitants, foodCurrent: 500 });

    hungerProcess(state);

    // 50 goblins * 2/hr = 100/hr per tick = 100/300 = 0.333 food per tick
    const expectedConsumption = (50 * 2) / HUNGER_TICKS_PER_HOUR;
    expect(state.world.resources.food.current).toBeCloseTo(500 - expectedConsumption);
  });
});
