import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { StatNameComponent } from '@components/stat-name/stat-name.component';
import {
  floorAll,
  roomRoleFindById,
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

@Component({
  selector: 'app-panel-training-grounds',
  imports: [DecimalPipe, StatNameComponent],
  templateUrl: './panel-training-grounds.component.html',
  styleUrl: './panel-training-grounds.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelTrainingGroundsComponent {
  public trainingRoom = computed(() => {
    const roleId = roomRoleFindById('trainingGrounds');
    if (!roleId) return undefined;

    for (const floor of floorAll()) {
      const room = floor.rooms.find((r) => r.roomTypeId === roleId);
      if (room) return trainingGetRoomInfo(room.id);
    }
    return undefined;
  });

  public trainees = computed(() => {
    const info = this.trainingRoom();
    if (!info) return [];

    const state = gamestate();
    return state.world.inhabitants
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
          name: def?.name ?? i.name,
          trained: i.trained ?? false,
          progress,
          percent,
          bonuses: i.trainingBonuses ?? { defense: 0, attack: 0 },
        };
      });
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
