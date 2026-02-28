import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { InhabitantCardComponent } from '@components/inhabitant-card/inhabitant-card.component';
import { JobProgressComponent } from '@components/job-progress/job-progress.component';
import {
  gamestate,
  contentGetEntry,
  trainingGetProgressPercent,
  trainingSelectedRoom,
} from '@helpers';
import { trainingGetCurrentTraitIds } from '@helpers/training';
import { ticksToRealSeconds } from '@helpers/game-time';
import type {
  InhabitantInstance,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { InhabitantTraitContent } from '@interfaces/content-inhabitanttrait';
import type { RoomContent } from '@interfaces/content-room';
import { sortBy } from 'es-toolkit/compat';

@Component({
  selector: 'app-panel-training-grounds',
  imports: [DecimalPipe, InhabitantCardComponent, JobProgressComponent],
  templateUrl: './panel-training-grounds.component.html',
  styleUrl: './panel-training-grounds.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelTrainingGroundsComponent {
  public trainingRoom = trainingSelectedRoom;

  public roomDef = computed(() => {
    const info = this.trainingRoom();
    if (!info) return undefined;
    return contentGetEntry<RoomContent>(info.placedRoom.roomTypeId);
  });

  public expectedTraits = computed(() => {
    const info = this.trainingRoom();
    if (!info) return [];
    return info.trainingTraitIds
      .map((id) => contentGetEntry<InhabitantTraitContent>(id))
      .filter((t): t is InhabitantTraitContent => t !== undefined);
  });

  public trainees = computed(() => {
    const info = this.trainingRoom();
    if (!info) return [];

    const state = gamestate();
    const expectedIds = new Set(info.trainingTraitIds);

    const mapped = state.world.inhabitants
      .filter((i) => i.assignedRoomId === info.placedRoom.id)
      .map((i) => {
        const def = contentGetEntry<InhabitantContent>(i.definitionId);
        if (!def) return undefined;

        const currentTrainingIds = trainingGetCurrentTraitIds(i.instanceTraitIds);
        const isTrained =
          currentTrainingIds.length > 0 &&
          currentTrainingIds.length === expectedIds.size &&
          currentTrainingIds.every((id) => expectedIds.has(id));

        const progress = i.trainingProgress ?? 0;
        const percent = trainingGetProgressPercent(progress, info.targetTicks);

        const acquiredTraits = currentTrainingIds
          .map((id) => contentGetEntry<InhabitantTraitContent>(id))
          .filter((t): t is InhabitantTraitContent => t !== undefined);

        return {
          instance: i,
          def,
          trained: isTrained,
          percent,
          acquiredTraits,
        };
      })
      .filter(
        (
          e,
        ): e is {
          instance: InhabitantInstance;
          def: InhabitantContent;
          trained: boolean;
          percent: number;
          acquiredTraits: InhabitantTraitContent[];
        } => e !== undefined,
      );
    return sortBy(mapped, [(e) => e.def.name]);
  });

  public trainingTimeSeconds = computed(() => {
    const info = this.trainingRoom();
    if (!info) return 0;
    return ticksToRealSeconds(info.targetTicks);
  });
}
