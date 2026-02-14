import { computed } from '@angular/core';
import { adjacencyAreRoomsAdjacent } from '@helpers/adjacency';
import { contentGetEntriesByType, contentGetEntry } from '@helpers/content';
import { productionGetRoomDefinition } from '@helpers/production';
import { roomShapeGetAbsoluteTiles, roomShapeResolve } from '@helpers/room-shapes';
import { gamestate } from '@helpers/state-game';
import type {
  Connection,
  Floor,
  InhabitantDefinition,
  IsContentItem,
  PlacedRoom,
  PlacedRoomId,
  RoomId,
  SynergyCondition,
  SynergyDefinition,
  TileOffset,
} from '@interfaces';
import type { PotentialSynergy } from '@interfaces/synergy';

export function synergyGetDefinitions(): SynergyDefinition[] {
  return contentGetEntriesByType<SynergyDefinition & IsContentItem>('synergy');
}

function buildAdjacencyMap(
  floor: Floor,
): Map<string, { adjacentIds: string[]; tiles: TileOffset[] }> {
  const roomTiles = new Map<string, TileOffset[]>();
  for (const room of floor.rooms) {
    const shape = roomShapeResolve(room);
    roomTiles.set(
      room.id,
      roomShapeGetAbsoluteTiles(shape, room.anchorX, room.anchorY),
    );
  }

  const map = new Map<
    string,
    { adjacentIds: string[]; tiles: TileOffset[] }
  >();
  for (const room of floor.rooms) {
    const thisTiles = roomTiles.get(room.id) ?? [];
    const adjacentIds: string[] = [];
    for (const other of floor.rooms) {
      if (other.id === room.id) continue;
      const otherTiles = roomTiles.get(other.id) ?? [];
      if (adjacencyAreRoomsAdjacent(thisTiles, otherTiles)) {
        adjacentIds.push(other.id);
      }
    }
    map.set(room.id, { adjacentIds, tiles: thisTiles });
  }

  return map;
}

function isConnectedTo(
  connections: Connection[],
  roomId: PlacedRoomId,
  targetRoomTypeId: RoomId,
  allRooms: PlacedRoom[],
): boolean {
  for (const conn of connections) {
    const otherId =
      conn.roomAId === roomId ? conn.roomBId : conn.roomBId === roomId ? conn.roomAId : null;
    if (!otherId) continue;
    const otherRoom = allRooms.find((r) => r.id === otherId);
    if (otherRoom && otherRoom.roomTypeId === targetRoomTypeId) return true;
  }
  return false;
}

export function synergyEvaluateCondition(
  condition: SynergyCondition,
  room: PlacedRoom,
  floor: Floor,
  adjacentRoomIds: string[],
): boolean {
  switch (condition.type) {
    case 'roomType':
      return room.roomTypeId === condition.roomTypeId;

    case 'adjacentRoomType': {
      return adjacentRoomIds.some((adjId) => {
        const adjRoom = floor.rooms.find((r) => r.id === adjId);
        return adjRoom?.roomTypeId === condition.roomTypeId;
      });
    }

    case 'connectedRoomType':
      return isConnectedTo(
        floor.connections,
        room.id,
        condition.roomTypeId!,
        floor.rooms,
      );

    case 'inhabitantType': {
      const assigned = floor.inhabitants.filter(
        (i) => i.assignedRoomId === room.id,
      );
      return assigned.some((i) => {
        const def = contentGetEntry<InhabitantDefinition & IsContentItem>(
          i.definitionId,
        );
        return def?.type === condition.inhabitantType;
      });
    }

    case 'minInhabitants': {
      const count = floor.inhabitants.filter(
        (i) => i.assignedRoomId === room.id,
      ).length;
      return count >= (condition.count ?? 1);
    }

    default:
      return false;
  }
}

export function synergyEvaluateForRoom(
  room: PlacedRoom,
  floor: Floor,
  adjacentRoomIds: string[],
  synergies?: SynergyDefinition[],
): SynergyDefinition[] {
  const defs = synergies ?? synergyGetDefinitions();
  return defs.filter((synergy) =>
    synergy.conditions.every((c) =>
      synergyEvaluateCondition(c, room, floor, adjacentRoomIds),
    ),
  );
}

export function synergyEvaluateAll(
  floors: Floor[],
  synergies?: SynergyDefinition[],
): Map<string, SynergyDefinition[]> {
  const result = new Map<string, SynergyDefinition[]>();

  for (const floor of floors) {
    const adjacencyMap = buildAdjacencyMap(floor);

    for (const room of floor.rooms) {
      const adjInfo = adjacencyMap.get(room.id);
      const adjacentRoomIds = adjInfo?.adjacentIds ?? [];
      const active = synergyEvaluateForRoom(
        room,
        floor,
        adjacentRoomIds,
        synergies,
      );
      if (active.length > 0) {
        result.set(room.id, active);
      }
    }
  }

  return result;
}

export function synergyGetActive(
  roomId: PlacedRoomId,
): SynergyDefinition[] {
  return synergyActiveMap().get(roomId) ?? [];
}

export const synergyActiveMap = computed(() => {
  return synergyEvaluateAll(gamestate().world.floors);
});

function describeCondition(condition: SynergyCondition): string {
  switch (condition.type) {
    case 'adjacentRoomType': {
      const def = productionGetRoomDefinition(condition.roomTypeId!);
      return `Place ${def?.name ?? 'a room'} adjacent`;
    }
    case 'connectedRoomType': {
      const def = productionGetRoomDefinition(condition.roomTypeId!);
      return `Connect to ${def?.name ?? 'a room'}`;
    }
    case 'inhabitantType':
      return `Assign a ${condition.inhabitantType} worker`;
    case 'minInhabitants':
      return `Assign ${condition.count ?? 1}+ inhabitants`;
    default:
      return '';
  }
}

export function synergyGetPotentialForRoom(
  room: PlacedRoom,
  floor: Floor,
  adjacentRoomIds: string[],
  synergies?: SynergyDefinition[],
): PotentialSynergy[] {
  const defs = synergies ?? synergyGetDefinitions();
  const potentials: PotentialSynergy[] = [];

  for (const synergy of defs) {
    const roomTypeCondition = synergy.conditions.find(
      (c) => c.type === 'roomType',
    );
    if (roomTypeCondition && roomTypeCondition.roomTypeId !== room.roomTypeId) {
      continue;
    }

    const conditionResults = synergy.conditions.map((c) => ({
      condition: c,
      met: synergyEvaluateCondition(c, room, floor, adjacentRoomIds),
    }));

    const allMet = conditionResults.every((r) => r.met);
    if (allMet) continue;

    const missing = conditionResults
      .filter((r) => !r.met && r.condition.type !== 'roomType')
      .map((r) => describeCondition(r.condition))
      .filter((d) => d !== '');

    if (missing.length > 0) {
      potentials.push({ synergy, missingConditions: missing });
    }
  }

  return potentials;
}

export function synergyFormatEffect(
  effect: SynergyDefinition['effects'][0],
): string {
  if (effect.type === 'productionBonus') {
    const pct = Math.round(effect.value * 100);
    const resource = effect.resource ? ` ${effect.resource}` : '';
    return `+${pct}%${resource} production`;
  }
  if (effect.type === 'fearReduction') {
    return `-${effect.value} fear`;
  }
  return '';
}
