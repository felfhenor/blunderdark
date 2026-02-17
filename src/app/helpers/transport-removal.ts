import { contentGetEntry } from '@helpers/content';
import { resourceAdd } from '@helpers/resources';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type { PlacedRoom, PlacedRoomId, ResourceType } from '@interfaces';
import type { TransportGroupId } from '@interfaces/room-shape';
import type { RoomContent } from '@interfaces/content-room';

const REFUND_RATE = 0.5;

export type TransportRemovalInfo = {
  canRemove: boolean;
  refund: Record<string, number>;
  traversingInhabitantNames: string[];
  reason?: string;
  groupRoomIds: PlacedRoomId[];
};

export function transportRemovalGetInfo(roomId: PlacedRoomId): TransportRemovalInfo {
  const state = gamestate();

  // Find the room and its transport group
  let targetRoom: PlacedRoom | undefined;
  let targetGroupId: TransportGroupId | undefined;
  for (const floor of state.world.floors) {
    const room = floor.rooms.find((r) => r.id === roomId);
    if (room) {
      targetRoom = room;
      targetGroupId = room.transportGroupId;
      break;
    }
  }

  if (!targetRoom || !targetGroupId) {
    return {
      canRemove: false,
      refund: {},
      traversingInhabitantNames: [],
      groupRoomIds: [],
      reason: 'Transport room not found',
    };
  }

  // Find all rooms in the same transport group
  const groupRoomIds: PlacedRoomId[] = [];
  for (const floor of state.world.floors) {
    for (const room of floor.rooms) {
      if (room.transportGroupId === targetGroupId) {
        groupRoomIds.push(room.id);
      }
    }
  }

  // Check for traveling inhabitants
  const traversing = state.world.inhabitants.filter(
    (i) => i.travelTicksRemaining !== undefined && i.travelTicksRemaining > 0,
  );

  // Calculate refund based on the room definition cost
  const roomDef = contentGetEntry<RoomContent>(targetRoom.roomTypeId);
  const refund: Record<string, number> = {};
  if (roomDef) {
    for (const [type, amount] of Object.entries(roomDef.cost)) {
      if (amount && amount > 0) {
        refund[type] = Math.floor(amount * REFUND_RATE);
      }
    }
  }

  if (traversing.length > 0) {
    return {
      canRemove: false,
      refund,
      traversingInhabitantNames: traversing.map((i) => i.name),
      groupRoomIds,
      reason: 'Inhabitants are currently traveling between floors',
    };
  }

  return {
    canRemove: true,
    refund,
    traversingInhabitantNames: [],
    groupRoomIds,
  };
}

export async function transportRemovalExecute(
  roomId: PlacedRoomId,
): Promise<{ success: boolean; error?: string }> {
  const info = transportRemovalGetInfo(roomId);
  if (!info.canRemove) {
    return { success: false, error: info.reason };
  }

  const groupRoomIdSet = new Set<string>(info.groupRoomIds);

  await updateGamestate((s) => {
    const newFloors = s.world.floors.map((floor) => {
      const hasGroupRoom = floor.rooms.some((r) => groupRoomIdSet.has(r.id));
      if (!hasGroupRoom) return floor;

      // Clear grid tiles and remove rooms
      const newGrid = floor.grid.map((row) => row.map((tile) => ({ ...tile })));
      for (const room of floor.rooms) {
        if (!groupRoomIdSet.has(room.id)) continue;
        const tile = newGrid[room.anchorY]?.[room.anchorX];
        if (tile && tile.roomId === room.id) {
          newGrid[room.anchorY][room.anchorX] = {
            occupied: false,
            occupiedBy: 'empty',
            roomId: undefined,
            hallwayId: undefined,
            connectionType: undefined,
          };
        }
      }

      return {
        ...floor,
        grid: newGrid,
        rooms: floor.rooms.filter((r) => !groupRoomIdSet.has(r.id)),
        connections: floor.connections.filter(
          (c) => !groupRoomIdSet.has(c.roomAId) && !groupRoomIdSet.has(c.roomBId),
        ),
      };
    });

    return { ...s, world: { ...s.world, floors: newFloors } };
  });

  // Refund resources
  for (const [type, amount] of Object.entries(info.refund)) {
    if (amount > 0) {
      await resourceAdd(type as ResourceType, amount);
    }
  }

  return { success: true };
}
