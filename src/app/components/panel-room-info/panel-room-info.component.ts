import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  inhabitantAssignToRoom,
  efficiencyCalculateRoom,
  connectionCreate,
  floorCurrent,
  roomRemovalExecute,
  connectionGetAdjacentUnconnected,
  contentGetEntry,
  roomUpgradeGetEffectiveMaxInhabitants,
  roomRemovalGetInfo,
  connectionGetRoomConnections,
  productionGetRoomDefinition,
  productionGetRoomRates,
  roomPlacementIsRemovable,
  inhabitantMeetsRestriction,
  notifyError,
  notifySuccess,
  productionPerMinute,
  connectionRemove,
  gridSelectedTile,
  inhabitantUnassignFromRoom,
  fearLevelBreakdownMap,
  fearLevelGetLabel,
  FEAR_LEVEL_MAX,
} from '@helpers';
import type { InhabitantDefinition, IsContentItem } from '@interfaces';
import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';

@Component({
  selector: 'app-panel-room-info',
  imports: [SweetAlert2Module],
  templateUrl: './panel-room-info.component.html',
  styleUrl: './panel-room-info.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelRoomInfoComponent {
  public selectedRoom = computed(() => {
    const tile = gridSelectedTile();
    const floor = floorCurrent();
    if (!tile || !floor) return undefined;

    const gridTile = floor.grid[tile.y]?.[tile.x];
    if (!gridTile?.roomId) return undefined;

    const room = floor.rooms.find((r) => r.id === gridTile.roomId);
    if (!room) return undefined;

    const def = productionGetRoomDefinition(room.roomTypeId);
    if (!def) return undefined;

    const effectiveMax = roomUpgradeGetEffectiveMaxInhabitants(room, def);

    return {
      id: room.id,
      name: def.name,
      roomTypeId: room.roomTypeId,
      placedRoom: room,
      maxInhabitants: effectiveMax,
    };
  });

  public assignedInhabitants = computed(() => {
    const room = this.selectedRoom();
    const floor = floorCurrent();
    if (!room || !floor) return [];

    return floor.inhabitants
      .filter((i) => i.assignedRoomId === room.id)
      .map((i) => {
        const def = contentGetEntry<InhabitantDefinition & IsContentItem>(
          i.definitionId,
        );
        return { instance: i, name: def?.name ?? i.name };
      });
  });

  public inhabitantCount = computed(() => this.assignedInhabitants().length);

  public roomProduction = computed(() => {
    const room = this.selectedRoom();
    if (!room) return [];
    const rates = productionGetRoomRates(room.id);
    return Object.entries(rates)
      .filter(([, v]) => v && v !== 0)
      .map(([type, perTick]) => ({
        type,
        perMinute: productionPerMinute(perTick as number),
      }));
  });

  public efficiencyBreakdown = computed(() => {
    const room = this.selectedRoom();
    const floor = floorCurrent();
    if (!room || !floor) return undefined;

    const roomDef = productionGetRoomDefinition(room.roomTypeId);
    if (!roomDef?.production || Object.keys(roomDef.production).length === 0) return undefined;

    return efficiencyCalculateRoom(room.placedRoom, floor.inhabitants);
  });

  public fearBreakdown = computed(() => {
    const room = this.selectedRoom();
    if (!room) return undefined;
    return fearLevelBreakdownMap().get(room.id);
  });

  public fearLabel = computed(() => {
    const breakdown = this.fearBreakdown();
    if (!breakdown) return undefined;
    return fearLevelGetLabel(breakdown.effectiveFear);
  });

  public fearMax = FEAR_LEVEL_MAX;

  public fearLabelClass = computed(() => {
    const breakdown = this.fearBreakdown();
    if (!breakdown) return '';
    switch (breakdown.effectiveFear) {
      case 0: return 'opacity-50';
      case 1: return 'text-success';
      case 2: return 'text-warning';
      case 3: return 'text-orange-400';
      case 4: return 'text-error';
      default: return '';
    }
  });

  public fearProgressClass = computed(() => {
    const breakdown = this.fearBreakdown();
    if (!breakdown) return 'progress-success';
    if (breakdown.effectiveFear >= 4) return 'progress-error';
    if (breakdown.effectiveFear >= 2) return 'progress-warning';
    return 'progress-success';
  });

  public eligibleUnassigned = computed(() => {
    const room = this.selectedRoom();
    const floor = floorCurrent();
    if (!room || !floor || room.maxInhabitants === 0) return [];

    const roomDef = productionGetRoomDefinition(room.roomTypeId);
    if (!roomDef) return [];

    return floor.inhabitants
      .filter((i) => {
        if (i.assignedRoomId !== undefined) return false;
        const def = contentGetEntry<InhabitantDefinition & IsContentItem>(
          i.definitionId,
        );
        return def
          ? inhabitantMeetsRestriction(def, roomDef.inhabitantRestriction)
          : false;
      })
      .map((i) => {
        const def = contentGetEntry<InhabitantDefinition & IsContentItem>(
          i.definitionId,
        );
        return { instance: i, name: def?.name ?? i.name };
      });
  });

  public adjacentUnconnected = computed(() => {
    const room = this.selectedRoom();
    const floor = floorCurrent();
    if (!room || !floor) return [];

    const ids = connectionGetAdjacentUnconnected(floor, room.id);
    return ids.map((id) => {
      const placedRoom = floor.rooms.find((r) => r.id === id);
      const def = placedRoom
        ? productionGetRoomDefinition(placedRoom.roomTypeId)
        : undefined;
      return { id, name: def?.name ?? 'Unknown Room' };
    });
  });

  public activeConnections = computed(() => {
    const room = this.selectedRoom();
    const floor = floorCurrent();
    if (!room || !floor) return [];

    const connections = connectionGetRoomConnections(floor, room.id);
    return connections.map((conn) => {
      const otherId =
        conn.roomAId === room.id ? conn.roomBId : conn.roomAId;
      const otherRoom = floor.rooms.find((r) => r.id === otherId);
      const def = otherRoom
        ? productionGetRoomDefinition(otherRoom.roomTypeId)
        : undefined;
      return {
        connectionId: conn.id,
        otherRoomId: otherId,
        otherRoomName: def?.name ?? 'Unknown Room',
      };
    });
  });

  public async onConnect(otherRoomId: string): Promise<void> {
    const room = this.selectedRoom();
    if (!room) return;

    const result = await connectionCreate(room.id, otherRoomId);
    if (result.error) {
      notifyError(result.error);
    } else {
      notifySuccess('Rooms connected');
    }
  }

  public async onDisconnect(connectionId: string): Promise<void> {
    const removed = await connectionRemove(connectionId);
    if (removed) {
      notifySuccess('Connection removed');
    } else {
      notifyError('Failed to remove connection');
    }
  }

  public async onAssignInhabitant(instanceId: string): Promise<void> {
    const room = this.selectedRoom();
    if (!room) return;

    const result = await inhabitantAssignToRoom(
      instanceId,
      room.id,
      room.roomTypeId,
    );
    if (!result.success && result.error) {
      notifyError(result.error);
    } else if (result.success) {
      notifySuccess('Inhabitant assigned');
    }
  }

  public async onUnassignInhabitant(instanceId: string): Promise<void> {
    const removed = await inhabitantUnassignFromRoom(instanceId);
    if (removed) {
      notifySuccess('Inhabitant unassigned');
    } else {
      notifyError('Failed to unassign inhabitant');
    }
  }

  public canRemoveRoom = computed(() => {
    const room = this.selectedRoom();
    if (!room) return false;
    return roomPlacementIsRemovable(room.roomTypeId);
  });

  public removalInfo = computed(() => {
    const room = this.selectedRoom();
    if (!room) return undefined;
    return roomRemovalGetInfo(room.id);
  });

  public removalSwalTitle = computed(() => {
    const info = this.removalInfo();
    return info ? `Remove ${info.roomName}?` : 'Remove Room?';
  });

  public removalSwalText = computed(() => {
    const info = this.removalInfo();
    if (!info) return '';

    const parts: string[] = [];

    const refundEntries = Object.entries(info.refund).filter(
      ([, v]) => v > 0,
    );
    if (refundEntries.length > 0) {
      const refundStr = refundEntries
        .map(([type, amount]) => `${amount} ${type}`)
        .join(', ');
      parts.push(`Refund: ${refundStr}`);
    } else {
      parts.push('No resource refund.');
    }

    if (info.displacedInhabitantNames.length > 0) {
      parts.push(
        `${info.displacedInhabitantNames.length} inhabitant(s) will be displaced.`,
      );
    }

    return parts.join('\n');
  });

  public async onConfirmRemoval(): Promise<void> {
    const room = this.selectedRoom();
    if (!room) return;

    const result = await roomRemovalExecute(room.id);
    if (result.success) {
      let message = `${room.name} demolished`;
      if (result.displacedNames && result.displacedNames.length > 0) {
        message += `. Displaced: ${result.displacedNames.join(', ')}`;
      }
      notifySuccess(message);
    } else {
      notifyError(result.error ?? 'Failed to remove room');
    }
  }
}
