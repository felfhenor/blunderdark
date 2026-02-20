import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CurrencyCostComponent } from '@components/currency-cost/currency-cost.component';
import type { ResourceCost, ResourceType } from '@interfaces';

@Component({
  selector: 'app-currency-cost-list',
  imports: [CurrencyCostComponent],
  template: `
    @for (entry of entries(); track entry.type) {
      <app-currency-cost [type]="entry.type" [amount]="entry.amount" />
    }
  `,
  host: {
    style: 'display: inline-flex; align-items: center; gap: 4px; flex-wrap: wrap;',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrencyCostListComponent {
  public cost = input.required<ResourceCost>();

  public entries = computed(() => {
    return Object.entries(this.cost())
      .filter(([, v]) => v && v > 0)
      .map(([type, v]) => ({ type: type as ResourceType, amount: v! }));
  });
}
