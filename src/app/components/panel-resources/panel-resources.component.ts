import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import {
  gamestate,
  productionBreakdowns,
  productionPerMinute,
  productionRates,
} from '@helpers';
import type { ResourceType } from '@interfaces';
import type { ResourceProductionBreakdown } from '@helpers/production';

type ResourceDisplay = {
  type: ResourceType;
  label: string;
  color: string;
  description: string;
};

const LOW_THRESHOLD = 0.2;
const CRITICAL_THRESHOLD = 0.1;
const TOOLTIP_DELAY_MS = 250;

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
  imports: [DecimalPipe],
  templateUrl: './panel-resources.component.html',
  styleUrl: './panel-resources.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelResourcesComponent {
  public readonly resources = RESOURCE_DISPLAY;

  public allResources = computed(() => gamestate().world.resources);
  public rates = productionRates;
  public breakdowns = productionBreakdowns;

  public activeTooltip = signal<ResourceType | undefined>(undefined);
  private tooltipTimer: ReturnType<typeof setTimeout> | undefined = undefined;

  public getCurrent(type: ResourceType): number {
    return this.allResources()[type].current;
  }

  public getMax(type: ResourceType): number {
    return this.allResources()[type].max;
  }

  public getPercent(type: ResourceType): number {
    const res = this.allResources()[type];
    if (res.max === 0) return 0;
    return (res.current / res.max) * 100;
  }

  public getRate(type: ResourceType): number {
    const perTick = this.rates()[type] ?? 0;
    return productionPerMinute(perTick);
  }

  public isFull(type: ResourceType): boolean {
    const res = this.allResources()[type];
    return res.max > 0 && res.current >= res.max;
  }

  public getWarningClass(type: ResourceType): string {
    const res = this.allResources()[type];
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

  public onMouseEnter(type: ResourceType): void {
    this.clearTimer();
    this.tooltipTimer = setTimeout(() => {
      this.activeTooltip.set(type);
    }, TOOLTIP_DELAY_MS);
  }

  public onMouseLeave(): void {
    this.clearTimer();
    this.activeTooltip.set(undefined);
  }

  private clearTimer(): void {
    if (this.tooltipTimer) {
      clearTimeout(this.tooltipTimer);
      this.tooltipTimer = undefined;
    }
  }
}
