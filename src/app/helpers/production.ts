import { getEntry } from '@helpers/content';
import type {
  InhabitantDefinition,
  InhabitantInstance,
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
