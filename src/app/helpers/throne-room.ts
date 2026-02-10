import { computed } from '@angular/core';
import { getEntry } from '@helpers/content';
import { gamestate } from '@helpers/state-game';
import type {
  Floor,
  InhabitantDefinition,
  InhabitantInstance,
  IsContentItem,
  PlacedRoom,
  RulerBonuses,
} from '@interfaces';

export const THRONE_ROOM_TYPE_ID = 'aa100001-0001-0001-0001-000000000001';

// --- Pure functions ---

/**
 * Find the placed Throne Room across all floors.
 * Returns the floor and room if found.
 */
export function findThroneRoom(
  floors: Floor[],
): { floor: Floor; room: PlacedRoom } | null {
  for (const floor of floors) {
    const room = floor.rooms.find(
      (r) => r.roomTypeId === THRONE_ROOM_TYPE_ID,
    );
    if (room) return { floor, room };
  }
  return null;
}

/**
 * Get the seated ruler instance from a floor's inhabitants.
 */
export function getSeatedRulerInstance(
  floor: Floor,
  throneRoomId: string,
): InhabitantInstance | null {
  return (
    floor.inhabitants.find((i) => i.assignedRoomId === throneRoomId) ?? null
  );
}

/**
 * Get the ruler definition for a seated ruler instance.
 */
export function getRulerDefinition(
  instance: InhabitantInstance,
): (InhabitantDefinition & IsContentItem) | null {
  return getEntry<InhabitantDefinition & IsContentItem>(instance.definitionId) ?? null;
}

/**
 * Get the active ruler bonuses from the current game state floors.
 * Returns an empty record if no Throne Room or no seated ruler.
 */
export function getActiveRulerBonuses(floors: Floor[]): RulerBonuses {
  const throne = findThroneRoom(floors);
  if (!throne) return {};

  const ruler = getSeatedRulerInstance(throne.floor, throne.room.id);
  if (!ruler) return {};

  const def = getRulerDefinition(ruler);
  if (!def) return {};

  return { ...def.rulerBonuses };
}

/**
 * Get a specific ruler bonus value. Returns 0 if not active.
 */
export function getRulerBonusValue(
  floors: Floor[],
  bonusType: string,
): number {
  const bonuses = getActiveRulerBonuses(floors);
  return bonuses[bonusType] ?? 0;
}

// --- Computed signals ---

/**
 * The currently seated ruler instance, or null if no Throne Room or empty.
 */
export const seatedRuler = computed<InhabitantInstance | null>(() => {
  const floors = gamestate().world.floors;
  const throne = findThroneRoom(floors);
  if (!throne) return null;
  return getSeatedRulerInstance(throne.floor, throne.room.id);
});

/**
 * The active ruler bonuses as a reactive signal.
 */
export const activeRulerBonuses = computed<RulerBonuses>(() => {
  return getActiveRulerBonuses(gamestate().world.floors);
});

/**
 * Get a specific bonus type's value reactively.
 */
export function rulerBonus(bonusType: string): number {
  return activeRulerBonuses()[bonusType] ?? 0;
}
