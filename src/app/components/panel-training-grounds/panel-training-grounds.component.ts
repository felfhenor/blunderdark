import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { InhabitantCardComponent } from '@components/inhabitant-card/inhabitant-card.component';
import { JobProgressComponent } from '@components/job-progress/job-progress.component';
import { StatNameComponent } from '@components/stat-name/stat-name.component';
import {
  gamestate,
  contentGetEntry,
  trainingGetProgressPercent,
  trainingSelectedRoom,
} from '@helpers';
import { ticksToRealSeconds } from '@helpers/game-time';
import type {
  InhabitantInstance,
  TrainingBonuses,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';
import { sortBy } from 'es-toolkit/compat';

@Component({
  selector: 'app-panel-training-grounds',
  imports: [DecimalPipe, InhabitantCardComponent, JobProgressComponent, StatNameComponent],
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

  public trainees = computed(() => {
    const info = this.trainingRoom();
    if (!info) return [];

    const state = gamestate();
    const mapped = state.world.inhabitants
      .filter((i) => i.assignedRoomId === info.placedRoom.id)
      .map((i) => {
        const def = contentGetEntry<InhabitantContent>(
          i.definitionId,
        );
        if (!def) return undefined;
        const progress = i.trainingProgress ?? 0;
        const percent = trainingGetProgressPercent(
          progress,
          info.targetTicks,
        );
        return {
          instance: i,
          def,
          trained: i.trained ?? false,
          percent,
          bonuses: (i.trainingBonuses ?? { defense: 0, attack: 0 }) as TrainingBonuses,
        };
      })
      .filter((e): e is { instance: InhabitantInstance; def: InhabitantContent; trained: boolean; percent: number; bonuses: TrainingBonuses } => e !== undefined);
    return sortBy(mapped, [(e) => e.def.name]);
  });

  public trainingTimeSeconds = computed(() => {
    const info = this.trainingRoom();
    if (!info) return 0;
    return ticksToRealSeconds(info.targetTicks);
  });

  public expectedBonuses = computed<TrainingBonuses | undefined>(() => {
    const info = this.trainingRoom();
    if (!info) return undefined;
    return info.bonuses;
  });
}
