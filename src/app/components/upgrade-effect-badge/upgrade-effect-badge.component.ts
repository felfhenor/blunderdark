import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { CurrencyCostComponent } from '@components/currency-cost/currency-cost.component';
import { CurrencyNameComponent } from '@components/currency-name/currency-name.component';
import { productionPerMinute } from '@helpers';
import type { RoomUpgradeEffect } from '@interfaces';
import { TippyDirective } from '@ngneat/helipopper';
import { startCase } from 'es-toolkit';

@Component({
  selector: 'app-upgrade-effect-badge',
  imports: [CurrencyCostComponent, CurrencyNameComponent, TippyDirective],
  template: `
    <span
      class="badge badge-xs badge-success badge-outline"
      [tp]="tooltipText()"
      [tpDelay]="250"
    >
      @switch (effect().type) {
        @case ('productionBonus') {
          +{{ effect().value * 100 }}%
          @if (effect().resource) {
            <app-currency-name [type]="$any(effect().resource)" />
          } @else {
            all
          }
          production
        }
        @case ('secondaryProduction') {
          +
          <app-currency-cost
            [type]="$any(effect().resource)"
            [amount]="perMinuteValue()"
          />
          /min
        }
        @case ('productionMultiplier') {
          x{{ effect().value }} production
        }
        @case ('maxInhabitantBonus') {
          +{{ effect().value }} max inhabitants
        }
        @case ('globalMaxInhabitantBonus') {
          +{{ effect().value }} global roster cap
        }
        @case ('fearReduction') {
          -{{ effect().value }} fear
        }
        @case ('storageSpecialization') {
          +{{ effect().value }} max
          <app-currency-name [type]="$any(effect().resource)" />
          capacity
        }
        @default {
          {{ formatEffectType(effect().type) }}: {{ effect().value }}
        }
      }
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpgradeEffectBadgeComponent {
  public effect = input.required<RoomUpgradeEffect>();
  public tooltipText = input.required<string>();
  public perMinuteValue = computed(() =>
    productionPerMinute(this.effect().value),
  );

  public formatEffectType(type: string): string {
    return startCase(type);
  }
}
