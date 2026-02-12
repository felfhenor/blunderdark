import { computed } from '@angular/core';
import { getEntry } from '@helpers/content';
import { getRoomDefinition } from '@helpers/production';
import { gamestate } from '@helpers/state-game';
import type {
  InhabitantDefinition,
  InhabitantInstance,
  InhabitantTrait,
  IsContentItem,
  PlacedRoom,
  RoomProduction,
} from '@interfaces';

export type EfficiencyTrait = {
  traitName: string;
  effectValue: number;
  targetResourceType: string | undefined;
};

export type InhabitantContribution = {
  instanceId: string;
  name: string;
  workerEfficiencyBonus: number;
  traitBonuses: Array<{
    traitName: string;
    bonus: number;
    applies: boolean;
  }>;
  totalBonus: number;
};

export type RoomEfficiencyBreakdown = {
  baseEfficiency: number;
  inhabitantBonuses: InhabitantContribution[];
  totalMultiplier: number;
};

/**
 * Extract efficiency-related traits (production_bonus) from an inhabitant definition.
 */
export function getEfficiencyTraits(
  def: InhabitantDefinition,
): EfficiencyTrait[] {
  return def.traits
    .filter((t) => t.effectType === 'production_bonus')
    .map((t) => ({
      traitName: t.name,
      effectValue: t.effectValue,
      targetResourceType: t.targetResourceType,
    }));
}

/**
 * Check if a trait applies to a room based on the room's production resources.
 * A trait with no targetResourceType (or 'all') applies to any producing room.
 * A trait with a specific targetResourceType only applies if the room produces that resource.
 */
export function doesTraitApplyToRoom(
  trait: InhabitantTrait,
  roomProduction: RoomProduction,
): boolean {
  if (!trait.targetResourceType || trait.targetResourceType === 'all') {
    return true;
  }
  const amount = roomProduction[trait.targetResourceType];
  return amount !== undefined && amount > 0;
}

/**
 * Calculate the efficiency bonus for a single inhabitant in a specific room,
 * considering trait-room matching.
 */
export function calculateInhabitantContribution(
  instance: InhabitantInstance,
  roomProduction: RoomProduction,
): InhabitantContribution | null {
  const def = getEntry<InhabitantDefinition & IsContentItem>(
    instance.definitionId,
  );
  if (!def) return null;

  const workerEfficiencyBonus = def.stats.workerEfficiency - 1.0;

  const traitBonuses = def.traits
    .filter((t) => t.effectType === 'production_bonus')
    .map((t) => {
      const applies = doesTraitApplyToRoom(t, roomProduction);
      return {
        traitName: t.name,
        bonus: t.effectValue,
        applies,
      };
    });

  const applicableTraitBonus = traitBonuses
    .filter((t) => t.applies)
    .reduce((sum, t) => sum + t.bonus, 0);

  return {
    instanceId: instance.instanceId,
    name: def.name,
    workerEfficiencyBonus,
    traitBonuses,
    totalBonus: workerEfficiencyBonus + applicableTraitBonus,
  };
}

/**
 * Calculate the full efficiency breakdown for a room.
 * Returns base efficiency (1.0), per-inhabitant contributions, and total multiplier.
 */
export function calculateRoomEfficiency(
  room: PlacedRoom,
  inhabitants: InhabitantInstance[],
): RoomEfficiencyBreakdown {
  const roomDef = getRoomDefinition(room.roomTypeId);
  const roomProduction = roomDef?.production ?? {};

  const assigned = inhabitants.filter(
    (i) => i.assignedRoomId === room.id,
  );

  const inhabitantBonuses: InhabitantContribution[] = [];
  for (const inst of assigned) {
    const contribution = calculateInhabitantContribution(inst, roomProduction);
    if (contribution) {
      inhabitantBonuses.push(contribution);
    }
  }

  const totalBonus = inhabitantBonuses.reduce(
    (sum, c) => sum + c.totalBonus,
    0,
  );

  return {
    baseEfficiency: 1.0,
    inhabitantBonuses,
    totalMultiplier: 1.0 + totalBonus,
  };
}

/**
 * Calculate the inhabitant bonus for a room using trait-room matching.
 * This is the matching-aware version used by the production system.
 */
export function calculateMatchedInhabitantBonus(
  placedRoom: PlacedRoom,
  inhabitants: InhabitantInstance[],
): { bonus: number; hasWorkers: boolean } {
  const roomDef = getRoomDefinition(placedRoom.roomTypeId);
  const roomProduction = roomDef?.production ?? {};

  const assigned = inhabitants.filter(
    (i) => i.assignedRoomId === placedRoom.id,
  );

  if (assigned.length === 0) {
    return { bonus: 0, hasWorkers: false };
  }

  let totalBonus = 0;
  for (const inst of assigned) {
    const def = getEntry<InhabitantDefinition & IsContentItem>(
      inst.definitionId,
    );
    if (!def) continue;

    totalBonus += def.stats.workerEfficiency - 1.0;

    for (const trait of def.traits) {
      if (trait.effectType === 'production_bonus') {
        if (doesTraitApplyToRoom(trait, roomProduction)) {
          totalBonus += trait.effectValue;
        }
      }
    }
  }

  return { bonus: totalBonus, hasWorkers: true };
}

// --- Reactive signals ---

/**
 * Get the efficiency breakdown for a specific room by ID.
 */
export function getRoomEfficiency(roomId: string): RoomEfficiencyBreakdown | null {
  const floors = gamestate().world.floors;
  for (const floor of floors) {
    const room = floor.rooms.find((r) => r.id === roomId);
    if (room) {
      return calculateRoomEfficiency(room, floor.inhabitants);
    }
  }
  return null;
}

/**
 * Average efficiency multiplier across all production rooms.
 */
export const averageDungeonEfficiency = computed<number>(() => {
  const floors = gamestate().world.floors;
  let totalMultiplier = 0;
  let roomCount = 0;

  for (const floor of floors) {
    for (const room of floor.rooms) {
      const roomDef = getRoomDefinition(room.roomTypeId);
      if (!roomDef || !roomDef.production || Object.keys(roomDef.production).length === 0) continue;

      const breakdown = calculateRoomEfficiency(room, floor.inhabitants);
      totalMultiplier += breakdown.totalMultiplier;
      roomCount++;
    }
  }

  return roomCount > 0 ? totalMultiplier / roomCount : 1.0;
});

/**
 * Sum of all efficiency bonuses for a specific resource across all rooms.
 */
export function totalEfficiencyBonusForResource(resourceType: string): number {
  const floors = gamestate().world.floors;
  let totalBonus = 0;

  for (const floor of floors) {
    for (const room of floor.rooms) {
      const roomDef = getRoomDefinition(room.roomTypeId);
      if (!roomDef?.production?.[resourceType]) continue;

      const breakdown = calculateRoomEfficiency(room, floor.inhabitants);
      totalBonus += breakdown.totalMultiplier - 1.0;
    }
  }

  return totalBonus;
}
