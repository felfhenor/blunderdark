import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { InhabitantCardComponent } from '@components/inhabitant-card/inhabitant-card.component';
import { analyticsSendDesignEvent } from '@helpers/analytics';
import {
  throneRoomActiveRulerBonuses,
  inhabitantAssignToRoom,
  contentGetEntry,
  throneRoomGetRulerDefinition,
  inhabitantMeetsRestriction,
  notifyError,
  notifySuccess,
  throneRoomSeatedRuler,
  throneRoomPositionalBonuses,
  inhabitantUnassignFromRoom,
  throneRoomFind,
} from '@helpers';
import { formatMultiplierAsPercentage } from '@helpers/format';
import { gamestate } from '@helpers/state-game';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';
import { startCase } from 'es-toolkit';
import { sortBy } from 'es-toolkit/compat';

@Component({
  selector: 'app-panel-throne-room',
  imports: [DecimalPipe, InhabitantCardComponent],
  templateUrl: './panel-throne-room.component.html',
  styleUrl: './panel-throne-room.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelThroneRoomComponent {
  public throneRoom = computed(() => {
    const result = throneRoomFind(gamestate().world.floors);
    return result?.room;
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
  public positional = throneRoomPositionalBonuses;

  public bonusEntries = computed(() => {
    const b = this.bonuses();
    return Object.entries(b).map(([key, value]) => ({
      label: this.formatBonusName(key),
      value: formatMultiplierAsPercentage(1 + value),
      raw: value,
    }));
  });

  public eligibleCreatures = computed(() => {
    const result = throneRoomFind(gamestate().world.floors);
    if (!result) return [];

    const entries = result.floor.inhabitants
      .filter((i) => {
        if (i.assignedRoomId !== undefined) return false;
        const def = contentGetEntry<InhabitantContent>(i.definitionId);
        return def ? inhabitantMeetsRestriction(def, 'unique') : false;
      })
      .map((i) => {
        const def = contentGetEntry<InhabitantContent>(i.definitionId)!;
        return { instance: i, definition: def };
      });
    return sortBy(entries, [(e) => e.definition.name]);
  });

  public async onAssignRuler(instanceId: string): Promise<void> {
    analyticsSendDesignEvent('Room:Throne:Ruler:Assign');
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
    analyticsSendDesignEvent('Room:Throne:Ruler:Remove');
    const ruler = throneRoomSeatedRuler();
    if (!ruler) return;

    const removed = await inhabitantUnassignFromRoom(ruler.instanceId);
    if (removed) {
      notifySuccess('Ruler removed from Throne Room');
    } else {
      notifyError('Failed to remove ruler');
    }
  }

  private formatBonusName(key: string): string {
    return startCase(key);
  }
}
