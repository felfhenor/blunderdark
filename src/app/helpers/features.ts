import { contentGetEntry } from '@helpers/content';
import type { FeatureBonus, FeatureBonusType, FeatureContent } from '@interfaces/content-feature';
import type { PlacedRoom } from '@interfaces/room-shape';

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
