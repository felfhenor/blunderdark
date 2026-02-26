import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CurrencyCostListComponent } from '@components/currency-cost-list/currency-cost-list.component';
import { JobProgressComponent } from '@components/job-progress/job-progress.component';
import { InhabitantCardComponent } from '@components/inhabitant-card/inhabitant-card.component';
import {
  contentGetEntry,
  floorCurrent,
  gamestate,
  gridSelectedTile,
  notify,
  resourceCanAfford,
  resourcePayCost,
  summoningCanStart,
  summoningCompleted$,
  summoningDismissed$,
  summoningGetAdjacentRoomTypeIds,
  summoningGetAvailableRecipes,
  summoningGetEffectiveTicks,
  summoningGetStatBonuses,
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
  imports: [DecimalPipe, CurrencyCostListComponent, InhabitantCardComponent, JobProgressComponent],
  templateUrl: './panel-summoning-circle.component.html',
  styleUrl: './panel-summoning-circle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelSummoningCircleComponent {
  private subscriptions = [
    summoningCompleted$.subscribe((evt) => {
      const label = `${evt.inhabitantName} the ${evt.inhabitantType}`;
      notify('Summoning', `${label} has joined your dungeon!`);
    }),
    summoningDismissed$.subscribe((evt) => {
      const label = `${evt.inhabitantName} the ${evt.inhabitantType}`;
      notify('Summoning', `${label} was dismissed — roster is full.`);
    }),
  ];

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

  public availableRecipes = computed(() => {
    const room = this.summoningRoom();
    if (!room || room.summonJob) return [];
    if (!summoningCanStart(room, gamestate().world.inhabitants)) return [];

    const recipes = summoningGetAvailableRecipes(room);
    const floor = floorCurrent();
    const adjacentTypes = floor
      ? summoningGetAdjacentRoomTypeIds(room, floor)
      : new Set<string>();

    const entries = recipes.map((recipe) => {
      const ticks = summoningGetEffectiveTicks(room, adjacentTypes, recipe.timeMultiplier);
      const statBonuses = summoningGetStatBonuses(room, adjacentTypes, recipe);
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

  public summoningProgress = computed(() => {
    const room = this.summoningRoom();
    if (!room?.summonJob) return undefined;
    const job = room.summonJob;
    const elapsed = job.targetTicks - job.ticksRemaining;
    const percent = Math.min(100, Math.round((elapsed / job.targetTicks) * 100));
    const recipe = contentGetEntry<SummonRecipeContent>(job.recipeId);
    return { percent, recipeName: recipe?.name ?? 'Unknown', ticksRemaining: job.ticksRemaining };
  });

  public formatStatBonuses(bonuses: Partial<InhabitantStats>): string {
    return Object.entries(bonuses)
      .filter(([, v]) => v !== undefined && v !== 0)
      .map(([k, v]) => `+${v} ${k}`)
      .join(', ');
  }

  public async startSummoning(recipeId: SummonRecipeId, targetTicks: number, cost: Partial<Record<ResourceType, number>>): Promise<void> {
    const room = this.summoningRoom();
    if (!room) return;

    const paid = await resourcePayCost(cost);
    if (!paid) return;

    await updateGamestate((state) => {
      for (const floor of state.world.floors) {
        const target = floor.rooms.find((r) => r.id === room.id);
        if (target) {
          target.summonJob = {
            recipeId,
            ticksRemaining: targetTicks,
            targetTicks,
          };
          break;
        }
      }
      return state;
    });
  }
}
