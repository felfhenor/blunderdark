import { areRoomsAdjacent } from '@helpers/adjacency';
import { getEntry } from '@helpers/content';
import { getAbsoluteTiles, resolveRoomShape } from '@helpers/room-shapes';
import type {
  Floor,
  GameState,
  InhabitantDefinition,
  InhabitantInstance,
  InhabitantState,
  IsContentItem,
  PlacedRoom,
  ResourceType,
  RoomDefinition,
  RoomProduction,
  TileOffset,
} from '@interfaces';

export type InhabitantBonusResult = {
  bonus: number;
  hasWorkers: boolean;
};

export function getBaseProduction(roomTypeId: string): RoomProduction {
  const room = getEntry<RoomDefinition & IsContentItem>(roomTypeId);
  if (!room) return {};
  return room.production ?? {};
}

export function getRoomDefinition(
  roomTypeId: string,
): (RoomDefinition & IsContentItem) | undefined {
  return getEntry<RoomDefinition & IsContentItem>(roomTypeId);
}

export function getInhabitantDefinition(
  definitionId: string,
): (InhabitantDefinition & IsContentItem) | undefined {
  return getEntry<InhabitantDefinition & IsContentItem>(definitionId);
}

export function calculateInhabitantBonus(
  placedRoom: PlacedRoom,
  inhabitants: InhabitantInstance[],
): InhabitantBonusResult {
  const assignedInhabitants = inhabitants.filter(
    (i) => i.assignedRoomId === placedRoom.id,
  );

  if (assignedInhabitants.length === 0) {
    return { bonus: 0, hasWorkers: false };
  }

  let totalBonus = 0;

  for (const inhabitant of assignedInhabitants) {
    const def = getEntry<InhabitantDefinition & IsContentItem>(
      inhabitant.definitionId,
    );
    if (!def) continue;

    totalBonus += def.stats.workerEfficiency - 1.0;

    for (const trait of def.traits) {
      if (trait.effectType === 'production_bonus') {
        totalBonus += trait.effectValue;
      }
    }
  }

  return { bonus: totalBonus, hasWorkers: true };
}

export function calculateAdjacencyBonus(
  placedRoom: PlacedRoom,
  adjacentRoomIds: string[],
  allPlacedRooms: PlacedRoom[],
): number {
  const roomDef = getRoomDefinition(placedRoom.roomTypeId);
  if (!roomDef) return 0;

  const bonusRules = roomDef.adjacencyBonuses;
  if (bonusRules.length === 0) return 0;

  const adjacentRoomTypeIds = new Map<string, number>();
  for (const adjId of adjacentRoomIds) {
    const adjRoom = allPlacedRooms.find((r) => r.id === adjId);
    if (!adjRoom) continue;
    const count = adjacentRoomTypeIds.get(adjRoom.roomTypeId) ?? 0;
    adjacentRoomTypeIds.set(adjRoom.roomTypeId, count + 1);
  }

  let totalBonus = 0;
  for (const rule of bonusRules) {
    const matchCount = adjacentRoomTypeIds.get(rule.adjacentRoomType) ?? 0;
    totalBonus += rule.bonus * matchCount;
  }

  return totalBonus;
}

const STATE_MODIFIERS: Record<InhabitantState, number> = {
  normal: 1.0,
  scared: 0.5,
  hungry: 0.75,
};

export function calculateConditionalModifiers(
  placedRoom: PlacedRoom,
  inhabitants: InhabitantInstance[],
): number {
  const assigned = inhabitants.filter(
    (i) => i.assignedRoomId === placedRoom.id,
  );

  if (assigned.length === 0) return 1.0;

  const activeStates = new Set(assigned.map((i) => i.state));

  let multiplier = 1.0;
  for (const state of activeStates) {
    multiplier *= STATE_MODIFIERS[state];
  }

  return multiplier;
}

export function calculateTotalProduction(floors: Floor[]): RoomProduction {
  const totalProduction: RoomProduction = {};

  for (const floor of floors) {
    const roomTiles = new Map<string, TileOffset[]>();
    for (const room of floor.rooms) {
      const shape = resolveRoomShape(room);
      roomTiles.set(
        room.id,
        getAbsoluteTiles(shape, room.anchorX, room.anchorY),
      );
    }

    for (const room of floor.rooms) {
      const roomDef = getRoomDefinition(room.roomTypeId);
      if (!roomDef) continue;

      const base = roomDef.production;
      if (!base || Object.keys(base).length === 0) continue;

      const { bonus: inhabitantBonus, hasWorkers } = calculateInhabitantBonus(
        room,
        floor.inhabitants,
      );

      if (roomDef.requiresWorkers && !hasWorkers) continue;

      const thisTiles = roomTiles.get(room.id) ?? [];
      const adjacentRoomIds: string[] = [];
      for (const other of floor.rooms) {
        if (other.id === room.id) continue;
        const otherTiles = roomTiles.get(other.id) ?? [];
        if (areRoomsAdjacent(thisTiles, otherTiles)) {
          adjacentRoomIds.push(other.id);
        }
      }

      const adjacencyBonus = calculateAdjacencyBonus(
        room,
        adjacentRoomIds,
        floor.rooms,
      );
      const modifier = calculateConditionalModifiers(room, floor.inhabitants);

      for (const [resourceType, baseAmount] of Object.entries(base)) {
        if (!baseAmount) continue;
        const final =
          baseAmount * (1 + inhabitantBonus + adjacencyBonus) * modifier;
        totalProduction[resourceType] =
          (totalProduction[resourceType] ?? 0) + final;
      }
    }
  }

  return totalProduction;
}

export function processProduction(state: GameState): void {
  const production = calculateTotalProduction(state.world.floors);

  for (const [type, amount] of Object.entries(production)) {
    if (amount <= 0) continue;
    const resourceType = type as ResourceType;
    const resource = state.world.resources[resourceType];
    if (!resource) continue;
    const available = resource.max - resource.current;
    resource.current += Math.min(amount, available);
  }
}
