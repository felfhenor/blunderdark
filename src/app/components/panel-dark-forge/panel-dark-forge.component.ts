import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
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
  floorCurrent,
  gamestate,
  gridSelectedTile,
  notify,
  resourceCanAfford,
  resourcePayCost,
  roomRoleFindById,
  updateGamestate,
} from '@helpers';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import type {
  ForgeRecipeContent,
  ForgeRecipeId,
  InhabitantStats,
  ResourceType,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';

@Component({
  selector: 'app-panel-dark-forge',
  imports: [DecimalPipe],
  templateUrl: './panel-dark-forge.component.html',
  styleUrl: './panel-dark-forge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelDarkForgeComponent {
  private subscription = darkForgeCompleted$.subscribe((evt) => {
    notify('Forging', `Forged: ${evt.recipeName}`);
  });

  public forgeRoom = computed(() => {
    const tile = gridSelectedTile();
    const floor = floorCurrent();
    if (!tile || !floor) return undefined;

    const gridTile = floor.grid[tile.y]?.[tile.x];
    if (!gridTile?.roomId) return undefined;

    const room = floor.rooms.find((r) => r.id === gridTile.roomId);
    if (!room || room.roomTypeId !== roomRoleFindById('darkForge')) return undefined;

    return room;
  });

  public assignedWorkers = computed(() => {
    const room = this.forgeRoom();
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

    return recipes.map((recipe) => {
      const ticks = darkForgeGetCraftingTicks(room, workerCount, recipe.timeMultiplier, adjacentTypes);
      const statBonuses = darkForgeGetStatBonuses(room, recipe, adjacentTypes);
      const canAfford = resourceCanAfford(recipe.cost);

      return {
        recipe,
        ticks,
        timeMinutes: ticks / GAME_TIME_TICKS_PER_MINUTE,
        statBonuses,
        canAfford,
      };
    });
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
    return state.world.forgeInventory.map((entry) => {
      const recipe = contentGetEntry<ForgeRecipeContent>(entry.recipeId);
      return {
        recipeId: entry.recipeId,
        name: recipe?.name ?? 'Unknown',
        count: entry.count,
        category: recipe?.category ?? 'equipment',
      };
    });
  });

  public formatCost(cost: Partial<Record<ResourceType, number>>): string {
    return Object.entries(cost)
      .filter(([, v]) => v && v > 0)
      .map(([k, v]) => `${v} ${k}`)
      .join(', ');
  }

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
