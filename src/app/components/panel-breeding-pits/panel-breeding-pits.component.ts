import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ModalComponent } from '@components/modal/modal.component';
import {
  breedingCompleted$,
  breedingGetAdjacentRoomTypeIds,
  breedingGetAvailableRecipes,
  breedingGetHybridTicks,
  breedingGetMutatableInhabitants,
  contentGetEntry,
  floorCurrent,
  gamestate,
  gridSelectedTile,
  mutationCompleted$,
  notify,
  roomRoleFindById,
  updateGamestate,
  MUTATION_BASE_TICKS,
} from '@helpers';
import { ticksToRealSeconds } from '@helpers/game-time';
import type {
  BreedingRecipeContent,
  BreedingRecipeId,
  InhabitantInstanceId,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';
import { sortBy } from 'es-toolkit/compat';

@Component({
  selector: 'app-panel-breeding-pits',
  imports: [DecimalPipe, ModalComponent],
  templateUrl: './panel-breeding-pits.component.html',
  styleUrl: './panel-breeding-pits.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelBreedingPitsComponent {
  public showMutationResult = signal(false);
  public lastMutationResult = signal<{ name: string; outcome: string } | undefined>(undefined);

  private subscriptions = [
    breedingCompleted$.subscribe((evt) => {
      notify('Breeding', `Hybrid created: ${evt.hybridName}`);
    }),
    mutationCompleted$.subscribe((evt) => {
      this.lastMutationResult.set({ name: evt.inhabitantName, outcome: evt.outcome });
      this.showMutationResult.set(true);
      notify('Breeding', `Mutation ${evt.outcome}: ${evt.inhabitantName}`);
    }),
  ];

  public breedingRoom = computed(() => {
    const tile = gridSelectedTile();
    const floor = floorCurrent();
    if (!tile || !floor) return undefined;

    const gridTile = floor.grid[tile.y]?.[tile.x];
    if (!gridTile?.roomId) return undefined;

    const room = floor.rooms.find((r) => r.id === gridTile.roomId);
    if (!room || room.roomTypeId !== roomRoleFindById('breedingPits')) return undefined;

    return room;
  });

  public roomDef = computed(() => {
    const room = this.breedingRoom();
    if (!room) return undefined;
    return contentGetEntry<RoomContent>(room.roomTypeId);
  });

  public assignedInhabitants = computed(() => {
    const room = this.breedingRoom();
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
    const assigned = this.assignedInhabitants();
    const room = this.breedingRoom();
    if (!room || room.breedingJob || room.mutationJob) return [];

    const entries = breedingGetAvailableRecipes(assigned).map((r) => {
      const floor = floorCurrent();
      const adjacentTypes = floor
        ? breedingGetAdjacentRoomTypeIds(room, floor)
        : new Set<string>();
      const ticks = breedingGetHybridTicks(room, adjacentTypes, r.recipe.timeMultiplier);
      return {
        ...r,
        ticks,
        timeSeconds: ticksToRealSeconds(ticks),
      };
    });
    return sortBy(entries, [(e) => e.recipe.resultName]);
  });

  public mutatableInhabitants = computed(() => {
    const assigned = this.assignedInhabitants();
    const room = this.breedingRoom();
    if (!room || room.breedingJob || room.mutationJob) return [];

    return sortBy(
      breedingGetMutatableInhabitants(assigned),
      [(i) => contentGetEntry<InhabitantContent>(i.definitionId)?.name ?? ''],
    );
  });

  public breedingProgress = computed(() => {
    const room = this.breedingRoom();
    if (!room?.breedingJob) return undefined;
    const job = room.breedingJob;
    const elapsed = job.targetTicks - job.ticksRemaining;
    const percent = Math.min(100, Math.round((elapsed / job.targetTicks) * 100));
    const recipe = contentGetEntry<BreedingRecipeContent>(job.recipeId);
    return { percent, recipeName: recipe?.resultName ?? 'Unknown', ticksRemaining: job.ticksRemaining };
  });

  public mutationProgress = computed(() => {
    const room = this.breedingRoom();
    if (!room?.mutationJob) return undefined;
    const job = room.mutationJob;
    const elapsed = job.targetTicks - job.ticksRemaining;
    const percent = Math.min(100, Math.round((elapsed / job.targetTicks) * 100));
    const target = gamestate().world.inhabitants.find((i) => i.instanceId === job.targetInstanceId);
    return { percent, targetName: target?.name ?? 'Unknown', ticksRemaining: job.ticksRemaining };
  });

  public async startBreeding(
    parentAInstanceId: InhabitantInstanceId,
    parentBInstanceId: InhabitantInstanceId,
    recipeId: BreedingRecipeId,
    targetTicks: number,
  ): Promise<void> {
    const room = this.breedingRoom();
    if (!room) return;

    await updateGamestate((state) => {
      for (const floor of state.world.floors) {
        const target = floor.rooms.find((r) => r.id === room.id);
        if (target) {
          target.breedingJob = {
            parentAInstanceId,
            parentBInstanceId,
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

  public async startMutation(targetInstanceId: InhabitantInstanceId): Promise<void> {
    const room = this.breedingRoom();
    if (!room) return;

    await updateGamestate((state) => {
      for (const floor of state.world.floors) {
        const target = floor.rooms.find((r) => r.id === room.id);
        if (target) {
          target.mutationJob = {
            targetInstanceId,
            ticksRemaining: MUTATION_BASE_TICKS,
            targetTicks: MUTATION_BASE_TICKS,
          };
          break;
        }
      }
      return state;
    });
  }
}
