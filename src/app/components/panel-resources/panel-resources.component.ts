import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { gamestate, productionPerMinute, productionRates } from '@helpers';
import type { ResourceType } from '@interfaces';

type ResourceDisplay = {
  type: ResourceType;
  label: string;
  color: string;
};

const RESOURCE_DISPLAY: ResourceDisplay[] = [
  { type: 'crystals', label: 'Crystals', color: 'progress-info' },
  { type: 'gold', label: 'Gold', color: 'progress-warning' },
  { type: 'food', label: 'Food', color: 'progress-success' },
  { type: 'flux', label: 'Flux', color: 'progress-secondary' },
  { type: 'research', label: 'Research', color: 'progress-primary' },
  { type: 'essence', label: 'Essence', color: 'progress-accent' },
  { type: 'corruption', label: 'Corruption', color: 'progress-error' },
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
}
