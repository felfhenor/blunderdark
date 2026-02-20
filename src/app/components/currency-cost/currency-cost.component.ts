import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CurrencyNameComponent } from '@components/currency-name/currency-name.component';
import type { ResourceType } from '@interfaces';

@Component({
  selector: 'app-currency-cost',
  imports: [CurrencyNameComponent],
  template: `<app-currency-name [type]="type()" [short]="true" [amount]="amount()" />`,
  host: {
    style: 'display: inline-flex; align-items: center;',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrencyCostComponent {
  public type = input.required<ResourceType>();
  public amount = input.required<number>();
}
