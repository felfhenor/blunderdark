import { computed, signal } from '@angular/core';
import { connectionAddToFloor, connectionValidate } from '@helpers/connections';
import { floorCurrent } from '@helpers/floor';
import {
  hallwayAdd,
  hallwayAddToGrid,
  hallwayFindAdjacentHallways,
  hallwayMergeOnFloor,
} from '@helpers/hallways';
import { resourceCanAfford, resourcePayCost } from '@helpers/resources';
import { rngUuid } from '@helpers/rng';
import { generateHallwaySuffix } from '@helpers/suffix';
import { roomPlacementExitMode } from '@helpers/room-placement';
import { updateGamestate } from '@helpers/state-game';
import type {
  Floor,
  GridState,
  Hallway,
  PlacedRoomId,
  TileOffset,
} from '@interfaces';
import { GRID_SIZE } from '@interfaces/grid';
import type { HallwayBuildStep, HallwayId } from '@interfaces/hallway';

export const hallwayPlacementBuildStep = signal<HallwayBuildStep>('inactive');

export const hallwayPlacementIsBuildMode = computed(
  () => hallwayPlacementBuildStep() !== 'inactive',
);

export const hallwayPlacementSourceTile = signal<TileOffset | undefined>(
  undefined,
);
export const hallwayPlacementDestTile = signal<TileOffset | undefined>(
  undefined,
);

export const HALLWAY_PLACEMENT_COST_PER_TILE = 5;

export function hallwayPlacementEnter(): void {
  roomPlacementExitMode();
  hallwayPlacementBuildStep.set('selectSource');
  hallwayPlacementSourceTile.set(undefined);
  hallwayPlacementDestTile.set(undefined);
}

export function hallwayPlacementExit(): void {
  hallwayPlacementBuildStep.set('inactive');
  hallwayPlacementSourceTile.set(undefined);
  hallwayPlacementDestTile.set(undefined);
}

/**
 * Handle a tile click during hallway build mode.
 * Any non-occupied tile is a valid target for source/destination.
 */
export function hallwayPlacementHandleTileClick(x: number, y: number): void {
  const floor = floorCurrent();
  if (!floor) return;

  const tile = floor.grid[y]?.[x];
  if (!tile || tile.occupied) return;

  const step = hallwayPlacementBuildStep();

  if (step === 'selectSource') {
    hallwayPlacementSourceTile.set({ x, y });
    hallwayPlacementBuildStep.set('selectDestination');
  } else if (step === 'selectDestination' || step === 'preview') {
    hallwayPlacementDestTile.set({ x, y });
    hallwayPlacementBuildStep.set('preview');
  }
}

/**
 * Find empty tiles adjacent to a single specific tile.
 */
export function findTileAdjacentEmptyTiles(
  grid: GridState,
  tile: TileOffset,
): TileOffset[] {
  const result: TileOffset[] = [];
  const dirs = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];

  for (const [dx, dy] of dirs) {
    const nx = tile.x + dx;
    const ny = tile.y + dy;
    if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
    if (!grid[ny][nx].occupied) {
      result.push({ x: nx, y: ny });
    }
  }

  return result;
}

/**
 * BFS pathfinding through empty tiles between two points.
 * If a point is on an occupied tile (room), uses adjacent empty tiles as candidates.
 * If a point is on an empty tile, uses that tile directly.
 * Includes both source and dest points in the path if they are empty.
 */
export function hallwayPlacementFindPointPath(
  grid: GridState,
  source: TileOffset,
  dest: TileOffset,
): TileOffset[] | undefined {
  // Single-tile hallway: source and dest are the same empty tile
  if (source.x === dest.x && source.y === dest.y) {
    if (!grid[source.y]?.[source.x]?.occupied) return [{ x: source.x, y: source.y }];
    return undefined;
  }

  const sourceOccupied = grid[source.y]?.[source.x]?.occupied;
  const destOccupied = grid[dest.y]?.[dest.x]?.occupied;

  const starts: TileOffset[] = sourceOccupied
    ? findTileAdjacentEmptyTiles(grid, source)
    : [source];
  const endCandidates: TileOffset[] = destOccupied
    ? findTileAdjacentEmptyTiles(grid, dest)
    : [dest];
  const endSet = new Set(endCandidates.map((t) => `${t.x},${t.y}`));

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
 * Computed path from source to destination tile.
 * Only computed when both tiles are selected (preview step).
 */
export const hallwayPlacementPreviewPath = computed(() => {
  const step = hallwayPlacementBuildStep();
  if (step !== 'preview') return undefined;

  const source = hallwayPlacementSourceTile();
  const dest = hallwayPlacementDestTile();
  if (!source || !dest) return undefined;

  const floor = floorCurrent();
  if (!floor) return undefined;

  return hallwayPlacementFindPointPath(floor.grid, source, dest);
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
 * Calculate the crystal cost for a hallway path.
 * Pure function: cost = number of tiles * HALLWAY_PLACEMENT_COST_PER_TILE.
 */
export function calculateHallwayCost(path: TileOffset[]): number {
  return path.length * HALLWAY_PLACEMENT_COST_PER_TILE;
}

/**
 * Total crystal cost for the current hallway path preview.
 */
export const hallwayPlacementPreviewCost = computed(() => {
  const path = hallwayPlacementPreviewPath();
  if (!path) return 0;
  return calculateHallwayCost(path);
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
  if (step === 'selectSource') return 'Select start point';
  if (step === 'selectDestination') return 'Select end point';
  if (step === 'preview') {
    const path = hallwayPlacementPreviewPath();
    if (!path) return 'No valid path found';
    return `${path.length} tiles — ${calculateHallwayCost(path)} Crystals`;
  }
  return '';
});

/**
 * Confirm the hallway build: deduct crystals, place tiles, add hallway to floor.
 * Auto-connects to all adjacent rooms and hallways.
 * Returns true on success, false if the build could not be completed.
 */
export async function hallwayPlacementConfirm(): Promise<boolean> {
  const path = hallwayPlacementPreviewPath();
  if (!path || path.length === 0) return false;

  const cost = hallwayPlacementPreviewCost();
  const paid = await resourcePayCost({ crystals: cost });
  if (!paid) return false;

  const floor = floorCurrent();
  if (!floor) return false;

  const hallway: Hallway = {
    id: rngUuid<HallwayId>(),
    suffix: generateHallwaySuffix(floor),
    tiles: [...path],
    upgrades: [],
  };

  await updateGamestate((state) => {
    const floorIndex = state.world.currentFloorIndex;
    const floor = state.world.floors[floorIndex];
    if (!floor) return state;

    const updatedGrid = hallwayAddToGrid(floor.grid, hallway);
    const updatedHallways = hallwayAdd(floor.hallways, hallway);

    let updatedFloor: Floor = {
      ...floor,
      grid: updatedGrid,
      hallways: updatedHallways,
    };

    // Merge adjacent hallways into the new one
    const adjacentHallways = hallwayFindAdjacentHallways(
      updatedFloor,
      hallway.id,
    );
    for (const adj of adjacentHallways) {
      updatedFloor = hallwayMergeOnFloor(updatedFloor, hallway.id, adj.id);
    }

    // Auto-connect to adjacent rooms (not hallways — those were merged)
    for (const room of floor.rooms) {
      const validation = connectionValidate(
        updatedFloor,
        hallway.id as unknown as PlacedRoomId,
        room.id,
      );
      if (validation.valid && validation.edgeTiles) {
        const result = connectionAddToFloor(
          updatedFloor,
          hallway.id as unknown as PlacedRoomId,
          room.id,
          validation.edgeTiles,
        );
        if (result) {
          updatedFloor = result.floor;
        }
      }
    }

    const updatedFloors = [...state.world.floors];
    updatedFloors[floorIndex] = updatedFloor;

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
