import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  altarRoomHas,
  biomeRestrictionCanBuild,
  biomeRestrictionGetRoomInfo,
  contentGetEntriesByType,
  floorCurrent,
  hallwayPlacementCanAfford,
  hallwayPlacementConfirm,
  hallwayPlacementEnter,
  hallwayPlacementExit,
  hallwayPlacementIsBuildMode,
  hallwayPlacementPreviewCost,
  hallwayPlacementPreviewPath,
  hallwayPlacementStatusMessage,
  researchUnlockGetRequiredResearchName,
  researchUnlockIsResearchGated,
  researchUnlockIsUnlocked,
  resourceCanAfford,
  roomPlacementEnterMode,
  roomPlacementExitMode,
  roomPlacementPlacedTypeIds,
  roomPlacementRotate,
  roomPlacementRotation,
  roomPlacementSelectedTypeId,
  roomShapeGet,
  roomShapeGetRotated,
} from '@helpers';
import type { RoomId, RoomShapeContent } from '@interfaces';
import type { RoomContent } from '@interfaces/content-room';
import { TippyDirective } from '@ngneat/helipopper';

@Component({
  selector: 'app-panel-room-select',
  imports: [TippyDirective],
  templateUrl: './panel-room-select.component.html',
  styleUrl: './panel-room-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelRoomSelectComponent {
  public rooms = computed(() =>
    contentGetEntriesByType<RoomContent>('room').filter((r) => !r.autoPlace),
  );

  public hasAltar = altarRoomHas;

  public selectedId = roomPlacementSelectedTypeId;
  public isHallwayMode = hallwayPlacementIsBuildMode;
  public hallwayStatus = hallwayPlacementStatusMessage;
  public hallwayCost = hallwayPlacementPreviewCost;
  public hallwayPath = hallwayPlacementPreviewPath;
  public hallwayPlacementCanAfford = hallwayPlacementCanAfford;

  public roomPlacementPlacedTypeIds = roomPlacementPlacedTypeIds;
  public rotation = roomPlacementRotation;

  public isSelected(roomId: string): boolean {
    return this.selectedId() === roomId;
  }

  public isAffordable(room: RoomContent): boolean {
    return resourceCanAfford(room.cost);
  }

  public isUniqueAndPlaced(room: RoomContent): boolean {
    if (!room.isUnique) return false;
    return this.roomPlacementPlacedTypeIds().has(room.id as RoomId);
  }

  public isResearchLocked(room: RoomContent): boolean {
    if (!researchUnlockIsResearchGated('room', room.id)) return false;
    return !researchUnlockIsUnlocked('room', room.id);
  }

  public getResearchRequirement(room: RoomContent): string {
    const name = researchUnlockGetRequiredResearchName('room', room.id);
    return name ? `Requires: ${name}` : '';
  }

  public isBiomeRestricted(room: RoomContent): boolean {
    const floor = floorCurrent();
    if (!floor) return false;
    const result = biomeRestrictionCanBuild(
      room.id as RoomId,
      floor.biome,
      floor,
    );
    return !result.allowed;
  }

  public getBiomeRestrictionTooltip(room: RoomContent): string {
    const floor = floorCurrent();
    if (!floor) return '';
    const info = biomeRestrictionGetRoomInfo(
      room.id as RoomId,
      floor.biome,
      floor,
    );
    return info.reason ?? '';
  }

  public getBiomeLimitLabel(room: RoomContent): string | undefined {
    const floor = floorCurrent();
    if (!floor) return undefined;
    const info = biomeRestrictionGetRoomInfo(
      room.id as RoomId,
      floor.biome,
      floor,
    );
    if (info.maxCount !== undefined && info.currentCount !== undefined) {
      return `${info.currentCount}/${info.maxCount}`;
    }
    return undefined;
  }

  public getRoomShapeForPreview(
    room: RoomContent,
  ): RoomShapeContent | undefined {
    return roomShapeGet(room.shapeId);
  }

  public getCostEntries(room: RoomContent): { type: string; amount: number }[] {
    return Object.entries(room.cost)
      .filter(([, amount]) => amount && amount > 0)
      .map(([type, amount]) => ({ type, amount: amount as number }));
  }

  private getEffectiveShape(room: RoomContent): RoomShapeContent | undefined {
    const base = roomShapeGet(room.shapeId);
    if (!base) return undefined;
    if (this.isSelected(room.id)) {
      return roomShapeGetRotated(base, this.rotation());
    }
    return base;
  }

  public getShapeTiles(
    room: RoomContent,
  ): { x: number; y: number; key: string }[] {
    const shape = this.getEffectiveShape(room);
    if (!shape) return [];
    return shape.tiles.map((t) => ({ x: t.x, y: t.y, key: `${t.x},${t.y}` }));
  }

  public getShapeGridSize(room: RoomContent): number {
    const shape = this.getEffectiveShape(room);
    if (!shape) return 1;
    let max = 0;
    for (const t of shape.tiles) {
      if (t.x > max) max = t.x;
      if (t.y > max) max = t.y;
    }
    return max + 1;
  }

  public selectRoom(room: RoomContent): void {
    if (this.isSelected(room.id)) {
      roomPlacementExitMode();
      return;
    }

    hallwayPlacementExit();
    const shape = roomShapeGet(room.shapeId);
    if (!shape) return;

    roomPlacementEnterMode(room.id as RoomId, shape);
  }

  public toggleHallwayMode(): void {
    if (hallwayPlacementIsBuildMode()) {
      hallwayPlacementExit();
    } else {
      hallwayPlacementEnter();
    }
  }

  public async confirmHallway(): Promise<void> {
    await hallwayPlacementConfirm();
  }

  public rotate(): void {
    roomPlacementRotate();
  }

  public capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
