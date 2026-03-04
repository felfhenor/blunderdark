import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  model,
} from '@angular/core';
import { SFXDirective } from '@directives/sfx.directive';
import { CurrencyCostComponent } from '@components/currency-cost/currency-cost.component';
import { analyticsSendDesignEvent } from '@helpers/analytics';
import { ModalComponent } from '@components/modal/modal.component';
import { contentGetEntry } from '@helpers/content';
import { gameTimeDay } from '@helpers/game-time';
import {
  merchantCanAffordTrade,
  merchantDaysRemaining,
  merchantExecuteTrade,
  merchantInventory,
  merchantIsPresent,
} from '@helpers/merchant';
import { notifyError, notifySuccess } from '@helpers/notify';
import type {
  MerchantTradeContent,
  MerchantTradeId,
  ResourceCost,
  ResourceType,
} from '@interfaces';
import { sortBy } from 'es-toolkit/compat';

type TradeEntry = {
  trade: MerchantTradeContent;
  stock: number;
  affordable: boolean;
  costEntries: { type: ResourceType; amount: number }[];
  rewardEntries: { type: ResourceType; amount: number }[];
};

@Component({
  selector: 'app-panel-merchant',
  imports: [DecimalPipe, CurrencyCostComponent, ModalComponent, SFXDirective],
  templateUrl: './panel-merchant.component.html',
  styleUrl: './panel-merchant.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelMerchantComponent {
  public visible = model<boolean>(false);

  public isPresent = merchantIsPresent;
  public daysRemaining = merchantDaysRemaining;
  public departureDay = computed(() => gameTimeDay() + this.daysRemaining());

  public tradeEntries = computed((): TradeEntry[] => {
    const inventory = merchantInventory();
    const entries = inventory.map((offer) => {
      const trade = contentGetEntry<MerchantTradeContent>(offer.tradeId);
      if (!trade) {
        return {
          trade: {
            id: offer.tradeId,
            name: 'Unknown Trade',
            __type: 'merchanttrade' as const,
            description: '',
            cost: {},
            reward: {},
            maxStock: 0,
            type: 'buy' as const,
          },
          stock: offer.stock,
          affordable: false,
          costEntries: [],
          rewardEntries: [],
        };
      }

      return {
        trade,
        stock: offer.stock,
        affordable: merchantCanAffordTrade(trade),
        costEntries: this.formatCost(trade.cost),
        rewardEntries: this.formatCost(trade.reward),
      };
    });
    return sortBy(entries, [(e) => e.trade.name]);
  });

  public async executeTrade(tradeId: MerchantTradeId): Promise<void> {
    analyticsSendDesignEvent('Room:Merchant:Trade');
    const result = await merchantExecuteTrade(tradeId);
    if (result.success) {
      const trade = contentGetEntry<MerchantTradeContent>(tradeId);
      notifySuccess(`Trade complete: ${trade?.name ?? 'Unknown'}`);
    } else {
      notifyError(result.error ?? 'Trade failed');
    }
  }

  public open(): void {
    analyticsSendDesignEvent('Room:Merchant:Open');
    this.visible.set(true);
  }

  public close(): void {
    this.visible.set(false);
  }

  private formatCost(cost: ResourceCost): { type: ResourceType; amount: number }[] {
    return Object.entries(cost)
      .filter(([, amount]) => amount && amount > 0)
      .map(([type, amount]) => ({ type: type as ResourceType, amount: amount! }));
  }
}
