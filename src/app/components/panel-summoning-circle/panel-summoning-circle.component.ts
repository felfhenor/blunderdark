import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ModalComponent } from '@components/modal/modal.component';
import {
  contentGetEntry,
  floorCurrent,
  gamestate,
  gridSelectedTile,
  notify,
  resourceCanAfford,
  resourcePayCost,
  roomRoleFindById,
  summoningCanStart,
  summoningCompleted$,
  summoningExpired$,
  summoningGetAdjacentRoomTypeIds,
  summoningGetAvailableRecipes,
  summoningGetEffectiveDuration,
  summoningGetEffectiveTicks,
  summoningGetStatBonuses,
  updateGamestate,
} from '@helpers';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import type {
  InhabitantStats,
  IsContentItem,
  ResourceType,
  SummonRecipeContent,
  SummonRecipeId,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';

@Component({
  selector: 'app-panel-summoning-circle',
  imports: [ModalComponent],
  templateUrl: './panel-summoning-circle.component.html',
  styleUrl: './panel-summoning-circle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelSummoningCircleComponent {
  public showSummonResult = signal(false);
  public lastSummonResult = signal<{ name: string; summonType: string } | undefined>(undefined);

  private subscriptions = [
    summoningCompleted$.subscribe((evt) => {
      this.lastSummonResult.set({ name: evt.inhabitantName, summonType: evt.summonType });
      this.showSummonResult.set(true);
      notify('Summoning', `Summoned: ${evt.inhabitantName}`);
    }),
    summoningExpired$.subscribe((evt) => {
      notify('Summoning', `${evt.inhabitantName} has faded away.`);
    }),
  ];

  public summoningRoom = computed(() => {
    const tile = gridSelectedTile();
    const floor = floorCurrent();
    if (!tile || !floor) return undefined;

    const gridTile = floor.grid[tile.y]?.[tile.x];
    if (!gridTile?.roomId) return undefined;

    const room = floor.rooms.find((r) => r.id === gridTile.roomId);
    if (!room || room.roomTypeId !== roomRoleFindById('summoningCircle')) return undefined;

    return room;
  });

  public assignedInhabitants = computed(() => {
    const room = this.summoningRoom();
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
    const room = this.summoningRoom();
    if (!room || room.summonJob) return [];
    if (!summoningCanStart(room, gamestate().world.inhabitants)) return [];

    const recipes = summoningGetAvailableRecipes(room);
    const floor = floorCurrent();
    const adjacentTypes = floor
      ? summoningGetAdjacentRoomTypeIds(room, floor)
      : new Set<string>();

    return recipes.map((recipe) => {
      const ticks = summoningGetEffectiveTicks(room, adjacentTypes, recipe.timeMultiplier);
      const statBonuses = summoningGetStatBonuses(room, adjacentTypes, recipe);
      const duration = recipe.summonType === 'temporary' && recipe.duration
        ? summoningGetEffectiveDuration(room, recipe.duration)
        : undefined;
      const canAfford = resourceCanAfford(recipe.cost);

      return {
        recipe,
        ticks,
        timeMinutes: ticks / GAME_TIME_TICKS_PER_MINUTE,
        statBonuses,
        duration,
        canAfford,
      };
    });
  });

  public summoningProgress = computed(() => {
    const room = this.summoningRoom();
    if (!room?.summonJob) return undefined;
    const job = room.summonJob;
    const elapsed = job.targetTicks - job.ticksRemaining;
    const percent = Math.min(100, Math.round((elapsed / job.targetTicks) * 100));
    const recipe = contentGetEntry<SummonRecipeContent & IsContentItem>(job.recipeId);
    return { percent, recipeName: recipe?.name ?? 'Unknown', ticksRemaining: job.ticksRemaining };
  });

  public temporaryInhabitants = computed(() => {
    const state = gamestate();
    return state.world.inhabitants
      .filter((i) => i.isTemporary && i.temporaryTicksRemaining !== undefined)
      .map((i) => ({
        name: i.name,
        ticksRemaining: i.temporaryTicksRemaining!,
        minutesRemaining: Math.ceil(i.temporaryTicksRemaining! / GAME_TIME_TICKS_PER_MINUTE),
      }));
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
