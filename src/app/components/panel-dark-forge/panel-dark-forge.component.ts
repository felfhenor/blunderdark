import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { SFXDirective } from '@directives/sfx.directive';
import { AssignedWorkersListComponent } from '@components/assigned-workers-list/assigned-workers-list.component';
import { CurrencyCostListComponent } from '@components/currency-cost-list/currency-cost-list.component';
import { CraftingQueueDisplayComponent, type CancelGroupEvent } from '@components/crafting-queue-display/crafting-queue-display.component';
import {
  contentGetEntry,
  craftingQueueGetMaxSize,
  darkForgeCancelGroup,
  darkForgeCraft,
  darkForgeGetAdjacentRoomTypeIds,
  darkForgeGetAvailableRecipes,
  darkForgeGetCraftingTicks,
  darkForgeGetStatBonuses,
  floorCurrent,
  gamestate,
  getAssignedInhabitantsWithDefs,
  resourceCanAfford,
  resourcePayCost,
  roomDefFromRoom,
  selectedPlacedRoomByRole,
} from '@helpers';
import { ticksToRealSeconds } from '@helpers/game-time';
import type {
  ForgeRecipeContent,
  ForgeRecipeId,
  InhabitantStats,
  InhabitantTraitContent,
  ResourceType,
} from '@interfaces';
import { analyticsSendDesignEvent } from '@helpers/analytics';
import { TippyDirective } from '@ngneat/helipopper';
import { sortBy } from 'es-toolkit/compat';

@Component({
  selector: 'app-panel-dark-forge',
  imports: [AssignedWorkersListComponent, DecimalPipe, CurrencyCostListComponent, CraftingQueueDisplayComponent, SFXDirective, TippyDirective],
  templateUrl: './panel-dark-forge.component.html',
  styleUrl: './panel-dark-forge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelDarkForgeComponent {

  private quantities = signal<Record<string, number>>({});

  public forgeRoom = selectedPlacedRoomByRole('darkForge');

  public roomDef = roomDefFromRoom(this.forgeRoom);

  public assignedWorkers = computed(() =>
    getAssignedInhabitantsWithDefs(this.forgeRoom()?.id),
  );

  public queueState = computed(() => {
    const room = this.forgeRoom();
    if (!room) return undefined;

    // Touch gamestate to get reactivity
    gamestate();

    const forgeJobs = room.forgeJobs;
    if (!forgeJobs || forgeJobs.length === 0) return undefined;

    const maxSize = craftingQueueGetMaxSize(room);

    const jobs = forgeJobs.map((job) => {
      const recipe = contentGetEntry<ForgeRecipeContent>(job.recipeId);
      return {
        recipeId: job.recipeId,
        name: recipe?.name ?? 'Unknown',
        progress: job.progress,
        targetTicks: job.targetTicks,
      };
    });

    return { jobs, maxSize };
  });

  public availableRecipes = computed(() => {
    const room = this.forgeRoom();
    if (!room) return [];

    const floor = floorCurrent();
    if (!floor) return [];

    // Need at least 1 worker assigned
    const workerCount = this.assignedWorkers().length;
    if (workerCount < 1) return [];

    const recipes = darkForgeGetAvailableRecipes(room);
    const adjacentTypes = darkForgeGetAdjacentRoomTypeIds(room, floor);
    const maxSize = craftingQueueGetMaxSize(room);
    const currentSize = (room.forgeJobs ?? []).length;
    const slotsRemaining = Math.max(0, maxSize - currentSize);
    const qtys = this.quantities();

    const queueFull = slotsRemaining === 0;

    const entries = recipes.map((recipe) => {
      const ticks = darkForgeGetCraftingTicks(room, workerCount, recipe.timeMultiplier, adjacentTypes);
      const statBonuses = darkForgeGetStatBonuses(room, recipe, adjacentTypes);
      const rawQty = qtys[recipe.id] ?? 1;
      const quantity = queueFull ? 1 : Math.min(Math.max(1, rawQty), slotsRemaining);
      const totalCost: Partial<Record<ResourceType, number>> = {};
      for (const [type, amount] of Object.entries(recipe.cost)) {
        totalCost[type as ResourceType] = amount * quantity;
      }
      const canAfford = resourceCanAfford(totalCost);

      return {
        recipe,
        ticks,
        timeSeconds: ticksToRealSeconds(ticks),
        statBonuses,
        canAfford,
        queueFull,
        quantity,
        maxQueueable: slotsRemaining,
        totalCost,
      };
    });
    return sortBy(entries, [(e) => e.recipe.name]);
  });

  public forgeInventory = computed(() => {
    const state = gamestate();
    const entries = state.world.forgeInventory.map((entry) => {
      const recipe = contentGetEntry<ForgeRecipeContent>(entry.recipeId);
      return {
        recipeId: entry.recipeId,
        name: recipe?.name ?? 'Unknown',
        count: entry.count,
        bakedStatBonuses: entry.bakedStatBonuses,
        grantedTraitIds: entry.grantedTraitIds,
      };
    });
    return sortBy(entries, [(e) => e.name]);
  });

  public lookupTraits(traitIds: string[] | undefined): InhabitantTraitContent[] {
    if (!traitIds || traitIds.length === 0) return [];
    const traits: InhabitantTraitContent[] = [];
    for (const id of traitIds) {
      const trait = contentGetEntry<InhabitantTraitContent>(id);
      if (trait) traits.push(trait);
    }
    return traits;
  }

  public formatStatBonuses(bonuses: Partial<InhabitantStats>): string {
    return Object.entries(bonuses)
      .filter(([, v]) => v !== undefined && v !== 0)
      .map(([k, v]) => `+${v} ${k}`)
      .join(', ');
  }

  public setQuantity(recipeId: string, event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.quantities.update((q) => ({ ...q, [recipeId]: isNaN(value) ? 1 : Math.max(1, value) }));
  }

  public async startCraftingBulk(
    recipeId: ForgeRecipeId,
    targetTicks: number,
    cost: Partial<Record<ResourceType, number>>,
    quantity: number,
  ): Promise<void> {
    analyticsSendDesignEvent('Room:DarkForge:Craft');
    const room = this.forgeRoom();
    if (!room) return;

    const totalCost: Partial<Record<ResourceType, number>> = {};
    for (const [type, amount] of Object.entries(cost)) {
      totalCost[type as ResourceType] = amount * quantity;
    }

    const paid = await resourcePayCost(totalCost);
    if (!paid) return;

    await darkForgeCraft(room.id, recipeId, targetTicks, quantity);
  }

  public async cancelGroup(event: CancelGroupEvent): Promise<void> {
    const room = this.forgeRoom();
    if (!room) return;

    await darkForgeCancelGroup(room.id, event.startIndex, event.count);
  }
}
