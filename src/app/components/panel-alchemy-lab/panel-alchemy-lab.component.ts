import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
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
  floorCurrent,
  gamestate,
  gridSelectedTile,
  notify,
  resourceCanAfford,
  roomRoleFindById,
  updateGamestate,
} from '@helpers';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import type {
  AlchemyRecipeContent,
  AlchemyRecipeId,
  ResourceType,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';

@Component({
  selector: 'app-panel-alchemy-lab',
  imports: [DecimalPipe],
  templateUrl: './panel-alchemy-lab.component.html',
  styleUrl: './panel-alchemy-lab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelAlchemyLabComponent {
  private subscription = alchemyLabCompleted$.subscribe((evt) => {
    notify('Alchemy', `Converted: +${evt.outputAmount} ${evt.outputResource}`);
  });

  public labRoom = computed(() => {
    const tile = gridSelectedTile();
    const floor = floorCurrent();
    if (!tile || !floor) return undefined;

    const gridTile = floor.grid[tile.y]?.[tile.x];
    if (!gridTile?.roomId) return undefined;

    const room = floor.rooms.find((r) => r.id === gridTile.roomId);
    if (!room || room.roomTypeId !== roomRoleFindById('alchemyLab')) return undefined;

    return room;
  });

  public assignedWorkers = computed(() => {
    const room = this.labRoom();
    if (!room) return [];

    const state = gamestate();
    return state.world.inhabitants
      .filter((i) => i.assignedRoomId === room.id)
      .map((i) => {
        const def = contentGetEntry<InhabitantContent>(i.definitionId);
        return { ...i, defName: def?.name ?? i.name };
      });
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

    return recipes.map((recipe) => {
      const ticks = alchemyLabGetConversionTicks(room, workerCount, recipe.baseTicks, adjacentTypes);
      const effectiveCost = alchemyLabGetEffectiveCost(room, recipe.inputCost, adjacentTypes);
      const canAfford = resourceCanAfford(effectiveCost);

      return {
        recipe,
        ticks,
        timeMinutes: ticks / GAME_TIME_TICKS_PER_MINUTE,
        effectiveCost,
        canAfford,
      };
    });
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

  public formatCost(cost: Partial<Record<ResourceType, number>>): string {
    return Object.entries(cost)
      .filter(([, v]) => v && v > 0)
      .map(([k, v]) => `${v} ${k}`)
      .join(', ');
  }

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
