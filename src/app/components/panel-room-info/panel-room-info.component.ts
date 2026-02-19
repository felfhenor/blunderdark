import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CurrencyNameComponent } from '@components/currency-name/currency-name.component';
import { HungerIndicatorComponent } from '@components/hunger-indicator/hunger-indicator.component';
import { ModalComponent } from '@components/modal/modal.component';
import { SynergyTooltipComponent } from '@components/synergy-tooltip/synergy-tooltip.component';
import {
  inhabitantAssignToRoom,
  inhabitantAll,
  efficiencyCalculateRoom,
  connectionCreate,
  floorCurrent,
  roomRemovalExecute,
  connectionGetAdjacentUnconnected,
  contentGetEntry,
  contentGetEntriesByType,
  roomUpgradeGetEffectiveMaxInhabitants,
  roomRemovalGetInfo,
  connectionGetRoomConnections,
  getEntityName,
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
  featureGetSlotCount,
  featureGetForSlot,
  featureAttachToSlot,
  featureRemoveFromSlot,
  featureIsUniquePlaced,
  featureGetResourceConverterEfficiency,
  resourceCanAfford,
  resourcePayCost,
  updateGamestate,
  gamestate,
  verticalTransportGetGroupsOnFloor,
} from '@helpers';
import {
  transportRemovalGetInfo,
  transportRemovalExecute,
} from '@helpers/transport-removal';
import {
  transportElevatorExtendExecute,
  transportElevatorShrinkExecute,
} from '@helpers/transport-placement';
import type { PlacedRoomId } from '@interfaces';
import type { FeatureContent, FeatureId } from '@interfaces/content-feature';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { ResourceType } from '@interfaces/resource';
import { TippyDirective } from '@ngneat/helipopper';
import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';

@Component({
  selector: 'app-panel-room-info',
  imports: [DecimalPipe, SweetAlert2Module, CurrencyNameComponent, HungerIndicatorComponent, TippyDirective, ModalComponent, SynergyTooltipComponent],
  templateUrl: './panel-room-info.component.html',
  styleUrl: './panel-room-info.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelRoomInfoComponent {
  private inhabitants = inhabitantAll();

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

  public transportInfo = computed(() => {
    const room = this.selectedRoom();
    if (!room) return undefined;
    const placedRoom = room.placedRoom;
    if (!placedRoom.transportType || !placedRoom.transportGroupId) return undefined;

    const state = gamestate();
    const groups = verticalTransportGetGroupsOnFloor(state.world.floors, floorCurrent()?.depth ?? 0);
    const group = groups.find((g) => g.room.id === placedRoom.id);

    return {
      type: placedRoom.transportType,
      groupId: placedRoom.transportGroupId,
      connectedFloors: group?.groupFloors ?? [],
    };
  });

  public async onRemoveTransport(): Promise<void> {
    const room = this.selectedRoom();
    if (!room) return;

    const result = await transportRemovalExecute(room.id);
    if (result.success) {
      notifySuccess(`${room.name} removed`);
    } else {
      notifyError(result.error ?? 'Failed to remove transport');
    }
  }

  public transportRemovalInfo = computed(() => {
    const room = this.selectedRoom();
    if (!room?.placedRoom.transportType) return undefined;
    return transportRemovalGetInfo(room.id);
  });

  public async onExtendElevator(direction: 'up' | 'down'): Promise<void> {
    const info = this.transportInfo();
    if (!info || info.type !== 'elevator') return;

    const result = await transportElevatorExtendExecute(info.groupId, direction);
    if (result.success) {
      notifySuccess(`Elevator extended ${direction}`);
    } else {
      notifyError(result.error ?? 'Failed to extend elevator');
    }
  }

  public async onShrinkElevator(floorDepth: number): Promise<void> {
    const info = this.transportInfo();
    if (!info || info.type !== 'elevator') return;

    const result = await transportElevatorShrinkExecute(info.groupId, floorDepth);
    if (result.success) {
      notifySuccess(`Elevator floor removed`);
    } else {
      notifyError(result.error ?? 'Failed to shrink elevator');
    }
  }

  public assignedInhabitants = computed(() => {
    const room = this.selectedRoom();
    if (!room) return [];

    return this.inhabitants()
      .filter((i) => i.assignedRoomId === room.id)
      .map((i) => {
        const def = contentGetEntry<InhabitantContent>(
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
        type: type as ResourceType,
        perMinute: productionPerMinute(perTick as number),
      }));
  });

  public efficiencyBreakdown = computed(() => {
    const room = this.selectedRoom();
    if (!room) return undefined;

    const roomDef = productionGetRoomDefinition(room.roomTypeId);
    if (!roomDef?.production || Object.keys(roomDef.production).length === 0) return undefined;

    return efficiencyCalculateRoom(room.placedRoom, this.inhabitants());
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
    if (!room || room.maxInhabitants === 0) return [];

    const roomDef = productionGetRoomDefinition(room.roomTypeId);
    if (!roomDef) return [];

    return this.inhabitants()
      .filter((i) => {
        if (i.assignedRoomId !== undefined) return false;
        const def = contentGetEntry<InhabitantContent>(
          i.definitionId,
        );
        return def
          ? inhabitantMeetsRestriction(def, roomDef.inhabitantRestriction)
          : false;
      })
      .map((i) => {
        const def = contentGetEntry<InhabitantContent>(
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
    return ids.map((id) => ({ id, name: getEntityName(floor, id) }));
  });

  public activeConnections = computed(() => {
    const room = this.selectedRoom();
    const floor = floorCurrent();
    if (!room || !floor) return [];

    const connections = connectionGetRoomConnections(floor, room.id);
    return connections.map((conn) => {
      const otherId =
        conn.roomAId === room.id ? conn.roomBId : conn.roomAId;
      return {
        connectionId: conn.id,
        otherRoomId: otherId,
        otherRoomName: getEntityName(floor, otherId),
      };
    });
  });

  // --- Feature slots ---

  public featureSlots = computed(() => {
    const room = this.selectedRoom();
    if (!room) return [];

    const slotCount = featureGetSlotCount(room.placedRoom);

    const slots: { index: number; feature: FeatureContent | undefined }[] = [];
    for (let i = 0; i < slotCount; i++) {
      slots.push({
        index: i,
        feature: featureGetForSlot(room.placedRoom, i),
      });
    }
    return slots;
  });

  public showFeatureSelect = signal(false);
  public featureSelectSlotIndex = signal(0);
  public featureRemoveSlotIndex = 0;

  public availableFeatures = computed(() => {
    const allFeatures = contentGetEntriesByType<FeatureContent>('feature');
    const resources = gamestate().world.resources;

    return allFeatures.map((f) => {
      const affordable = resourceCanAfford(f.cost);
      const shortfall: { type: string; needed: number; have: number }[] = [];
      if (!affordable) {
        for (const [type, amount] of Object.entries(f.cost)) {
          const current = resources[type as ResourceType]?.current ?? 0;
          if (current < amount) {
            shortfall.push({ type, needed: amount, have: current });
          }
        }
      }
      const costEntries = Object.entries(f.cost)
        .filter(([, v]) => v !== undefined && v > 0)
        .map(([type, amount]) => ({ type: type as ResourceType, amount: amount as number }));
      return { feature: f, affordable, shortfall, costEntries };
    });
  });

  // --- Resource Converter ---

  private readonly CONVERTIBLE_RESOURCES: ResourceType[] = ['crystals', 'food', 'gold', 'flux', 'research', 'essence'];

  public hasResourceConverter = computed(() => {
    const room = this.selectedRoom();
    if (!room) return false;
    return featureGetResourceConverterEfficiency(room.placedRoom) !== undefined;
  });

  public converterEfficiency = computed(() => {
    const room = this.selectedRoom();
    if (!room) return 0;
    return featureGetResourceConverterEfficiency(room.placedRoom) ?? 0;
  });

  public convertedOutputResource = computed(() => {
    const room = this.selectedRoom();
    if (!room) return undefined;
    return room.placedRoom.convertedOutputResource;
  });

  public availableConversionResources = computed(() => {
    const room = this.selectedRoom();
    if (!room) return [];
    const roomDef = productionGetRoomDefinition(room.roomTypeId);
    if (!roomDef?.production) return [];
    const producedTypes = Object.keys(roomDef.production);
    return this.CONVERTIBLE_RESOURCES.filter((r) => !producedTypes.includes(r));
  });

  public async onSetConvertedResource(resourceType: string | undefined): Promise<void> {
    const room = this.selectedRoom();
    if (!room) return;

    await updateGamestate((state) => {
      for (const floor of state.world.floors) {
        const target = floor.rooms.find((r) => r.id === room.id);
        if (target) {
          target.convertedOutputResource = resourceType || undefined;
          break;
        }
      }
      return state;
    });

    if (resourceType) {
      notifySuccess(`Converting output to ${resourceType}`);
    } else {
      notifySuccess('Conversion disabled');
    }
  }

  // --- Actions ---

  public async onConnect(otherRoomId: string): Promise<void> {
    const room = this.selectedRoom();
    if (!room) return;

    const result = await connectionCreate(room.id, otherRoomId as PlacedRoomId);
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

  // --- Feature actions ---

  public onOpenFeatureSelect(slotIndex: number): void {
    this.featureSelectSlotIndex.set(slotIndex);
    this.showFeatureSelect.set(true);
  }

  public async onAttachFeature(featureId: FeatureId): Promise<void> {
    const room = this.selectedRoom();
    if (!room) return;

    const feature = contentGetEntry<FeatureContent>(featureId);
    if (!feature) return;

    if (feature.unique) {
      const state = gamestate();
      if (state && featureIsUniquePlaced(state.world.floors, featureId)) {
        notifyError(`${feature.name} is unique and already placed in the dungeon`);
        return;
      }
    }

    const paid = await resourcePayCost(feature.cost);
    if (!paid) {
      notifyError('Cannot afford this feature');
      return;
    }

    const slotIndex = this.featureSelectSlotIndex();
    const totalSlots = featureGetSlotCount(room.placedRoom);

    await updateGamestate((state) => {
      for (const floor of state.world.floors) {
        const target = floor.rooms.find((r) => r.id === room.id);
        if (target) {
          featureAttachToSlot(target, slotIndex, featureId, totalSlots);
          break;
        }
      }
      return state;
    });

    this.showFeatureSelect.set(false);
    notifySuccess(`Attached ${feature.name}`);
  }

  public async onRemoveFeature(slotIndex: number): Promise<void> {
    const room = this.selectedRoom();
    if (!room) return;

    const feature = featureGetForSlot(room.placedRoom, slotIndex);
    const featureName = feature?.name ?? 'Feature';

    await updateGamestate((state) => {
      for (const floor of state.world.floors) {
        const target = floor.rooms.find((r) => r.id === room.id);
        if (target) {
          featureRemoveFromSlot(target, slotIndex);
          break;
        }
      }
      return state;
    });

    notifySuccess(`Removed ${featureName} (destroyed)`);
  }
}
