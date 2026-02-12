import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  currentFloor,
  findRoomIdByRole,
  gamestate,
  getEntry,
  getTrainingProgressPercent,
  getTrainingRoomInfo,
  selectedTile,
} from '@helpers';
import { TICKS_PER_MINUTE } from '@helpers/game-time';
import type {
  InhabitantDefinition,
  IsContentItem,
  TrainingBonuses,
} from '@interfaces';

@Component({
  selector: 'app-panel-training-grounds',
  templateUrl: './panel-training-grounds.component.html',
  styleUrl: './panel-training-grounds.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelTrainingGroundsComponent {
  public trainingRoom = computed(() => {
    const tile = selectedTile();
    const floor = currentFloor();
    if (!tile || !floor) return undefined;

    const gridTile = floor.grid[tile.y]?.[tile.x];
    if (!gridTile?.roomId) return undefined;

    const room = floor.rooms.find((r) => r.id === gridTile.roomId);
    if (!room || room.roomTypeId !== findRoomIdByRole('trainingGrounds')) return undefined;

    return getTrainingRoomInfo(room.id);
  });

  public trainees = computed(() => {
    const info = this.trainingRoom();
    if (!info) return [];

    const state = gamestate();
    return state.world.inhabitants
      .filter((i) => i.assignedRoomId === info.placedRoom.id)
      .map((i) => {
        const def = getEntry<InhabitantDefinition & IsContentItem>(
          i.definitionId,
        );
        const progress = i.trainingProgress ?? 0;
        const percent = getTrainingProgressPercent(
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

  public trainingTimeMinutes = computed(() => {
    const info = this.trainingRoom();
    if (!info) return 0;
    return info.targetTicks / TICKS_PER_MINUTE;
  });

  public expectedBonuses = computed<TrainingBonuses | undefined>(() => {
    const info = this.trainingRoom();
    if (!info) return undefined;
    return info.bonuses;
  });
}
