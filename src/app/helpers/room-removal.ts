import { getEntry } from '@helpers/content';
import {
  isRoomRemovable,
  removeRoomFromFloor,
} from '@helpers/room-placement';
import { addResource } from '@helpers/resources';
import { getRotatedShape, getRoomShape } from '@helpers/room-shapes';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type {
  IsContentItem,
  ResourceCost,
  ResourceType,
  RoomDefinition,
} from '@interfaces';

export type RemovalRefund = Record<string, number>;

export type RemovalInfo = {
  roomName: string;
  refund: RemovalRefund;
  displacedInhabitantNames: string[];
  canRemove: boolean;
  error?: string;
};

const REFUND_RATE = 0.5;

/**
 * Calculate the refund for removing a room (50% of original cost, rounded down).
 */
export function calculateRefund(cost: ResourceCost): RemovalRefund {
  const refund: RemovalRefund = {};
  for (const [type, amount] of Object.entries(cost)) {
    if (amount && amount > 0) {
      refund[type] = Math.floor(amount * REFUND_RATE);
    }
  }
  return refund;
}

/**
 * Get information about what would happen if a room were removed.
 * Used by the confirmation dialog to show refund and displaced inhabitants.
 */
export function getRemovalInfo(roomId: string): RemovalInfo | undefined {
  const state = gamestate();
  const floorIndex = state.world.currentFloorIndex;
  const floor = state.world.floors[floorIndex];
  if (!floor) return undefined;

  const room = floor.rooms.find((r) => r.id === roomId);
  if (!room) return undefined;

  const roomDef = getEntry<RoomDefinition & IsContentItem>(room.roomTypeId);
  if (!roomDef) return undefined;

  if (!isRoomRemovable(room.roomTypeId)) {
    return {
      roomName: roomDef.name,
      refund: {},
      displacedInhabitantNames: [],
      canRemove: false,
      error: 'This room cannot be removed',
    };
  }

  const refund = calculateRefund(roomDef.cost);

  const displacedInhabitantNames = state.world.inhabitants
    .filter((i) => i.assignedRoomId === roomId)
    .map((i) => {
      const def = getEntry<{ name: string } & IsContentItem>(i.definitionId);
      return def?.name ?? i.name;
    });

  return {
    roomName: roomDef.name,
    refund,
    displacedInhabitantNames,
    canRemove: true,
  };
}

/**
 * Execute room removal: validate, unassign inhabitants, refund resources, clear grid.
 * Returns a result with displaced inhabitant names for notification.
 */
export async function executeRoomRemoval(
  roomId: string,
): Promise<{ success: boolean; error?: string; displacedNames?: string[] }> {
  const state = gamestate();
  const floorIndex = state.world.currentFloorIndex;
  const floor = state.world.floors[floorIndex];
  if (!floor) return { success: false, error: 'No active floor' };

  const room = floor.rooms.find((r) => r.id === roomId);
  if (!room) return { success: false, error: 'Room not found' };

  if (!isRoomRemovable(room.roomTypeId)) {
    return { success: false, error: 'This room cannot be removed' };
  }

  const roomDef = getEntry<RoomDefinition & IsContentItem>(room.roomTypeId);
  if (!roomDef) return { success: false, error: 'Unknown room type' };

  const baseShape = getRoomShape(room.shapeId);
  if (!baseShape) return { success: false, error: 'Unknown room shape' };

  const shape = getRotatedShape(baseShape, room.rotation ?? 0);

  // Calculate refund before removal
  const refund = calculateRefund(roomDef.cost);

  // Get displaced inhabitant names before removal
  const displacedNames = state.world.inhabitants
    .filter((i) => i.assignedRoomId === roomId)
    .map((i) => {
      const def = getEntry<{ name: string } & IsContentItem>(i.definitionId);
      return def?.name ?? i.name;
    });

  // Remove room from floor grid
  const updatedFloor = removeRoomFromFloor(floor, roomId, shape);
  if (!updatedFloor) return { success: false, error: 'Failed to remove room from grid' };

  // Update gamestate: remove room from grid + unassign inhabitants
  await updateGamestate((s) => {
    const newFloors = [...s.world.floors];
    newFloors[floorIndex] = updatedFloor;

    // Unassign all inhabitants from this room
    const newInhabitants = s.world.inhabitants.map((i) =>
      i.assignedRoomId === roomId ? { ...i, assignedRoomId: undefined } : i,
    );

    return {
      ...s,
      world: {
        ...s.world,
        floors: newFloors,
        inhabitants: newInhabitants,
      },
    };
  });

  // Refund resources (capped at max)
  for (const [type, amount] of Object.entries(refund)) {
    if (amount > 0) {
      await addResource(type as ResourceType, amount);
    }
  }

  return { success: true, displacedNames };
}
