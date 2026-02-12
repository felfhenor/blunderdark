import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  clearPreviewPosition,
  currentFloor,
  deselectTile,
  executeRoomPlacement,
  exitHallwayBuildMode,
  exitPlacementMode,
  getEffectiveMaxInhabitants,
  getRoomDefinition,
  hallwayPreviewTileSet,
  hallwaySourceRoomId,
  handleHallwayTileClick,
  isHallwayBuildMode,
  notifyError,
  placementPreview,
  placementPreviewShape,
  rotatePlacement,
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
    '(document:keydown.r)': 'onRotateKey()',
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

  public roomAssignmentMap = computed(() => {
    const floor = currentFloor();
    if (!floor)
      return new Map<
        string,
        { current: number; max: number; status: 'full' | 'partial' | 'empty' }
      >();

    const map = new Map<
      string,
      { current: number; max: number; status: 'full' | 'partial' | 'empty' }
    >();

    for (const room of floor.rooms) {
      const def = getRoomDefinition(room.roomTypeId);
      if (!def) continue;

      const maxCapacity = getEffectiveMaxInhabitants(room, def);
      if (maxCapacity === 0) continue;

      const currentCount = floor.inhabitants.filter(
        (i) => i.assignedRoomId === room.id,
      ).length;

      let status: 'full' | 'partial' | 'empty';
      if (currentCount === 0) {
        status = 'empty';
      } else if (maxCapacity > 0 && currentCount >= maxCapacity) {
        status = 'full';
      } else {
        status = 'partial';
      }

      map.set(room.id, { current: currentCount, max: maxCapacity, status });
    }
    return map;
  });

  public getAssignmentInfo(
    roomId: string | null,
  ): { current: number; max: number; status: 'full' | 'partial' | 'empty' } | null {
    if (!roomId) return null;
    return this.roomAssignmentMap().get(roomId) ?? null;
  }

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

  /**
   * Map of "x,y" → Set of directions ('top'|'right'|'bottom'|'left') for doorway indicators.
   * Both sides of a shared edge get a doorway marker.
   */
  private doorwayMap = computed(() => {
    const floor = currentFloor();
    if (!floor) return new Map<string, Set<string>>();

    const map = new Map<string, Set<string>>();
    const grid = floor.grid;

    const dirLookup: Array<{
      dx: number;
      dy: number;
      dir: string;
      opposite: string;
    }> = [
      { dx: 0, dy: -1, dir: 'top', opposite: 'bottom' },
      { dx: 1, dy: 0, dir: 'right', opposite: 'left' },
      { dx: 0, dy: 1, dir: 'bottom', opposite: 'top' },
      { dx: -1, dy: 0, dir: 'left', opposite: 'right' },
    ];

    for (const conn of floor.connections) {
      for (const tile of conn.edgeTiles) {
        for (const { dx, dy, dir, opposite } of dirLookup) {
          const nx = tile.x + dx;
          const ny = tile.y + dy;
          const neighborTile = grid[ny]?.[nx];
          if (neighborTile?.roomId === conn.roomBId) {
            const keyA = `${tile.x},${tile.y}`;
            if (!map.has(keyA)) map.set(keyA, new Set());
            map.get(keyA)!.add(dir);

            const keyB = `${nx},${ny}`;
            if (!map.has(keyB)) map.set(keyB, new Set());
            map.get(keyB)!.add(opposite);
          }
        }
      }
    }

    return map;
  });

  public getDoorways(x: number, y: number): Set<string> | undefined {
    return this.doorwayMap().get(`${x},${y}`);
  }

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
    if (isHallwayBuildMode()) {
      handleHallwayTileClick(x, y);
      return;
    }
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

  public isHallwayMode = isHallwayBuildMode;
  public hallwaySourceId = hallwaySourceRoomId;
  private hallwayPathSet = hallwayPreviewTileSet;

  public isHallwayPathTile(x: number, y: number): boolean {
    return this.hallwayPathSet().has(`${x},${y}`);
  }

  public isHallwaySourceRoom(roomId: string | null): boolean {
    if (!roomId) return false;
    return hallwaySourceRoomId() === roomId;
  }

  public onRightClick(event: MouseEvent): void {
    if (isHallwayBuildMode()) {
      event.preventDefault();
      exitHallwayBuildMode();
    } else if (placementPreviewShape()) {
      event.preventDefault();
      rotatePlacement();
    }
  }

  public onRotateKey(): void {
    if (placementPreviewShape()) {
      rotatePlacement();
    }
  }

  public onEscapeKey(): void {
    if (isHallwayBuildMode()) {
      exitHallwayBuildMode();
    } else if (placementPreviewShape()) {
      exitPlacementMode();
    } else {
      deselectTile();
    }
  }
}
