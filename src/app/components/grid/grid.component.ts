import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  clearPreviewPosition,
  currentFloor,
  deselectTile,
  executeRoomPlacement,
  exitPlacementMode,
  getRoomDefinition,
  notifyError,
  placementPreview,
  placementPreviewShape,
  selectedTile,
  selectTile,
  updatePreviewPosition,
} from '@helpers';
import { createEmptyGrid } from '@helpers/grid';

const ROOM_COLORS: Record<string, string> = {};
const COLOR_PALETTE = [
  'oklch(0.55 0.15 260)', // blue-violet
  'oklch(0.55 0.15 30)',  // warm orange
  'oklch(0.55 0.15 145)', // green
  'oklch(0.55 0.15 330)', // magenta
  'oklch(0.55 0.15 80)',  // yellow-green
  'oklch(0.55 0.15 200)', // teal
  'oklch(0.55 0.15 0)',   // red
];
let colorIndex = 0;

function getRoomColor(roomTypeId: string): string {
  if (!ROOM_COLORS[roomTypeId]) {
    ROOM_COLORS[roomTypeId] = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
    colorIndex++;
  }
  return ROOM_COLORS[roomTypeId];
}

@Component({
  selector: 'app-grid',
  templateUrl: './grid.component.html',
  styleUrl: './grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscapeKey()',
  },
})
export class GridComponent {
  public grid = computed(() => currentFloor()?.grid ?? createEmptyGrid());
  public selectedTile = selectedTile;
  public placementPreview = placementPreview;

  private roomInfoMap = computed(() => {
    const floor = currentFloor();
    if (!floor) return new Map<string, { color: string; name: string }>();

    const map = new Map<string, { color: string; name: string }>();
    for (const room of floor.rooms) {
      const def = getRoomDefinition(room.roomTypeId);
      map.set(room.id, {
        color: getRoomColor(room.roomTypeId),
        name: def?.name ?? 'Room',
      });
    }
    return map;
  });

  public getRoomColor(roomId: string | null): string | null {
    if (!roomId) return null;
    return this.roomInfoMap().get(roomId)?.color ?? null;
  }

  public getRoomName(roomId: string | null): string | null {
    if (!roomId) return null;
    return this.roomInfoMap().get(roomId)?.name ?? null;
  }

  public isRoomAnchor(x: number, y: number, roomId: string | null): boolean {
    if (!roomId) return false;
    const floor = currentFloor();
    if (!floor) return false;
    const room = floor.rooms.find((r) => r.id === roomId);
    return room?.anchorX === x && room?.anchorY === y;
  }

  private previewTileSet = computed(() => {
    const preview = this.placementPreview();
    if (!preview) return null;
    const set = new Set<string>();
    for (const t of preview.tiles) {
      if (t.inBounds) {
        set.add(`${t.x},${t.y}`);
      }
    }
    return { set, valid: preview.valid };
  });

  public isSelected(x: number, y: number): boolean {
    const sel = this.selectedTile();
    return sel?.x === x && sel?.y === y;
  }

  public isPreviewValid(x: number, y: number): boolean {
    const data = this.previewTileSet();
    return data !== null && data.valid && data.set.has(`${x},${y}`);
  }

  public isPreviewInvalid(x: number, y: number): boolean {
    const data = this.previewTileSet();
    return data !== null && !data.valid && data.set.has(`${x},${y}`);
  }

  public async onTileClick(x: number, y: number): Promise<void> {
    if (placementPreviewShape()) {
      const result = await executeRoomPlacement(x, y);
      if (!result.success && result.error) {
        notifyError(result.error);
      }
      return;
    }
    selectTile(x, y);
  }

  public onTileHover(x: number, y: number): void {
    if (placementPreviewShape()) {
      updatePreviewPosition(x, y);
    }
  }

  public onGridLeave(): void {
    if (placementPreviewShape()) {
      clearPreviewPosition();
    }
  }

  public onRightClick(event: MouseEvent): void {
    if (placementPreviewShape()) {
      event.preventDefault();
      exitPlacementMode();
    }
  }

  public onEscapeKey(): void {
    if (placementPreviewShape()) {
      exitPlacementMode();
    } else {
      deselectTile();
    }
  }
}
