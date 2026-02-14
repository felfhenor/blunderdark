import { signal } from '@angular/core';
import { floorCurrent } from '@helpers/floor';
import { hallwayPlacementExit } from '@helpers/hallway-placement';
import { resourceCanAfford, resourcePayCost } from '@helpers/resources';
import { rngUuid } from '@helpers/rng';
import { roomPlacementExitMode } from '@helpers/room-placement';
import { stairPlacementExit } from '@helpers/stairs';
import { elevatorPlacementExit } from '@helpers/elevators';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type { Floor, PortalId, PortalInstance } from '@interfaces';
import type { PortalValidationResult, PortalRemovalInfo } from '@interfaces/portal';

export const PORTAL_PLACEMENT_COST_FLUX = 100;
export const PORTAL_PLACEMENT_COST_ESSENCE = 30;
export const PORTAL_REMOVAL_REFUND_RATIO = 0.5;

// --- Placement mode state ---

export const portalPlacementActive = signal(false);
export const portalPlacementStep = signal<'selectSource' | 'selectDestination'>('selectSource');
export const portalPlacementSourceFloorDepth = signal<number | undefined>(undefined);
export const portalPlacementSourcePosition = signal<{ x: number; y: number } | undefined>(undefined);
export const portalPlacementTargetFloorDepth = signal<number | undefined>(undefined);

export function portalPlacementEnter(): void {
  roomPlacementExitMode();
  hallwayPlacementExit();
  stairPlacementExit();
  elevatorPlacementExit();
  portalPlacementActive.set(true);
  portalPlacementStep.set('selectSource');
  portalPlacementSourceFloorDepth.set(undefined);
  portalPlacementSourcePosition.set(undefined);
  portalPlacementTargetFloorDepth.set(undefined);
}

export function portalPlacementExit(): void {
  portalPlacementActive.set(false);
  portalPlacementStep.set('selectSource');
  portalPlacementSourceFloorDepth.set(undefined);
  portalPlacementSourcePosition.set(undefined);
  portalPlacementTargetFloorDepth.set(undefined);
}

export function portalPlacementSetSource(x: number, y: number, floorDepth: number): void {
  portalPlacementSourceFloorDepth.set(floorDepth);
  portalPlacementSourcePosition.set({ x, y });
  portalPlacementStep.set('selectDestination');
}

export function portalPlacementSetTargetFloor(floorDepth: number): void {
  portalPlacementTargetFloorDepth.set(floorDepth);
}

export function portalValidatePlacement(
  floors: Floor[],
  portals: PortalInstance[],
  floorDepthA: number,
  posA: { x: number; y: number },
  floorDepthB: number,
  posB: { x: number; y: number },
): PortalValidationResult {
  // Must connect different floors
  if (floorDepthA === floorDepthB) {
    return { valid: false, error: 'Portal must connect two different floors' };
  }

  // Both floors must exist
  const floorA = floors.find((f) => f.depth === floorDepthA);
  const floorB = floors.find((f) => f.depth === floorDepthB);
  if (!floorA) return { valid: false, error: `Floor ${floorDepthA} not found` };
  if (!floorB) return { valid: false, error: `Floor ${floorDepthB} not found` };

  // Both tiles must be empty
  const tileA = floorA.grid[posA.y]?.[posA.x];
  if (!tileA || tileA.occupied) {
    return { valid: false, error: 'Source tile is occupied' };
  }

  const tileB = floorB.grid[posB.y]?.[posB.x];
  if (!tileB || tileB.occupied) {
    return { valid: false, error: 'Destination tile is occupied' };
  }

  // No existing portal connecting these exact floors at these positions
  const existingPortal = portals.find(
    (p) =>
      (p.floorDepthA === floorDepthA && p.floorDepthB === floorDepthB &&
        p.positionA.x === posA.x && p.positionA.y === posA.y &&
        p.positionB.x === posB.x && p.positionB.y === posB.y) ||
      (p.floorDepthA === floorDepthB && p.floorDepthB === floorDepthA &&
        p.positionA.x === posB.x && p.positionA.y === posB.y &&
        p.positionB.x === posA.x && p.positionB.y === posA.y),
  );
  if (existingPortal) {
    return { valid: false, error: 'Portal already exists at these positions' };
  }

  return { valid: true };
}

// --- Pure grid operations ---

export function portalPlaceOnFloors(
  floors: Floor[],
  portal: PortalInstance,
): Floor[] {
  return floors.map((floor) => {
    if (floor.depth === portal.floorDepthA) {
      const newGrid = floor.grid.map((row) => row.map((tile) => ({ ...tile })));
      newGrid[portal.positionA.y][portal.positionA.x] = {
        occupied: true,
        occupiedBy: 'portal',
        roomId: undefined,
        hallwayId: undefined,
        stairId: undefined,
        elevatorId: undefined,
        portalId: portal.id,
        connectionType: undefined,
      };
      return { ...floor, grid: newGrid };
    }

    if (floor.depth === portal.floorDepthB) {
      const newGrid = floor.grid.map((row) => row.map((tile) => ({ ...tile })));
      newGrid[portal.positionB.y][portal.positionB.x] = {
        occupied: true,
        occupiedBy: 'portal',
        roomId: undefined,
        hallwayId: undefined,
        stairId: undefined,
        elevatorId: undefined,
        portalId: portal.id,
        connectionType: undefined,
      };
      return { ...floor, grid: newGrid };
    }

    return floor;
  });
}

export function portalRemoveFromFloors(
  floors: Floor[],
  portalId: string,
  portals: PortalInstance[],
): Floor[] {
  const portal = portals.find((p) => p.id === portalId);
  if (!portal) return floors;

  return floors.map((floor) => {
    if (floor.depth !== portal.floorDepthA && floor.depth !== portal.floorDepthB) {
      return floor;
    }

    const pos = floor.depth === portal.floorDepthA ? portal.positionA : portal.positionB;
    const tile = floor.grid[pos.y]?.[pos.x];
    if (!tile || tile.portalId !== portalId) return floor;

    const newGrid = floor.grid.map((row) => row.map((t) => ({ ...t })));
    newGrid[pos.y][pos.x] = {
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

export async function portalPlacementExecute(
  destX: number,
  destY: number,
): Promise<{ success: boolean; error?: string }> {
  const state = gamestate();
  const sourceFloorDepth = portalPlacementSourceFloorDepth();
  const sourcePos = portalPlacementSourcePosition();
  const targetFloorDepth = portalPlacementTargetFloorDepth();
  const currentFloor = floorCurrent();

  if (!sourceFloorDepth || !sourcePos) {
    return { success: false, error: 'No source position selected' };
  }

  const destFloorDepth = targetFloorDepth ?? currentFloor?.depth;
  if (!destFloorDepth) {
    return { success: false, error: 'No destination floor' };
  }

  const validation = portalValidatePlacement(
    state.world.floors,
    state.world.portals,
    sourceFloorDepth,
    sourcePos,
    destFloorDepth,
    { x: destX, y: destY },
  );
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const cost = { flux: PORTAL_PLACEMENT_COST_FLUX, essence: PORTAL_PLACEMENT_COST_ESSENCE };
  if (!resourceCanAfford(cost)) {
    return { success: false, error: 'Not enough resources (100 Flux + 30 Essence)' };
  }

  const paid = await resourcePayCost(cost);
  if (!paid) return { success: false, error: 'Not enough resources' };

  const portal: PortalInstance = {
    id: rngUuid() as PortalId,
    floorDepthA: sourceFloorDepth,
    floorDepthB: destFloorDepth,
    positionA: { ...sourcePos },
    positionB: { x: destX, y: destY },
  };

  await updateGamestate((s) => {
    const updatedFloors = portalPlaceOnFloors(s.world.floors, portal);
    return {
      ...s,
      world: {
        ...s.world,
        floors: updatedFloors,
        portals: [...s.world.portals, portal],
      },
    };
  });

  portalPlacementExit();
  return { success: true };
}

// --- Query helpers ---

export function portalGetOnFloor(portals: PortalInstance[], floorDepth: number): PortalInstance[] {
  return portals.filter(
    (p) => p.floorDepthA === floorDepth || p.floorDepthB === floorDepth,
  );
}

export function portalRemovalGetInfo(portalId: string): PortalRemovalInfo {
  const state = gamestate();
  const portal = state.world.portals.find((p) => p.id === portalId);
  if (!portal) {
    return { canRemove: false, refundFlux: 0, refundEssence: 0, traversingInhabitantNames: [], reason: 'Portal not found' };
  }

  const refundFlux = Math.floor(PORTAL_PLACEMENT_COST_FLUX * PORTAL_REMOVAL_REFUND_RATIO);
  const refundEssence = Math.floor(PORTAL_PLACEMENT_COST_ESSENCE * PORTAL_REMOVAL_REFUND_RATIO);

  const traversing = state.world.inhabitants.filter(
    (i) => i.travelTicksRemaining !== undefined && i.travelTicksRemaining > 0,
  );

  if (traversing.length > 0) {
    return {
      canRemove: false,
      refundFlux,
      refundEssence,
      traversingInhabitantNames: traversing.map((i) => i.name),
      reason: 'Inhabitants are currently traveling between floors',
    };
  }

  return {
    canRemove: true,
    refundFlux,
    refundEssence,
    traversingInhabitantNames: [],
  };
}

export async function portalRemovalExecute(portalId: string): Promise<{ success: boolean; error?: string }> {
  const info = portalRemovalGetInfo(portalId);
  if (!info.canRemove) {
    return { success: false, error: info.reason };
  }

  await updateGamestate((s) => {
    const updatedFloors = portalRemoveFromFloors(s.world.floors, portalId, s.world.portals);
    const updatedPortals = s.world.portals.filter((p) => p.id !== portalId);

    const fluxResource = s.world.resources.flux;
    const essenceResource = s.world.resources.essence;

    return {
      ...s,
      world: {
        ...s.world,
        floors: updatedFloors,
        portals: updatedPortals,
        resources: {
          ...s.world.resources,
          flux: {
            ...fluxResource,
            current: Math.min(fluxResource.current + info.refundFlux, fluxResource.max),
          },
          essence: {
            ...essenceResource,
            current: Math.min(essenceResource.current + info.refundEssence, essenceResource.max),
          },
        },
      },
    };
  });

  return { success: true };
}
