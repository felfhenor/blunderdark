import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  signal,
} from '@angular/core';
import { CurrencyNameComponent } from '@components/currency-name/currency-name.component';
import { ModalComponent } from '@components/modal/modal.component';
import { TabBarComponent } from '@components/tab-bar/tab-bar.component';
import type { TabDefinition } from '@components/tab-bar/tab-bar.component';
import {
  consumptionCalculateDetailedBreakdown,
  gamestate,
  productionCalculateDetailedBreakdown,
  productionPerMinute,
} from '@helpers';
import type { ResourceType } from '@interfaces';
import type {
  ConsumptionDetail,
  ResourceDetailedBreakdown,
  RoomProductionDetail,
} from '@interfaces/production';
import { sortBy } from 'es-toolkit/compat';

@Component({
  selector: 'app-resource-breakdown-modal',
  imports: [ModalComponent, CurrencyNameComponent, TabBarComponent],
  templateUrl: './resource-breakdown-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceBreakdownModalComponent {
  public visible = model<boolean>(false);
  public resourceType = input.required<ResourceType>();

  public activeTab = signal<string>('base');

  public readonly tabDefs: TabDefinition[] = [
    { id: 'base', label: 'Base' },
    { id: 'workers', label: 'Workers' },
    { id: 'modifiers', label: 'Modifiers' },
    { id: 'costs', label: 'Costs' },
  ];

  public breakdown = computed<ResourceDetailedBreakdown | undefined>(() => {
    if (!this.visible()) return undefined;

    const state = gamestate();
    const resType = this.resourceType();

    const production = productionCalculateDetailedBreakdown(
      state.world.floors,
      resType,
      state.clock.hour,
      state.world.season.currentSeason,
    );

    const consumption = consumptionCalculateDetailedBreakdown(
      state.world.floors,
      state.world.inhabitants,
      resType,
    );

    let totalBase = 0;
    let totalInhabitantBonus = 0;
    let totalAdjacencyBonus = 0;
    let totalModifierEffect = 0;
    let totalProduction = 0;
    let totalConsumption = 0;

    for (const room of production) {
      totalBase += room.base;
      totalInhabitantBonus += room.inhabitantBonus;
      totalAdjacencyBonus += room.adjacencyBonus;
      totalModifierEffect += room.modifierEffect;
      totalProduction += room.final;
    }

    for (const c of consumption) {
      totalConsumption += c.amount;
    }

    return {
      production,
      consumption,
      totals: {
        base: totalBase,
        inhabitantBonus: totalInhabitantBonus,
        adjacencyBonus: totalAdjacencyBonus,
        modifierEffect: totalModifierEffect,
        totalProduction,
        totalConsumption,
        net: totalProduction - totalConsumption,
      },
    };
  });

  public sortedProduction = computed<RoomProductionDetail[]>(() => {
    const bd = this.breakdown();
    if (!bd) return [];
    return sortBy(bd.production, [(r) => -r.final]);
  });

  public roomsWithWorkers = computed<RoomProductionDetail[]>(() => {
    const bd = this.breakdown();
    if (!bd) return [];
    return sortBy(
      bd.production.filter((r) => r.workerCount > 0),
      [(r) => -r.inhabitantBonus],
    );
  });

  public roomsWithModifiers = computed<RoomProductionDetail[]>(() => {
    const bd = this.breakdown();
    if (!bd) return [];
    return bd.production.filter(
      (r) =>
        r.modifierDetails.length > 0 ||
        r.adjacencyBonus !== 0 ||
        r.featureBonus !== 0 ||
        r.synergyBonus !== 0,
    );
  });

  public consumptionDetails = computed<ConsumptionDetail[]>(() => {
    const bd = this.breakdown();
    if (!bd) return [];
    return sortBy(bd.consumption, [(c) => -c.amount]);
  });

  public formatRate(perTick: number): string {
    const perMin = productionPerMinute(perTick);
    if (perMin > 0) return `+${perMin.toFixed(2)}`;
    if (perMin < 0) return perMin.toFixed(2);
    return '0.00';
  }

  public formatMultiplier(mult: number): string {
    const pct = Math.round((mult - 1.0) * 100);
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct}%`;
  }

  public categoryLabel(
    category: 'feeding' | 'legendary_upkeep' | 'feature_maintenance',
  ): string {
    switch (category) {
      case 'feeding':
        return 'Feeding';
      case 'legendary_upkeep':
        return 'Legendary Upkeep';
      case 'feature_maintenance':
        return 'Maintenance';
    }
  }
}
