import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { RoomConnectionsComponent } from '@components/room-connections/room-connections.component';
import {
  connectionCreate,
  connectionGetAdjacentUnconnected,
  connectionGetRoomConnections,
  connectionRemove,
  floorCurrent,
  gamestate,
  getEntityName,
  gridDeselectTile,
  gridSelectedTile,
  hallwayTileRemove,
  invasionIsActive,
  notifyError,
  notifySuccess,
  productionGetRoomDefinition,
  trapAddToInventory,
  trapCanPlace,
  trapGetAtTile,
  trapGetDefinition,
  trapPlace,
  trapRemove,
  trapRemoveFromInventory,
  updateGamestate,
} from '@helpers';
import { contentGetEntry } from '@helpers/content';
import { floorCurrentIndex } from '@helpers/floor';
import type { PlacedRoomId } from '@interfaces';
import type { TrapContent, TrapId } from '@interfaces/content-trap';
import type { TrapInstanceId } from '@interfaces/trap';

function formatRoomName(name: string, suffix: string | undefined): string {
  return suffix ? `${name} ${suffix}` : name;
}

@Component({
  selector: 'app-panel-hallway-info',
  imports: [DecimalPipe, RoomConnectionsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (selectedHallwayTile(); as info) {
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body p-4">
          <h3 class="card-title text-sm">
            Corridor{{ info.suffix ? ' ' + info.suffix : '' }}
          </h3>
          @if (info.startRoomName && info.endRoomName) {
            <div class="text-xs opacity-50">
              <span>{{ info.startRoomName }}</span>
              <span>—</span>
              <span>{{ info.endRoomName }}</span>
            </div>
          }

          <app-room-connections
            [connectTo]="adjacentUnconnected()"
            [connections]="activeConnections()"
            (connect)="onConnect($event)"
            (disconnect)="onDisconnect($event)"
          />

          <!-- Trap Section -->
          @if (trapAtTile(); as placedTrap) {
            <div class="divider my-1 text-xs opacity-60">Trap</div>
            <div class="flex flex-col gap-2 p-2 bg-base-200 rounded">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold">
                  {{ placedTrap.name }}
                </span>
                <span class="badge badge-xs badge-warning">
                  {{ placedTrap.effectType }}
                </span>
              </div>
              <div class="text-xs opacity-50">
                Charges: {{ placedTrap.remainingCharges | number: '1.0-0' }} /
                {{ placedTrap.maxCharges | number: '1.0-0' }}
              </div>
              @if (placedTrap.damage > 0) {
                <div class="text-xs opacity-50">
                  Damage: {{ placedTrap.damage | number: '1.0-0' }}
                </div>
              }
              <button
                class="btn btn-xs btn-outline btn-warning"
                [disabled]="isInvasionActive()"
                (click)="onRemoveTrap(placedTrap.trapId)"
              >
                Remove Trap
              </button>
            </div>
          } @else if (trapInventoryEntries().length > 0 && canPlaceTrap()) {
            <div class="divider my-1 text-xs opacity-60">Place Trap</div>
            <div class="flex flex-col gap-2">
              @for (
                entry of trapInventoryEntries();
                track entry.trapTypeId
              ) {
                <div
                  class="flex items-center justify-between p-1 bg-base-200 rounded"
                >
                  <div class="flex flex-col">
                    <span class="text-xs font-semibold">
                      {{ entry.name }}
                    </span>
                    <span class="text-xs opacity-50">
                      x{{ entry.count | number: '1.0-0' }}
                    </span>
                  </div>
                  <button
                    class="btn btn-xs btn-outline btn-success"
                    [disabled]="isInvasionActive()"
                    (click)="onPlaceTrap(entry.trapTypeId)"
                  >
                    Place
                  </button>
                </div>
              }
            </div>
          }

          <div class="divider my-1"></div>

          <button
            class="btn btn-sm btn-error btn-outline w-full"
            [disabled]="isInvasionActive()"
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
  public isInvasionActive = invasionIsActive;

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

    const startSuffix = startRoom?.suffix;
    const endSuffix = endRoom?.suffix;

    return {
      x: tile.x,
      y: tile.y,
      hallwayId: gridTile.hallwayId,
      suffix: hallway.suffix,
      startRoomName: startDef
        ? formatRoomName(startDef.name, startSuffix)
        : undefined,
      endRoomName: endDef ? formatRoomName(endDef.name, endSuffix) : undefined,
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
        name: getEntityName(floor, otherId),
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

  public trapAtTile = computed(() => {
    const info = this.selectedHallwayTile();
    const floor = floorCurrent();
    if (!info || !floor) return undefined;

    const trap = trapGetAtTile(floor, info.x, info.y);
    if (!trap) return undefined;

    const def = contentGetEntry<TrapContent>(trap.trapTypeId);
    if (!def) return undefined;

    return {
      trapId: trap.id,
      name: def.name,
      effectType: def.effectType,
      damage: def.damage,
      remainingCharges: trap.remainingCharges,
      maxCharges: def.charges,
    };
  });

  public canPlaceTrap = computed(() => {
    const info = this.selectedHallwayTile();
    const floor = floorCurrent();
    if (!info || !floor) return false;

    return trapCanPlace(floor, info.x, info.y).canPlace;
  });

  public trapInventoryEntries = computed(() => {
    const state = gamestate();
    return state.world.trapInventory
      .filter((e) => e.count > 0)
      .map((e) => {
        const def = trapGetDefinition(e.trapTypeId);
        return {
          trapTypeId: e.trapTypeId,
          name: def?.name ?? 'Unknown',
          count: e.count,
        };
      });
  });

  public async onPlaceTrap(trapTypeId: TrapId): Promise<void> {
    const info = this.selectedHallwayTile();
    if (!info) return;

    const floorIndex = floorCurrentIndex();
    await updateGamestate((state) => {
      const floor = state.world.floors[floorIndex];
      if (!floor) return state;

      const result = trapPlace(floor, trapTypeId, info.x, info.y);
      if (!result) return state;

      state.world.floors[floorIndex] = result.floor;

      const newInventory = trapRemoveFromInventory(
        state.world.trapInventory,
        trapTypeId,
      );
      if (newInventory) {
        state.world.trapInventory = newInventory;
      }

      return state;
    });
    notifySuccess('Trap placed');
  }

  public async onRemoveTrap(trapId: TrapInstanceId): Promise<void> {
    const floorIndex = floorCurrentIndex();
    await updateGamestate((state) => {
      const floor = state.world.floors[floorIndex];
      if (!floor) return state;

      const result = trapRemove(floor, trapId);
      if (!result) return state;

      state.world.floors[floorIndex] = result.floor;
      state.world.trapInventory = trapAddToInventory(
        state.world.trapInventory,
        result.trap.trapTypeId,
      );

      return state;
    });
    notifySuccess('Trap removed');
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
