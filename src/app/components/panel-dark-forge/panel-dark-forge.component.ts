import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { SFXDirective } from '@directives/sfx.directive';
import { CurrencyCostListComponent } from '@components/currency-cost-list/currency-cost-list.component';
import { CraftingQueueDisplayComponent, type CancelGroupEvent } from '@components/crafting-queue-display/crafting-queue-display.component';
import { InhabitantCardComponent } from '@components/inhabitant-card/inhabitant-card.component';
import {
  contentGetEntry,
  craftingQueueGetMaxSize,
  darkForgeAddJob,
  darkForgeGetAdjacentRoomTypeIds,
  darkForgeGetAvailableRecipes,
  darkForgeGetCraftingTicks,
  darkForgeGetStatBonuses,
  darkForgeRemoveJobGroup,
  floorCurrent,
  gamestate,
  gridSelectedTile,
  resourceCanAfford,
  resourcePayCost,
  updateGamestate,
} from '@helpers';
import { roomRoleFindById } from '@helpers/room-roles';
import { ticksToRealSeconds } from '@helpers/game-time';
import type {
  ForgeRecipeContent,
  ForgeRecipeId,
  InhabitantStats,
  InhabitantTraitContent,
  ResourceType,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';
import { analyticsSendDesignEvent } from '@helpers/analytics';
import { TippyDirective } from '@ngneat/helipopper';
import { sortBy } from 'es-toolkit/compat';

@Component({
  selector: 'app-panel-dark-forge',
  imports: [DecimalPipe, CurrencyCostListComponent, CraftingQueueDisplayComponent, InhabitantCardComponent, SFXDirective, TippyDirective],
  templateUrl: './panel-dark-forge.component.html',
  styleUrl: './panel-dark-forge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelDarkForgeComponent {

  private quantities = signal<Record<string, number>>({});

  public forgeRoom = computed(() => {
    const tile = gridSelectedTile();
    const floor = floorCurrent();
    if (!tile || !floor) return undefined;

    const gridTile = floor.grid[tile.y]?.[tile.x];
    if (!gridTile?.roomId) return undefined;

    const room = floor.rooms.find((r) => r.id === gridTile.roomId);
    if (!room) return undefined;

    const darkForgeTypeId = roomRoleFindById('darkForge');
    if (room.roomTypeId !== darkForgeTypeId) return undefined;

    return room;
  });

  public roomDef = computed(() => {
    const room = this.forgeRoom();
    if (!room) return undefined;
    return contentGetEntry<RoomContent>(room.roomTypeId);
  });

  public assignedWorkers = computed(() => {
    const room = this.forgeRoom();
    if (!room) return [];

    const state = gamestate();
    const mapped = state.world.inhabitants
      .filter((i) => i.assignedRoomId === room.id)
      .map((i) => {
        const def = contentGetEntry<InhabitantContent>(i.definitionId);
        return { instance: i, def };
      })
      .filter((e): e is typeof e & { def: InhabitantContent } => e.def !== undefined);
    return sortBy(mapped, [(e) => e.def.name]);
  });

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

    await updateGamestate((state) => {
      for (const floor of state.world.floors) {
        const target = floor.rooms.find((r) => r.id === room.id);
        if (target) {
          for (let i = 0; i < quantity; i++) {
            darkForgeAddJob(target, recipeId, targetTicks);
          }
          break;
        }
      }
      return state;
    });
  }

  public async cancelGroup(event: CancelGroupEvent): Promise<void> {
    const room = this.forgeRoom();
    if (!room) return;

    await updateGamestate((state) => {
      for (const floor of state.world.floors) {
        const target = floor.rooms.find((r) => r.id === room.id);
        if (target) {
          darkForgeRemoveJobGroup(target, event.startIndex, event.count);
          break;
        }
      }
      return state;
    });
  }
}
