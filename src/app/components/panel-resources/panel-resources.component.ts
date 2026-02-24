import { DecimalPipe, NgClass, UpperCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { CurrencyNameComponent } from '@components/currency-name/currency-name.component';
import {
  gamestate,
  hungerCalculateTotalConsumption,
  hungerGetWarningLevel,
  productionPerMinute,
  productionRates,
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
import { ticksToRealSeconds } from '@helpers/game-time';
import type { ResourceType } from '@interfaces';
import { TippyDirective } from '@ngneat/helipopper';

const LOW_THRESHOLD = 0.2;
const CRITICAL_THRESHOLD = 0.1;

@Component({
  selector: 'app-panel-resources',
  imports: [DecimalPipe, NgClass, UpperCasePipe, CurrencyNameComponent, TippyDirective],
  templateUrl: './panel-resources.component.html',
  styleUrl: './panel-resources.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelResourcesComponent {
  public readonly resources = RESOURCE_DISPLAY;
  public rates = productionRates;

  public readonly getCurrent = resourceDisplayGetCurrent;
  public readonly getMax = resourceDisplayGetMax;
  public readonly getPercent = resourceDisplayGetPercent;
  public readonly isFull = resourceDisplayIsFull;
  public readonly getResourceBreakdown = resourceDisplayGetBreakdown;
  public readonly formatBreakdownRate = resourceDisplayFormatBreakdownRate;
  public readonly getCorruptionColorClass = resourceDisplayGetCorruptionColorClass;
  public readonly getCorruptionBadgeClass = resourceDisplayGetCorruptionBadgeClass;
  public corruptionInfo = computed(() => resourceDisplayGetCorruptionInfo());

  public foodWarning = computed(() => {
    const state = gamestate();
    const food = state.world.resources.food.current;
    const totalConsumption = hungerCalculateTotalConsumption(
      state.world.inhabitants,
    );
    const level = hungerGetWarningLevel(food, totalConsumption);
    if (!level) return undefined;

    let secondsRemaining: number | undefined;
    if (totalConsumption > 0 && food > 0) {
      const ticksRemaining = food / totalConsumption;
      secondsRemaining = Math.floor(ticksToRealSeconds(ticksRemaining));
    }

    return { level, secondsRemaining };
  });

  public foodWarningDismissed = signal(false);

  public dismissFoodWarning(): void {
    this.foodWarningDismissed.set(true);
    setTimeout(() => this.foodWarningDismissed.set(false), 60_000);
  }

  public getRate(type: ResourceType): number {
    const perTick = this.rates()[type] ?? 0;
    return productionPerMinute(perTick);
  }

  public getWarningClass(type: ResourceType): string {
    const res = gamestate().world.resources[type];
    if (res.max === 0) return '';
    const ratio = res.current / res.max;

    if (res.current === 0) return 'resource-empty';
    if (ratio <= CRITICAL_THRESHOLD) return 'resource-critical';
    if (ratio <= LOW_THRESHOLD) return 'resource-low';
    return '';
  }

  public getRateClass(type: ResourceType): string {
    const rate = this.getRate(type);
    if (rate > 0) return 'text-success';
    if (rate < 0) return 'text-error';
    return 'opacity-50';
  }

  public formatRate(type: ResourceType): string {
    const rate = this.getRate(type);
    if (rate > 0) return `+${rate.toFixed(2)}/min`;
    if (rate < 0) return `${rate.toFixed(2)}/min`;
    return '0/min';
  }
}
