import { DecimalPipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  output,
} from '@angular/core';
import { CurrencyCostComponent } from '@components/currency-cost/currency-cost.component';
import { IconComponent } from '@components/icon/icon.component';
import { CurrencyNameComponent } from '@components/currency-name/currency-name.component';
import {
  currencyIsUnlocked,
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
import { analyticsSendDesignEvent } from '@helpers/analytics';
import { corruptionProgressBarClass } from '@helpers/corruption-effects';
import type { ResourceType } from '@interfaces';
import { TippyDirective } from '@ngneat/helipopper';

@Component({
  selector: 'app-resource-bar-top',
  imports: [
    DecimalPipe,
    NgClass,
    CurrencyCostComponent,
    CurrencyNameComponent,
    IconComponent,
    TippyDirective,
  ],
  host: {
    class: 'block pointer-events-auto',
  },
  templateUrl: './resource-bar-top.component.html',
  styleUrl: './resource-bar-top.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceBarTopComponent {
  public readonly resources = computed(() =>
    RESOURCE_DISPLAY.filter((r) => currencyIsUnlocked(r.type)),
  );

  public readonly getCurrent = resourceDisplayGetCurrent;
  public readonly getMax = resourceDisplayGetMax;
  public readonly getPercent = resourceDisplayGetPercent;
  public readonly isFull = resourceDisplayIsFull;
  public readonly getResourceBreakdown = resourceDisplayGetBreakdown;
  public readonly formatBreakdownRate = resourceDisplayFormatBreakdownRate;
  public readonly getCorruptionColorClass =
    resourceDisplayGetCorruptionColorClass;
  public readonly getCorruptionBadgeClass =
    resourceDisplayGetCorruptionBadgeClass;
  public readonly getCorruptionProgressBarClass = corruptionProgressBarClass;
  public corruptionInfo = computed(() => resourceDisplayGetCorruptionInfo());

  public resourceClick = output<ResourceType>();

  public openBreakdown(type: ResourceType): void {
    analyticsSendDesignEvent('Resource:Breakdown:' + type);
    this.resourceClick.emit(type);
  }
}
