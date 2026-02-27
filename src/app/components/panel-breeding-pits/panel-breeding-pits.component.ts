import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { InhabitantCardComponent } from '@components/inhabitant-card/inhabitant-card.component';
import { JobProgressComponent } from '@components/job-progress/job-progress.component';
import { ModalComponent } from '@components/modal/modal.component';
import { MutationOutcomeTextComponent } from '@components/mutation-outcome-text/mutation-outcome-text.component';
import { StatNameComponent } from '@components/stat-name/stat-name.component';
import {
  breedingCompleted$,
  breedingGetAdjacentRoomTypeIds,
  breedingGetAllRecipes,
  breedingGetAvailableRecipes,
  breedingGetHybridTicks,
  breedingGetMutatableInhabitants,
  contentGetEntry,
  floorCurrent,
  gamestate,
  gridSelectedTile,
  mutationCompleted$,
  updateGamestate,
  MUTATION_BASE_TICKS,
} from '@helpers';
import { ticksToRealSeconds } from '@helpers/game-time';
import type {
  BreedingRecipeContent,
  BreedingRecipeId,
  Floor,
  InhabitantInstanceId,
  InhabitantStats,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';
import { sortBy } from 'es-toolkit/compat';

@Component({
  selector: 'app-panel-breeding-pits',
  imports: [
    DecimalPipe,
    InhabitantCardComponent,
    JobProgressComponent,
    ModalComponent,
    MutationOutcomeTextComponent,
    StatNameComponent,
  ],
  templateUrl: './panel-breeding-pits.component.html',
  styleUrl: './panel-breeding-pits.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelBreedingPitsComponent {
  public showMutationResult = signal(false);
  public lastMutationResult = signal<
    { name: string; outcome: string } | undefined
  >(undefined);

  private subscriptions = [
    breedingCompleted$.subscribe(),
    mutationCompleted$.subscribe((evt) => {
      this.lastMutationResult.set({
        name: evt.inhabitantName,
        outcome: evt.outcome,
      });
      this.showMutationResult.set(true);
    }),
  ];

  private selectedBreedingData = computed(() => {
    const tile = gridSelectedTile();
    const floor = floorCurrent();
    if (!tile || !floor) return undefined;

    const gridTile = floor.grid[tile.y]?.[tile.x];
    if (!gridTile?.roomId) return undefined;

    const room = floor.rooms.find((r) => r.id === gridTile.roomId);
    if (!room) return undefined;

    const def = contentGetEntry<RoomContent>(room.roomTypeId);
    if (def?.role !== 'breedingPits') return undefined;

    return { room, floor };
  });

  public breedingRoom = computed(() => this.selectedBreedingData()?.room);

  public breedingFloor = computed<Floor | undefined>(
    () => this.selectedBreedingData()?.floor,
  );

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
        return { instance: i, def };
      })
      .filter(
        (e): e is typeof e & { def: InhabitantContent } => e.def !== undefined,
      );
    return sortBy(mapped, [(e) => e.def.name]);
  });

  public availableRecipes = computed(() => {
    const assigned = this.assignedInhabitants();
    const room = this.breedingRoom();
    if (!room || room.breedingJob || room.mutationJob) return [];

    const instances = assigned.map((a) => a.instance);
    const floor = this.breedingFloor();
    const entries = breedingGetAvailableRecipes(instances).map((r) => {
      const adjacentTypes = floor
        ? breedingGetAdjacentRoomTypeIds(room, floor)
        : new Set<string>();
      const ticks = breedingGetHybridTicks(
        room,
        adjacentTypes,
        r.recipe.timeMultiplier,
      );
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

    const instances = assigned.map((a) => a.instance);
    return sortBy(breedingGetMutatableInhabitants(instances), [
      (i) => contentGetEntry<InhabitantContent>(i.definitionId)?.name ?? '',
    ]);
  });

  public breedingProgress = computed(() => {
    const room = this.breedingRoom();
    if (!room?.breedingJob) return undefined;
    const job = room.breedingJob;
    const elapsed = job.targetTicks - job.ticksRemaining;
    const percent = Math.min(
      100,
      Math.round((elapsed / job.targetTicks) * 100),
    );
    const recipe = contentGetEntry<BreedingRecipeContent>(job.recipeId);
    return {
      percent,
      recipeName: recipe?.resultName ?? 'Unknown',
      ticksRemaining: job.ticksRemaining,
    };
  });

  // --- Recipe Browser ---
  public showRecipeBrowser = signal(false);
  public recipeSearchQuery = signal('');

  public allRecipes = computed(() => {
    const recipes = breedingGetAllRecipes();
    const inhabitants = gamestate().world.inhabitants;
    const inhabitantDefIds = new Set(inhabitants.map((i) => i.definitionId));

    return sortBy(
      recipes
        .map((recipe) => {
          const parentADef = contentGetEntry<InhabitantContent>(
            recipe.parentInhabitantAId,
          );
          const parentBDef = contentGetEntry<InhabitantContent>(
            recipe.parentInhabitantBId,
          );
          const hasParents =
            inhabitantDefIds.has(recipe.parentInhabitantAId) &&
            inhabitantDefIds.has(recipe.parentInhabitantBId);

          const statBonusEntries = Object.entries(recipe.statBonuses)
            .filter(([, v]) => v !== undefined && v !== 0)
            .map(([key, value]) => ({
              stat: key as keyof InhabitantStats,
              value: value!,
            }));

          return {
            recipe,
            parentADef,
            parentBDef,
            hasParents,
            statBonusEntries,
          };
        })
        .filter((e) => e.parentADef && e.parentBDef),
      [(e) => e.recipe.resultName],
    );
  });

  public filteredRecipes = computed(() => {
    const query = this.recipeSearchQuery().toLowerCase().trim();
    const all = this.allRecipes();
    if (!query) return all;

    return all.filter(
      (e) =>
        e.recipe.resultName.toLowerCase().includes(query) ||
        e.parentADef!.name.toLowerCase().includes(query) ||
        e.parentBDef!.name.toLowerCase().includes(query),
    );
  });

  public mutationProgress = computed(() => {
    const room = this.breedingRoom();
    if (!room?.mutationJob) return undefined;
    const job = room.mutationJob;
    const elapsed = job.targetTicks - job.ticksRemaining;
    const percent = Math.min(
      100,
      Math.round((elapsed / job.targetTicks) * 100),
    );
    const target = gamestate().world.inhabitants.find(
      (i) => i.instanceId === job.targetInstanceId,
    );
    return {
      percent,
      targetName: target?.name ?? 'Unknown',
      ticksRemaining: job.ticksRemaining,
    };
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

  public async startMutation(
    targetInstanceId: InhabitantInstanceId,
  ): Promise<void> {
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
