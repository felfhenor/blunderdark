import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  altarFearReductionAura,
  canRecruit,
  currentFloor,
  selectedTile,
  ALTAR_ROOM_TYPE_ID,
} from '@helpers';

@Component({
  selector: 'app-panel-altar',
  templateUrl: './panel-altar.component.html',
  styleUrl: './panel-altar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelAltarComponent {
  public altarRoom = computed(() => {
    const tile = selectedTile();
    const floor = currentFloor();
    if (!tile || !floor) return null;

    const gridTile = floor.grid[tile.y]?.[tile.x];
    if (!gridTile?.roomId) return null;

    const room = floor.rooms.find((r) => r.id === gridTile.roomId);
    if (!room || room.roomTypeId !== ALTAR_ROOM_TYPE_ID) return null;

    return room;
  });

  public fearReduction = altarFearReductionAura;
  public recruitmentAvailable = canRecruit;
}
