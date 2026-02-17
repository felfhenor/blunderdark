import { DecimalPipe } from '@angular/common';
import {
  type AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  type ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { FearIndicatorComponent } from '@components/fear-indicator/fear-indicator.component';
import {
  CAMERA_ZOOM_STEP,
  cameraInit,
  cameraIsAnimating,
  cameraPan,
  cameraReset,
  cameraTransform,
  cameraUpdateViewport,
  cameraZoomAt,
  corruptionLevel,
  featureGetForSlot,
  featureGetSlotCount,
  floorCurrent,
  gridDeselectTile,
  gridSelectedTile,
  gridSelectTile,
  hallwayPlacementDestTile,
  hallwayPlacementExit,
  hallwayPlacementHandleTileClick,
  hallwayPlacementIsBuildMode,
  hallwayPlacementPreviewTileSet,
  hallwayPlacementSourceTile,
  inhabitantAll,
  notifyError,
  productionGetRoomDefinition,
  roomPlacementClearPreviewPosition,
  roomPlacementExecute,
  roomPlacementExitMode,
  roomPlacementPreview,
  roomPlacementPreviewShape,
  roomPlacementRotate,
  roomPlacementUpdatePreviewPosition,
  roomUpgradeGetEffectiveMaxInhabitants,
  uiIsAnyModalOpen,
  verticalTransportGetGroupsOnFloor,
} from '@helpers';
import {
  transportPlacementActive,
  transportPlacementType,
  transportPlacementExit,
  transportStairExecute,
  transportElevatorExecute,
  transportPortalExecute,
  transportPortalSetSource,
  transportPortalStep,
} from '@helpers/transport-placement';
import { gridCreateEmpty } from '@helpers/grid';
import { gamestate } from '@helpers/state-game';
import { TippyDirective } from '@ngneat/helipopper';

const ROOM_COLORS: Record<string, string> = {};
const COLOR_PALETTE = [
  'oklch(0.55 0.15 260)', // blue-violet
  'oklch(0.55 0.15 30)', // warm orange
  'oklch(0.55 0.15 145)', // green
  'oklch(0.55 0.15 330)', // magenta
  'oklch(0.55 0.15 80)', // yellow-green
  'oklch(0.55 0.15 200)', // teal
  'oklch(0.55 0.15 0)', // red
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

const CAMERA_DRAG_THRESHOLD = 5;

@Component({
  selector: 'app-grid',
  imports: [DecimalPipe, FearIndicatorComponent, TippyDirective],
  templateUrl: './grid.component.html',
  styleUrl: './grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscapeKey()',
    '(document:keydown.r)': 'onRotateKey()',
    '(document:keydown.Home)': 'onResetCamera($event)',
  },
})
export class GridComponent implements AfterViewInit {
  private destroyRef = inject(DestroyRef);
  private viewport = viewChild<ElementRef<HTMLElement>>('viewport');

  // Camera state
  public cameraTransform = cameraTransform;
  public cameraIsAnimating = cameraIsAnimating;
  private dragStart: { x: number; y: number; button: number } | undefined;
  private isDragging = false;
  private wasDragging = false;
  private resizeObserver: ResizeObserver | undefined;
  public grid = computed(() => floorCurrent()?.grid ?? gridCreateEmpty());
  public gridSelectedTile = gridSelectedTile;
  public roomPlacementPreview = roomPlacementPreview;
  public corruptionLevel = corruptionLevel;

  ngAfterViewInit(): void {
    const el = this.viewport()?.nativeElement;
    if (!el) return;

    cameraInit(el.clientWidth, el.clientHeight);

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        cameraUpdateViewport(entry.contentRect.width, entry.contentRect.height);
      }
    });
    this.resizeObserver.observe(el);

    this.destroyRef.onDestroy(() => {
      this.resizeObserver?.disconnect();
    });
  }

  // --- Camera: mouse drag panning ---

  public onCameraMouseDown(event: MouseEvent): void {
    // Middle mouse (1) or left mouse (0)
    if (event.button !== 0 && event.button !== 1) return;
    // Prevent default for middle-click (auto-scroll)
    if (event.button === 1) event.preventDefault();
    this.dragStart = {
      x: event.clientX,
      y: event.clientY,
      button: event.button,
    };
    this.isDragging = false;
  }

  public onCameraMouseMove(event: MouseEvent): void {
    if (!this.dragStart) return;

    const dx = event.clientX - this.dragStart.x;
    const dy = event.clientY - this.dragStart.y;

    if (!this.isDragging) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CAMERA_DRAG_THRESHOLD) return;
      this.isDragging = true;
    }

    cameraPan(
      event.clientX - this.dragStart.x,
      event.clientY - this.dragStart.y,
    );
    this.dragStart = { ...this.dragStart, x: event.clientX, y: event.clientY };
  }

  public onCameraMouseUp(): void {
    this.wasDragging = this.isDragging;
    this.dragStart = undefined;
    this.isDragging = false;
  }

  // --- Camera: mouse wheel zoom ---

  public onWheel(event: WheelEvent): void {
    event.preventDefault();
    const el = this.viewport()?.nativeElement;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;

    const delta = event.deltaY < 0 ? CAMERA_ZOOM_STEP : -CAMERA_ZOOM_STEP;
    cameraZoomAt(delta, cursorX, cursorY);
  }

  // --- Camera: reset ---

  public onResetCamera(event?: Event): void {
    if (event) {
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }
      if (uiIsAnyModalOpen()) return;
    }
    cameraReset();
  }

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
  ):
    | { current: number; max: number; status: 'full' | 'partial' | 'empty' }
    | undefined {
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
    const bounds = new Map<
      string,
      { minX: number; maxX: number; minY: number; anchorX: number }
    >();

    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y]?.length; x++) {
        const roomId = grid[y][x].roomId;
        if (!roomId) continue;

        const entry = bounds.get(roomId);
        if (!entry) {
          bounds.set(roomId, { minX: x, maxX: x, minY: y, anchorX: x });
        } else {
          if (x < entry.minX) entry.minX = x;
          if (x > entry.maxX) entry.maxX = x;
          if (y < entry.minY) {
            entry.minY = y;
            entry.anchorX = x;
          } else if (y === entry.minY && x < entry.anchorX) {
            entry.anchorX = x;
          }
        }
      }
    }

    const anchorMap = new Map<string, string>();
    for (const [roomId, entry] of bounds) {
      anchorMap.set(roomId, `${entry.anchorX},${entry.minY}`);
    }

    return { anchorMap, tilesMap: bounds };
  });

  public isRoomAnchor(
    x: number,
    y: number,
    roomId: string | undefined,
  ): boolean {
    if (!roomId) return false;
    return this.roomLabelTileMap().anchorMap.get(roomId) === `${x},${y}`;
  }

  public getRoomLabelOffset(roomId: string | undefined): string {
    if (!roomId) return '0px';
    const entry = this.roomLabelTileMap().tilesMap.get(roomId);
    if (!entry) return '0px';
    const centerX = (entry.minX + entry.maxX) / 2;
    const offsetTiles = centerX - entry.anchorX;
    // Each tile is 64px + 1px gap
    return `${offsetTiles * 65}px`;
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

    const hallwayIds: Set<string> = new Set(
      floor.hallways.map((h) => h.id as string),
    );

    for (const conn of floor.connections) {
      // Skip hallway connections — handled by hallwayDoorwayMap
      if (hallwayIds.has(conn.roomAId) || hallwayIds.has(conn.roomBId))
        continue;

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

  /**
   * Map of "x,y" → Set of directions for hallway-to-room doorway indicators.
   * Only hallway tiles get markers, on the edge facing a connected entity.
   * Door graphics only appear when there is an actual connection.
   */
  private hallwayDoorwayMap = computed(() => {
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

    for (const hallway of floor.hallways) {
      // Build set of entity IDs actually connected to this hallway
      const connectedIds = new Set<string>();
      for (const conn of floor.connections) {
        if ((conn.roomAId as string) === (hallway.id as string))
          connectedIds.add(conn.roomBId);
        else if ((conn.roomBId as string) === (hallway.id as string))
          connectedIds.add(conn.roomAId);
      }

      for (const tile of hallway.tiles) {
        for (const { dx, dy, dir, opposite } of dirLookup) {
          const nx = tile.x + dx;
          const ny = tile.y + dy;
          const neighbor = grid[ny]?.[nx];
          if (!neighbor) continue;

          // Check if the neighbor is a room or hallway that is connected
          const neighborEntityId = neighbor.roomId ?? neighbor.hallwayId;
          if (neighborEntityId && connectedIds.has(neighborEntityId)) {
            const key = `${tile.x},${tile.y}`;
            if (!map.has(key)) map.set(key, new Set());
            map.get(key)!.add(dir);

            const neighborKey = `${nx},${ny}`;
            if (!map.has(neighborKey)) map.set(neighborKey, new Set());
            map.get(neighborKey)!.add(opposite);
          }
        }
      }
    }

    return map;
  });

  public getHallwayDoorways(x: number, y: number): Set<string> | undefined {
    return this.hallwayDoorwayMap().get(`${x},${y}`);
  }

  private roomBorderMap = computed(() => {
    const grid = this.grid();
    const map = new Map<string, { color: string; classes: string }>();

    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const roomId = grid[y][x].roomId;
        if (!roomId) continue;

        const color = getRoomBorderColor(roomId);
        const top = grid[y - 1]?.[x]?.roomId !== roomId;
        const right = grid[y]?.[x + 1]?.roomId !== roomId;
        const bottom = grid[y + 1]?.[x]?.roomId !== roomId;
        const left = grid[y]?.[x - 1]?.roomId !== roomId;

        const classes: string[] = [];
        if (top) classes.push('border-edge-top');
        if (right) classes.push('border-edge-right');
        if (bottom) classes.push('border-edge-bottom');
        if (left) classes.push('border-edge-left');

        if (classes.length > 0) {
          map.set(`${x},${y}`, { color, classes: classes.join(' ') });
        }
      }
    }
    return map;
  });

  public getRoomBorderColor(x: number, y: number): string | undefined {
    return this.roomBorderMap().get(`${x},${y}`)?.color;
  }

  public getRoomBorderClasses(x: number, y: number): string {
    return this.roomBorderMap().get(`${x},${y}`)?.classes ?? '';
  }

  private selectedRoomId = computed(() => {
    const sel = this.gridSelectedTile();
    if (!sel) return undefined;
    return this.grid()[sel.y]?.[sel.x]?.roomId;
  });

  private selectedHallwayId = computed(() => {
    const sel = this.gridSelectedTile();
    if (!sel) return undefined;
    return this.grid()[sel.y]?.[sel.x]?.hallwayId;
  });

  public isSelected(x: number, y: number): boolean {
    const sel = this.gridSelectedTile();
    if (!sel) return false;

    const selectedRoom = this.selectedRoomId();
    if (selectedRoom) {
      return this.grid()[y]?.[x]?.roomId === selectedRoom;
    }

    const selectedHallway = this.selectedHallwayId();
    if (selectedHallway) {
      return this.grid()[y]?.[x]?.hallwayId === selectedHallway;
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
    if (this.wasDragging) {
      this.wasDragging = false;
      return;
    }
    if (transportPlacementActive()) {
      const type = transportPlacementType();
      if (type === 'portal') {
        const step = transportPortalStep();
        if (step === 'selectSource') {
          const floor = floorCurrent();
          if (floor) {
            const tile = floor.grid[y]?.[x];
            if (tile?.occupied) {
              notifyError('Tile is occupied');
            } else {
              transportPortalSetSource(x, y, floor.depth);
            }
          }
        } else {
          const result = await transportPortalExecute(x, y);
          if (!result.success && result.error) {
            notifyError(result.error);
          }
        }
      } else if (type === 'elevator') {
        const result = await transportElevatorExecute(x, y);
        if (!result.success && result.error) {
          notifyError(result.error);
        }
      } else if (type === 'stair') {
        const result = await transportStairExecute(x, y);
        if (!result.success && result.error) {
          notifyError(result.error);
        }
      }
      return;
    }
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
  public isTransportMode = transportPlacementActive;
  public transportType = transportPlacementType;
  public portalStep = transportPortalStep;
  private hallwayPathSet = hallwayPlacementPreviewTileSet;

  public transportTileMap = computed(() => {
    const floor = floorCurrent();
    if (!floor) return new Map<string, { type: string; connectsToFloors: number[] }>();

    const state = gamestate();
    const groups = verticalTransportGetGroupsOnFloor(state.world.floors, floor.depth);
    const map = new Map<string, { type: string; connectsToFloors: number[] }>();

    for (const { room, groupFloors } of groups) {
      const otherFloors = groupFloors.filter((d) => d !== floor.depth);
      map.set(`${room.anchorX},${room.anchorY}`, {
        type: room.transportType!,
        connectsToFloors: otherFloors,
      });
    }

    return map;
  });

  public getTransportInfo(
    x: number,
    y: number,
  ): { type: string; connectsToFloors: number[] } | undefined {
    return this.transportTileMap().get(`${x},${y}`);
  }

  public featureIndicatorMap = computed(() => {
    const floor = floorCurrent();
    if (!floor)
      return new Map<
        string,
        { occupied: number; total: number; names: string[] }
      >();

    const map = new Map<
      string,
      { occupied: number; total: number; names: string[] }
    >();
    for (const room of floor.rooms) {
      const total = featureGetSlotCount(room);
      let occupied = 0;
      const names: string[] = [];
      for (let i = 0; i < total; i++) {
        const feature = featureGetForSlot(room, i);
        if (feature) {
          occupied++;
          names.push(feature.name);
        }
      }
      if (occupied > 0) {
        map.set(room.id, { occupied, total, names });
      }
    }
    return map;
  });

  public getFeatureInfo(
    roomId: string | undefined,
  ): { occupied: number; total: number; names: string[] } | undefined {
    if (!roomId) return undefined;
    return this.featureIndicatorMap().get(roomId);
  }

  public isHallwayPathTile(x: number, y: number): boolean {
    return this.hallwayPathSet().has(`${x},${y}`);
  }

  public isHallwayStartTile(x: number, y: number): boolean {
    const source = hallwayPlacementSourceTile();
    return source !== undefined && source.x === x && source.y === y;
  }

  public isHallwayEndTile(x: number, y: number): boolean {
    const dest = hallwayPlacementDestTile();
    return dest !== undefined && dest.x === x && dest.y === y;
  }

  public onRightClick(event: MouseEvent): void {
    if (transportPlacementActive()) {
      event.preventDefault();
      transportPlacementExit();
    } else if (hallwayPlacementIsBuildMode()) {
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
    if (uiIsAnyModalOpen()) return;
    if (transportPlacementActive()) {
      transportPlacementExit();
    } else if (hallwayPlacementIsBuildMode()) {
      hallwayPlacementExit();
    } else if (roomPlacementPreviewShape()) {
      roomPlacementExitMode();
    } else {
      gridDeselectTile();
    }
  }
}
