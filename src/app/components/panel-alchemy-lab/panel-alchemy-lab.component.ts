import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CurrencyCostComponent } from '@components/currency-cost/currency-cost.component';
import { CurrencyCostListComponent } from '@components/currency-cost-list/currency-cost-list.component';
import {
  alchemyLabCanConvert,
  alchemyLabCompleted$,
  alchemyLabGetAdjacentRoomTypeIds,
  alchemyLabGetAvailableRecipes,
  alchemyLabGetConversion,
  alchemyLabGetConversionTicks,
  alchemyLabGetEffectiveCost,
  alchemyLabStartConversion,
  alchemyLabStopConversion,
  contentGetEntry,
  floorAll,
  floorCurrent,
  gamestate,
  notify,
  resourceCanAfford,
  roomRoleFindById,
  updateGamestate,
} from '@helpers';
import { ticksToRealSeconds } from '@helpers/game-time';
import type { AlchemyRecipeContent, AlchemyRecipeId } from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';
import { sortBy } from 'es-toolkit/compat';

@Component({
  selector: 'app-panel-alchemy-lab',
  imports: [DecimalPipe, CurrencyCostComponent, CurrencyCostListComponent],
  templateUrl: './panel-alchemy-lab.component.html',
  styleUrl: './panel-alchemy-lab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelAlchemyLabComponent {
  private subscription = alchemyLabCompleted$.subscribe((evt) => {
    notify('Alchemy', `Converted: +${evt.outputAmount} ${evt.outputResource}`);
  });

  public labRoom = computed(() => {
    const roleId = roomRoleFindById('alchemyLab');
    if (!roleId) return undefined;

    for (const floor of floorAll()) {
      const room = floor.rooms.find((r) => r.roomTypeId === roleId);
      if (room) return room;
    }
    return undefined;
  });

  public roomDef = computed(() => {
    const room = this.labRoom();
    if (!room) return undefined;
    return contentGetEntry<RoomContent>(room.roomTypeId);
  });

  public assignedWorkers = computed(() => {
    const room = this.labRoom();
    if (!room) return [];

    const state = gamestate();
    const mapped = state.world.inhabitants
      .filter((i) => i.assignedRoomId === room.id)
      .map((i) => {
        const def = contentGetEntry<InhabitantContent>(i.definitionId);
        return { ...i, defName: def?.name ?? i.name };
      });
    return sortBy(mapped, [(e) => e.defName]);
  });

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
      const canAfford = resourceCanAfford(effectiveCost);

      return {
        recipe,
        ticks,
        timeSeconds: ticksToRealSeconds(ticks),
        effectiveCost,
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
      outputResource: recipe?.outputResource ?? 'flux',
      outputAmount: recipe?.outputAmount ?? 1,
      percent,
      inputConsumed: conversion.inputConsumed,
    };
  });

  public async selectRecipe(recipeId: AlchemyRecipeId, targetTicks: number): Promise<void> {
    const room = this.labRoom();
    if (!room) return;

    const state = gamestate();
    const { canConvert } = alchemyLabCanConvert(room.id, state.world.floors);
    if (!canConvert) return;

    await updateGamestate((s) => {
      s.world.alchemyConversions = alchemyLabStartConversion(
        s.world.alchemyConversions,
        room.id,
        recipeId,
        targetTicks,
      );
      return s;
    });
  }

  public async stopConversion(): Promise<void> {
    const room = this.labRoom();
    if (!room) return;

    await updateGamestate((s) => {
      s.world.alchemyConversions = alchemyLabStopConversion(
        s.world.alchemyConversions,
        room.id,
      );
      return s;
    });
  }
}
