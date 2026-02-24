import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { JobProgressComponent } from '@components/job-progress/job-progress.component';
import { StatNameComponent } from '@components/stat-name/stat-name.component';
import {
  findRoomByRole,
  gamestate,
  contentGetEntry,
  trainingGetProgressPercent,
  trainingGetRoomInfo,
} from '@helpers';
import { ticksToRealSeconds } from '@helpers/game-time';
import type {
  TrainingBonuses,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';
import { sortBy } from 'es-toolkit/compat';

@Component({
  selector: 'app-panel-training-grounds',
  imports: [DecimalPipe, JobProgressComponent, StatNameComponent],
  templateUrl: './panel-training-grounds.component.html',
  styleUrl: './panel-training-grounds.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelTrainingGroundsComponent {
  public trainingRoom = computed(() => {
    const room = findRoomByRole('trainingGrounds')?.room;
    if (!room) return undefined;
    return trainingGetRoomInfo(room.id);
  });

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
        const progress = i.trainingProgress ?? 0;
        const percent = trainingGetProgressPercent(
          progress,
          info.targetTicks,
        );
        return {
          instanceId: i.instanceId,
          instanceName: i.name,
          defName: def?.name ?? i.name,
          trained: i.trained ?? false,
          progress,
          percent,
          bonuses: i.trainingBonuses ?? { defense: 0, attack: 0 },
        };
      });
    return sortBy(mapped, [(e) => e.defName]);
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
