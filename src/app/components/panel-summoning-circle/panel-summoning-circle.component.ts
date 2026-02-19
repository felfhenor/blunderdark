import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CurrencyNameComponent } from '@components/currency-name/currency-name.component';
import { ModalComponent } from '@components/modal/modal.component';
import {
  contentGetEntry,
  floorAll,
  floorCurrent,
  gamestate,
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
  imports: [DecimalPipe, CurrencyNameComponent, ModalComponent],
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
    const roleId = roomRoleFindById('summoningCircle');
    if (!roleId) return undefined;

    for (const floor of floorAll()) {
      const room = floor.rooms.find((r) => r.roomTypeId === roleId);
      if (room) return room;
    }
    return undefined;
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
        return { ...i, defName: def?.name ?? i.name };
      });
    return sortBy(mapped, [(e) => e.defName]);
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
      const durationTicks = recipe.summonType === 'temporary' && recipe.duration
        ? summoningGetEffectiveDuration(room, recipe.duration)
        : undefined;
      const duration = durationTicks !== undefined ? ticksToRealSeconds(durationTicks) : undefined;
      const canAfford = resourceCanAfford(recipe.cost);

      return {
        recipe,
        ticks,
        timeSeconds: ticksToRealSeconds(ticks),
        statBonuses,
        duration,
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

  public temporaryInhabitants = computed(() => {
    const state = gamestate();
    return state.world.inhabitants
      .filter((i) => i.isTemporary && i.temporaryTicksRemaining !== undefined)
      .map((i) => ({
        name: i.name,
        ticksRemaining: i.temporaryTicksRemaining!,
        secondsRemaining: Math.ceil(ticksToRealSeconds(i.temporaryTicksRemaining!)),
      }));
  });

  public formatCost(cost: Partial<Record<ResourceType, number>>): { type: ResourceType; amount: number }[] {
    return Object.entries(cost)
      .filter(([, v]) => v && v > 0)
      .map(([type, v]) => ({ type: type as ResourceType, amount: v! }));
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
