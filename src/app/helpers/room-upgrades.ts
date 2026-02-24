import { contentGetEntry } from '@helpers/content';
import { featureCalculateCapacityBonus } from '@helpers/features';
import {
  researchUnlockGetPassiveBonusWithMastery,
  researchUnlockIsUnlocked,
} from '@helpers/research-unlocks';
import type {
  PlacedRoom,
  RoomId,
  RoomProduction,
  RoomUpgradeEffect,
  RoomUpgradeId,
} from '@interfaces';
import type { RoomContent } from '@interfaces/content-room';
import type { RoomUpgradeContent } from '@interfaces/content-roomupgrade';
import type {
  UpgradeValidation,
  VisibleUpgrade,
} from '@interfaces/room-upgrade';

/**
 * Get the display name for a placed room, accounting for applied upgrades and suffix.
 * Returns the upgrade name if one is applied, otherwise the base room type name.
 * Appends the room suffix (e.g. "A", "B") if present.
 */
export function roomGetDisplayName(placedRoom: PlacedRoom): string {
  const upgrade = roomUpgradeGetApplied(placedRoom);
  const def = contentGetEntry<RoomContent>(placedRoom.roomTypeId);
  const baseName = upgrade?.name ?? def?.name ?? 'Unknown';
  return placedRoom.suffix ? `${baseName} ${placedRoom.suffix}` : baseName;
}

export function roomUpgradeGetPaths(roomTypeId: RoomId): RoomUpgradeContent[] {
  const room = contentGetEntry<RoomContent>(roomTypeId);
  if (!room?.roomUpgradeIds?.length) return [];
  return room.roomUpgradeIds
    .map((id) => contentGetEntry<RoomUpgradeContent>(id))
    .filter((u): u is RoomUpgradeContent => u !== undefined);
}

export function roomUpgradeGetApplied(
  placedRoom: PlacedRoom,
): RoomUpgradeContent | undefined {
  if (!placedRoom.appliedUpgradePathId) return undefined;

  return (
    contentGetEntry<RoomUpgradeContent>(placedRoom.appliedUpgradePathId) ??
    undefined
  );
}

export function roomUpgradeGetAppliedEffects(
  placedRoom: PlacedRoom,
): RoomUpgradeEffect[] {
  const upgrade = roomUpgradeGetApplied(placedRoom);
  return upgrade?.effects ?? [];
}

export function roomUpgradeCanApply(
  placedRoom: PlacedRoom,
  upgradePathId: string,
  darkUpgradeUnlocked = false,
): UpgradeValidation {
  if (placedRoom.appliedUpgradePathId) {
    return {
      valid: false,
      reason: 'Room already has an upgrade applied',
    };
  }

  const paths = roomUpgradeGetPaths(placedRoom.roomTypeId);
  const path = paths.find((p) => p.id === upgradePathId);
  if (!path) {
    return {
      valid: false,
      reason: 'Invalid upgrade path for this room type',
    };
  }

  if (path.requiresDarkUpgrade && !darkUpgradeUnlocked) {
    return {
      valid: false,
      reason: 'Requires dark upgrades (50 Corruption)',
    };
  }

  return { valid: true };
}

export function roomUpgradeApply(
  placedRoom: PlacedRoom,
  upgradePathId: RoomUpgradeId,
): PlacedRoom {
  return {
    ...placedRoom,
    appliedUpgradePathId: upgradePathId,
  };
}

export function roomUpgradeGetAvailable(
  placedRoom: PlacedRoom,
  darkUpgradeUnlocked = false,
): RoomUpgradeContent[] {
  if (placedRoom.appliedUpgradePathId) return [];
  return roomUpgradeGetPaths(placedRoom.roomTypeId).filter(
    (p) =>
      researchUnlockIsUnlocked('roomupgrade', p.id) &&
      (!p.requiresDarkUpgrade || darkUpgradeUnlocked),
  );
}

/**
 * Returns all upgrade paths for a room with lock status.
 * Upgrades are locked if not yet researched or if they require dark upgrades.
 */
export function roomUpgradeGetVisible(
  placedRoom: PlacedRoom,
  darkUpgradeUnlocked = false,
): VisibleUpgrade[] {
  if (placedRoom.appliedUpgradePathId) return [];
  return roomUpgradeGetPaths(placedRoom.roomTypeId).map((path) => {
    const researchLocked = !researchUnlockIsUnlocked('roomupgrade', path.id);
    const darkLocked = !!path.requiresDarkUpgrade && !darkUpgradeUnlocked;
    const locked = researchLocked || darkLocked;
    let lockReason: string | undefined;
    if (researchLocked) {
      lockReason = 'Requires research';
    } else if (darkLocked) {
      lockReason = 'Requires 50 Corruption';
    }
    return { path, locked, lockReason };
  });
}

/**
 * Calculate the effective max inhabitants for a placed room,
 * accounting for upgrade bonuses (maxInhabitantBonus).
 * Returns -1 for unlimited capacity.
 */
export function roomUpgradeGetEffectiveMaxInhabitants(
  placedRoom: PlacedRoom,
  roomDef: RoomContent,
): number {
  if (roomDef.maxInhabitants < 0) return -1;

  const effects = roomUpgradeGetAppliedEffects(placedRoom);
  let bonus = 0;
  for (const effect of effects) {
    if (effect.type === 'maxInhabitantBonus') {
      bonus += effect.value;
    }
  }

  bonus += featureCalculateCapacityBonus(placedRoom);

  const researchCapBonus =
    researchUnlockGetPassiveBonusWithMastery('roomCapacity');
  bonus += Math.floor(researchCapBonus);

  return roomDef.maxInhabitants + bonus;
}

/**
 * Extract all secondaryProduction effects from a room's applied upgrade
 * and return them as a RoomProduction record (e.g. { essence: 0.2, flux: 0.2 }).
 */
export function roomUpgradeGetSecondaryProduction(
  placedRoom: PlacedRoom,
): RoomProduction {
  const effects = roomUpgradeGetAppliedEffects(placedRoom);
  const result: RoomProduction = {};
  for (const effect of effects) {
    if (effect.type === 'secondaryProduction' && effect.resource) {
      result[effect.resource] = (result[effect.resource] ?? 0) + effect.value;
    }
  }
  return result;
}

/**
 * Extract productionMultiplier effects from a room's applied upgrade
 * and return the combined multiplier. Returns 1.0 if no multiplier effects.
 */
export function roomUpgradeGetProductionMultiplier(
  placedRoom: PlacedRoom,
): number {
  const effects = roomUpgradeGetAppliedEffects(placedRoom);
  let multiplier = 1.0;
  for (const effect of effects) {
    if (effect.type === 'productionMultiplier') {
      multiplier *= effect.value;
    }
  }
  return multiplier;
}
