import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CurrencyCostListComponent } from '@components/currency-cost-list/currency-cost-list.component';
import {
  contentGetEntry,
  darkForgeAddJob,
  darkForgeCanQueue,
  darkForgeCompleted$,
  darkForgeGetAdjacentRoomTypeIds,
  darkForgeGetAvailableRecipes,
  darkForgeGetCraftingTicks,
  darkForgeGetStatBonuses,
  darkForgeRemoveJob,
  DARK_FORGE_MAX_QUEUE_SIZE,
  floorAll,
  floorCurrent,
  gamestate,
  notify,
  resourceCanAfford,
  resourcePayCost,
  roomRoleFindById,
  updateGamestate,
} from '@helpers';
import { ticksToRealSeconds } from '@helpers/game-time';
import type {
  ForgeRecipeContent,
  ForgeRecipeId,
  InhabitantStats,
  ResourceType,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';
import { sortBy } from 'es-toolkit/compat';

@Component({
  selector: 'app-panel-dark-forge',
  imports: [DecimalPipe, CurrencyCostListComponent],
  templateUrl: './panel-dark-forge.component.html',
  styleUrl: './panel-dark-forge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelDarkForgeComponent {
  private subscription = darkForgeCompleted$.subscribe((evt) => {
    notify('Forging', `Forged: ${evt.recipeName}`);
  });

  public forgeRoom = computed(() => {
    const roleId = roomRoleFindById('darkForge');
    if (!roleId) return undefined;

    for (const floor of floorAll()) {
      const room = floor.rooms.find((r) => r.roomTypeId === roleId);
      if (room) return room;
    }
    return undefined;
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
        return { ...i, defName: def?.name ?? i.name };
      });
    return sortBy(mapped, [(e) => e.defName]);
  });

  public availableRecipes = computed(() => {
    const room = this.forgeRoom();
    if (!room) return [];

    const state = gamestate();
    const { canQueue } = darkForgeCanQueue(room.id, state.world.floors, state.world.forgeCraftingQueues);
    if (!canQueue) return [];

    const recipes = darkForgeGetAvailableRecipes(room);
    const floor = floorCurrent();
    const adjacentTypes = floor
      ? darkForgeGetAdjacentRoomTypeIds(room, floor)
      : new Set<string>();

    const workerCount = this.assignedWorkers().length;

    const entries = recipes.map((recipe) => {
      const ticks = darkForgeGetCraftingTicks(room, workerCount, recipe.timeMultiplier, adjacentTypes);
      const statBonuses = darkForgeGetStatBonuses(room, recipe, adjacentTypes);
      const canAfford = resourceCanAfford(recipe.cost);

      return {
        recipe,
        ticks,
        timeSeconds: ticksToRealSeconds(ticks),
        statBonuses,
        canAfford,
      };
    });
    return sortBy(entries, [(e) => e.recipe.name]);
  });

  public queueState = computed(() => {
    const room = this.forgeRoom();
    if (!room) return undefined;

    const state = gamestate();
    const queue = state.world.forgeCraftingQueues.find((q) => q.roomId === room.id);
    if (!queue || queue.jobs.length === 0) return undefined;

    const jobs = queue.jobs.map((job, index) => {
      const recipe = contentGetEntry<ForgeRecipeContent>(job.recipeId);
      const percent = Math.min(100, Math.round((job.progress / job.targetTicks) * 100));
      return {
        index,
        recipeName: recipe?.name ?? 'Unknown',
        percent,
        isActive: index === 0,
      };
    });

    return { jobs, maxSize: DARK_FORGE_MAX_QUEUE_SIZE };
  });

  public forgeInventory = computed(() => {
    const state = gamestate();
    const entries = state.world.forgeInventory.map((entry) => {
      const recipe = contentGetEntry<ForgeRecipeContent>(entry.recipeId);
      return {
        recipeId: entry.recipeId,
        name: recipe?.name ?? 'Unknown',
        count: entry.count,
        category: recipe?.category ?? 'equipment',
      };
    });
    return sortBy(entries, [(e) => e.name]);
  });

  public formatStatBonuses(bonuses: Partial<InhabitantStats>): string {
    return Object.entries(bonuses)
      .filter(([, v]) => v !== undefined && v !== 0)
      .map(([k, v]) => `+${v} ${k}`)
      .join(', ');
  }

  public async startCrafting(recipeId: ForgeRecipeId, targetTicks: number, cost: Partial<Record<ResourceType, number>>): Promise<void> {
    const room = this.forgeRoom();
    if (!room) return;

    const paid = await resourcePayCost(cost);
    if (!paid) return;

    await updateGamestate((state) => {
      state.world.forgeCraftingQueues = darkForgeAddJob(
        state.world.forgeCraftingQueues,
        room.id,
        recipeId,
        targetTicks,
      );
      return state;
    });
  }

  public async cancelJob(jobIndex: number): Promise<void> {
    const room = this.forgeRoom();
    if (!room) return;

    await updateGamestate((state) => {
      state.world.forgeCraftingQueues = darkForgeRemoveJob(
        state.world.forgeCraftingQueues,
        room.id,
        jobIndex,
      );
      return state;
    });
  }
}
