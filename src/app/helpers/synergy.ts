import { computed } from '@angular/core';
import { areRoomsAdjacent } from '@helpers/adjacency';
import { getEntry } from '@helpers/content';
import { getRoomDefinition } from '@helpers/production';
import { getAbsoluteTiles, resolveRoomShape } from '@helpers/room-shapes';
import { gamestate } from '@helpers/state-game';
import type {
  Connection,
  Floor,
  InhabitantDefinition,
  IsContentItem,
  PlacedRoom,
  SynergyCondition,
  SynergyDefinition,
  TileOffset,
} from '@interfaces';

// Room type ID constants for synergy definitions
const CRYSTAL_MINE = 'aa100001-0001-0001-0001-000000000002';
const MUSHROOM_GROVE = 'aa100001-0001-0001-0001-000000000003';
const SHADOW_LIBRARY = 'aa100001-0001-0001-0001-000000000004';
const SOUL_WELL = 'aa100001-0001-0001-0001-000000000005';
const DARK_FORGE = 'aa100001-0001-0001-0001-000000000006';
const BARRACKS = 'aa100001-0001-0001-0001-000000000007';
const TREASURE_VAULT = 'aa100001-0001-0001-0001-000000000008';

export const SYNERGY_DEFINITIONS: SynergyDefinition[] = [
  {
    id: 'synergy-dark-industry',
    name: 'Dark Industry',
    description:
      'Goblin miners near a Dark Forge extract crystals with forge-heated tools.',
    conditions: [
      { type: 'roomType', roomTypeId: CRYSTAL_MINE },
      { type: 'adjacentRoomType', roomTypeId: DARK_FORGE },
      { type: 'inhabitantType', inhabitantType: 'creature' },
    ],
    effects: [{ type: 'productionBonus', value: 0.15, resource: 'crystals' }],
  },
  {
    id: 'synergy-verdant-communion',
    name: 'Verdant Communion',
    description:
      'Myconid workers harmonize with Soul Well energy for explosive fungal growth.',
    conditions: [
      { type: 'roomType', roomTypeId: MUSHROOM_GROVE },
      { type: 'adjacentRoomType', roomTypeId: SOUL_WELL },
      { type: 'inhabitantType', inhabitantType: 'fungal' },
    ],
    effects: [{ type: 'productionBonus', value: 0.2, resource: 'food' }],
  },
  {
    id: 'synergy-arcane-resonance',
    name: 'Arcane Resonance',
    description:
      'A spiritual connection between the library and well amplifies research.',
    conditions: [
      { type: 'roomType', roomTypeId: SHADOW_LIBRARY },
      { type: 'connectedRoomType', roomTypeId: SOUL_WELL },
    ],
    effects: [{ type: 'productionBonus', value: 0.15, resource: 'research' }],
  },
  {
    id: 'synergy-forge-master',
    name: 'Forge Master',
    description:
      'A fully-staffed forge operates at peak efficiency with specialized workers.',
    conditions: [
      { type: 'roomType', roomTypeId: DARK_FORGE },
      { type: 'minInhabitants', count: 2 },
    ],
    effects: [{ type: 'productionBonus', value: 0.1, resource: 'gold' }],
  },
  {
    id: 'synergy-treasury-guard',
    name: 'Treasury Guard',
    description:
      'Barracks guards protect the vault, enabling more efficient gold storage.',
    conditions: [
      { type: 'roomType', roomTypeId: TREASURE_VAULT },
      { type: 'adjacentRoomType', roomTypeId: BARRACKS },
    ],
    effects: [{ type: 'productionBonus', value: 0.2, resource: 'gold' }],
  },
];

function buildAdjacencyMap(
  floor: Floor,
): Map<string, { adjacentIds: string[]; tiles: TileOffset[] }> {
  const roomTiles = new Map<string, TileOffset[]>();
  for (const room of floor.rooms) {
    const shape = resolveRoomShape(room);
    roomTiles.set(
      room.id,
      getAbsoluteTiles(shape, room.anchorX, room.anchorY),
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
      if (areRoomsAdjacent(thisTiles, otherTiles)) {
        adjacentIds.push(other.id);
      }
    }
    map.set(room.id, { adjacentIds, tiles: thisTiles });
  }

  return map;
}

function isConnectedTo(
  connections: Connection[],
  roomId: string,
  targetRoomTypeId: string,
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

export function evaluateCondition(
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
        const def = getEntry<InhabitantDefinition & IsContentItem>(
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

export function evaluateSynergiesForRoom(
  room: PlacedRoom,
  floor: Floor,
  adjacentRoomIds: string[],
  synergies?: SynergyDefinition[],
): SynergyDefinition[] {
  const defs = synergies ?? SYNERGY_DEFINITIONS;
  return defs.filter((synergy) =>
    synergy.conditions.every((c) =>
      evaluateCondition(c, room, floor, adjacentRoomIds),
    ),
  );
}

export function evaluateAllSynergies(
  floors: Floor[],
  synergies?: SynergyDefinition[],
): Map<string, SynergyDefinition[]> {
  const result = new Map<string, SynergyDefinition[]>();

  for (const floor of floors) {
    const adjacencyMap = buildAdjacencyMap(floor);

    for (const room of floor.rooms) {
      const adjInfo = adjacencyMap.get(room.id);
      const adjacentRoomIds = adjInfo?.adjacentIds ?? [];
      const active = evaluateSynergiesForRoom(
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

export function getActiveSynergies(
  roomId: string,
): SynergyDefinition[] {
  return activeSynergyMap().get(roomId) ?? [];
}

export const activeSynergyMap = computed(() => {
  return evaluateAllSynergies(gamestate().world.floors);
});

export type PotentialSynergy = {
  synergy: SynergyDefinition;
  missingConditions: string[];
};

function describeCondition(condition: SynergyCondition): string {
  switch (condition.type) {
    case 'adjacentRoomType': {
      const def = getRoomDefinition(condition.roomTypeId!);
      return `Place ${def?.name ?? 'a room'} adjacent`;
    }
    case 'connectedRoomType': {
      const def = getRoomDefinition(condition.roomTypeId!);
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

export function getPotentialSynergiesForRoom(
  room: PlacedRoom,
  floor: Floor,
  adjacentRoomIds: string[],
  synergies?: SynergyDefinition[],
): PotentialSynergy[] {
  const defs = synergies ?? SYNERGY_DEFINITIONS;
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
      met: evaluateCondition(c, room, floor, adjacentRoomIds),
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

export function formatSynergyEffect(
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
