import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { DecimalPipe, KeyValuePipe } from '@angular/common';
import {
  activeRulerBonuses,
  assignInhabitantToRoom,
  currentFloor,
  getEntry,
  getRulerDefinition,
  meetsInhabitantRestriction,
  notifyError,
  notifySuccess,
  seatedRuler,
  selectedTile,
  thronePositionalBonuses,
  throneRoomFearLevel,
  THRONE_ROOM_TYPE_ID,
  unassignInhabitantFromRoom,
} from '@helpers';
import type { InhabitantDefinition, IsContentItem } from '@interfaces';

@Component({
  selector: 'app-panel-throne-room',
  imports: [DecimalPipe, KeyValuePipe],
  templateUrl: './panel-throne-room.component.html',
  styleUrl: './panel-throne-room.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelThroneRoomComponent {
  public throneRoom = computed(() => {
    const tile = selectedTile();
    const floor = currentFloor();
    if (!tile || !floor) return null;

    const gridTile = floor.grid[tile.y]?.[tile.x];
    if (!gridTile?.roomId) return null;

    const room = floor.rooms.find((r) => r.id === gridTile.roomId);
    if (!room || room.roomTypeId !== THRONE_ROOM_TYPE_ID) return null;

    return room;
  });

  public rulerInfo = computed(() => {
    const ruler = seatedRuler();
    if (!ruler) return null;

    const def = getRulerDefinition(ruler);
    if (!def) return null;

    return { instance: ruler, definition: def };
  });

  public bonuses = activeRulerBonuses;
  public fearLevel = throneRoomFearLevel;
  public positional = thronePositionalBonuses;

  public bonusEntries = computed(() => {
    const b = this.bonuses();
    return Object.entries(b);
  });

  public eligibleCreatures = computed(() => {
    const floor = currentFloor();
    if (!floor) return [];

    return floor.inhabitants
      .filter((i) => {
        if (i.assignedRoomId !== null) return false;
        const def = getEntry<InhabitantDefinition & IsContentItem>(
          i.definitionId,
        );
        return def ? meetsInhabitantRestriction(def, 'unique') : false;
      })
      .map((i) => {
        const def = getEntry<InhabitantDefinition & IsContentItem>(
          i.definitionId,
        );
        return { instance: i, name: def?.name ?? i.name };
      });
  });

  public async onAssignRuler(instanceId: string): Promise<void> {
    const room = this.throneRoom();
    if (!room) return;

    const result = await assignInhabitantToRoom(
      instanceId,
      room.id,
      room.roomTypeId,
    );
    if (!result.success && result.error) {
      notifyError(result.error);
    } else if (result.success) {
      notifySuccess('Ruler assigned to Throne Room');
    }
  }

  public async onRemoveRuler(): Promise<void> {
    const ruler = seatedRuler();
    if (!ruler) return;

    const removed = await unassignInhabitantFromRoom(ruler.instanceId);
    if (removed) {
      notifySuccess('Ruler removed from Throne Room');
    } else {
      notifyError('Failed to remove ruler');
    }
  }
}
