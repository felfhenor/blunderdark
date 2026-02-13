import { computed, signal } from '@angular/core';
import { floorCurrent } from '@helpers/floor';
import { hallwayAdd, hallwayAddToGrid } from '@helpers/hallways';
import { resourceCanAfford, resourcePayCost } from '@helpers/resources';
import { rngUuid } from '@helpers/rng';
import { roomPlacementExitMode } from '@helpers/room-placement';
import { updateGamestate } from '@helpers/state-game';
import type { GridState, Hallway, TileOffset } from '@interfaces';
import { GRID_SIZE } from '@interfaces/grid';

export type HallwayBuildStep =
  | 'inactive'
  | 'selectSource'
  | 'selectDestination'
  | 'preview';

export const hallwayPlacementBuildStep = signal<HallwayBuildStep>('inactive');

export const hallwayPlacementIsBuildMode = computed(
  () => hallwayPlacementBuildStep() !== 'inactive',
);

export const hallwayPlacementSourceRoomId = signal<string | undefined>(undefined);
export const hallwayPlacementDestRoomId = signal<string | undefined>(undefined);

export const HALLWAY_PLACEMENT_COST_PER_TILE = 5;

export function hallwayPlacementEnter(): void {
  roomPlacementExitMode();
  hallwayPlacementBuildStep.set('selectSource');
  hallwayPlacementSourceRoomId.set(undefined);
  hallwayPlacementDestRoomId.set(undefined);
}

export function hallwayPlacementExit(): void {
  hallwayPlacementBuildStep.set('inactive');
  hallwayPlacementSourceRoomId.set(undefined);
  hallwayPlacementDestRoomId.set(undefined);
}

/**
 * Handle a tile click during hallway build mode.
 * Only room tiles are valid targets for source/destination selection.
 */
export function hallwayPlacementHandleTileClick(x: number, y: number): void {
  const floor = floorCurrent();
  if (!floor) return;

  const tile = floor.grid[y]?.[x];
  if (!tile?.roomId) return;

  const step = hallwayPlacementBuildStep();

  if (step === 'selectSource') {
    hallwayPlacementSourceRoomId.set(tile.roomId);
    hallwayPlacementBuildStep.set('selectDestination');
  } else if (step === 'selectDestination' || step === 'preview') {
    if (tile.roomId === hallwayPlacementSourceRoomId()) return;
    hallwayPlacementDestRoomId.set(tile.roomId);
    hallwayPlacementBuildStep.set('preview');
  }
}

/**
 * Find empty tiles adjacent to a room's occupied tiles.
 */
function findRoomAdjacentEmptyTiles(
  grid: GridState,
  roomId: string,
): TileOffset[] {
  const result: TileOffset[] = [];
  const seen = new Set<string>();
  const dirs = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (grid[y][x].roomId !== roomId) continue;

      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;

        const key = `${nx},${ny}`;
        if (seen.has(key)) continue;

        if (!grid[ny][nx].occupied) {
          seen.add(key);
          result.push({ x: nx, y: ny });
        }
      }
    }
  }

  return result;
}

/**
 * BFS pathfinding through empty tiles between two rooms.
 * Returns the shortest path of empty tiles, or undefined if unreachable.
 */
export function hallwayPlacementFindPath(
  grid: GridState,
  sourceRoomId: string,
  destRoomId: string,
): TileOffset[] | undefined {
  if (sourceRoomId === destRoomId) return undefined;

  const starts = findRoomAdjacentEmptyTiles(grid, sourceRoomId);
  const endSet = new Set(
    findRoomAdjacentEmptyTiles(grid, destRoomId).map(
      (t) => `${t.x},${t.y}`,
    ),
  );

  if (starts.length === 0 || endSet.size === 0) return undefined;

  const visited = new Set<string>();
  const queue: Array<{ x: number; y: number; path: TileOffset[] }> = [];

  for (const s of starts) {
    const key = `${s.x},${s.y}`;
    if (endSet.has(key)) return [s];
    visited.add(key);
    queue.push({ x: s.x, y: s.y, path: [s] });
  }

  const dirs = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const [dx, dy] of dirs) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const nkey = `${nx},${ny}`;

      if (visited.has(nkey)) continue;
      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
      if (grid[ny][nx].occupied) continue;

      visited.add(nkey);
      const newPath = [...current.path, { x: nx, y: ny }];

      if (endSet.has(nkey)) return newPath;

      queue.push({ x: nx, y: ny, path: newPath });
    }
  }

  return undefined;
}

/**
 * Computed path from source to destination room.
 * Only computed when both rooms are selected (preview step).
 */
export const hallwayPlacementPreviewPath = computed(() => {
  const step = hallwayPlacementBuildStep();
  if (step !== 'preview') return undefined;

  const sourceId = hallwayPlacementSourceRoomId();
  const destId = hallwayPlacementDestRoomId();
  if (!sourceId || !destId) return undefined;

  const floor = floorCurrent();
  if (!floor) return undefined;

  return hallwayPlacementFindPath(floor.grid, sourceId, destId);
});

/**
 * Set of "x,y" keys for O(1) hallway path tile lookup in the grid.
 */
export const hallwayPlacementPreviewTileSet = computed(() => {
  const path = hallwayPlacementPreviewPath();
  if (!path) return new Set<string>();
  return new Set(path.map((t) => `${t.x},${t.y}`));
});

/**
 * Total crystal cost for the current hallway path preview.
 */
export const hallwayPlacementPreviewCost = computed(() => {
  const path = hallwayPlacementPreviewPath();
  if (!path) return 0;
  return path.length * HALLWAY_PLACEMENT_COST_PER_TILE;
});

/**
 * Whether the player can afford the current hallway preview cost.
 */
export const hallwayPlacementCanAfford = computed(() => {
  const cost = hallwayPlacementPreviewCost();
  if (cost <= 0) return true;
  return resourceCanAfford({ crystals: cost });
});

/**
 * Status message for the hallway build mode UI.
 */
export const hallwayPlacementStatusMessage = computed(() => {
  const step = hallwayPlacementBuildStep();
  if (step === 'selectSource') return 'Select source room';
  if (step === 'selectDestination') return 'Now select the destination room';
  if (step === 'preview') {
    const path = hallwayPlacementPreviewPath();
    if (!path) return 'No valid path found';
    return `${path.length} tiles — ${path.length * HALLWAY_PLACEMENT_COST_PER_TILE} Crystals`;
  }
  return '';
});

/**
 * Confirm the hallway build: deduct crystals, place tiles, add hallway to floor.
 * Returns true on success, false if the build could not be completed.
 */
export async function hallwayPlacementConfirm(): Promise<boolean> {
  const path = hallwayPlacementPreviewPath();
  if (!path || path.length === 0) return false;

  const sourceId = hallwayPlacementSourceRoomId();
  const destId = hallwayPlacementDestRoomId();
  if (!sourceId || !destId) return false;

  const cost = hallwayPlacementPreviewCost();
  const paid = await resourcePayCost({ crystals: cost });
  if (!paid) return false;

  const hallway: Hallway = {
    id: rngUuid(),
    startRoomId: sourceId,
    endRoomId: destId,
    tiles: [...path],
    upgrades: [],
  };

  await updateGamestate((state) => {
    const floorIndex = state.world.currentFloorIndex;
    const floor = state.world.floors[floorIndex];
    if (!floor) return state;

    const updatedGrid = hallwayAddToGrid(floor.grid, hallway);
    const updatedHallways = hallwayAdd(floor.hallways, hallway);

    const updatedFloors = [...state.world.floors];
    updatedFloors[floorIndex] = {
      ...floor,
      grid: updatedGrid,
      hallways: updatedHallways,
    };

    return {
      ...state,
      world: {
        ...state.world,
        floors: updatedFloors,
      },
    };
  });

  hallwayPlacementExit();
  return true;
}
