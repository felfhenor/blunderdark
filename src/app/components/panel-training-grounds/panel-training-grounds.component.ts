import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  currentFloor,
  gamestate,
  getEntry,
  getTrainingProgressPercent,
  getTrainingRoomInfo,
  selectedTile,
  TRAINING_GROUNDS_TYPE_ID,
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
    if (!tile || !floor) return null;

    const gridTile = floor.grid[tile.y]?.[tile.x];
    if (!gridTile?.roomId) return null;

    const room = floor.rooms.find((r) => r.id === gridTile.roomId);
    if (!room || room.roomTypeId !== TRAINING_GROUNDS_TYPE_ID) return null;

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

  public expectedBonuses = computed<TrainingBonuses | null>(() => {
    const info = this.trainingRoom();
    if (!info) return null;
    return info.bonuses;
  });
}
