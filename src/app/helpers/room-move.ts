import { computed, signal } from '@angular/core';
import { connectionRemoveRoomFromFloor } from '@helpers/connections';
import {
  roomPlacementEnterMode,
  roomPlacementExitMode,
  roomPlacementPlaceOnFloor,
  roomPlacementRemoveFromFloor,
  roomPlacementRotation,
  roomPlacementValidate,
} from '@helpers/room-placement';
import { roomShapeResolve } from '@helpers/room-shapes';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type { Connection, Floor, PlacedRoom, PlacedRoomId } from '@interfaces';

const roomMoveRoomId = signal<PlacedRoomId | undefined>(undefined);
const roomMoveOriginalRoom = signal<PlacedRoom | undefined>(undefined);
const roomMoveOriginalConnections = signal<Connection[]>([]);

export const roomMoveActive = computed(() => roomMoveRoomId() !== undefined);

export async function roomMoveEnter(roomId: PlacedRoomId): Promise<void> {
  const state = gamestate();
  const floorIndex = state.world.currentFloorIndex;
  const floor = state.world.floors[floorIndex];
  if (!floor) return;

  const room = floor.rooms.find((r) => r.id === roomId);
  if (!room) return;

  const shape = roomShapeResolve(room);

  // Save original state
  roomMoveRoomId.set(roomId);
  roomMoveOriginalRoom.set({ ...room });
  roomMoveOriginalConnections.set(
    floor.connections.filter(
      (c) => c.roomAId === roomId || c.roomBId === roomId,
    ),
  );

  // Remove room tiles and connections from the floor
  let updatedFloor: Floor | undefined = roomPlacementRemoveFromFloor(
    floor,
    roomId,
    shape,
  );
  if (!updatedFloor) return;

  updatedFloor = connectionRemoveRoomFromFloor(updatedFloor, roomId);

  await updateGamestate((s) => {
    const newFloors = [...s.world.floors];
    newFloors[floorIndex] = updatedFloor;
    return {
      ...s,
      world: {
        ...s.world,
        floors: newFloors,
      },
    };
  });

  // Enter placement preview mode with the room's shape and rotation
  roomPlacementEnterMode(room.roomTypeId, shape);
}

export async function roomMoveExecute(
  x: number,
  y: number,
): Promise<{ success: boolean; error?: string }> {
  const originalRoom = roomMoveOriginalRoom();
  if (!originalRoom) return { success: false };

  const state = gamestate();
  const floorIndex = state.world.currentFloorIndex;
  const floor = state.world.floors[floorIndex];
  if (!floor) return { success: false, error: 'No active floor' };

  const shape = roomShapeResolve({
    ...originalRoom,
    rotation: roomPlacementRotation() || undefined,
  });

  const validation = roomPlacementValidate(shape, x, y, floor.grid);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.errors.join(', '),
    };
  }

  const movedRoom: PlacedRoom = {
    ...originalRoom,
    anchorX: x,
    anchorY: y,
    rotation: roomPlacementRotation() || undefined,
  };

  const updatedFloor = roomPlacementPlaceOnFloor(floor, movedRoom, shape);
  if (!updatedFloor) return { success: false, error: 'Failed to place room' };

  await updateGamestate((s) => {
    const newFloors = [...s.world.floors];
    newFloors[floorIndex] = updatedFloor;
    return {
      ...s,
      world: {
        ...s.world,
        floors: newFloors,
      },
    };
  });

  // Clean up move state and exit placement mode
  roomMoveRoomId.set(undefined);
  roomMoveOriginalRoom.set(undefined);
  roomMoveOriginalConnections.set([]);
  roomPlacementExitMode();

  return { success: true };
}

export async function roomMoveCancel(): Promise<void> {
  const originalRoom = roomMoveOriginalRoom();
  const originalConnections = roomMoveOriginalConnections();
  if (!originalRoom) return;

  const state = gamestate();
  const floorIndex = state.world.currentFloorIndex;
  const floor = state.world.floors[floorIndex];
  if (!floor) return;

  const shape = roomShapeResolve(originalRoom);

  const restoredFloor = roomPlacementPlaceOnFloor(floor, originalRoom, shape);
  if (!restoredFloor) return;

  // Restore original connections
  const floorWithConnections: Floor = {
    ...restoredFloor,
    connections: [...restoredFloor.connections, ...originalConnections],
  };

  await updateGamestate((s) => {
    const newFloors = [...s.world.floors];
    newFloors[floorIndex] = floorWithConnections;
    return {
      ...s,
      world: {
        ...s.world,
        floors: newFloors,
      },
    };
  });

  // Clean up move state
  roomMoveRoomId.set(undefined);
  roomMoveOriginalRoom.set(undefined);
  roomMoveOriginalConnections.set([]);
}
