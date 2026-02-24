import { DecimalPipe, NgClass, UpperCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  output,
} from '@angular/core';
import { CurrencyCostComponent } from '@components/currency-cost/currency-cost.component';
import { CurrencyNameComponent } from '@components/currency-name/currency-name.component';
import {
  RESOURCE_DISPLAY,
  resourceDisplayFormatBreakdownRate,
  resourceDisplayGetBreakdown,
  resourceDisplayGetCorruptionBadgeClass,
  resourceDisplayGetCorruptionColorClass,
  resourceDisplayGetCorruptionInfo,
  resourceDisplayGetCurrent,
  resourceDisplayGetMax,
  resourceDisplayGetPercent,
  resourceDisplayIsFull,
} from '@helpers';
import type { ResourceType } from '@interfaces';
import { TippyDirective } from '@ngneat/helipopper';

@Component({
  selector: 'app-resource-bar-top',
  imports: [DecimalPipe, NgClass, UpperCasePipe, CurrencyCostComponent, CurrencyNameComponent, TippyDirective],
  host: {
    class: 'block pointer-events-auto',
  },
  templateUrl: './resource-bar-top.component.html',
  styleUrl: './resource-bar-top.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceBarTopComponent {
  public readonly resources = RESOURCE_DISPLAY;

  public readonly getCurrent = resourceDisplayGetCurrent;
  public readonly getMax = resourceDisplayGetMax;
  public readonly getPercent = resourceDisplayGetPercent;
  public readonly isFull = resourceDisplayIsFull;
  public readonly getResourceBreakdown = resourceDisplayGetBreakdown;
  public readonly formatBreakdownRate = resourceDisplayFormatBreakdownRate;
  public readonly getCorruptionColorClass = resourceDisplayGetCorruptionColorClass;
  public readonly getCorruptionBadgeClass = resourceDisplayGetCorruptionBadgeClass;
  public corruptionInfo = computed(() => resourceDisplayGetCorruptionInfo());

  public resourceClick = output<ResourceType>();

  public openBreakdown(type: ResourceType): void {
    this.resourceClick.emit(type);
  }
}
