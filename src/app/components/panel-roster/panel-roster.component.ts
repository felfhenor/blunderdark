import { DecimalPipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { StatNameComponent } from '@components/stat-name/stat-name.component';
import {
  inhabitantAssignToRoom,
  assignmentCanAssignToRoom,
  contentGetEntry,
  productionGetRoomDefinition,
  notifyError,
  notifySuccess,
  inhabitantUnassignFromRoom,
} from '@helpers';
import { gamestate } from '@helpers/state-game';
import type {
  InhabitantInstance,
  PlacedRoom,
  PlacedRoomId,
  RoomId,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';
import { TippyDirective } from '@ngneat/helipopper';

type RosterFilter = 'all' | 'assigned' | 'unassigned';

type RosterEntry = {
  instance: InhabitantInstance;
  def: InhabitantContent;
  roomName: string | undefined;
};

@Component({
  selector: 'app-panel-roster',
  imports: [DecimalPipe, NgClass, StatNameComponent, TippyDirective],
  templateUrl: './panel-roster.component.html',
  styleUrl: './panel-roster.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelRosterComponent {
  public activeFilter = signal<RosterFilter>('all');
  public selectedInhabitantId = signal<string | undefined>(undefined);

  private allEntries = computed<RosterEntry[]>(() => {
    const state = gamestate();
    const inhabitants = state.world.inhabitants;
    const floors = state.world.floors;

    return inhabitants
      .map((inst) => {
        const def = contentGetEntry<InhabitantContent>(
          inst.definitionId,
        );
        if (!def) return undefined;

        let roomName: string | undefined = undefined;
        if (inst.assignedRoomId) {
          for (const floor of floors) {
            const room = floor.rooms.find(
              (r) => r.id === inst.assignedRoomId,
            );
            if (room) {
              const roomDef = productionGetRoomDefinition(room.roomTypeId);
              roomName = roomDef?.name ?? 'Unknown Room';
              break;
            }
          }
        }

        return { instance: inst, def, roomName } as RosterEntry;
      })
      .filter((e): e is RosterEntry => e !== undefined);
  });

  public allCount = computed(() => this.allEntries().length);

  public assignedCount = computed(
    () =>
      this.allEntries().filter((e) => e.instance.assignedRoomId !== undefined)
        .length,
  );

  public unassignedCount = computed(
    () =>
      this.allEntries().filter((e) => e.instance.assignedRoomId === undefined)
        .length,
  );

  public filteredEntries = computed(() => {
    const filter = this.activeFilter();
    const entries = this.allEntries();
    if (filter === 'assigned')
      return entries.filter((e) => e.instance.assignedRoomId !== undefined);
    if (filter === 'unassigned')
      return entries.filter((e) => e.instance.assignedRoomId === undefined);
    return entries;
  });

  public selectedEntry = computed<RosterEntry | undefined>(() => {
    const id = this.selectedInhabitantId();
    if (!id) return undefined;
    return this.allEntries().find((e) => e.instance.instanceId === id) ?? undefined;
  });

  public availableRooms = computed(() => {
    const entry = this.selectedEntry();
    if (!entry) return [];

    const floors = gamestate().world.floors;
    const rooms: Array<{
      room: PlacedRoom;
      roomDef: RoomContent;
      floorName: string;
      canAssign: boolean;
    }> = [];

    for (const floor of floors) {
      for (const room of floor.rooms) {
        const roomDef = contentGetEntry<RoomContent>(
          room.roomTypeId,
        );
        if (!roomDef || roomDef.maxInhabitants === 0) continue;

        const validation = assignmentCanAssignToRoom(room.id);
        rooms.push({
          room,
          roomDef,
          floorName: floor.name,
          canAssign: validation.allowed,
        });
      }
    }

    return rooms;
  });

  public setFilter(filter: RosterFilter): void {
    this.activeFilter.set(filter);
  }

  public selectInhabitant(instanceId: string): void {
    const current = this.selectedInhabitantId();
    this.selectedInhabitantId.set(
      current === instanceId ? undefined : instanceId,
    );
  }

  public closeDetail(): void {
    this.selectedInhabitantId.set(undefined);
  }

  public async onAssignToRoom(
    instanceId: string,
    roomId: string,
    roomTypeId: string,
  ): Promise<void> {
    const entry = this.selectedEntry();
    if (!entry) return;

    // If already assigned, unassign first
    if (entry.instance.assignedRoomId !== undefined) {
      await inhabitantUnassignFromRoom(instanceId);
    }

    const result = await inhabitantAssignToRoom(instanceId, roomId as PlacedRoomId, roomTypeId as RoomId);
    if (!result.success && result.error) {
      notifyError(result.error);
    } else if (result.success) {
      notifySuccess('Inhabitant assigned');
    }
  }

  public async onUnassign(instanceId: string): Promise<void> {
    const removed = await inhabitantUnassignFromRoom(instanceId);
    if (removed) {
      notifySuccess('Inhabitant unassigned');
    } else {
      notifyError('Failed to unassign inhabitant');
    }
  }

  public getStatClass(value: number, stat: string): string {
    if (stat === 'workerEfficiency') return value > 1.0 ? 'stat-high' : value < 1.0 ? 'stat-low' : '';
    return '';
  }

  public getStateClass(state: string): string {
    if (state === 'scared') return 'badge-error';
    if (state === 'hungry') return 'badge-warning';
    return 'badge-success';
  }
}
