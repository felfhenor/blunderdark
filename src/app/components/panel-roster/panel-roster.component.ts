import { SFXDirective } from '@directives/sfx.directive';
import { analyticsSendDesignEvent } from '@helpers/analytics';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { IconComponent } from '@components/icon/icon.component';
import { InhabitantCardComponent } from '@components/inhabitant-card/inhabitant-card.component';
import {
  InhabitantListComponent,
  type InhabitantListEntry,
  type InhabitantListFilter,
} from '@components/inhabitant-list/inhabitant-list.component';
import {
  inhabitantAssignToRoom,
  inhabitantRename,
  inhabitantRemove,
  assignmentCanAssignToRoom,
  contentGetEntry,
  floorAll,
  notifyError,
  notifySuccess,
  inhabitantUnassignFromRoom,
  roomGetDisplayName,
  rosterNavigateToInhabitant,
} from '@helpers';
import { inhabitantIsTraveling } from '@helpers/inhabitants';
import { formatRealDuration } from '@helpers/game-time';
import { gamestate } from '@helpers/state-game';
import type {
  PlacedRoom,
  PlacedRoomId,
  RoomId,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';

import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';
import { sortBy } from 'es-toolkit/compat';
import type { SwalComponent } from '@sweetalert2/ngx-sweetalert2';

type RosterEntry = InhabitantListEntry & {
  roomName: string | undefined;
  floorName: string | undefined;
};

@Component({
  selector: 'app-panel-roster',
  imports: [IconComponent, InhabitantCardComponent, InhabitantListComponent, SFXDirective, SweetAlert2Module],
  templateUrl: './panel-roster.component.html',
  styleUrl: './panel-roster.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelRosterComponent {
  private renameSwal = viewChild<SwalComponent>('renameSwal');
  private releaseSwal = viewChild<SwalComponent>('releaseSwal');

  public activeFilter = signal<InhabitantListFilter>('all');
  public selectedInhabitantId = signal<string | undefined>(undefined);

  constructor() {
    effect(() => {
      const targetId = rosterNavigateToInhabitant();
      if (!targetId) return;
      untracked(() => {
        this.selectedInhabitantId.set(targetId);
        this.activeFilter.set('all');
        rosterNavigateToInhabitant.set(undefined);
      });
    });
  }

  public allEntries = computed<InhabitantListEntry[]>(() => {
    const state = gamestate();
    const inhabitants = state.world.inhabitants;

    const entries = inhabitants
      .map((inst) => {
        const def = contentGetEntry<InhabitantContent>(inst.definitionId);
        if (!def) return undefined;
        return { instance: inst, def } as InhabitantListEntry;
      })
      .filter((e): e is InhabitantListEntry => e !== undefined);
    return sortBy(entries, [(e) => e.def.name]);
  });

  public selectedEntry = computed<RosterEntry | undefined>(() => {
    const id = this.selectedInhabitantId();
    if (!id) return undefined;

    const state = gamestate();
    const inst = state.world.inhabitants.find((i) => i.instanceId === id);
    if (!inst) return undefined;

    const def = contentGetEntry<InhabitantContent>(inst.definitionId);
    if (!def) return undefined;

    let roomName: string | undefined = undefined;
    let floorName: string | undefined = undefined;
    if (inst.assignedRoomId) {
      for (const floor of state.world.floors) {
        const room = floor.rooms.find((r) => r.id === inst.assignedRoomId);
        if (room) {
          roomName = roomGetDisplayName(room);
          floorName = floor.name;
          break;
        }
      }
    }

    return { instance: inst, def, roomName, floorName };
  });

  public availableRooms = computed(() => {
    const entry = this.selectedEntry();
    if (!entry) return [];

    const floors = floorAll();
    const rooms: Array<{
      room: PlacedRoom;
      roomDef: RoomContent;
      displayName: string;
      floorName: string;
      canAssign: boolean;
    }> = [];

    for (const floor of floors) {
      for (const room of floor.rooms) {
        const roomDef = contentGetEntry<RoomContent>(room.roomTypeId);
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

  public onSelectInhabitant(entry: InhabitantListEntry): void {
    analyticsSendDesignEvent('Roster:Select');
    const current = this.selectedInhabitantId();
    this.selectedInhabitantId.set(
      current === entry.instance.instanceId ? undefined : entry.instance.instanceId,
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
    analyticsSendDesignEvent('Roster:Assign');
    const entry = this.selectedEntry();
    if (!entry) return;

    if (entry.instance.assignedRoomId !== undefined) {
      await inhabitantUnassignFromRoom(instanceId);
    }

    const result = await inhabitantAssignToRoom(instanceId, roomId as PlacedRoomId, roomTypeId as RoomId);
    if (!result.success && result.error) {
      notifyError(result.error);
    } else if (result.success) {
      const updated = gamestate().world.inhabitants.find(
        (i) => i.instanceId === instanceId,
      );
      if (updated && inhabitantIsTraveling(updated)) {
        notifySuccess(
          `Inhabitant assigned - traveling (${formatRealDuration(updated.travelTicksRemaining!)})`,
        );
      } else {
        notifySuccess('Inhabitant assigned');
      }
    }
  }

  public async onUnassign(instanceId: string): Promise<void> {
    analyticsSendDesignEvent('Roster:Unassign');
    const removed = await inhabitantUnassignFromRoom(instanceId);
    if (removed) {
      notifySuccess('Inhabitant unassigned');
    } else {
      notifyError('Failed to unassign inhabitant');
    }
  }

  public async onRename(instanceId: string, currentName: string): Promise<void> {
    analyticsSendDesignEvent('Roster:Rename');
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
    analyticsSendDesignEvent('Roster:Release');
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
