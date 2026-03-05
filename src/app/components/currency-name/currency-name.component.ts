import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { IconComponent } from '@components/icon/icon.component';
import {
  RESOURCE_COLOR_MAP,
  RESOURCE_ICON_MAP,
  RESOURCE_LABEL_MAP,
} from '@helpers';
import type { ResourceType } from '@interfaces';

@Component({
  selector: 'app-currency-name',
  imports: [IconComponent, DecimalPipe],
  host: {
    class: 'inline-flex items-center gap-1 align-baseline',
  },
  template: `
    <app-icon [name]="icon()" [color]="color()" />
    @if (short()) {
      <span class="inline-block text-right tabular-nums" [style.min-width]="minWidth()">{{ amount() | number: numberFormat() }}</span>
    } @else {
      <span>{{ label() }}</span>
    }
  `,
  styles: `
    :host ::ng-deep svg {
      paint-order: stroke fill;
      stroke: black;
      stroke-width: 18px;
      stroke-linejoin: round;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrencyNameComponent {
  public type = input.required<ResourceType>();
  public short = input(false);
  public amount = input(0);
  public minWidth = input('');
  public numberFormat = input('1.0-0');

  public icon = computed(() => RESOURCE_ICON_MAP[this.type()]);
  public color = computed(() => RESOURCE_COLOR_MAP[this.type()]);
  public label = computed(() => RESOURCE_LABEL_MAP[this.type()]);
}
