import { contentGetEntry } from '@helpers/content';
import type { FeatureBonus, FeatureBonusType, FeatureContent } from '@interfaces/content-feature';
import type { RoomProduction } from '@interfaces/room';
import type { PlacedRoom, SacrificeBuff } from '@interfaces/room-shape';

/**
 * Get the FeatureContent for a room's attached feature, if any.
 */
export function featureGetForRoom(
  placedRoom: PlacedRoom,
): FeatureContent | undefined {
  if (!placedRoom.featureId) return undefined;
  return contentGetEntry<FeatureContent>(placedRoom.featureId);
}

/**
 * Get all bonuses of a specific type from a room's attached feature.
 */
export function featureGetBonuses(
  placedRoom: PlacedRoom,
  bonusType: FeatureBonusType,
): FeatureBonus[] {
  const feature = featureGetForRoom(placedRoom);
  if (!feature) return [];
  return feature.bonuses.filter((b) => b.type === bonusType);
}

/**
 * Calculate the fear reduction from a room's attached feature.
 * Returns the total fear reduction value (positive number to subtract).
 */
export function featureCalculateFearReduction(
  placedRoom: PlacedRoom,
): number {
  const bonuses = featureGetBonuses(placedRoom, 'fear_reduction');
  let reduction = 0;
  for (const bonus of bonuses) {
    // Only count non-targeted fear reduction (Bioluminescent Moss)
    // Targeted fear reduction (Coffins - undead only) is handled separately
    if (!bonus.targetType) {
      reduction += bonus.value;
    }
  }
  return reduction;
}

/**
 * Calculate the capacity bonus from a room's attached feature for a specific inhabitant type.
 * Coffins add +1 capacity for undead inhabitants.
 */
export function featureCalculateCapacityBonus(
  placedRoom: PlacedRoom,
  inhabitantType?: string,
): number {
  const bonuses = featureGetBonuses(placedRoom, 'capacity_bonus');
  let bonus = 0;
  for (const b of bonuses) {
    if (!b.targetType || b.targetType === inhabitantType) {
      bonus += b.value;
    }
  }
  return bonus;
}

/**
 * Calculate the adjacent production bonus from features on adjacent rooms.
 * Bioluminescent Moss grants +5% to adjacent rooms.
 */
export function featureCalculateAdjacentProductionBonus(
  adjacentRooms: PlacedRoom[],
): number {
  let bonus = 0;
  for (const adjRoom of adjacentRooms) {
    const adjBonuses = featureGetBonuses(adjRoom, 'adjacent_production');
    for (const b of adjBonuses) {
      bonus += b.value;
    }
  }
  return bonus;
}

/**
 * Calculate flat production from a room's attached feature.
 * Arcane Crystals add +1 Flux per minute (returned as per-tick values).
 * Returns a RoomProduction map keyed by resource type.
 */
export function featureCalculateFlatProduction(
  placedRoom: PlacedRoom,
  ticksPerMinute: number,
): RoomProduction {
  const bonuses = featureGetBonuses(placedRoom, 'flat_production');
  const result: RoomProduction = {};
  for (const bonus of bonuses) {
    if (bonus.targetType) {
      result[bonus.targetType] =
        (result[bonus.targetType] ?? 0) + bonus.value / ticksPerMinute;
    }
  }
  return result;
}

/**
 * Calculate the production multiplier bonus from a room's own attached feature.
 * Arcane Crystals: +15% for flux. Geothermal Vents: +15% for all.
 * Returns the bonus as a fraction (e.g. 0.15 for 15%).
 */
export function featureCalculateProductionBonus(
  placedRoom: PlacedRoom,
  resourceType?: string,
): number {
  const bonuses = featureGetBonuses(placedRoom, 'production_bonus');
  let total = 0;
  for (const bonus of bonuses) {
    if (!bonus.targetType || bonus.targetType === resourceType) {
      total += bonus.value;
    }
  }
  return total;
}

/**
 * Get combat bonuses from a room's attached feature.
 * Geothermal Vents grant fire damage bonus.
 * Returns array of { value, targetType } for consumption by combat system.
 */
export function featureGetCombatBonuses(
  placedRoom: PlacedRoom,
): FeatureBonus[] {
  return featureGetBonuses(placedRoom, 'combat_bonus');
}

/**
 * Calculate per-tick corruption generation from features across all rooms.
 * Blood Altar generates +2 Corruption per minute when attached.
 */
export function featureCalculateCorruptionGenerationPerTick(
  rooms: PlacedRoom[],
  ticksPerMinute: number,
): number {
  let totalPerMinute = 0;
  for (const room of rooms) {
    const bonuses = featureGetBonuses(room, 'corruption_generation');
    for (const bonus of bonuses) {
      totalPerMinute += bonus.value;
    }
  }
  return totalPerMinute / ticksPerMinute;
}

// --- Blood Altar Sacrifice ---

export const FEATURE_SACRIFICE_FOOD_COST = 25;
export const FEATURE_SACRIFICE_BUFF_TICKS = 50; // 10 minutes
export const FEATURE_SACRIFICE_PRODUCTION_MULTIPLIER = 0.25;
export const FEATURE_SACRIFICE_COMBAT_MULTIPLIER = 0.15;

/**
 * Check if a sacrifice can be performed on a room with a Blood Altar.
 */
export function featureCanSacrifice(
  placedRoom: PlacedRoom,
  currentFood: number,
): { allowed: boolean; reason?: string } {
  const feature = featureGetForRoom(placedRoom);
  if (!feature) {
    return { allowed: false, reason: 'Room has no feature attached' };
  }

  const hasCorruptionGen = feature.bonuses.some(
    (b) => b.type === 'corruption_generation',
  );
  if (!hasCorruptionGen) {
    return { allowed: false, reason: 'Feature does not support sacrifice' };
  }

  if (placedRoom.sacrificeBuff) {
    return { allowed: false, reason: 'Sacrifice buff already active' };
  }

  if (currentFood < FEATURE_SACRIFICE_FOOD_COST) {
    return { allowed: false, reason: 'Not enough Food' };
  }

  return { allowed: true };
}

/**
 * Create a sacrifice buff for a room with a Blood Altar.
 */
export function featureCreateSacrificeBuff(): SacrificeBuff {
  return {
    productionMultiplier: FEATURE_SACRIFICE_PRODUCTION_MULTIPLIER,
    combatMultiplier: FEATURE_SACRIFICE_COMBAT_MULTIPLIER,
    ticksRemaining: FEATURE_SACRIFICE_BUFF_TICKS,
  };
}

/**
 * Process sacrifice buff tick-down for all rooms on a floor.
 * Removes expired buffs. Mutates rooms in-place.
 */
export function featureSacrificeProcess(rooms: PlacedRoom[]): void {
  for (const room of rooms) {
    if (!room.sacrificeBuff) continue;
    room.sacrificeBuff.ticksRemaining--;
    if (room.sacrificeBuff.ticksRemaining <= 0) {
      room.sacrificeBuff = undefined;
    }
  }
}
