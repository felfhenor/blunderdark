import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { ResourceCost } from '@interfaces/resource';
import type { HasDescription } from '@interfaces/traits';

export type MerchantTradeId = Branded<string, 'MerchantTradeId'>;

export type MerchantTradeType = 'buy' | 'sell' | 'special';

export type MerchantTradeContent = IsContentItem &
  HasDescription & {
    id: MerchantTradeId;
    cost: ResourceCost;
    reward: ResourceCost;
    maxStock: number;
    type: MerchantTradeType;
  };
