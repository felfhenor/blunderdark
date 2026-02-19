import { DecimalPipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  model,
  signal,
} from '@angular/core';
import { CurrencyNameComponent } from '@components/currency-name/currency-name.component';
import { ModalComponent } from '@components/modal/modal.component';
import { contentGetEntry } from '@helpers/content';
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
  MerchantTradeType,
  ResourceCost,
  ResourceType,
} from '@interfaces';
import { sortBy } from 'es-toolkit/compat';

type TradeCategory = 'all' | MerchantTradeType;

type TradeEntry = {
  trade: MerchantTradeContent;
  stock: number;
  affordable: boolean;
  costEntries: { type: ResourceType; amount: number }[];
  rewardEntries: { type: ResourceType; amount: number }[];
};

@Component({
  selector: 'app-panel-merchant',
  imports: [DecimalPipe, NgClass, CurrencyNameComponent, ModalComponent],
  templateUrl: './panel-merchant.component.html',
  styleUrl: './panel-merchant.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelMerchantComponent {
  public visible = model<boolean>(false);

  public isPresent = merchantIsPresent;
  public daysRemaining = merchantDaysRemaining;
  public activeCategory = signal<TradeCategory>('all');

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

  public filteredTrades = computed((): TradeEntry[] => {
    const category = this.activeCategory();
    const entries = this.tradeEntries();
    if (category === 'all') return entries;
    return entries.filter((e) => e.trade.type === category);
  });

  public categoryCounts = computed(() => {
    const entries = this.tradeEntries();
    return {
      all: entries.length,
      buy: entries.filter((e) => e.trade.type === 'buy').length,
      sell: entries.filter((e) => e.trade.type === 'sell').length,
      special: entries.filter((e) => e.trade.type === 'special').length,
    };
  });

  public setCategory(category: TradeCategory): void {
    this.activeCategory.set(category);
  }

  public async executeTrade(tradeId: MerchantTradeId): Promise<void> {
    const result = await merchantExecuteTrade(tradeId);
    if (result.success) {
      const trade = contentGetEntry<MerchantTradeContent>(tradeId);
      notifySuccess(`Trade complete: ${trade?.name ?? 'Unknown'}`);
    } else {
      notifyError(result.error ?? 'Trade failed');
    }
  }

  public open(): void {
    this.visible.set(true);
  }

  public close(): void {
    this.visible.set(false);
    this.activeCategory.set('all');
  }

  public getCategoryLabel(type: MerchantTradeType): string {
    switch (type) {
      case 'buy':
        return 'Buy';
      case 'sell':
        return 'Sell';
      case 'special':
        return 'Special';
    }
  }

  public getCategoryBadgeClass(type: MerchantTradeType): string {
    switch (type) {
      case 'buy':
        return 'badge-info';
      case 'sell':
        return 'badge-success';
      case 'special':
        return 'badge-accent';
    }
  }

  private formatCost(cost: ResourceCost): { type: ResourceType; amount: number }[] {
    return Object.entries(cost)
      .filter(([, amount]) => amount && amount > 0)
      .map(([type, amount]) => ({ type: type as ResourceType, amount: amount! }));
  }
}
