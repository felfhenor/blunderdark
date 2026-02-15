import { contentGetEntriesByType } from '@helpers/content';
import { rngNumberRange, rngShuffle } from '@helpers/rng';
import type {
  GameState,
  MerchantState,
  MerchantTradeContent,
  TradeOffer,
} from '@interfaces';
import { Subject } from 'rxjs';
import type { PRNG } from 'seedrandom';

// --- Constants ---

export const MERCHANT_VISIT_DURATION = 3;
export const MERCHANT_MIN_TRADES = 5;
export const MERCHANT_MAX_TRADES = 10;
export const MERCHANT_MIN_BUY_TRADES = 2;
export const MERCHANT_MIN_SELL_TRADES = 2;
export const MERCHANT_MIN_SPECIAL_TRADES = 1;

// --- Events ---

export type MerchantEvent = {
  type: 'arrival' | 'departure';
};

const merchantEventSubject = new Subject<MerchantEvent>();
export const merchantEvent$ = merchantEventSubject.asObservable();

// --- Pure helpers ---

export function merchantGenerateInventory(
  allTrades: MerchantTradeContent[],
  rng?: PRNG,
): TradeOffer[] {
  if (allTrades.length === 0) return [];

  const buyTrades = allTrades.filter((t) => t.type === 'buy');
  const sellTrades = allTrades.filter((t) => t.type === 'sell');
  const specialTrades = allTrades.filter((t) => t.type === 'special');

  const selected: MerchantTradeContent[] = [];

  const shuffledBuy = rng ? rngShuffle(buyTrades, rng) : buyTrades;
  const shuffledSell = rng ? rngShuffle(sellTrades, rng) : sellTrades;
  const shuffledSpecial = rng ? rngShuffle(specialTrades, rng) : specialTrades;

  for (let i = 0; i < Math.min(MERCHANT_MIN_BUY_TRADES, shuffledBuy.length); i++) {
    selected.push(shuffledBuy[i]);
  }

  for (let i = 0; i < Math.min(MERCHANT_MIN_SELL_TRADES, shuffledSell.length); i++) {
    selected.push(shuffledSell[i]);
  }

  for (let i = 0; i < Math.min(MERCHANT_MIN_SPECIAL_TRADES, shuffledSpecial.length); i++) {
    selected.push(shuffledSpecial[i]);
  }

  const totalTarget = rng
    ? rngNumberRange(MERCHANT_MIN_TRADES, MERCHANT_MAX_TRADES + 1, rng)
    : MERCHANT_MIN_TRADES;

  const remaining = allTrades.filter(
    (t) => !selected.some((s) => s.id === t.id),
  );
  const shuffledRemaining = rng ? rngShuffle(remaining, rng) : remaining;

  for (let i = 0; i < shuffledRemaining.length && selected.length < totalTarget; i++) {
    selected.push(shuffledRemaining[i]);
  }

  return selected.map((trade) => ({
    tradeId: trade.id,
    stock: trade.maxStock,
  }));
}

export function merchantShouldArrive(
  merchant: MerchantState,
  currentSeason: string,
): boolean {
  return currentSeason === 'harvest' && !merchant.isPresent;
}

export function merchantShouldDepart(merchant: MerchantState): boolean {
  return merchant.isPresent && merchant.departureDayRemaining <= 0;
}

export function merchantArrival(
  currentDay: number,
  allTrades: MerchantTradeContent[],
  rng?: PRNG,
): MerchantState {
  return {
    isPresent: true,
    arrivalDay: currentDay,
    departureDayRemaining: MERCHANT_VISIT_DURATION,
    inventory: merchantGenerateInventory(allTrades, rng),
  };
}

export function merchantDeparture(): MerchantState {
  return {
    isPresent: false,
    arrivalDay: 0,
    departureDayRemaining: 0,
    inventory: [],
  };
}

// --- State field for day tracking ---

let merchantLastProcessedDay = 0;

export function merchantResetLastProcessedDay(): void {
  merchantLastProcessedDay = 0;
}

// --- Process function (called from gameloop) ---

export function merchantProcess(state: GameState): void {
  const currentDay = state.clock.day;

  if (currentDay <= merchantLastProcessedDay) return;
  merchantLastProcessedDay = currentDay;

  const merchant = state.world.merchant;
  const season = state.world.season.currentSeason;

  if (merchant.isPresent) {
    merchant.departureDayRemaining--;

    if (merchantShouldDepart(merchant)) {
      const departed = merchantDeparture();
      state.world.merchant = departed;
      merchantEventSubject.next({ type: 'departure' });
      return;
    }
  }

  if (merchantShouldArrive(merchant, season)) {
    const allTrades =
      contentGetEntriesByType<MerchantTradeContent>('merchanttrade');
    state.world.merchant = merchantArrival(currentDay, allTrades);
    merchantEventSubject.next({ type: 'arrival' });
  }
}
