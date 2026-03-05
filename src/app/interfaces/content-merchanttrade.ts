import type { ForgeRecipeId } from '@interfaces/content-forgerecipe';
import type { TrapId } from '@interfaces/content-trap';
import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { ResourceType } from '@interfaces/resource';
import type { HasDescription } from '@interfaces/traits';

export type MerchantTradeId = Branded<string, 'MerchantTradeId'>;

type MerchantTradeType = 'buy' | 'sell' | 'special';

export type ResourceTradeEntry = {
  type: 'resource';
  resourceType: ResourceType;
  amount: number;
};

export type TrapTradeEntry = {
  type: 'trap';
  trapId: TrapId;
  count: number;
};

export type ForgeItemTradeEntry = {
  type: 'forgeItem';
  forgeRecipeId: ForgeRecipeId;
  count: number;
};

export type TradeEntry = ResourceTradeEntry | TrapTradeEntry | ForgeItemTradeEntry;

export type MerchantTradeContent = IsContentItem &
  HasDescription & {
    id: MerchantTradeId;
    cost: TradeEntry[];
    reward: TradeEntry[];
    maxStock: number;
    type: MerchantTradeType;
  };
