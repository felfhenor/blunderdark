import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { FearIndicatorComponent } from '@components/fear-indicator/fear-indicator.component';
import {
  roomPlacementClearPreviewPosition,
  floorCurrent,
  gridDeselectTile,
  roomPlacementExecute,
  hallwayPlacementExit,
  roomPlacementExitMode,
  roomUpgradeGetEffectiveMaxInhabitants,
  productionGetRoomDefinition,
  hallwayPlacementPreviewTileSet,
  hallwayPlacementSourceRoomId,
  hallwayPlacementHandleTileClick,
  hallwayPlacementIsBuildMode,
  inhabitantAll,
  notifyError,
  roomPlacementPreview,
  roomPlacementPreviewShape,
  roomPlacementRotate,
  gridSelectedTile,
  gridSelectTile,
  roomPlacementUpdatePreviewPosition,
  corruptionLevel,
} from '@helpers';
import { gridCreateEmpty } from '@helpers/grid';

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

const BORDER_HUES = [40, 180, 310, 90, 220, 350, 130, 270, 10, 160];
let borderColorIndex = 0;
const ROOM_BORDER_COLORS: Record<string, string> = {};

function getRoomBorderColor(roomId: string): string {
  if (!ROOM_BORDER_COLORS[roomId]) {
    const hue = BORDER_HUES[borderColorIndex % BORDER_HUES.length];
    ROOM_BORDER_COLORS[roomId] = `oklch(0.8 0.15 ${hue})`;
    borderColorIndex++;
  }
  return ROOM_BORDER_COLORS[roomId];
}

@Component({
  selector: 'app-grid',
  imports: [FearIndicatorComponent],
  templateUrl: './grid.component.html',
  styleUrl: './grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscapeKey()',
    '(document:keydown.r)': 'onRotateKey()',
  },
})
export class GridComponent {
  public grid = computed(() => floorCurrent()?.grid ?? gridCreateEmpty());
  public gridSelectedTile = gridSelectedTile;
  public roomPlacementPreview = roomPlacementPreview;
  public corruptionLevel = corruptionLevel;

  private roomInfoMap = computed(() => {
    const floor = floorCurrent();
    if (!floor) return new Map<string, { color: string; name: string }>();

    const map = new Map<string, { color: string; name: string }>();
    for (const room of floor.rooms) {
      const def = productionGetRoomDefinition(room.roomTypeId);
      map.set(room.id, {
        color: getRoomColor(room.roomTypeId),
        name: def?.name ?? 'Room',
      });
    }
    return map;
  });

  private inhabitants = inhabitantAll();

  public roomAssignmentMap = computed(() => {
    const floor = floorCurrent();
    if (!floor)
      return new Map<
        string,
        { current: number; max: number; status: 'full' | 'partial' | 'empty' }
      >();

    const inhabitants = this.inhabitants();
    const map = new Map<
      string,
      { current: number; max: number; status: 'full' | 'partial' | 'empty' }
    >();

    for (const room of floor.rooms) {
      const def = productionGetRoomDefinition(room.roomTypeId);
      if (!def) continue;

      const maxCapacity = roomUpgradeGetEffectiveMaxInhabitants(room, def);
      if (maxCapacity === 0) continue;

      const currentCount = inhabitants.filter(
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
    roomId: string | undefined,
  ): { current: number; max: number; status: 'full' | 'partial' | 'empty' } | undefined {
    if (!roomId) return undefined;
    return this.roomAssignmentMap().get(roomId) ?? undefined;
  }

  public getRoomColor(roomId: string | undefined): string | undefined {
    if (!roomId) return undefined;
    return this.roomInfoMap().get(roomId)?.color ?? undefined;
  }

  public getRoomName(roomId: string | undefined): string | undefined {
    if (!roomId) return undefined;
    return this.roomInfoMap().get(roomId)?.name ?? undefined;
  }

  private roomLabelTileMap = computed(() => {
    const grid = this.grid();
    const map = new Map<string, string>();

    for (let x = 0; x < grid[0]?.length; x++) {
      for (let y = 0; y < grid.length; y++) {
        const roomId = grid[y][x].roomId;
        if (roomId && !map.has(roomId)) {
          map.set(roomId, `${x},${y}`);
        }
      }
    }
    return map;
  });

  public isRoomAnchor(x: number, y: number, roomId: string | undefined): boolean {
    if (!roomId) return false;
    return this.roomLabelTileMap().get(roomId) === `${x},${y}`;
  }


  private previewTileSet = computed(() => {
    const preview = this.roomPlacementPreview();
    if (!preview) return undefined;
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
    const floor = floorCurrent();
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

  private roomBorderMap = computed(() => {
    const grid = this.grid();
    const map = new Map<string, string>();

    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const roomId = grid[y][x].roomId;
        if (!roomId) continue;

        const color = getRoomBorderColor(roomId);
        const top = grid[y - 1]?.[x]?.roomId !== roomId;
        const right = grid[y]?.[x + 1]?.roomId !== roomId;
        const bottom = grid[y + 1]?.[x]?.roomId !== roomId;
        const left = grid[y]?.[x - 1]?.roomId !== roomId;

        const parts: string[] = [];
        if (top) parts.push(`border-top:2px solid ${color}`);
        if (right) parts.push(`border-right:2px solid ${color}`);
        if (bottom) parts.push(`border-bottom:2px solid ${color}`);
        if (left) parts.push(`border-left:2px solid ${color}`);

        if (parts.length > 0) {
          map.set(`${x},${y}`, parts.join(';'));
        }
      }
    }
    return map;
  });

  public getRoomBorderStyle(x: number, y: number): string | undefined {
    return this.roomBorderMap().get(`${x},${y}`);
  }

  private selectedRoomId = computed(() => {
    const sel = this.gridSelectedTile();
    if (!sel) return undefined;
    return this.grid()[sel.y]?.[sel.x]?.roomId;
  });

  public isSelected(x: number, y: number): boolean {
    const sel = this.gridSelectedTile();
    if (!sel) return false;

    const selectedRoom = this.selectedRoomId();
    if (selectedRoom) {
      return this.grid()[y]?.[x]?.roomId === selectedRoom;
    }

    return sel.x === x && sel.y === y;
  }

  public isPreviewValid(x: number, y: number): boolean {
    const data = this.previewTileSet();
    return data !== undefined && data.valid && data.set.has(`${x},${y}`);
  }

  public isPreviewInvalid(x: number, y: number): boolean {
    const data = this.previewTileSet();
    return data !== undefined && !data.valid && data.set.has(`${x},${y}`);
  }

  public async onTileClick(x: number, y: number): Promise<void> {
    if (hallwayPlacementIsBuildMode()) {
      hallwayPlacementHandleTileClick(x, y);
      return;
    }
    if (roomPlacementPreviewShape()) {
      const result = await roomPlacementExecute(x, y);
      if (!result.success && result.error) {
        notifyError(result.error);
      }
      return;
    }
    const tile = this.grid()[y]?.[x];
    if (!tile?.occupied) {
      gridDeselectTile();
      return;
    }
    gridSelectTile(x, y);
  }

  public onTileHover(x: number, y: number): void {
    if (roomPlacementPreviewShape()) {
      roomPlacementUpdatePreviewPosition(x, y);
    }
  }

  public onGridLeave(): void {
    if (roomPlacementPreviewShape()) {
      roomPlacementClearPreviewPosition();
    }
  }

  public isHallwayMode = hallwayPlacementIsBuildMode;
  public hallwaySourceId = hallwayPlacementSourceRoomId;
  private hallwayPathSet = hallwayPlacementPreviewTileSet;

  public isHallwayPathTile(x: number, y: number): boolean {
    return this.hallwayPathSet().has(`${x},${y}`);
  }

  public isHallwaySourceRoom(roomId: string | undefined): boolean {
    if (!roomId) return false;
    return hallwayPlacementSourceRoomId() === roomId;
  }

  public onRightClick(event: MouseEvent): void {
    if (hallwayPlacementIsBuildMode()) {
      event.preventDefault();
      hallwayPlacementExit();
    } else if (roomPlacementPreviewShape()) {
      event.preventDefault();
      roomPlacementExitMode();
    }
  }

  public onRotateKey(): void {
    if (roomPlacementPreviewShape()) {
      roomPlacementRotate();
    }
  }

  public onEscapeKey(): void {
    if (hallwayPlacementIsBuildMode()) {
      hallwayPlacementExit();
    } else if (roomPlacementPreviewShape()) {
      roomPlacementExitMode();
    } else {
      gridDeselectTile();
    }
  }
}
