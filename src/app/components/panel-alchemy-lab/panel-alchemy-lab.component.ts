import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { SFXDirective } from '@directives/sfx.directive';
import { AssignedWorkersListComponent } from '@components/assigned-workers-list/assigned-workers-list.component';
import { CurrencyCostComponent } from '@components/currency-cost/currency-cost.component';
import { JobProgressComponent } from '@components/job-progress/job-progress.component';
import { CurrencyCostListComponent } from '@components/currency-cost-list/currency-cost-list.component';
import {
  alchemyLabCanConvert,
  alchemyLabGetAdjacentRoomTypeIds,
  alchemyLabGetAvailableRecipes,
  alchemyLabGetConversion,
  alchemyLabGetConversionTicks,
  alchemyLabGetEffectiveCost,
  alchemyLabSelectRecipe,
  alchemyLabStopConversionAction,
  contentGetEntry,
  floorCurrent,
  gamestate,
  getAssignedInhabitantsWithDefs,
  resourceCanAfford,
  roomDefFromRoom,
  selectedPlacedRoomByRole,
} from '@helpers';
import { ticksToRealSeconds } from '@helpers/game-time';
import type { AlchemyRecipeContent, AlchemyRecipeId, AlchemyResourceEntry } from '@interfaces';
import type { ResourceCost } from '@interfaces/resource';
import { analyticsSendDesignEvent } from '@helpers/analytics';
import { sortBy } from 'es-toolkit/compat';

@Component({
  selector: 'app-panel-alchemy-lab',
  imports: [AssignedWorkersListComponent, DecimalPipe, CurrencyCostComponent, CurrencyCostListComponent, JobProgressComponent, SFXDirective],
  templateUrl: './panel-alchemy-lab.component.html',
  styleUrl: './panel-alchemy-lab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelAlchemyLabComponent {
  public labRoom = selectedPlacedRoomByRole('alchemyLab');

  public roomDef = roomDefFromRoom(this.labRoom);

  public assignedWorkers = computed(() =>
    getAssignedInhabitantsWithDefs(this.labRoom()?.id),
  );

  public availableRecipes = computed(() => {
    const room = this.labRoom();
    if (!room) return [];

    const recipes = alchemyLabGetAvailableRecipes(room);
    const floor = floorCurrent();
    const adjacentTypes = floor
      ? alchemyLabGetAdjacentRoomTypeIds(room, floor)
      : new Set<string>();

    const workerCount = this.assignedWorkers().length;

    const entries = recipes.map((recipe) => {
      const ticks = alchemyLabGetConversionTicks(room, workerCount, recipe.baseTicks, adjacentTypes);
      const effectiveCost = alchemyLabGetEffectiveCost(room, recipe.inputCost, adjacentTypes);
      const effectiveCostMap = this.entriesToCostMap(effectiveCost);
      const canAfford = resourceCanAfford(effectiveCostMap);

      return {
        recipe,
        ticks,
        timeSeconds: ticksToRealSeconds(ticks),
        effectiveCostMap,
        canAfford,
      };
    });
    return sortBy(entries, [(e) => e.recipe.name]);
  });

  public activeConversion = computed(() => {
    const room = this.labRoom();
    if (!room) return undefined;

    const state = gamestate();
    const conversion = alchemyLabGetConversion(state.world.alchemyConversions, room.id);
    if (!conversion) return undefined;

    const recipe = contentGetEntry<AlchemyRecipeContent>(conversion.recipeId);
    const percent = Math.min(100, Math.round((conversion.progress / conversion.targetTicks) * 100));

    return {
      recipeName: recipe?.name ?? 'Unknown',
      outputCost: recipe?.outputCost ?? [],
      percent,
      inputConsumed: conversion.inputConsumed,
    };
  });

  private entriesToCostMap(entries: AlchemyResourceEntry[]): ResourceCost {
    const result: ResourceCost = {};
    for (const entry of entries) {
      result[entry.resource] = entry.amount;
    }
    return result;
  }

  public async selectRecipe(recipeId: AlchemyRecipeId, targetTicks: number): Promise<void> {
    analyticsSendDesignEvent('Room:Alchemy:Recipe:Select');
    const room = this.labRoom();
    if (!room) return;

    const state = gamestate();
    const { canConvert } = alchemyLabCanConvert(room.id, state.world.floors);
    if (!canConvert) return;

    await alchemyLabSelectRecipe(room.id, recipeId, targetTicks);
  }

  public async stopConversion(): Promise<void> {
    analyticsSendDesignEvent('Room:Alchemy:Conversion:Stop');
    const room = this.labRoom();
    if (!room) return;

    await alchemyLabStopConversionAction(room.id);
  }
}
