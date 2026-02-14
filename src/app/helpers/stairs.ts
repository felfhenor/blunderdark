import { signal } from '@angular/core';
import { floorCurrent } from '@helpers/floor';
import { hallwayPlacementExit } from '@helpers/hallway-placement';
import { resourceCanAfford, resourcePayCost } from '@helpers/resources';
import { rngUuid } from '@helpers/rng';
import { roomPlacementExitMode } from '@helpers/room-placement';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type { Floor, StairDirection, StairInstance } from '@interfaces';

export const STAIR_PLACEMENT_COST = 20;
export const STAIR_REMOVAL_REFUND = 10;

// --- Placement mode state ---

export const stairPlacementActive = signal(false);
export const stairPlacementDirection = signal<StairDirection>('down');

export function stairPlacementEnter(direction: StairDirection = 'down'): void {
  roomPlacementExitMode();
  hallwayPlacementExit();
  // Note: elevator/portal exit is handled by the UI layer (grid component, panel-floor-selector)
  // to avoid circular dependencies between stairs ↔ elevators ↔ portals
  stairPlacementActive.set(true);
  stairPlacementDirection.set(direction);
}

export function stairPlacementExit(): void {
  stairPlacementActive.set(false);
}

// --- Pure validation ---

export type StairValidationResult = {
  valid: boolean;
  error?: string;
};

export function stairValidatePlacement(
  floors: Floor[],
  stairs: StairInstance[],
  currentFloorDepth: number,
  x: number,
  y: number,
  direction: StairDirection,
): StairValidationResult {
  const targetDepth = direction === 'down' ? currentFloorDepth + 1 : currentFloorDepth - 1;

  // Adjacent floor must exist
  const currentFloor = floors.find((f) => f.depth === currentFloorDepth);
  const targetFloor = floors.find((f) => f.depth === targetDepth);
  if (!currentFloor) {
    return { valid: false, error: 'Current floor not found' };
  }
  if (!targetFloor) {
    return { valid: false, error: direction === 'down' ? 'No floor below' : 'No floor above' };
  }

  // Current floor tile must be empty
  const currentTile = currentFloor.grid[y]?.[x];
  if (!currentTile || currentTile.occupied) {
    return { valid: false, error: 'Tile is occupied on current floor' };
  }

  // Target floor tile must be empty
  const targetTile = targetFloor.grid[y]?.[x];
  if (!targetTile || targetTile.occupied) {
    return { valid: false, error: 'Tile is occupied on target floor' };
  }

  // No existing stair at this position connecting these floors
  const existingStair = stairs.find(
    (s) => s.gridX === x && s.gridY === y &&
      ((s.floorDepthA === currentFloorDepth && s.floorDepthB === targetDepth) ||
       (s.floorDepthA === targetDepth && s.floorDepthB === currentFloorDepth)),
  );
  if (existingStair) {
    return { valid: false, error: 'Stairs already exist at this position' };
  }

  return { valid: true };
}

// --- Pure grid operations ---

export function stairPlaceOnFloors(
  floors: Floor[],
  stair: StairInstance,
): Floor[] {
  return floors.map((floor) => {
    if (floor.depth !== stair.floorDepthA && floor.depth !== stair.floorDepthB) {
      return floor;
    }

    const newGrid = floor.grid.map((row) => row.map((tile) => ({ ...tile })));
    newGrid[stair.gridY][stair.gridX] = {
      occupied: true,
      occupiedBy: 'stair',
      roomId: undefined,
      hallwayId: undefined,
      stairId: stair.id,
      elevatorId: undefined,
      portalId: undefined,
      connectionType: undefined,
    };

    return { ...floor, grid: newGrid };
  });
}

export function stairRemoveFromFloors(
  floors: Floor[],
  stairId: string,
  stairs: StairInstance[],
): Floor[] {
  const stair = stairs.find((s) => s.id === stairId);
  if (!stair) return floors;

  return floors.map((floor) => {
    if (floor.depth !== stair.floorDepthA && floor.depth !== stair.floorDepthB) {
      return floor;
    }

    const tile = floor.grid[stair.gridY]?.[stair.gridX];
    if (!tile || tile.stairId !== stairId) return floor;

    const newGrid = floor.grid.map((row) => row.map((t) => ({ ...t })));
    newGrid[stair.gridY][stair.gridX] = {
      occupied: false,
      occupiedBy: 'empty',
      roomId: undefined,
      hallwayId: undefined,
      stairId: undefined,
      elevatorId: undefined,
      portalId: undefined,
      connectionType: undefined,
    };

    return { ...floor, grid: newGrid };
  });
}

// --- Placement execution ---

export async function stairPlacementExecute(
  x: number,
  y: number,
): Promise<{ success: boolean; error?: string }> {
  const state = gamestate();
  const direction = stairPlacementDirection();
  const currentFloor = floorCurrent();
  if (!currentFloor) return { success: false, error: 'No active floor' };

  const validation = stairValidatePlacement(
    state.world.floors,
    state.world.stairs,
    currentFloor.depth,
    x, y,
    direction,
  );
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  if (!resourceCanAfford({ crystals: STAIR_PLACEMENT_COST })) {
    return { success: false, error: 'Not enough Crystals' };
  }

  const paid = await resourcePayCost({ crystals: STAIR_PLACEMENT_COST });
  if (!paid) return { success: false, error: 'Not enough Crystals' };

  const targetDepth = direction === 'down'
    ? currentFloor.depth + 1
    : currentFloor.depth - 1;

  const stair: StairInstance = {
    id: rngUuid(),
    floorDepthA: Math.min(currentFloor.depth, targetDepth),
    floorDepthB: Math.max(currentFloor.depth, targetDepth),
    gridX: x,
    gridY: y,
  };

  await updateGamestate((s) => {
    const updatedFloors = stairPlaceOnFloors(s.world.floors, stair);
    return {
      ...s,
      world: {
        ...s.world,
        floors: updatedFloors,
        stairs: [...s.world.stairs, stair],
      },
    };
  });

  return { success: true };
}

// --- Query helpers ---

export function stairGetOnFloor(stairs: StairInstance[], floorDepth: number): StairInstance[] {
  return stairs.filter(
    (s) => s.floorDepthA === floorDepth || s.floorDepthB === floorDepth,
  );
}

export function stairGetAtPosition(stairs: StairInstance[], x: number, y: number): StairInstance | undefined {
  return stairs.find((s) => s.gridX === x && s.gridY === y);
}

/**
 * BFS to check if two floors are connected via stairs.
 * Returns true if fromDepth === toDepth (same floor).
 */
export function stairFloorsAreConnected(
  stairs: StairInstance[],
  fromDepth: number,
  toDepth: number,
): boolean {
  if (fromDepth === toDepth) return true;

  const visited = new Set<number>();
  const queue = [fromDepth];
  visited.add(fromDepth);

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const stair of stairs) {
      let neighbor: number | undefined;
      if (stair.floorDepthA === current) neighbor = stair.floorDepthB;
      else if (stair.floorDepthB === current) neighbor = stair.floorDepthA;

      if (neighbor !== undefined && !visited.has(neighbor)) {
        if (neighbor === toDepth) return true;
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return false;
}

/**
 * Count the minimum number of floors traversed between two depths via stairs.
 * Returns undefined if no path exists.
 */
export function stairCountFloorsTraversed(
  stairs: StairInstance[],
  fromDepth: number,
  toDepth: number,
): number | undefined {
  if (fromDepth === toDepth) return 0;

  const visited = new Set<number>();
  const queue: Array<{ depth: number; distance: number }> = [
    { depth: fromDepth, distance: 0 },
  ];
  visited.add(fromDepth);

  while (queue.length > 0) {
    const { depth: current, distance } = queue.shift()!;

    for (const stair of stairs) {
      let neighbor: number | undefined;
      if (stair.floorDepthA === current) neighbor = stair.floorDepthB;
      else if (stair.floorDepthB === current) neighbor = stair.floorDepthA;

      if (neighbor !== undefined && !visited.has(neighbor)) {
        if (neighbor === toDepth) return distance + 1;
        visited.add(neighbor);
        queue.push({ depth: neighbor, distance: distance + 1 });
      }
    }
  }

  return undefined;
}

// --- Stair removal ---

export type StairRemovalInfo = {
  canRemove: boolean;
  refund: number;
  traversingInhabitantNames: string[];
  reason?: string;
};

export function stairRemovalGetInfo(stairId: string): StairRemovalInfo {
  const state = gamestate();
  const stair = state.world.stairs.find((s) => s.id === stairId);
  if (!stair) {
    return { canRemove: false, refund: 0, traversingInhabitantNames: [], reason: 'Stair not found' };
  }

  const traversing = state.world.inhabitants.filter(
    (i) => i.travelTicksRemaining !== undefined && i.travelTicksRemaining > 0,
  );

  if (traversing.length > 0) {
    return {
      canRemove: false,
      refund: STAIR_REMOVAL_REFUND,
      traversingInhabitantNames: traversing.map((i) => i.name),
      reason: 'Inhabitants are currently traveling between floors',
    };
  }

  return {
    canRemove: true,
    refund: STAIR_REMOVAL_REFUND,
    traversingInhabitantNames: [],
  };
}

export async function stairRemovalExecute(stairId: string): Promise<{ success: boolean; error?: string }> {
  const info = stairRemovalGetInfo(stairId);
  if (!info.canRemove) {
    return { success: false, error: info.reason };
  }

  await updateGamestate((s) => {
    const updatedFloors = stairRemoveFromFloors(s.world.floors, stairId, s.world.stairs);
    const updatedStairs = s.world.stairs.filter((st) => st.id !== stairId);

    // Refund crystals
    const crystalResource = s.world.resources.crystals;
    const refundAmount = Math.min(STAIR_REMOVAL_REFUND, crystalResource.max - crystalResource.current);

    return {
      ...s,
      world: {
        ...s.world,
        floors: updatedFloors,
        stairs: updatedStairs,
        resources: {
          ...s.world.resources,
          crystals: {
            ...crystalResource,
            current: crystalResource.current + refundAmount,
          },
        },
      },
    };
  });

  return { success: true };
}

// --- Travel processing ---

export function stairTravelProcess(state: { world: { inhabitants: { travelTicksRemaining?: number }[] } }): void {
  for (const inhabitant of state.world.inhabitants) {
    if (inhabitant.travelTicksRemaining !== undefined && inhabitant.travelTicksRemaining > 0) {
      inhabitant.travelTicksRemaining -= 1;
    }
  }
}
