import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { IconComponent } from '@components/icon/icon.component';
import { STAT_COLOR_MAP, STAT_ICON_MAP, STAT_LABEL_MAP } from '@helpers';
import type { StatType } from '@helpers/stat-icons';

@Component({
  selector: 'app-stat-name',
  imports: [IconComponent, DecimalPipe],
  template: `
    <app-icon [name]="icon()" [color]="color()" />
    @if (value() !== undefined) {
      <span>{{ prefix() }}{{ value() | number:'1.0-2' }}{{ suffix() }}</span>
    } @else {
      <span>{{ label() }}</span>
    }
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
export class StatNameComponent {
  public type = input.required<StatType>();
  public value = input<number>();
  public prefix = input<string>('');
  public suffix = input<string>('');

  public icon = computed(() => STAT_ICON_MAP[this.type()]);
  public color = computed(() => STAT_COLOR_MAP[this.type()]);
  public label = computed(() => STAT_LABEL_MAP[this.type()]);
}
