import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { IconComponent } from '@components/icon/icon.component';
import { RESOURCE_COLOR_MAP, RESOURCE_ICON_MAP, RESOURCE_LABEL_MAP } from '@helpers';
import type { ResourceType } from '@interfaces';

@Component({
  selector: 'app-currency-name',
  imports: [IconComponent],
  template: `
    <app-icon [name]="icon()" [color]="color()" />
    <span>{{ label() }}</span>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      vertical-align: baseline;
    }

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

  public icon = computed(() => RESOURCE_ICON_MAP[this.type()]);
  public color = computed(() => RESOURCE_COLOR_MAP[this.type()]);
  public label = computed(() => RESOURCE_LABEL_MAP[this.type()]);
}
