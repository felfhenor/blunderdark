import { signal } from '@angular/core';
import { sortBy } from 'es-toolkit/compat';
import { contentGetEntriesByType } from '@helpers/content';
import { floorCurrent } from '@helpers/floor';
import { hallwayPlacementExit } from '@helpers/hallway-placement';
import { resourceCanAfford, resourcePayCost } from '@helpers/resources';
import { rngUuid } from '@helpers/rng';
import { roomPlacementExitMode } from '@helpers/room-placement';
import { roomShapeGet } from '@helpers/room-shapes';
import { roomPlacementPlaceOnFloor } from '@helpers/room-placement';
import { gamestate, updateGamestate } from '@helpers/state-game';
import { generateRoomSuffix } from '@helpers/suffix';
import type {
  Floor,
  PlacedRoom,
  PlacedRoomId,
} from '@interfaces';
import type { TransportGroupId, TransportType } from '@interfaces/room-shape';
import type { RoomContent } from '@interfaces/content-room';

// --- Placement mode state ---

export const transportPlacementActive = signal(false);
export const transportPlacementType = signal<TransportType | undefined>(undefined);

// Portal two-step state
export const transportPortalStep = signal<'selectSource' | 'selectDestination'>('selectSource');
export const transportPortalSourceFloorDepth = signal<number | undefined>(undefined);
export const transportPortalSourcePosition = signal<{ x: number; y: number } | undefined>(undefined);
export const transportPortalTargetFloorDepth = signal<number | undefined>(undefined);

export function transportPlacementEnter(type: TransportType): void {
  roomPlacementExitMode();
  hallwayPlacementExit();
  transportPlacementActive.set(true);
  transportPlacementType.set(type);
  if (type === 'portal') {
    transportPortalStep.set('selectSource');
    transportPortalSourceFloorDepth.set(undefined);
    transportPortalSourcePosition.set(undefined);
    transportPortalTargetFloorDepth.set(undefined);
  }
}

export function transportPlacementExit(): void {
  transportPlacementActive.set(false);
  transportPlacementType.set(undefined);
  transportPortalStep.set('selectSource');
  transportPortalSourceFloorDepth.set(undefined);
  transportPortalSourcePosition.set(undefined);
  transportPortalTargetFloorDepth.set(undefined);
}

export function transportPortalSetSource(x: number, y: number, floorDepth: number): void {
  transportPortalSourceFloorDepth.set(floorDepth);
  transportPortalSourcePosition.set({ x, y });
  transportPortalStep.set('selectDestination');
}

export function transportPortalSetTargetFloor(floorDepth: number): void {
  transportPortalTargetFloorDepth.set(floorDepth);
}

// --- Helpers ---

function getTransportRoomDef(type: TransportType): RoomContent | undefined {
  const roleMap: Record<TransportType, string> = {
    stair: 'stair',
    elevator: 'elevator',
    portal: 'portal',
  };
  const allRooms = contentGetEntriesByType<RoomContent>('room');
  return allRooms.find((r) => r.role === roleMap[type]);
}

function createTransportRoom(
  floor: Floor,
  roomDef: RoomContent,
  x: number,
  y: number,
  transportType: TransportType,
  transportGroupId: TransportGroupId,
): PlacedRoom {
  return {
    id: rngUuid<PlacedRoomId>(),
    roomTypeId: roomDef.id,
    shapeId: roomDef.shapeId,
    anchorX: x,
    anchorY: y,
    suffix: generateRoomSuffix(floor, roomDef.id),
    transportType,
    transportGroupId,
  };
}

function placeTransportRoomOnFloor(floor: Floor, room: PlacedRoom, roomDef: RoomContent): Floor | undefined {
  const shape = roomShapeGet(roomDef.shapeId);
  if (!shape) return undefined;
  return roomPlacementPlaceOnFloor(floor, room, shape);
}

// --- Stair placement ---

export async function transportStairExecute(
  x: number,
  y: number,
): Promise<{ success: boolean; error?: string }> {
  const state = gamestate();
  const currentFloor = floorCurrent();
  if (!currentFloor) return { success: false, error: 'No active floor' };

  const roomDef = getTransportRoomDef('stair');
  if (!roomDef) return { success: false, error: 'Stairway room definition not found' };

  // Find adjacent floor below (prefer down, fallback up)
  const belowFloor = state.world.floors.find((f) => f.depth === currentFloor.depth + 1);
  const aboveFloor = state.world.floors.find((f) => f.depth === currentFloor.depth - 1);
  const targetFloor = belowFloor ?? aboveFloor;
  if (!targetFloor) return { success: false, error: 'No adjacent floor exists' };

  // Validate both tiles
  const currentTile = currentFloor.grid[y]?.[x];
  if (!currentTile || currentTile.occupied) {
    return { success: false, error: 'Tile is occupied on current floor' };
  }

  const targetTile = targetFloor.grid[y]?.[x];
  if (!targetTile || targetTile.occupied) {
    return { success: false, error: 'Tile is occupied on target floor' };
  }

  if (!resourceCanAfford(roomDef.cost)) {
    return { success: false, error: 'Not enough resources' };
  }

  const paid = await resourcePayCost(roomDef.cost);
  if (!paid) return { success: false, error: 'Not enough resources' };

  const groupId = rngUuid<TransportGroupId>();
  const roomA = createTransportRoom(currentFloor, roomDef, x, y, 'stair', groupId);
  const roomB = createTransportRoom(targetFloor, roomDef, x, y, 'stair', groupId);

  await updateGamestate((s) => {
    const newFloors = s.world.floors.map((floor) => {
      if (floor.depth === currentFloor.depth) {
        return placeTransportRoomOnFloor(floor, roomA, roomDef) ?? floor;
      }
      if (floor.depth === targetFloor.depth) {
        return placeTransportRoomOnFloor(floor, roomB, roomDef) ?? floor;
      }
      return floor;
    });
    return { ...s, world: { ...s.world, floors: newFloors } };
  });

  return { success: true };
}

// --- Elevator placement ---

export async function transportElevatorExecute(
  x: number,
  y: number,
): Promise<{ success: boolean; error?: string }> {
  const state = gamestate();
  const currentFloor = floorCurrent();
  if (!currentFloor) return { success: false, error: 'No active floor' };

  if (state.world.floors.length < 2) {
    return { success: false, error: 'Need at least 2 floors' };
  }

  const roomDef = getTransportRoomDef('elevator');
  if (!roomDef) return { success: false, error: 'Elevator room definition not found' };

  const belowFloor = state.world.floors.find((f) => f.depth === currentFloor.depth + 1);
  const aboveFloor = state.world.floors.find((f) => f.depth === currentFloor.depth - 1);
  const targetFloor = belowFloor ?? aboveFloor;
  if (!targetFloor) return { success: false, error: 'No adjacent floor exists' };

  const currentTile = currentFloor.grid[y]?.[x];
  if (!currentTile || currentTile.occupied) {
    return { success: false, error: 'Tile is occupied on current floor' };
  }

  const targetTile = targetFloor.grid[y]?.[x];
  if (!targetTile || targetTile.occupied) {
    return { success: false, error: 'Tile is occupied on target floor' };
  }

  if (!resourceCanAfford(roomDef.cost)) {
    return { success: false, error: 'Not enough resources' };
  }

  const paid = await resourcePayCost(roomDef.cost);
  if (!paid) return { success: false, error: 'Not enough resources' };

  const groupId = rngUuid<TransportGroupId>();
  const roomA = createTransportRoom(currentFloor, roomDef, x, y, 'elevator', groupId);
  const roomB = createTransportRoom(targetFloor, roomDef, x, y, 'elevator', groupId);

  await updateGamestate((s) => {
    const newFloors = s.world.floors.map((floor) => {
      if (floor.depth === currentFloor.depth) {
        return placeTransportRoomOnFloor(floor, roomA, roomDef) ?? floor;
      }
      if (floor.depth === targetFloor.depth) {
        return placeTransportRoomOnFloor(floor, roomB, roomDef) ?? floor;
      }
      return floor;
    });
    return { ...s, world: { ...s.world, floors: newFloors } };
  });

  return { success: true };
}

// --- Elevator extend ---

export async function transportElevatorExtendExecute(
  groupId: TransportGroupId,
  direction: 'up' | 'down',
): Promise<{ success: boolean; error?: string }> {
  const state = gamestate();

  const roomDef = getTransportRoomDef('elevator');
  if (!roomDef) return { success: false, error: 'Elevator room definition not found' };

  // Find all rooms in this elevator group
  const groupRooms: { room: PlacedRoom; floorDepth: number }[] = [];
  for (const floor of state.world.floors) {
    for (const room of floor.rooms) {
      if (room.transportGroupId === groupId && room.transportType === 'elevator') {
        groupRooms.push({ room, floorDepth: floor.depth });
      }
    }
  }

  if (groupRooms.length === 0) return { success: false, error: 'Elevator group not found' };

  const depths = sortBy(groupRooms.map((r) => r.floorDepth), [(d) => d]);
  const targetDepth = direction === 'down' ? depths[depths.length - 1] + 1 : depths[0] - 1;

  const targetFloor = state.world.floors.find((f) => f.depth === targetDepth);
  if (!targetFloor) return { success: false, error: `No floor at depth ${targetDepth}` };

  const { anchorX: x, anchorY: y } = groupRooms[0].room;
  const targetTile = targetFloor.grid[y]?.[x];
  if (!targetTile || targetTile.occupied) {
    return { success: false, error: 'Tile is occupied on target floor' };
  }

  // Extension cost is half the base cost
  const extensionCost: Record<string, number> = {};
  for (const [type, amount] of Object.entries(roomDef.cost)) {
    if (amount && amount > 0) {
      extensionCost[type] = Math.ceil(amount / 2);
    }
  }

  if (!resourceCanAfford(extensionCost)) {
    return { success: false, error: 'Not enough resources' };
  }

  const paid = await resourcePayCost(extensionCost);
  if (!paid) return { success: false, error: 'Not enough resources' };

  const newRoom = createTransportRoom(targetFloor, roomDef, x, y, 'elevator', groupId);

  await updateGamestate((s) => {
    const newFloors = s.world.floors.map((floor) => {
      if (floor.depth === targetDepth) {
        return placeTransportRoomOnFloor(floor, newRoom, roomDef) ?? floor;
      }
      return floor;
    });
    return { ...s, world: { ...s.world, floors: newFloors } };
  });

  return { success: true };
}

// --- Elevator shrink ---

export async function transportElevatorShrinkExecute(
  groupId: TransportGroupId,
  floorDepth: number,
): Promise<{ success: boolean; error?: string }> {
  const state = gamestate();

  // Find all rooms in this elevator group
  const groupRooms: { room: PlacedRoom; floorDepth: number }[] = [];
  for (const floor of state.world.floors) {
    for (const room of floor.rooms) {
      if (room.transportGroupId === groupId && room.transportType === 'elevator') {
        groupRooms.push({ room, floorDepth: floor.depth });
      }
    }
  }

  if (groupRooms.length <= 2) {
    return { success: false, error: 'Elevator must connect at least 2 floors. Remove the elevator instead.' };
  }

  const depths = sortBy(groupRooms.map((r) => r.floorDepth), [(d) => d]);
  if (floorDepth !== depths[0] && floorDepth !== depths[depths.length - 1]) {
    return { success: false, error: 'Can only remove floors from the top or bottom of the elevator' };
  }

  // Check no traveling inhabitants
  const traversing = state.world.inhabitants.filter(
    (i) => i.travelTicksRemaining !== undefined && i.travelTicksRemaining > 0,
  );
  if (traversing.length > 0) {
    return { success: false, error: 'Inhabitants are currently traveling between floors' };
  }

  const roomToRemove = groupRooms.find((r) => r.floorDepth === floorDepth);
  if (!roomToRemove) return { success: false, error: 'Room not found on that floor' };

  await updateGamestate((s) => {
    const newFloors = s.world.floors.map((floor) => {
      if (floor.depth !== floorDepth) return floor;

      const room = floor.rooms.find((r) => r.id === roomToRemove.room.id);
      if (!room) return floor;

      // Clear grid tile
      const newGrid = floor.grid.map((row) => row.map((tile) => ({ ...tile })));
      newGrid[room.anchorY][room.anchorX] = {
        occupied: false,
        occupiedBy: 'empty',
        roomId: undefined,
        hallwayId: undefined,
        connectionType: undefined,
      };

      return {
        ...floor,
        grid: newGrid,
        rooms: floor.rooms.filter((r) => r.id !== roomToRemove.room.id),
        connections: floor.connections.filter(
          (c) => c.roomAId !== roomToRemove.room.id && c.roomBId !== roomToRemove.room.id,
        ),
      };
    });

    return { ...s, world: { ...s.world, floors: newFloors } };
  });

  return { success: true };
}

// --- Portal placement ---

export async function transportPortalExecute(
  destX: number,
  destY: number,
): Promise<{ success: boolean; error?: string }> {
  const state = gamestate();
  const sourceFloorDepth = transportPortalSourceFloorDepth();
  const sourcePos = transportPortalSourcePosition();
  const targetFloorDepth = transportPortalTargetFloorDepth();
  const currentFloor = floorCurrent();

  if (sourceFloorDepth === undefined || !sourcePos) {
    return { success: false, error: 'No source position selected' };
  }

  const destFloorDepth = targetFloorDepth ?? currentFloor?.depth;
  if (destFloorDepth === undefined) {
    return { success: false, error: 'No destination floor' };
  }

  if (sourceFloorDepth === destFloorDepth) {
    return { success: false, error: 'Portal must connect two different floors' };
  }

  const roomDef = getTransportRoomDef('portal');
  if (!roomDef) return { success: false, error: 'Portal room definition not found' };

  const sourceFloor = state.world.floors.find((f) => f.depth === sourceFloorDepth);
  const destFloor = state.world.floors.find((f) => f.depth === destFloorDepth);
  if (!sourceFloor || !destFloor) return { success: false, error: 'Floor not found' };

  const sourceTile = sourceFloor.grid[sourcePos.y]?.[sourcePos.x];
  if (!sourceTile || sourceTile.occupied) {
    return { success: false, error: 'Source tile is occupied' };
  }

  const destTile = destFloor.grid[destY]?.[destX];
  if (!destTile || destTile.occupied) {
    return { success: false, error: 'Destination tile is occupied' };
  }

  if (!resourceCanAfford(roomDef.cost)) {
    return { success: false, error: 'Not enough resources' };
  }

  const paid = await resourcePayCost(roomDef.cost);
  if (!paid) return { success: false, error: 'Not enough resources' };

  const groupId = rngUuid<TransportGroupId>();
  const roomA = createTransportRoom(sourceFloor, roomDef, sourcePos.x, sourcePos.y, 'portal', groupId);
  const roomB = createTransportRoom(destFloor, roomDef, destX, destY, 'portal', groupId);

  await updateGamestate((s) => {
    const newFloors = s.world.floors.map((floor) => {
      if (floor.depth === sourceFloorDepth) {
        return placeTransportRoomOnFloor(floor, roomA, roomDef) ?? floor;
      }
      if (floor.depth === destFloorDepth) {
        return placeTransportRoomOnFloor(floor, roomB, roomDef) ?? floor;
      }
      return floor;
    });
    return { ...s, world: { ...s.world, floors: newFloors } };
  });

  transportPlacementExit();
  return { success: true };
}
