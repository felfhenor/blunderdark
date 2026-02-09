import { getEntry } from '@helpers/content';
import type {
  InhabitantDefinition,
  InhabitantInstance,
  InhabitantState,
  IsContentItem,
  PlacedRoom,
  RoomDefinition,
  RoomProduction,
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
