import { DecimalPipe, UpperCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { CurrencyNameComponent } from '@components/currency-name/currency-name.component';
import { IconComponent } from '@components/icon/icon.component';
import {
  corruptionGetLevel,
  corruptionGetLevelDescription,
  dayNightFormatMultiplier,
  dayNightGetAllActiveModifiers,
  dayNightGetPhaseLabel,
  gamestate,
  hungerCalculateTotalConsumption,
  hungerGetWarningLevel,
  productionBreakdowns,
  productionPerMinute,
  productionRates,
  GAME_TIME_TICKS_PER_MINUTE,
} from '@helpers';
import type { CorruptionLevel } from '@interfaces/corruption';
import type { DayNightCreatureModifier, DayNightResourceModifier } from '@interfaces/day-night';
import type { ResourceType } from '@interfaces';
import type { ResourceProductionBreakdown } from '@interfaces/production';
import { TippyDirective } from '@ngneat/helipopper';

type ResourceDisplay = {
  type: ResourceType;
  label: string;
  color: string;
  description: string;
};

const LOW_THRESHOLD = 0.2;
const CRITICAL_THRESHOLD = 0.1;

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
  selector: 'app-panel-resources',
  imports: [DecimalPipe, UpperCasePipe, CurrencyNameComponent, IconComponent, TippyDirective],
  templateUrl: './panel-resources.component.html',
  styleUrl: './panel-resources.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelResourcesComponent {
  public readonly Math = Math;
  public readonly resources = RESOURCE_DISPLAY.filter(r => r.type !== 'corruption');
  public readonly corruptionDisplay = RESOURCE_DISPLAY.find(r => r.type === 'corruption')!;

  public resourceAll = computed(() => gamestate().world.resources);
  public rates = productionRates;
  public breakdowns = productionBreakdowns;

  public activeTimeModifiers = computed(() => {
    const hour = gamestate().clock.hour;
    return dayNightGetAllActiveModifiers(hour);
  });

  public foodWarning = computed(() => {
    const state = gamestate();
    const food = state.world.resources.food.current;
    const totalConsumption = hungerCalculateTotalConsumption(
      state.world.inhabitants,
    );
    const level = hungerGetWarningLevel(food, totalConsumption);
    if (!level) return undefined;

    let minutesRemaining: number | undefined;
    if (totalConsumption > 0 && food > 0) {
      const ticksRemaining = food / totalConsumption;
      minutesRemaining = Math.floor(ticksRemaining / GAME_TIME_TICKS_PER_MINUTE);
    }

    return { level, minutesRemaining };
  });

  public foodWarningDismissed = signal(false);

  public dismissFoodWarning(): void {
    this.foodWarningDismissed.set(true);
    // Reset after 60 seconds so it can reappear if condition persists
    setTimeout(() => this.foodWarningDismissed.set(false), 60_000);
  }

  public getCurrent(type: ResourceType): number {
    return this.resourceAll()[type].current;
  }

  public getMax(type: ResourceType): number {
    return this.resourceAll()[type].max;
  }

  public getPercent(type: ResourceType): number {
    const res = this.resourceAll()[type];
    if (res.max === 0) return 0;
    return (res.current / res.max) * 100;
  }

  public getRate(type: ResourceType): number {
    const perTick = this.rates()[type] ?? 0;
    return productionPerMinute(perTick);
  }

  public isFull(type: ResourceType): boolean {
    const res = this.resourceAll()[type];
    return res.max > 0 && res.current >= res.max;
  }

  public getWarningClass(type: ResourceType): string {
    const res = this.resourceAll()[type];
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

  public getBreakdown(type: ResourceType): ResourceProductionBreakdown | undefined {
    return this.breakdowns()[type] ?? undefined;
  }

  public formatBreakdownRate(perTick: number): string {
    const perMin = productionPerMinute(perTick);
    if (perMin > 0) return `+${perMin.toFixed(2)}`;
    if (perMin < 0) return perMin.toFixed(2);
    return '0';
  }

  public getPhaseLabel(): string {
    return dayNightGetPhaseLabel(this.activeTimeModifiers().phase);
  }

  public formatMultiplier(mod: DayNightResourceModifier | DayNightCreatureModifier): string {
    return dayNightFormatMultiplier(mod.multiplier);
  }

  public isPositiveModifier(mod: DayNightResourceModifier | DayNightCreatureModifier): boolean {
    return mod.multiplier > 1.0;
  }

  public corruptionInfo = computed(() => {
    const value = this.getCurrent('corruption');
    const level = corruptionGetLevel(value);
    const description = corruptionGetLevelDescription(level);
    return { value, level, description };
  });

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
}
