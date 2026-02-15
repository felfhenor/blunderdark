import type { MerchantTradeId } from '@interfaces/content-merchanttrade';

export type TradeOffer = {
  tradeId: MerchantTradeId;
  stock: number;
};

export type MerchantState = {
  isPresent: boolean;
  arrivalDay: number;
  departureDayRemaining: number;
  inventory: TradeOffer[];
};
