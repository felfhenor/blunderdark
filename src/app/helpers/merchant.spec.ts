import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MerchantTradeId } from '@interfaces/content-merchanttrade';
import type { GameState, MerchantState, MerchantTradeContent } from '@interfaces';
import { contentGetEntriesByType } from '@helpers/content';
import {
  merchantGenerateInventory,
  merchantShouldArrive,
  merchantShouldDepart,
  merchantArrival,
  merchantDeparture,
  merchantProcess,
  merchantResetLastProcessedDay,
  MERCHANT_VISIT_DURATION,
  MERCHANT_MIN_BUY_TRADES,
  MERCHANT_MIN_SELL_TRADES,
  MERCHANT_MIN_SPECIAL_TRADES,
} from '@helpers/merchant';
import { rngSeeded } from '@helpers/rng';

// --- Mocks ---

vi.mock('@helpers/content', () => ({
  contentGetEntriesByType: vi.fn(),
}));

const TEST_BUY_1 = 'buy-1' as MerchantTradeId;
const TEST_BUY_2 = 'buy-2' as MerchantTradeId;
const TEST_BUY_3 = 'buy-3' as MerchantTradeId;
const TEST_SELL_1 = 'sell-1' as MerchantTradeId;
const TEST_SELL_2 = 'sell-2' as MerchantTradeId;
const TEST_SELL_3 = 'sell-3' as MerchantTradeId;
const TEST_SPECIAL_1 = 'special-1' as MerchantTradeId;
const TEST_SPECIAL_2 = 'special-2' as MerchantTradeId;

function makeTrade(
  id: MerchantTradeId,
  type: 'buy' | 'sell' | 'special',
  maxStock = 3,
): MerchantTradeContent {
  return {
    id,
    name: `Trade ${id}`,
    __type: 'merchanttrade',
    description: `Test trade ${id}`,
    cost: { gold: 100 },
    reward: { crystals: 50 },
    maxStock,
    type,
  };
}

function makeAllTrades(): MerchantTradeContent[] {
  return [
    makeTrade(TEST_BUY_1, 'buy'),
    makeTrade(TEST_BUY_2, 'buy'),
    makeTrade(TEST_BUY_3, 'buy'),
    makeTrade(TEST_SELL_1, 'sell'),
    makeTrade(TEST_SELL_2, 'sell'),
    makeTrade(TEST_SELL_3, 'sell'),
    makeTrade(TEST_SPECIAL_1, 'special'),
    makeTrade(TEST_SPECIAL_2, 'special'),
  ];
}

function makeDefaultMerchant(): MerchantState {
  return {
    isPresent: false,
    arrivalDay: 0,
    departureDayRemaining: 0,
    inventory: [],
  };
}

function makeGameState(overrides: {
  day?: number;
  season?: string;
  merchant?: Partial<MerchantState>;
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
        crystals: { current: 0, max: 500 },
        food: { current: 50, max: 500 },
        gold: { current: 100, max: 1000 },
        flux: { current: 0, max: 200 },
        research: { current: 0, max: 300 },
        essence: { current: 0, max: 200 },
        corruption: { current: 0, max: Number.MAX_SAFE_INTEGER },
      },
      inhabitants: [],
      hallways: [],
      season: {
        currentSeason: (overrides.season ?? 'growth') as 'growth',
        dayInSeason: 1,
        totalSeasonCycles: 0,
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
        ...overrides.merchant,
      },
    },
  } as unknown as GameState;
}

beforeEach(() => {
  vi.clearAllMocks();
  merchantResetLastProcessedDay();
});

// --- merchantGenerateInventory ---

describe('merchantGenerateInventory', () => {
  it('should return empty array when no trades available', () => {
    const result = merchantGenerateInventory([]);
    expect(result).toEqual([]);
  });

  it('should include at least minimum buy trades', () => {
    const trades = makeAllTrades();
    const rng = rngSeeded('test-seed');
    const result = merchantGenerateInventory(trades, rng);

    const buyTradeIds = new Set([TEST_BUY_1, TEST_BUY_2, TEST_BUY_3]);
    const selectedBuy = result.filter((r) => buyTradeIds.has(r.tradeId));
    expect(selectedBuy.length).toBeGreaterThanOrEqual(MERCHANT_MIN_BUY_TRADES);
  });

  it('should include at least minimum sell trades', () => {
    const trades = makeAllTrades();
    const rng = rngSeeded('test-seed');
    const result = merchantGenerateInventory(trades, rng);

    const sellTradeIds = new Set([TEST_SELL_1, TEST_SELL_2, TEST_SELL_3]);
    const selectedSell = result.filter((r) => sellTradeIds.has(r.tradeId));
    expect(selectedSell.length).toBeGreaterThanOrEqual(MERCHANT_MIN_SELL_TRADES);
  });

  it('should include at least minimum special trades', () => {
    const trades = makeAllTrades();
    const rng = rngSeeded('test-seed');
    const result = merchantGenerateInventory(trades, rng);

    const specialTradeIds = new Set([TEST_SPECIAL_1, TEST_SPECIAL_2]);
    const selectedSpecial = result.filter((r) => specialTradeIds.has(r.tradeId));
    expect(selectedSpecial.length).toBeGreaterThanOrEqual(MERCHANT_MIN_SPECIAL_TRADES);
  });

  it('should set stock from maxStock on content', () => {
    const trades = [makeTrade(TEST_BUY_1, 'buy', 5)];
    const result = merchantGenerateInventory(trades);
    expect(result[0].stock).toBe(5);
  });

  it('should generate between min and max trades', () => {
    const trades = makeAllTrades();
    const rng = rngSeeded('test-seed');
    const result = merchantGenerateInventory(trades, rng);
    expect(result.length).toBeGreaterThanOrEqual(5);
    expect(result.length).toBeLessThanOrEqual(10);
  });
});

// --- merchantShouldArrive ---

describe('merchantShouldArrive', () => {
  it('should return true when harvest season and merchant not present', () => {
    const merchant = makeDefaultMerchant();
    expect(merchantShouldArrive(merchant, 'harvest')).toBe(true);
  });

  it('should return false when merchant already present', () => {
    const merchant = { ...makeDefaultMerchant(), isPresent: true };
    expect(merchantShouldArrive(merchant, 'harvest')).toBe(false);
  });

  it('should return false when not harvest season', () => {
    const merchant = makeDefaultMerchant();
    expect(merchantShouldArrive(merchant, 'growth')).toBe(false);
    expect(merchantShouldArrive(merchant, 'darkness')).toBe(false);
    expect(merchantShouldArrive(merchant, 'storms')).toBe(false);
  });
});

// --- merchantShouldDepart ---

describe('merchantShouldDepart', () => {
  it('should return true when present and countdown reaches 0', () => {
    const merchant: MerchantState = {
      isPresent: true,
      arrivalDay: 1,
      departureDayRemaining: 0,
      inventory: [],
    };
    expect(merchantShouldDepart(merchant)).toBe(true);
  });

  it('should return false when countdown still positive', () => {
    const merchant: MerchantState = {
      isPresent: true,
      arrivalDay: 1,
      departureDayRemaining: 2,
      inventory: [],
    };
    expect(merchantShouldDepart(merchant)).toBe(false);
  });

  it('should return false when merchant not present', () => {
    const merchant = makeDefaultMerchant();
    expect(merchantShouldDepart(merchant)).toBe(false);
  });
});

// --- merchantArrival ---

describe('merchantArrival', () => {
  it('should create merchant state with correct fields', () => {
    const trades = makeAllTrades();
    const result = merchantArrival(10, trades);

    expect(result.isPresent).toBe(true);
    expect(result.arrivalDay).toBe(10);
    expect(result.departureDayRemaining).toBe(MERCHANT_VISIT_DURATION);
    expect(result.inventory.length).toBeGreaterThan(0);
  });
});

// --- merchantDeparture ---

describe('merchantDeparture', () => {
  it('should reset merchant state', () => {
    const result = merchantDeparture();
    expect(result.isPresent).toBe(false);
    expect(result.arrivalDay).toBe(0);
    expect(result.departureDayRemaining).toBe(0);
    expect(result.inventory).toEqual([]);
  });
});

// --- merchantProcess ---

describe('merchantProcess', () => {
  it('should arrive at harvest season on new day', () => {
    const trades = makeAllTrades();
    vi.mocked(contentGetEntriesByType).mockReturnValue(trades);

    const state = makeGameState({ day: 1, season: 'harvest' });
    merchantProcess(state);

    expect(state.world.merchant.isPresent).toBe(true);
    expect(state.world.merchant.arrivalDay).toBe(1);
    expect(state.world.merchant.departureDayRemaining).toBe(MERCHANT_VISIT_DURATION);
    expect(state.world.merchant.inventory.length).toBeGreaterThan(0);
  });

  it('should not arrive in non-harvest season', () => {
    const state = makeGameState({ day: 1, season: 'growth' });
    merchantProcess(state);

    expect(state.world.merchant.isPresent).toBe(false);
  });

  it('should decrement departure countdown on new day', () => {
    const state = makeGameState({
      day: 2,
      season: 'harvest',
      merchant: {
        isPresent: true,
        arrivalDay: 1,
        departureDayRemaining: 3,
        inventory: [{ tradeId: TEST_BUY_1, stock: 3 }],
      },
    });

    merchantProcess(state);

    expect(state.world.merchant.departureDayRemaining).toBe(2);
    expect(state.world.merchant.isPresent).toBe(true);
  });

  it('should depart when countdown reaches 0', () => {
    const state = makeGameState({
      day: 4,
      season: 'harvest',
      merchant: {
        isPresent: true,
        arrivalDay: 1,
        departureDayRemaining: 1,
        inventory: [{ tradeId: TEST_BUY_1, stock: 3 }],
      },
    });

    merchantProcess(state);

    expect(state.world.merchant.isPresent).toBe(false);
    expect(state.world.merchant.inventory).toEqual([]);
  });

  it('should not process same day twice', () => {
    const trades = makeAllTrades();
    vi.mocked(contentGetEntriesByType).mockReturnValue(trades);

    const state = makeGameState({ day: 1, season: 'harvest' });
    merchantProcess(state);
    expect(state.world.merchant.isPresent).toBe(true);

    // Reset to simulate departure then re-call on same day
    state.world.merchant = makeDefaultMerchant();
    merchantProcess(state);
    expect(state.world.merchant.isPresent).toBe(false);
  });

  it('should depart after 3 days', () => {
    const trades = makeAllTrades();
    vi.mocked(contentGetEntriesByType).mockReturnValue(trades);

    // Day 1: Arrive
    const state = makeGameState({ day: 1, season: 'harvest' });
    merchantProcess(state);
    expect(state.world.merchant.isPresent).toBe(true);
    expect(state.world.merchant.departureDayRemaining).toBe(3);

    // Day 2: Decrement to 2
    state.clock.day = 2;
    merchantProcess(state);
    expect(state.world.merchant.isPresent).toBe(true);
    expect(state.world.merchant.departureDayRemaining).toBe(2);

    // Day 3: Decrement to 1
    state.clock.day = 3;
    merchantProcess(state);
    expect(state.world.merchant.isPresent).toBe(true);
    expect(state.world.merchant.departureDayRemaining).toBe(1);

    // Day 4: Decrement to 0 and depart
    state.clock.day = 4;
    merchantProcess(state);
    expect(state.world.merchant.isPresent).toBe(false);
  });
});
