import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  connectionCreate,
  connectionGetAdjacentUnconnected,
  connectionGetRoomConnections,
  connectionRemove,
  floorCurrent,
  getEntityName,
  gridDeselectTile,
  gridSelectedTile,
  hallwayTileRemove,
  notifyError,
  notifySuccess,
  productionGetRoomDefinition,
} from '@helpers';
import type { PlacedRoomId } from '@interfaces';

@Component({
  selector: 'app-panel-hallway-info',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (selectedHallwayTile(); as info) {
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body p-4">
          <h3 class="card-title text-sm">Corridor</h3>
          @if (info.startRoomName && info.endRoomName) {
            <div class="text-xs opacity-50">
              <span>{{ info.startRoomName }}</span>
              <span>—</span>
              <span>{{ info.endRoomName }}</span>
            </div>
          }

          @if (adjacentUnconnected().length > 0) {
            <div class="mt-2">
              <h4 class="text-xs font-semibold opacity-70 mb-1">Connect to:</h4>
              <div class="flex flex-col gap-1">
                @for (adj of adjacentUnconnected(); track adj.id) {
                  <button
                    class="btn btn-xs btn-outline btn-success"
                    (click)="onConnect(adj.id)"
                  >
                    {{ adj.name }}
                  </button>
                }
              </div>
            </div>
          }

          @if (activeConnections().length > 0) {
            <div class="mt-2">
              <h4 class="text-xs font-semibold opacity-70 mb-1">Connected:</h4>
              <div class="flex flex-col gap-1">
                @for (conn of activeConnections(); track conn.connectionId) {
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-xs">{{ conn.otherName }}</span>
                    <button
                      class="btn btn-xs btn-outline btn-error"
                      (click)="onDisconnect(conn.connectionId)"
                    >
                      Disconnect
                    </button>
                  </div>
                }
              </div>
            </div>
          }

          @if (
            adjacentUnconnected().length === 0 &&
            activeConnections().length === 0
          ) {
            <p class="text-xs opacity-50 mt-1">
              No adjacent entities to connect.
            </p>
          }

          <div class="divider my-1"></div>

          <button
            class="btn btn-sm btn-error btn-outline w-full"
            (click)="onRemoveHallway()"
          >
            Remove Corridor
          </button>
        </div>
      </div>
    }
  `,
})
export class PanelHallwayInfoComponent {
  public selectedHallwayTile = computed(() => {
    const tile = gridSelectedTile();
    const floor = floorCurrent();
    if (!tile || !floor) return undefined;

    const gridTile = floor.grid[tile.y]?.[tile.x];
    if (!gridTile || gridTile.occupiedBy !== 'hallway' || !gridTile.hallwayId) {
      return undefined;
    }

    const hallway = floor.hallways.find((h) => h.id === gridTile.hallwayId);
    if (!hallway) return undefined;

    const startRoom = hallway.startRoomId
      ? floor.rooms.find((r) => r.id === hallway.startRoomId)
      : undefined;
    const endRoom = hallway.endRoomId
      ? floor.rooms.find((r) => r.id === hallway.endRoomId)
      : undefined;

    const startDef = startRoom
      ? productionGetRoomDefinition(startRoom.roomTypeId)
      : undefined;
    const endDef = endRoom
      ? productionGetRoomDefinition(endRoom.roomTypeId)
      : undefined;

    return {
      x: tile.x,
      y: tile.y,
      hallwayId: gridTile.hallwayId,
      startRoomName: startDef?.name,
      endRoomName: endDef?.name,
    };
  });

  public adjacentUnconnected = computed(() => {
    const info = this.selectedHallwayTile();
    const floor = floorCurrent();
    if (!info || !floor) return [];

    const ids = connectionGetAdjacentUnconnected(
      floor,
      info.hallwayId as unknown as PlacedRoomId,
    );
    return ids.map((id) => ({ id, name: getEntityName(floor, id) }));
  });

  public activeConnections = computed(() => {
    const info = this.selectedHallwayTile();
    const floor = floorCurrent();
    if (!info || !floor) return [];

    const connections = connectionGetRoomConnections(
      floor,
      info.hallwayId as unknown as PlacedRoomId,
    );
    return connections.map((conn) => {
      const otherId =
        conn.roomAId === (info.hallwayId as unknown as PlacedRoomId)
          ? conn.roomBId
          : conn.roomAId;
      return {
        connectionId: conn.id,
        otherId,
        otherName: getEntityName(floor, otherId),
      };
    });
  });

  public async onConnect(entityId: PlacedRoomId): Promise<void> {
    const info = this.selectedHallwayTile();
    if (!info) return;

    const result = await connectionCreate(
      info.hallwayId as unknown as PlacedRoomId,
      entityId,
    );
    if (result.error) {
      notifyError(result.error);
    } else {
      notifySuccess('Connected');
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

  public async onRemoveHallway(): Promise<void> {
    const info = this.selectedHallwayTile();
    if (!info) return;

    const result = await hallwayTileRemove(info.x, info.y);
    if (result.success) {
      notifySuccess('Corridor removed');
      gridDeselectTile();
    } else {
      notifyError(result.error ?? 'Failed to remove corridor');
    }
  }
}
