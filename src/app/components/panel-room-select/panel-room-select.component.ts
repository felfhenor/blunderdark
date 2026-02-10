import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  canAfford,
  enterHallwayBuildMode,
  enterPlacementMode,
  exitHallwayBuildMode,
  exitPlacementMode,
  getEntriesByType,
  getRoomShape,
  hallwayPreviewCost,
  hallwayPreviewPath,
  hallwayStatusMessage,
  isHallwayBuildMode,
  selectedRoomTypeId,
} from '@helpers';
import type { IsContentItem, RoomDefinition, RoomShape } from '@interfaces';

@Component({
  selector: 'app-panel-room-select',
  templateUrl: './panel-room-select.component.html',
  styleUrl: './panel-room-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelRoomSelectComponent {
  public rooms = computed(() =>
    getEntriesByType<RoomDefinition & IsContentItem>('room'),
  );

  public selectedId = selectedRoomTypeId;
  public isHallwayMode = isHallwayBuildMode;
  public hallwayStatus = hallwayStatusMessage;
  public hallwayCost = hallwayPreviewCost;
  public hallwayPath = hallwayPreviewPath;

  public isSelected(roomId: string): boolean {
    return this.selectedId() === roomId;
  }

  public isAffordable(room: RoomDefinition): boolean {
    return canAfford(room.cost);
  }

  public getRoomShapeForPreview(
    room: RoomDefinition,
  ): (RoomShape & IsContentItem) | undefined {
    return getRoomShape(room.shapeId);
  }

  public getCostEntries(
    room: RoomDefinition,
  ): { type: string; amount: number }[] {
    return Object.entries(room.cost)
      .filter(([, amount]) => amount && amount > 0)
      .map(([type, amount]) => ({ type, amount: amount as number }));
  }

  public getShapeTiles(
    room: RoomDefinition,
  ): { x: number; y: number; key: string }[] {
    const shape = getRoomShape(room.shapeId);
    if (!shape) return [];
    return shape.tiles.map((t) => ({ x: t.x, y: t.y, key: `${t.x},${t.y}` }));
  }

  public getShapeGridSize(room: RoomDefinition): number {
    const shape = getRoomShape(room.shapeId);
    if (!shape) return 1;
    let max = 0;
    for (const t of shape.tiles) {
      if (t.x > max) max = t.x;
      if (t.y > max) max = t.y;
    }
    return max + 1;
  }

  public selectRoom(room: RoomDefinition): void {
    if (this.isSelected(room.id)) {
      exitPlacementMode();
      return;
    }

    exitHallwayBuildMode();
    const shape = getRoomShape(room.shapeId);
    if (!shape) return;

    enterPlacementMode(room.id, shape);
  }

  public toggleHallwayMode(): void {
    if (isHallwayBuildMode()) {
      exitHallwayBuildMode();
    } else {
      enterHallwayBuildMode();
    }
  }

  public capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
