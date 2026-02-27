import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CurrencyCostListComponent } from '@components/currency-cost-list/currency-cost-list.component';
import { CraftingQueueDisplayComponent, type CancelGroupEvent } from '@components/crafting-queue-display/crafting-queue-display.component';
import { InhabitantCardComponent } from '@components/inhabitant-card/inhabitant-card.component';
import {
  contentGetEntry,
  craftingQueueGetMaxSize,
  floorCurrent,
  gamestate,
  gridSelectedTile,
  notify,
  resourceCanAfford,
  resourcePayCost,
  summoningAddJob,
  summoningCompleted$,
  summoningDismissed$,
  summoningGetAdjacentRoomTypeIds,
  summoningGetAvailableRecipes,
  summoningGetEffectiveTicks,
  summoningGetStatBonuses,
  summoningRemoveJobGroup,
  updateGamestate,
} from '@helpers';
import { ticksToRealSeconds } from '@helpers/game-time';
import type {
  InhabitantStats,
  ResourceType,
  SummonRecipeContent,
  SummonRecipeId,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';
import { sortBy } from 'es-toolkit/compat';

@Component({
  selector: 'app-panel-summoning-circle',
  imports: [DecimalPipe, CurrencyCostListComponent, InhabitantCardComponent, CraftingQueueDisplayComponent],
  templateUrl: './panel-summoning-circle.component.html',
  styleUrl: './panel-summoning-circle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelSummoningCircleComponent {
  private subscriptions = [
    summoningCompleted$.subscribe(),
    summoningDismissed$.subscribe((evt) => {
      const label = `${evt.inhabitantName} the ${evt.inhabitantType}`;
      notify('Summoning', `${label} was dismissed — roster is full.`);
    }),
  ];

  private quantities = signal<Record<string, number>>({});

  public summoningRoom = computed(() => {
    const tile = gridSelectedTile();
    const floor = floorCurrent();
    if (!tile || !floor) return undefined;

    const gridTile = floor.grid[tile.y]?.[tile.x];
    if (!gridTile?.roomId) return undefined;

    const room = floor.rooms.find((r) => r.id === gridTile.roomId);
    if (!room) return undefined;

    const def = contentGetEntry<RoomContent>(room.roomTypeId);
    if (def?.role !== 'summoningCircle') return undefined;

    return room;
  });

  public roomDef = computed(() => {
    const room = this.summoningRoom();
    if (!room) return undefined;
    return contentGetEntry<RoomContent>(room.roomTypeId);
  });

  public assignedInhabitants = computed(() => {
    const room = this.summoningRoom();
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
    const room = this.summoningRoom();
    if (!room) return undefined;

    // Touch gamestate to get reactivity
    gamestate();

    const summonJobs = room.summonJobs;
    if (!summonJobs || summonJobs.length === 0) return undefined;

    const maxSize = craftingQueueGetMaxSize(room);

    const jobs = summonJobs.map((job) => {
      const recipe = contentGetEntry<SummonRecipeContent>(job.recipeId);
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
    const room = this.summoningRoom();
    if (!room) return [];

    const state = gamestate();

    // Need at least 1 inhabitant assigned
    const assigned = state.world.inhabitants.filter((i) => i.assignedRoomId === room.id);
    if (assigned.length < 1) return [];

    const recipes = summoningGetAvailableRecipes(room);
    const floor = floorCurrent();
    const adjacentTypes = floor
      ? summoningGetAdjacentRoomTypeIds(room, floor)
      : new Set<string>();

    const maxSize = craftingQueueGetMaxSize(room);
    const currentSize = (room.summonJobs ?? []).length;
    const slotsRemaining = Math.max(0, maxSize - currentSize);
    const qtys = this.quantities();

    const queueFull = slotsRemaining === 0;

    const entries = recipes.map((recipe) => {
      const ticks = summoningGetEffectiveTicks(room, adjacentTypes, recipe.timeMultiplier);
      const statBonuses = summoningGetStatBonuses(room, adjacentTypes, recipe);
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

  public async startSummoningBulk(
    recipeId: SummonRecipeId,
    targetTicks: number,
    cost: Partial<Record<ResourceType, number>>,
    quantity: number,
  ): Promise<void> {
    const room = this.summoningRoom();
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
            summoningAddJob(target, recipeId, targetTicks);
          }
          break;
        }
      }
      return state;
    });
  }

  public async cancelGroup(event: CancelGroupEvent): Promise<void> {
    const room = this.summoningRoom();
    if (!room) return;

    await updateGamestate((state) => {
      for (const floor of state.world.floors) {
        const target = floor.rooms.find((r) => r.id === room.id);
        if (target) {
          summoningRemoveJobGroup(target, event.startIndex, event.count);
          break;
        }
      }
      return state;
    });
  }
}
