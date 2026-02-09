import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  createConnection,
  currentFloor,
  getAdjacentUnconnectedRooms,
  getRoomConnections,
  getRoomDefinition,
  notifyError,
  notifySuccess,
  removeConnection,
  selectedTile,
} from '@helpers';

@Component({
  selector: 'app-panel-room-info',
  templateUrl: './panel-room-info.component.html',
  styleUrl: './panel-room-info.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelRoomInfoComponent {
  public selectedRoom = computed(() => {
    const tile = selectedTile();
    const floor = currentFloor();
    if (!tile || !floor) return null;

    const gridTile = floor.grid[tile.y]?.[tile.x];
    if (!gridTile?.roomId) return null;

    const room = floor.rooms.find((r) => r.id === gridTile.roomId);
    if (!room) return null;

    const def = getRoomDefinition(room.roomTypeId);
    return {
      id: room.id,
      name: def?.name ?? 'Unknown Room',
      roomTypeId: room.roomTypeId,
    };
  });

  public adjacentUnconnected = computed(() => {
    const room = this.selectedRoom();
    const floor = currentFloor();
    if (!room || !floor) return [];

    const ids = getAdjacentUnconnectedRooms(floor, room.id);
    return ids.map((id) => {
      const placedRoom = floor.rooms.find((r) => r.id === id);
      const def = placedRoom
        ? getRoomDefinition(placedRoom.roomTypeId)
        : undefined;
      return { id, name: def?.name ?? 'Unknown Room' };
    });
  });

  public activeConnections = computed(() => {
    const room = this.selectedRoom();
    const floor = currentFloor();
    if (!room || !floor) return [];

    const connections = getRoomConnections(floor, room.id);
    return connections.map((conn) => {
      const otherId =
        conn.roomAId === room.id ? conn.roomBId : conn.roomAId;
      const otherRoom = floor.rooms.find((r) => r.id === otherId);
      const def = otherRoom
        ? getRoomDefinition(otherRoom.roomTypeId)
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

    const result = await createConnection(room.id, otherRoomId);
    if (result.error) {
      notifyError(result.error);
    } else {
      notifySuccess('Rooms connected');
    }
  }

  public async onDisconnect(connectionId: string): Promise<void> {
    const removed = await removeConnection(connectionId);
    if (removed) {
      notifySuccess('Connection removed');
    } else {
      notifyError('Failed to remove connection');
    }
  }
}
