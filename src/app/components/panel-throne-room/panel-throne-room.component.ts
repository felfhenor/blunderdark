import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  throneRoomActiveRulerBonuses,
  inhabitantAssignToRoom,
  floorCurrent,
  roomRoleFindById,
  contentGetEntry,
  throneRoomGetRulerDefinition,
  inhabitantMeetsRestriction,
  notifyError,
  notifySuccess,
  throneRoomSeatedRuler,
  gridSelectedTile,
  throneRoomPositionalBonuses,
  throneRoomFearLevel,
  inhabitantUnassignFromRoom,
} from '@helpers';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';
import { sortBy } from 'es-toolkit/compat';

@Component({
  selector: 'app-panel-throne-room',
  imports: [DecimalPipe],
  templateUrl: './panel-throne-room.component.html',
  styleUrl: './panel-throne-room.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelThroneRoomComponent {
  public throneRoom = computed(() => {
    const tile = gridSelectedTile();
    const floor = floorCurrent();
    if (!tile || !floor) return undefined;

    const gridTile = floor.grid[tile.y]?.[tile.x];
    if (!gridTile?.roomId) return undefined;

    const room = floor.rooms.find((r) => r.id === gridTile.roomId);
    if (!room || room.roomTypeId !== roomRoleFindById('throne'))
      return undefined;

    return room;
  });

  public roomDef = computed(() => {
    const room = this.throneRoom();
    if (!room) return undefined;
    return contentGetEntry<RoomContent>(room.roomTypeId);
  });

  public rulerInfo = computed(() => {
    const ruler = throneRoomSeatedRuler();
    if (!ruler) return undefined;

    const def = throneRoomGetRulerDefinition(ruler);
    if (!def) return undefined;

    return { instance: ruler, definition: def };
  });

  public bonuses = throneRoomActiveRulerBonuses;
  public fearLevel = throneRoomFearLevel;
  public positional = throneRoomPositionalBonuses;

  public bonusEntries = computed(() => {
    const b = this.bonuses();
    return Object.entries(b);
  });

  public eligibleCreatures = computed(() => {
    const floor = floorCurrent();
    if (!floor) return [];

    const entries = floor.inhabitants
      .filter((i) => {
        if (i.assignedRoomId !== undefined) return false;
        const def = contentGetEntry<InhabitantContent>(
          i.definitionId,
        );
        return def ? inhabitantMeetsRestriction(def, 'unique') : false;
      })
      .map((i) => {
        const def = contentGetEntry<InhabitantContent>(
          i.definitionId,
        );
        return { instance: i, name: def?.name ?? i.name };
      });
    return sortBy(entries, [(e) => e.name]);
  });

  public async onAssignRuler(instanceId: string): Promise<void> {
    const room = this.throneRoom();
    if (!room) return;

    const result = await inhabitantAssignToRoom(
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
    const ruler = throneRoomSeatedRuler();
    if (!ruler) return;

    const removed = await inhabitantUnassignFromRoom(ruler.instanceId);
    if (removed) {
      notifySuccess('Ruler removed from Throne Room');
    } else {
      notifyError('Failed to remove ruler');
    }
  }
}
