import { DecimalPipe, NgClass, UpperCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
} from '@angular/core';
import { CurrencyCostComponent } from '@components/currency-cost/currency-cost.component';
import { CurrencyNameComponent } from '@components/currency-name/currency-name.component';
import {
  consumptionBreakdowns,
  corruptionGetLevel,
  corruptionGetLevelDescription,
  gamestate,
  productionBreakdowns,
  productionPerMinute,
  productionRates,
} from '@helpers';
import type { CorruptionLevel } from '@interfaces/corruption';
import type { ResourceType } from '@interfaces';
import type {
  ResourceConsumptionBreakdown,
  ResourceProductionBreakdown,
} from '@interfaces/production';
import { TippyDirective } from '@ngneat/helipopper';

type ResourceBreakdownInfo = {
  prod: ResourceProductionBreakdown | undefined;
  cons: ResourceConsumptionBreakdown | undefined;
  net: number;
};

type ResourceDisplay = {
  type: ResourceType;
  label: string;
  color: string;
  description: string;
};

const RESOURCE_DISPLAY: ResourceDisplay[] = [
  {
    type: 'crystals',
    label: 'Crystals',
    color: 'progress-info',
    description: 'Magical crystals used for construction and upgrades.',
  },
  {
    type: 'food',
    label: 'Food',
    color: 'progress-success',
    description: 'Sustenance for your dungeon inhabitants.',
  },
  {
    type: 'gold',
    label: 'Gold',
    color: 'progress-warning',
    description: 'Currency for hiring and trading.',
  },
  {
    type: 'flux',
    label: 'Flux',
    color: 'progress-secondary',
    description: 'Arcane energy that powers magical rooms.',
  },
  {
    type: 'research',
    label: 'Research',
    color: 'progress-primary',
    description: 'Knowledge points for unlocking new technologies.',
  },
  {
    type: 'essence',
    label: 'Essence',
    color: 'progress-accent',
    description: 'Spiritual energy harvested from the dungeon.',
  },
  {
    type: 'corruption',
    label: 'Corruption',
    color: 'progress-error',
    description: 'Dark energy that spreads through your dungeon.',
  },
];

@Component({
  selector: 'app-resource-bar-top',
  imports: [DecimalPipe, NgClass, UpperCasePipe, CurrencyCostComponent, CurrencyNameComponent, TippyDirective],
  templateUrl: './resource-bar-top.component.html',
  styleUrl: './resource-bar-top.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceBarTopComponent {
  public readonly resources = RESOURCE_DISPLAY;

  public resourceAll = computed(() => gamestate().world.resources);
  public rates = productionRates;
  public breakdowns = productionBreakdowns;
  public consumptions = consumptionBreakdowns;

  public getCurrent(type: ResourceType): number {
    return this.resourceAll()[type].current;
  }

  public getMax(type: ResourceType): number {
    return this.resourceAll()[type].max;
  }

  public getPercent(type: ResourceType): number {
    const res = this.resourceAll()[type];
    if (type === 'corruption') {
      return res.current === 0 ? 0 : Math.min(100, (res.current / 200) * 100);
    }
    if (res.max === 0) return 0;
    return (res.current / res.max) * 100;
  }

  public isFull(type: ResourceType): boolean {
    const res = this.resourceAll()[type];
    return res.max > 0 && res.current >= res.max;
  }

  public getResourceBreakdown(
    type: ResourceType,
  ): ResourceBreakdownInfo | undefined {
    const prod = this.breakdowns()[type];
    const cons = this.consumptions()[type];
    if (!prod && !cons) return undefined;

    const productionFinal = prod?.final ?? 0;
    const consumptionTotal = cons?.total ?? 0;

    return {
      prod: prod ?? undefined,
      cons: cons ?? undefined,
      net: productionFinal - consumptionTotal,
    };
  }

  public formatBreakdownRate(perTick: number): string {
    const perMin = productionPerMinute(perTick);
    if (perMin > 0) return `+${perMin.toFixed(2)}`;
    if (perMin < 0) return perMin.toFixed(2);
    return '0';
  }

  public corruptionInfo = computed(() => {
    const value = this.getCurrent('corruption');
    const level = corruptionGetLevel(value);
    const description = corruptionGetLevelDescription(level);
    return { value, level, description };
  });

  public getCorruptionBadgeClass(level: CorruptionLevel): string {
    switch (level) {
      case 'low':
        return 'badge-success';
      case 'medium':
        return 'badge-warning';
      case 'high':
        return 'badge-ghost bg-orange-400/20 text-orange-400';
      case 'critical':
        return 'badge-error';
    }
  }

  public getCorruptionColorClass(level: CorruptionLevel): string {
    switch (level) {
      case 'low':
        return 'text-success';
      case 'medium':
        return 'text-warning';
      case 'high':
        return 'text-orange-400';
      case 'critical':
        return 'text-error';
    }
  }
}
