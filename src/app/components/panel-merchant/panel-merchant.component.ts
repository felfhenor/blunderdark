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
  ForgeRecipeContent,
  MerchantTradeContent,
  MerchantTradeId,
  ResourceType,
  TradeEntry,
  TrapContent,
} from '@interfaces';
import { sortBy } from 'es-toolkit/compat';

type CostDisplayEntry =
  | { kind: 'resource'; type: ResourceType; amount: number }
  | { kind: 'trap'; name: string; count: number }
  | { kind: 'forgeItem'; name: string; count: number };

type MerchantTradeEntry = {
  trade: MerchantTradeContent;
  stock: number;
  affordable: boolean;
  costEntries: CostDisplayEntry[];
  rewardEntries: CostDisplayEntry[];
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

  public tradeEntries = computed((): MerchantTradeEntry[] => {
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
            cost: [],
            reward: [],
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
        costEntries: this.toDisplayEntries(trade.cost),
        rewardEntries: this.toDisplayEntries(trade.reward),
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

  private toDisplayEntries(entries: TradeEntry[]): CostDisplayEntry[] {
    return entries.map((entry): CostDisplayEntry => {
      switch (entry.type) {
        case 'resource':
          return { kind: 'resource', type: entry.resourceType, amount: entry.amount };
        case 'trap': {
          const trap = contentGetEntry<TrapContent>(entry.trapId);
          return { kind: 'trap', name: trap?.name ?? 'Unknown Trap', count: entry.count };
        }
        case 'forgeItem': {
          const recipe = contentGetEntry<ForgeRecipeContent>(entry.forgeRecipeId);
          return { kind: 'forgeItem', name: recipe?.name ?? 'Unknown Item', count: entry.count };
        }
      }
    });
  }
}
