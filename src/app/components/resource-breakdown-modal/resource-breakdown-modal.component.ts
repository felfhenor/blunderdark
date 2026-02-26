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
  alchemyLabCalculateBreakdown,
  consumptionCalculateDetailedBreakdown,
  gamestate,
  productionCalculateDetailedBreakdown,
  productionPerMinute,
} from '@helpers';
import type { ResourceType } from '@interfaces';
import type {
  AlchemyConversionDetail,
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

    const alchemy = alchemyLabCalculateBreakdown(
      state.world.floors,
      state.world.alchemyConversions,
      resType,
    );

    let totalBase = 0;
    let totalInhabitantBonus = 0;
    let totalAdjacencyBonus = 0;
    let totalModifierEffect = 0;
    let totalProduction = 0;
    let totalConsumption = 0;
    let totalAlchemyProduction = 0;
    let totalAlchemyConsumption = 0;

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

    for (const a of alchemy.production) {
      totalAlchemyProduction += a.perTick;
    }

    for (const a of alchemy.consumption) {
      totalAlchemyConsumption += a.amount;
    }

    const allConsumption = [...consumption, ...alchemy.consumption];

    return {
      production,
      alchemyProduction: alchemy.production,
      consumption: allConsumption,
      totals: {
        base: totalBase,
        inhabitantBonus: totalInhabitantBonus,
        adjacencyBonus: totalAdjacencyBonus,
        modifierEffect: totalModifierEffect,
        totalProduction: totalProduction + totalAlchemyProduction,
        alchemyProduction: totalAlchemyProduction,
        totalConsumption: totalConsumption + totalAlchemyConsumption,
        alchemyConsumption: totalAlchemyConsumption,
        net:
          totalProduction +
          totalAlchemyProduction -
          totalConsumption -
          totalAlchemyConsumption,
      },
    };
  });

  public sortedProduction = computed<RoomProductionDetail[]>(() => {
    const bd = this.breakdown();
    if (!bd) return [];
    return sortBy(
      bd.production.filter((r) => r.final !== 0),
      [(r) => -r.final],
    );
  });

  public roomsWithWorkers = computed<RoomProductionDetail[]>(() => {
    const bd = this.breakdown();
    if (!bd) return [];
    return sortBy(
      bd.production.filter((r) => r.workerCount > 0 && r.inhabitantBonus !== 0),
      [(r) => -r.inhabitantBonus],
    );
  });

  public roomsWithModifiers = computed<RoomProductionDetail[]>(() => {
    const bd = this.breakdown();
    if (!bd) return [];
    return bd.production.filter(
      (r) =>
        r.modifierDetails.some((m) => m.multiplier !== 1) ||
        r.adjacencyBonus !== 0 ||
        r.featureBonus !== 0 ||
        r.synergyBonus !== 0 ||
        r.upgradeMultiplier !== 1 ||
        r.flatFeatureProduction !== 0 ||
        r.upgradeSecondaryProduction !== 0,
    );
  });

  public alchemyProductionDetails = computed<AlchemyConversionDetail[]>(() => {
    const bd = this.breakdown();
    if (!bd) return [];
    return bd.alchemyProduction.filter((a) => a.perTick !== 0);
  });

  public consumptionDetails = computed<ConsumptionDetail[]>(() => {
    const bd = this.breakdown();
    if (!bd) return [];
    return sortBy(
      bd.consumption.filter((c) => c.amount !== 0),
      [(c) => -c.amount],
    );
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
    category: 'feeding' | 'legendary_upkeep' | 'feature_maintenance' | 'alchemy_input',
  ): string {
    switch (category) {
      case 'feeding':
        return 'Feeding';
      case 'legendary_upkeep':
        return 'Legendary Upkeep';
      case 'feature_maintenance':
        return 'Maintenance';
      case 'alchemy_input':
        return 'Alchemy';
    }
  }
}
