import { signal } from '@angular/core';
import { floorCurrent } from '@helpers/floor';
import { hallwayPlacementExit } from '@helpers/hallway-placement';
import { resourceCanAfford, resourcePayCost } from '@helpers/resources';
import { rngUuid } from '@helpers/rng';
import { roomPlacementExitMode } from '@helpers/room-placement';
import { stairPlacementExit } from '@helpers/stairs';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type { ElevatorInstance, Floor } from '@interfaces';
import type { ElevatorValidationResult, ElevatorExtensionValidation, ElevatorRemovalInfo } from '@interfaces/elevator';

export const ELEVATOR_PLACEMENT_COST_CRYSTALS = 50;
export const ELEVATOR_PLACEMENT_COST_FLUX = 20;
export const ELEVATOR_EXTENSION_COST_CRYSTALS = 25;
export const ELEVATOR_EXTENSION_COST_FLUX = 10;
export const ELEVATOR_REMOVAL_REFUND_RATIO = 0.5;

// --- Placement mode state ---

export const elevatorPlacementActive = signal(false);

export function elevatorPlacementEnter(): void {
  roomPlacementExitMode();
  hallwayPlacementExit();
  stairPlacementExit();
  elevatorPlacementActive.set(true);
}

export function elevatorPlacementExit(): void {
  elevatorPlacementActive.set(false);
}

export function elevatorValidatePlacement(
  floors: Floor[],
  elevators: ElevatorInstance[],
  currentFloorDepth: number,
  x: number,
  y: number,
): ElevatorValidationResult {
  // Need at least 2 floors
  if (floors.length < 2) {
    return { valid: false, error: 'Need at least 2 floors' };
  }

  const currentFloor = floors.find((f) => f.depth === currentFloorDepth);
  if (!currentFloor) {
    return { valid: false, error: 'Current floor not found' };
  }

  // Find adjacent floor (prefer down, then up)
  const belowFloor = floors.find((f) => f.depth === currentFloorDepth + 1);
  const aboveFloor = floors.find((f) => f.depth === currentFloorDepth - 1);
  const adjacentFloor = belowFloor ?? aboveFloor;
  if (!adjacentFloor) {
    return { valid: false, error: 'No adjacent floor exists' };
  }

  // Current floor tile must be empty
  const currentTile = currentFloor.grid[y]?.[x];
  if (!currentTile || currentTile.occupied) {
    return { valid: false, error: 'Tile is occupied on current floor' };
  }

  // Adjacent floor tile must be empty
  const adjacentTile = adjacentFloor.grid[y]?.[x];
  if (!adjacentTile || adjacentTile.occupied) {
    return { valid: false, error: 'Tile is occupied on adjacent floor' };
  }

  // No existing elevator at this position connecting these floors
  const existingElevator = elevators.find(
    (e) => e.gridX === x && e.gridY === y &&
      e.connectedFloors.includes(currentFloorDepth) &&
      e.connectedFloors.includes(adjacentFloor.depth),
  );
  if (existingElevator) {
    return { valid: false, error: 'Elevator already exists at this position' };
  }

  return { valid: true };
}

// --- Pure grid operations ---

export function elevatorPlaceOnFloors(
  floors: Floor[],
  elevator: ElevatorInstance,
): Floor[] {
  return floors.map((floor) => {
    if (!elevator.connectedFloors.includes(floor.depth)) {
      return floor;
    }

    const newGrid = floor.grid.map((row) => row.map((tile) => ({ ...tile })));
    newGrid[elevator.gridY][elevator.gridX] = {
      occupied: true,
      occupiedBy: 'elevator',
      roomId: undefined,
      hallwayId: undefined,
      stairId: undefined,
      elevatorId: elevator.id,
      portalId: undefined,
      connectionType: undefined,
    };

    return { ...floor, grid: newGrid };
  });
}

export function elevatorRemoveFromFloors(
  floors: Floor[],
  elevatorId: string,
  elevators: ElevatorInstance[],
): Floor[] {
  const elevator = elevators.find((e) => e.id === elevatorId);
  if (!elevator) return floors;

  return floors.map((floor) => {
    if (!elevator.connectedFloors.includes(floor.depth)) {
      return floor;
    }

    const tile = floor.grid[elevator.gridY]?.[elevator.gridX];
    if (!tile || tile.elevatorId !== elevatorId) return floor;

    const newGrid = floor.grid.map((row) => row.map((t) => ({ ...t })));
    newGrid[elevator.gridY][elevator.gridX] = {
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

export async function elevatorPlacementExecute(
  x: number,
  y: number,
): Promise<{ success: boolean; error?: string }> {
  const state = gamestate();
  const currentFloor = floorCurrent();
  if (!currentFloor) return { success: false, error: 'No active floor' };

  const validation = elevatorValidatePlacement(
    state.world.floors,
    state.world.elevators,
    currentFloor.depth,
    x, y,
  );
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const cost = { crystals: ELEVATOR_PLACEMENT_COST_CRYSTALS, flux: ELEVATOR_PLACEMENT_COST_FLUX };
  if (!resourceCanAfford(cost)) {
    return { success: false, error: 'Not enough resources (50 Crystals + 20 Flux)' };
  }

  const paid = await resourcePayCost(cost);
  if (!paid) return { success: false, error: 'Not enough resources' };

  // Connect to adjacent floor (prefer below, then above)
  const belowFloor = state.world.floors.find((f) => f.depth === currentFloor.depth + 1);
  const aboveFloor = state.world.floors.find((f) => f.depth === currentFloor.depth - 1);
  const adjacentFloor = belowFloor ?? aboveFloor;
  if (!adjacentFloor) return { success: false, error: 'No adjacent floor' };

  const connectedFloors = [currentFloor.depth, adjacentFloor.depth].sort((a, b) => a - b);

  const elevator: ElevatorInstance = {
    id: rngUuid(),
    connectedFloors,
    gridX: x,
    gridY: y,
  };

  await updateGamestate((s) => {
    const updatedFloors = elevatorPlaceOnFloors(s.world.floors, elevator);
    return {
      ...s,
      world: {
        ...s.world,
        floors: updatedFloors,
        elevators: [...s.world.elevators, elevator],
      },
    };
  });

  return { success: true };
}

export function elevatorValidateExtension(
  floors: Floor[],
  elevator: ElevatorInstance,
  direction: 'up' | 'down',
): ElevatorExtensionValidation {
  const sortedFloors = [...elevator.connectedFloors].sort((a, b) => a - b);
  const targetDepth = direction === 'down'
    ? sortedFloors[sortedFloors.length - 1] + 1
    : sortedFloors[0] - 1;

  // Must be adjacent to existing range
  if (direction === 'down' && targetDepth !== sortedFloors[sortedFloors.length - 1] + 1) {
    return { valid: false, error: 'Can only extend to adjacent floors' };
  }
  if (direction === 'up' && targetDepth !== sortedFloors[0] - 1) {
    return { valid: false, error: 'Can only extend to adjacent floors' };
  }

  // Target floor must exist
  const targetFloor = floors.find((f) => f.depth === targetDepth);
  if (!targetFloor) {
    return { valid: false, error: `No floor at depth ${targetDepth}` };
  }

  // Tile must be empty on target floor
  const targetTile = targetFloor.grid[elevator.gridY]?.[elevator.gridX];
  if (!targetTile || targetTile.occupied) {
    return { valid: false, error: 'Tile is occupied on target floor' };
  }

  return { valid: true, targetDepth };
}

export async function elevatorExtendExecute(
  elevatorId: string,
  direction: 'up' | 'down',
): Promise<{ success: boolean; error?: string }> {
  const state = gamestate();
  const elevator = state.world.elevators.find((e) => e.id === elevatorId);
  if (!elevator) return { success: false, error: 'Elevator not found' };

  const validation = elevatorValidateExtension(state.world.floors, elevator, direction);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const cost = { crystals: ELEVATOR_EXTENSION_COST_CRYSTALS, flux: ELEVATOR_EXTENSION_COST_FLUX };
  if (!resourceCanAfford(cost)) {
    return { success: false, error: 'Not enough resources (25 Crystals + 10 Flux)' };
  }

  const paid = await resourcePayCost(cost);
  if (!paid) return { success: false, error: 'Not enough resources' };

  const targetDepth = validation.targetDepth!;

  await updateGamestate((s) => {
    const updatedElevators = s.world.elevators.map((e) => {
      if (e.id !== elevatorId) return e;
      return {
        ...e,
        connectedFloors: [...e.connectedFloors, targetDepth].sort((a, b) => a - b),
      };
    });

    // Mark the new floor's tile
    const updatedFloors = s.world.floors.map((floor) => {
      if (floor.depth !== targetDepth) return floor;

      const newGrid = floor.grid.map((row) => row.map((tile) => ({ ...tile })));
      newGrid[elevator.gridY][elevator.gridX] = {
        occupied: true,
        occupiedBy: 'elevator',
        roomId: undefined,
        hallwayId: undefined,
        stairId: undefined,
        elevatorId: elevator.id,
        portalId: undefined,
        connectionType: undefined,
      };

      return { ...floor, grid: newGrid };
    });

    return {
      ...s,
      world: {
        ...s.world,
        floors: updatedFloors,
        elevators: updatedElevators,
      },
    };
  });

  return { success: true };
}

// --- Shrink (remove one floor from elevator) ---

export async function elevatorShrinkExecute(
  elevatorId: string,
  floorDepth: number,
): Promise<{ success: boolean; error?: string }> {
  const state = gamestate();
  const elevator = state.world.elevators.find((e) => e.id === elevatorId);
  if (!elevator) return { success: false, error: 'Elevator not found' };

  // Can only shrink from ends
  const sorted = [...elevator.connectedFloors].sort((a, b) => a - b);
  if (floorDepth !== sorted[0] && floorDepth !== sorted[sorted.length - 1]) {
    return { success: false, error: 'Can only remove floors from the top or bottom of the elevator' };
  }

  // Must keep at least 2 floors
  if (elevator.connectedFloors.length <= 2) {
    return { success: false, error: 'Elevator must connect at least 2 floors. Remove the elevator instead.' };
  }

  // Check no traveling inhabitants
  const traversing = state.world.inhabitants.filter(
    (i) => i.travelTicksRemaining !== undefined && i.travelTicksRemaining > 0,
  );
  if (traversing.length > 0) {
    return { success: false, error: 'Inhabitants are currently traveling between floors' };
  }

  await updateGamestate((s) => {
    const updatedElevators = s.world.elevators.map((e) => {
      if (e.id !== elevatorId) return e;
      return {
        ...e,
        connectedFloors: e.connectedFloors.filter((d) => d !== floorDepth),
      };
    });

    // Clear the tile on the removed floor
    const updatedFloors = s.world.floors.map((floor) => {
      if (floor.depth !== floorDepth) return floor;

      const tile = floor.grid[elevator.gridY]?.[elevator.gridX];
      if (!tile || tile.elevatorId !== elevatorId) return floor;

      const newGrid = floor.grid.map((row) => row.map((t) => ({ ...t })));
      newGrid[elevator.gridY][elevator.gridX] = {
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

    // Partial refund for the removed floor
    const crystalResource = s.world.resources.crystals;
    const fluxResource = s.world.resources.flux;
    const crystalRefund = Math.floor(ELEVATOR_EXTENSION_COST_CRYSTALS * ELEVATOR_REMOVAL_REFUND_RATIO);
    const fluxRefund = Math.floor(ELEVATOR_EXTENSION_COST_FLUX * ELEVATOR_REMOVAL_REFUND_RATIO);

    return {
      ...s,
      world: {
        ...s.world,
        floors: updatedFloors,
        elevators: updatedElevators,
        resources: {
          ...s.world.resources,
          crystals: {
            ...crystalResource,
            current: Math.min(crystalResource.current + crystalRefund, crystalResource.max),
          },
          flux: {
            ...fluxResource,
            current: Math.min(fluxResource.current + fluxRefund, fluxResource.max),
          },
        },
      },
    };
  });

  return { success: true };
}

// --- Query helpers ---

export function elevatorGetOnFloor(elevators: ElevatorInstance[], floorDepth: number): ElevatorInstance[] {
  return elevators.filter((e) => e.connectedFloors.includes(floorDepth));
}

export function elevatorRemovalGetInfo(elevatorId: string): ElevatorRemovalInfo {
  const state = gamestate();
  const elevator = state.world.elevators.find((e) => e.id === elevatorId);
  if (!elevator) {
    return { canRemove: false, refundCrystals: 0, refundFlux: 0, traversingInhabitantNames: [], reason: 'Elevator not found' };
  }

  const traversing = state.world.inhabitants.filter(
    (i) => i.travelTicksRemaining !== undefined && i.travelTicksRemaining > 0,
  );

  // Base cost + extension costs
  const extensionFloors = elevator.connectedFloors.length - 2;
  const totalCrystals = ELEVATOR_PLACEMENT_COST_CRYSTALS + extensionFloors * ELEVATOR_EXTENSION_COST_CRYSTALS;
  const totalFlux = ELEVATOR_PLACEMENT_COST_FLUX + extensionFloors * ELEVATOR_EXTENSION_COST_FLUX;
  const refundCrystals = Math.floor(totalCrystals * ELEVATOR_REMOVAL_REFUND_RATIO);
  const refundFlux = Math.floor(totalFlux * ELEVATOR_REMOVAL_REFUND_RATIO);

  if (traversing.length > 0) {
    return {
      canRemove: false,
      refundCrystals,
      refundFlux,
      traversingInhabitantNames: traversing.map((i) => i.name),
      reason: 'Inhabitants are currently traveling between floors',
    };
  }

  return {
    canRemove: true,
    refundCrystals,
    refundFlux,
    traversingInhabitantNames: [],
  };
}

export async function elevatorRemovalExecute(elevatorId: string): Promise<{ success: boolean; error?: string }> {
  const info = elevatorRemovalGetInfo(elevatorId);
  if (!info.canRemove) {
    return { success: false, error: info.reason };
  }

  await updateGamestate((s) => {
    const updatedFloors = elevatorRemoveFromFloors(s.world.floors, elevatorId, s.world.elevators);
    const updatedElevators = s.world.elevators.filter((e) => e.id !== elevatorId);

    const crystalResource = s.world.resources.crystals;
    const fluxResource = s.world.resources.flux;

    return {
      ...s,
      world: {
        ...s.world,
        floors: updatedFloors,
        elevators: updatedElevators,
        resources: {
          ...s.world.resources,
          crystals: {
            ...crystalResource,
            current: Math.min(crystalResource.current + info.refundCrystals, crystalResource.max),
          },
          flux: {
            ...fluxResource,
            current: Math.min(fluxResource.current + info.refundFlux, fluxResource.max),
          },
        },
      },
    };
  });

  return { success: true };
}
