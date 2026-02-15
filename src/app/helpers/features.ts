import { contentGetEntry } from '@helpers/content';
import type {
  FeatureBonus,
  FeatureBonusType,
  FeatureContent,
  FeatureId,
} from '@interfaces/content-feature';
import type { Floor } from '@interfaces/floor';
import type { InhabitantInstance } from '@interfaces/inhabitant';
import type { RoomProduction } from '@interfaces/room';
import type { PlacedRoom, PlacedRoomId, SacrificeBuff } from '@interfaces/room-shape';

export const FEATURE_SLOT_COUNT_SMALL = 2;
export const FEATURE_SLOT_COUNT_LARGE = 3;
export const FEATURE_SLOT_SIZE_THRESHOLD = 3;

/**
 * Get the number of feature slots for a room based on its tile count.
 * Small rooms (1-2 tiles) get 2 slots; large rooms (3+ tiles) get 3 slots.
 */
export function featureGetSlotCount(tileCount: number): number {
  return tileCount < FEATURE_SLOT_SIZE_THRESHOLD
    ? FEATURE_SLOT_COUNT_SMALL
    : FEATURE_SLOT_COUNT_LARGE;
}

/**
 * Get all FeatureContent entries for a room's attached features.
 */
export function featureGetAllForRoom(
  placedRoom: PlacedRoom,
): FeatureContent[] {
  if (!placedRoom.featureIds || placedRoom.featureIds.length === 0) return [];
  const features: FeatureContent[] = [];
  for (const fid of placedRoom.featureIds) {
    if (!fid) continue;
    const content = contentGetEntry<FeatureContent>(fid);
    if (content) features.push(content);
  }
  return features;
}

/**
 * Get the FeatureContent for a specific slot index on a room.
 */
export function featureGetForSlot(
  placedRoom: PlacedRoom,
  slotIndex: number,
): FeatureContent | undefined {
  const fid = placedRoom.featureIds?.[slotIndex];
  if (!fid) return undefined;
  return contentGetEntry<FeatureContent>(fid);
}

/**
 * Get all bonuses of a specific type from all of a room's attached features.
 */
export function featureGetBonuses(
  placedRoom: PlacedRoom,
  bonusType: FeatureBonusType,
): FeatureBonus[] {
  const features = featureGetAllForRoom(placedRoom);
  const bonuses: FeatureBonus[] = [];
  for (const feature of features) {
    for (const b of feature.bonuses) {
      if (b.type === bonusType) bonuses.push(b);
    }
  }
  return bonuses;
}

/**
 * Calculate the fear reduction from all of a room's attached features.
 * Returns the total fear reduction value (positive number to subtract).
 */
export function featureCalculateFearReduction(
  placedRoom: PlacedRoom,
): number {
  const bonuses = featureGetBonuses(placedRoom, 'fear_reduction');
  let reduction = 0;
  for (const bonus of bonuses) {
    if (!bonus.targetType) {
      reduction += bonus.value;
    }
  }
  return reduction;
}

/**
 * Calculate the capacity bonus from all of a room's attached features for a specific inhabitant type.
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
 * Calculate flat production from all of a room's attached features.
 * Returns a RoomProduction map keyed by resource type (per-tick values).
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
 * Calculate the production multiplier bonus from all of a room's attached features.
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
 * Get combat bonuses from all of a room's attached features.
 */
export function featureGetCombatBonuses(
  placedRoom: PlacedRoom,
): FeatureBonus[] {
  return featureGetBonuses(placedRoom, 'combat_bonus');
}

/**
 * Calculate per-tick corruption generation from features across all rooms.
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

// --- Storage Bonus ---

/**
 * Calculate the total storage bonus multiplier from all rooms across all floors.
 * Each storage_bonus feature adds its value (e.g. 1.0 = +100%) to the multiplier.
 * Returns a multiplier >= 1.0 (e.g. 2.0 for one storage expansion with value 1.0).
 */
export function featureCalculateStorageBonusMultiplier(
  floors: Floor[],
): number {
  let totalBonus = 0;
  for (const floor of floors) {
    for (const room of floor.rooms) {
      const bonuses = featureGetBonuses(room, 'storage_bonus');
      for (const b of bonuses) {
        totalBonus += b.value;
      }
    }
  }
  return 1 + totalBonus;
}

/**
 * Check if any room on any floor has a corruption_seal feature.
 * Returns a set of PlacedRoomIds that have corruption seals.
 */
export function featureGetCorruptionSealedRoomIds(
  floors: Floor[],
): Set<string> {
  const sealed = new Set<string>();
  for (const floor of floors) {
    for (const room of floor.rooms) {
      const bonuses = featureGetBonuses(room, 'corruption_seal');
      if (bonuses.length > 0) {
        sealed.add(room.id);
      }
    }
  }
  return sealed;
}

/**
 * Calculate XP gain per tick from training_xp features on a room.
 */
export function featureCalculateTrainingXpPerTick(
  placedRoom: PlacedRoom,
): number {
  const bonuses = featureGetBonuses(placedRoom, 'training_xp');
  let total = 0;
  for (const b of bonuses) {
    total += b.value;
  }
  return total;
}

/**
 * Get the resource converter bonus on a room (if any).
 * Returns the conversion efficiency (e.g. 0.75 for 75%) or undefined if no converter.
 */
export function featureGetResourceConverterEfficiency(
  placedRoom: PlacedRoom,
): number | undefined {
  const bonuses = featureGetBonuses(placedRoom, 'resource_converter');
  if (bonuses.length === 0) return undefined;
  return bonuses[0].value;
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
  const features = featureGetAllForRoom(placedRoom);
  if (features.length === 0) {
    return { allowed: false, reason: 'Room has no feature attached' };
  }

  const hasCorruptionGen = features.some((f) =>
    f.bonuses.some((b) => b.type === 'corruption_generation'),
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

// --- Fungal Network ---

/**
 * Check if a room has a Fungal Network feature (teleport_link bonus).
 */
export function featureHasFungalNetwork(placedRoom: PlacedRoom): boolean {
  return featureGetBonuses(placedRoom, 'teleport_link').length > 0;
}

/**
 * Get all rooms on floors that have Fungal Network features, excluding a given room.
 */
export function featureGetFungalNetworkDestinations(
  floors: Floor[],
  sourceRoomId: PlacedRoomId,
): { floor: Floor; room: PlacedRoom }[] {
  const destinations: { floor: Floor; room: PlacedRoom }[] = [];
  for (const floor of floors) {
    for (const room of floor.rooms) {
      if (room.id === sourceRoomId) continue;
      if (featureHasFungalNetwork(room)) {
        destinations.push({ floor, room });
      }
    }
  }
  return destinations;
}

/**
 * Check if an inhabitant can be transferred via Fungal Network.
 */
export function featureCanFungalTransfer(
  floors: Floor[],
  sourceRoom: PlacedRoom,
  inhabitant: InhabitantInstance,
): { allowed: boolean; reason?: string } {
  if (!featureHasFungalNetwork(sourceRoom)) {
    return { allowed: false, reason: 'Source room has no Fungal Network' };
  }

  if (inhabitant.assignedRoomId !== sourceRoom.id) {
    return { allowed: false, reason: 'Inhabitant is not assigned to this room' };
  }

  const destinations = featureGetFungalNetworkDestinations(floors, sourceRoom.id);
  if (destinations.length === 0) {
    return { allowed: false, reason: 'No other Fungal Network rooms available' };
  }

  return { allowed: true };
}

/**
 * Transfer an inhabitant instantly via Fungal Network.
 */
export function featureFungalTransfer(
  inhabitant: InhabitantInstance,
  destinationRoomId: PlacedRoomId,
): void {
  inhabitant.assignedRoomId = destinationRoomId;
  inhabitant.travelTicksRemaining = 0;
}

/**
 * Attach a feature to a specific slot on a room.
 * Initializes featureIds array if needed and ensures proper length.
 */
export function featureAttachToSlot(
  placedRoom: PlacedRoom,
  slotIndex: number,
  featureId: FeatureId,
  totalSlots: number,
): void {
  if (!placedRoom.featureIds) {
    placedRoom.featureIds = new Array(totalSlots).fill(undefined);
  }
  placedRoom.featureIds[slotIndex] = featureId;
}

/**
 * Remove a feature from a specific slot on a room.
 * Clears the slot and removes sacrificeBuff if no corruption_generation features remain.
 */
export function featureRemoveFromSlot(
  placedRoom: PlacedRoom,
  slotIndex: number,
): void {
  if (!placedRoom.featureIds) return;
  placedRoom.featureIds[slotIndex] = undefined as unknown as FeatureId;

  // If no features with corruption_generation remain, clear sacrifice buff
  const features = featureGetAllForRoom(placedRoom);
  const hasCorruptionGen = features.some((f) =>
    f.bonuses.some((b) => b.type === 'corruption_generation'),
  );
  if (!hasCorruptionGen) {
    placedRoom.sacrificeBuff = undefined;
  }
}

/**
 * Remove all features from a room. Clears featureIds and sacrificeBuff.
 */
export function featureRemoveAllFromRoom(placedRoom: PlacedRoom): void {
  placedRoom.featureIds = undefined;
  placedRoom.sacrificeBuff = undefined;
}
