import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
  viewChild,
} from '@angular/core';
import { IconComponent } from '@components/icon/icon.component';
import { InhabitantCardComponent } from '@components/inhabitant-card/inhabitant-card.component';
import {
  inhabitantAssignToRoom,
  inhabitantRename,
  inhabitantRemove,
  assignmentCanAssignToRoom,
  contentGetEntry,
  notifyError,
  notifySuccess,
  inhabitantUnassignFromRoom,
  roomGetDisplayName,
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

import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';
import { sortBy } from 'es-toolkit/compat';
import type { SwalComponent } from '@sweetalert2/ngx-sweetalert2';

type RosterFilter = 'all' | 'assigned' | 'unassigned';

type RosterEntry = {
  instance: InhabitantInstance;
  def: InhabitantContent;
  roomName: string | undefined;
  floorName: string | undefined;
};

@Component({
  selector: 'app-panel-roster',
  imports: [DecimalPipe, IconComponent, InhabitantCardComponent, SweetAlert2Module],
  templateUrl: './panel-roster.component.html',
  styleUrl: './panel-roster.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelRosterComponent {
  private renameSwal = viewChild<SwalComponent>('renameSwal');
  private releaseSwal = viewChild<SwalComponent>('releaseSwal');

  public activeFilter = signal<RosterFilter>('all');
  public selectedInhabitantId = signal<string | undefined>(undefined);

  private allEntries = computed<RosterEntry[]>(() => {
    const state = gamestate();
    const inhabitants = state.world.inhabitants;
    const floors = state.world.floors;

    const entries = inhabitants
      .map((inst) => {
        const def = contentGetEntry<InhabitantContent>(
          inst.definitionId,
        );
        if (!def) return undefined;

        let roomName: string | undefined = undefined;
        let floorName: string | undefined = undefined;
        if (inst.assignedRoomId) {
          for (const floor of floors) {
            const room = floor.rooms.find(
              (r) => r.id === inst.assignedRoomId,
            );
            if (room) {
              roomName = roomGetDisplayName(room);
              floorName = floor.name;
              break;
            }
          }
        }

        return { instance: inst, def, roomName, floorName } as RosterEntry;
      })
      .filter((e): e is RosterEntry => e !== undefined);
    return sortBy(entries, [(e) => e.def.name]);
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
      displayName: string;
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
          displayName: roomGetDisplayName(room),
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

  public async onRename(instanceId: string, currentName: string): Promise<void> {
    const swal = this.renameSwal();
    if (!swal) return;

    swal.swalOptions = {
      title: 'Rename Creature',
      input: 'text',
      inputValue: currentName,
      inputAttributes: { maxlength: '20' },
      inputValidator: (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return 'Name cannot be empty';
        if (trimmed.length > 20) return 'Name must be 20 characters or fewer';
        return null;
      },
      showCancelButton: true,
      confirmButtonText: 'Rename',
    };

    const result = await swal.fire();
    if (result.isConfirmed && result.value) {
      const renamed = await inhabitantRename(instanceId, result.value as string);
      if (renamed) {
        notifySuccess('Creature renamed');
      } else {
        notifyError('Failed to rename creature');
      }
    }
  }

  public async onRelease(instanceId: string, instanceName: string): Promise<void> {
    const swal = this.releaseSwal();
    if (!swal) return;

    swal.swalOptions = {
      title: 'Release Creature',
      text: `Release ${instanceName}? This cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Release',
    };

    const result = await swal.fire();
    if (result.isConfirmed) {
      const entry = this.selectedEntry();
      if (entry?.instance.assignedRoomId) {
        await inhabitantUnassignFromRoom(instanceId);
      }
      await inhabitantRemove(instanceId);
      this.selectedInhabitantId.set(undefined);
      notifySuccess(`${instanceName} has been released`);
    }
  }

}
