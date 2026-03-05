import { computed } from '@angular/core';
import { contentGetEntry } from '@helpers/content';
import { effectiveStatsCalculate } from '@helpers/effective-stats';
import { productionGetRoomDefinition } from '@helpers/production';
import { gamestate } from '@helpers/state-game';
import type {
  InhabitantInstance,
  InhabitantTraitContent,
  PlacedRoom,
  PlacedRoomId,
  RoomProduction,
  TraitEffect,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { EfficiencyTrait, InhabitantContribution, RoomEfficiencyBreakdown } from '@interfaces/efficiency';

/**
 * Extract efficiency-related traits (production_multiplier) from an inhabitant definition.
 */
export function efficiencyGetTraits(
  def: InhabitantContent,
): EfficiencyTrait[] {
  const result: EfficiencyTrait[] = [];
  for (const trait of def.traits) {
    for (const effect of trait.effects) {
      if (effect.effectType === 'production_multiplier' || effect.effectType === 'room_versatility') {
        result.push({
          traitName: trait.name,
          effectValue: effect.effectValue,
          targetResourceType: effect.targetResourceType,
        });
      }
    }
  }
  return result;
}

/**
 * Check if an effect applies to a room based on the room's production resources.
 * An effect with no targetResourceType (or 'all') applies to any producing room.
 * An effect with a specific targetResourceType only applies if the room produces that resource.
 */
export function efficiencyDoesTraitApply(
  effect: Pick<TraitEffect, 'targetResourceType'>,
  roomProduction: RoomProduction,
): boolean {
  if (!effect.targetResourceType || effect.targetResourceType === 'all') {
    return true;
  }
  const amount = roomProduction[effect.targetResourceType];
  return amount !== undefined && amount > 0;
}

/**
 * Calculate the efficiency bonus for a single inhabitant in a specific room,
 * considering trait-room matching.
 */
export function efficiencyCalculateInhabitantContribution(
  instance: InhabitantInstance,
  roomProduction: RoomProduction,
  roommates?: InhabitantInstance[],
): InhabitantContribution | undefined {
  const def = contentGetEntry<InhabitantContent>(
    instance.definitionId,
  );
  if (!def) return undefined;

  const stats = effectiveStatsCalculate(def, instance, roommates);
  const workerEfficiencyBonus = stats.workerEfficiency;

  const traitBonuses: { traitName: string; bonus: number; applies: boolean }[] = [];
  for (const trait of def.traits) {
    for (const effect of trait.effects) {
      if (effect.effectType === 'production_multiplier') {
        const applies = efficiencyDoesTraitApply(effect, roomProduction);
        traitBonuses.push({
          traitName: trait.name,
          bonus: effect.effectValue,
          applies,
        });
      } else if (effect.effectType === 'room_versatility') {
        traitBonuses.push({
          traitName: trait.name,
          bonus: effect.effectValue,
          applies: true,
        });
      }
    }
  }

  // Equipped trait production bonuses (from masterwork forge items)
  if (instance.equippedTraitIds) {
    for (const traitId of instance.equippedTraitIds) {
      const eqTrait = contentGetEntry<InhabitantTraitContent>(traitId);
      if (!eqTrait) continue;
      for (const effect of eqTrait.effects) {
        if (effect.effectType === 'production_multiplier') {
          const applies = efficiencyDoesTraitApply(effect, roomProduction);
          traitBonuses.push({
            traitName: eqTrait.name,
            bonus: effect.effectValue,
            applies,
          });
        } else if (effect.effectType === 'room_versatility') {
          traitBonuses.push({
            traitName: eqTrait.name,
            bonus: effect.effectValue,
            applies: true,
          });
        }
      }
    }
  }

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
export function efficiencyCalculateRoom(
  room: PlacedRoom,
  inhabitants: InhabitantInstance[],
): RoomEfficiencyBreakdown {
  const roomDef = productionGetRoomDefinition(room.roomTypeId);
  const roomProduction = roomDef?.production ?? {};

  const assigned = inhabitants.filter(
    (i) => i.assignedRoomId === room.id,
  );

  const inhabitantBonuses: InhabitantContribution[] = [];
  for (const inst of assigned) {
    const contribution = efficiencyCalculateInhabitantContribution(inst, roomProduction, assigned);
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
export function efficiencyCalculateMatchedInhabitantBonus(
  placedRoom: PlacedRoom,
  inhabitants: InhabitantInstance[],
): { bonus: number; hasWorkers: boolean } {
  const roomDef = productionGetRoomDefinition(placedRoom.roomTypeId);
  const roomProduction = roomDef?.production ?? {};

  const assigned = inhabitants.filter(
    (i) => i.assignedRoomId === placedRoom.id,
  );

  if (assigned.length === 0) {
    return { bonus: 0, hasWorkers: false };
  }

  let totalBonus = 0;
  for (const inst of assigned) {
    const def = contentGetEntry<InhabitantContent>(
      inst.definitionId,
    );
    if (!def) continue;

    const stats = effectiveStatsCalculate(def, inst, assigned);
    totalBonus += stats.workerEfficiency;

    for (const trait of def.traits) {
      for (const effect of trait.effects) {
        if (effect.effectType === 'production_multiplier') {
          if (efficiencyDoesTraitApply(effect, roomProduction)) {
            totalBonus += effect.effectValue;
          }
        } else if (effect.effectType === 'room_versatility') {
          totalBonus += effect.effectValue;
        }
      }
    }

    // Equipped trait production bonuses (from masterwork forge items)
    if (inst.equippedTraitIds) {
      for (const traitId of inst.equippedTraitIds) {
        const eqTrait = contentGetEntry<InhabitantTraitContent>(traitId);
        if (!eqTrait) continue;
        for (const effect of eqTrait.effects) {
          if (effect.effectType === 'production_multiplier') {
            if (efficiencyDoesTraitApply(effect, roomProduction)) {
              totalBonus += effect.effectValue;
            }
          } else if (effect.effectType === 'room_versatility') {
            totalBonus += effect.effectValue;
          }
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
export function efficiencyGetRoom(roomId: PlacedRoomId): RoomEfficiencyBreakdown | undefined {
  const floors = gamestate().world.floors;
  for (const floor of floors) {
    const room = floor.rooms.find((r) => r.id === roomId);
    if (room) {
      return efficiencyCalculateRoom(room, floor.inhabitants);
    }
  }
  return undefined;
}

/**
 * Average efficiency multiplier across all production rooms.
 */
export const efficiencyAverageDungeon = computed<number>(() => {
  const floors = gamestate().world.floors;
  let totalMultiplier = 0;
  let roomCount = 0;

  for (const floor of floors) {
    for (const room of floor.rooms) {
      const roomDef = productionGetRoomDefinition(room.roomTypeId);
      if (!roomDef || !roomDef.production || Object.keys(roomDef.production).length === 0) continue;

      const breakdown = efficiencyCalculateRoom(room, floor.inhabitants);
      totalMultiplier += breakdown.totalMultiplier;
      roomCount++;
    }
  }

  return roomCount > 0 ? totalMultiplier / roomCount : 1.0;
});

/**
 * Sum of all efficiency bonuses for a specific resource across all rooms.
 */
export function efficiencyTotalBonusForResource(resourceType: string): number {
  const floors = gamestate().world.floors;
  let totalBonus = 0;

  for (const floor of floors) {
    for (const room of floor.rooms) {
      const roomDef = productionGetRoomDefinition(room.roomTypeId);
      if (!roomDef?.production?.[resourceType]) continue;

      const breakdown = efficiencyCalculateRoom(room, floor.inhabitants);
      totalBonus += breakdown.totalMultiplier - 1.0;
    }
  }

  return totalBonus;
}
