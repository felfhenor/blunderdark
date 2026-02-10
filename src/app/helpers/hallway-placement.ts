import { computed, signal } from '@angular/core';
import { currentFloor } from '@helpers/floor';
import { exitPlacementMode } from '@helpers/room-placement';
import type { GridState, TileOffset } from '@interfaces';
import { GRID_SIZE } from '@interfaces/grid';

export type HallwayBuildStep =
  | 'inactive'
  | 'selectSource'
  | 'selectDestination'
  | 'preview';

export const hallwayBuildStep = signal<HallwayBuildStep>('inactive');

export const isHallwayBuildMode = computed(
  () => hallwayBuildStep() !== 'inactive',
);

export const hallwaySourceRoomId = signal<string | null>(null);
export const hallwayDestRoomId = signal<string | null>(null);

export const HALLWAY_COST_PER_TILE = 5;

export function enterHallwayBuildMode(): void {
  exitPlacementMode();
  hallwayBuildStep.set('selectSource');
  hallwaySourceRoomId.set(null);
  hallwayDestRoomId.set(null);
}

export function exitHallwayBuildMode(): void {
  hallwayBuildStep.set('inactive');
  hallwaySourceRoomId.set(null);
  hallwayDestRoomId.set(null);
}

/**
 * Handle a tile click during hallway build mode.
 * Only room tiles are valid targets for source/destination selection.
 */
export function handleHallwayTileClick(x: number, y: number): void {
  const floor = currentFloor();
  if (!floor) return;

  const tile = floor.grid[y]?.[x];
  if (!tile?.roomId) return;

  const step = hallwayBuildStep();

  if (step === 'selectSource') {
    hallwaySourceRoomId.set(tile.roomId);
    hallwayBuildStep.set('selectDestination');
  } else if (step === 'selectDestination' || step === 'preview') {
    if (tile.roomId === hallwaySourceRoomId()) return;
    hallwayDestRoomId.set(tile.roomId);
    hallwayBuildStep.set('preview');
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
 * Returns the shortest path of empty tiles, or null if unreachable.
 */
export function findHallwayPath(
  grid: GridState,
  sourceRoomId: string,
  destRoomId: string,
): TileOffset[] | null {
  if (sourceRoomId === destRoomId) return null;

  const starts = findRoomAdjacentEmptyTiles(grid, sourceRoomId);
  const endSet = new Set(
    findRoomAdjacentEmptyTiles(grid, destRoomId).map(
      (t) => `${t.x},${t.y}`,
    ),
  );

  if (starts.length === 0 || endSet.size === 0) return null;

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

  return null;
}

/**
 * Computed path from source to destination room.
 * Only computed when both rooms are selected (preview step).
 */
export const hallwayPreviewPath = computed(() => {
  const step = hallwayBuildStep();
  if (step !== 'preview') return null;

  const sourceId = hallwaySourceRoomId();
  const destId = hallwayDestRoomId();
  if (!sourceId || !destId) return null;

  const floor = currentFloor();
  if (!floor) return null;

  return findHallwayPath(floor.grid, sourceId, destId);
});

/**
 * Set of "x,y" keys for O(1) hallway path tile lookup in the grid.
 */
export const hallwayPreviewTileSet = computed(() => {
  const path = hallwayPreviewPath();
  if (!path) return new Set<string>();
  return new Set(path.map((t) => `${t.x},${t.y}`));
});

/**
 * Total crystal cost for the current hallway path preview.
 */
export const hallwayPreviewCost = computed(() => {
  const path = hallwayPreviewPath();
  if (!path) return 0;
  return path.length * HALLWAY_COST_PER_TILE;
});

/**
 * Status message for the hallway build mode UI.
 */
export const hallwayStatusMessage = computed(() => {
  const step = hallwayBuildStep();
  if (step === 'selectSource') return 'Select source room';
  if (step === 'selectDestination') return 'Now select the destination room';
  if (step === 'preview') {
    const path = hallwayPreviewPath();
    if (!path) return 'No valid path found';
    return `${path.length} tiles — ${path.length * HALLWAY_COST_PER_TILE} Crystals`;
  }
  return '';
});
