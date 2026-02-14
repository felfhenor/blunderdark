import { contentGetEntry } from '@helpers/content';
import type {
  IsContentItem,
  PlacedRoom,
  RoomDefinition,
  RoomUpgradeEffect,
  RoomUpgradePath,
} from '@interfaces';
import type { UpgradeValidation, VisibleUpgrade } from '@interfaces/room-upgrade';

export function roomUpgradeGetPaths(roomTypeId: string): RoomUpgradePath[] {
  const room = contentGetEntry<RoomDefinition & IsContentItem>(roomTypeId);
  if (!room) return [];
  return room.upgradePaths ?? [];
}

export function roomUpgradeGetApplied(
  placedRoom: PlacedRoom,
): RoomUpgradePath | undefined {
  if (!placedRoom.appliedUpgradePathId) return undefined;

  const paths = roomUpgradeGetPaths(placedRoom.roomTypeId);
  return paths.find((p) => p.id === placedRoom.appliedUpgradePathId) ?? undefined;
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
  upgradePathId: string,
): PlacedRoom {
  return {
    ...placedRoom,
    appliedUpgradePathId: upgradePathId,
  };
}

export function roomUpgradeGetAvailable(
  placedRoom: PlacedRoom,
  darkUpgradeUnlocked = false,
): RoomUpgradePath[] {
  if (placedRoom.appliedUpgradePathId) return [];
  return roomUpgradeGetPaths(placedRoom.roomTypeId).filter(
    (p) => !p.requiresDarkUpgrade || darkUpgradeUnlocked,
  );
}

/**
 * Returns all upgrade paths for a room with lock status.
 * Dark upgrades are visible but locked until corruption >= 50.
 */
export function roomUpgradeGetVisible(
  placedRoom: PlacedRoom,
  darkUpgradeUnlocked = false,
): VisibleUpgrade[] {
  if (placedRoom.appliedUpgradePathId) return [];
  return roomUpgradeGetPaths(placedRoom.roomTypeId).map((path) => {
    const locked = !!path.requiresDarkUpgrade && !darkUpgradeUnlocked;
    return {
      path,
      locked,
      lockReason: locked ? 'Requires 50 Corruption' : undefined,
    };
  });
}

/**
 * Calculate the effective max inhabitants for a placed room,
 * accounting for upgrade bonuses (maxInhabitantBonus).
 * Returns -1 for unlimited capacity.
 */
export function roomUpgradeGetEffectiveMaxInhabitants(
  placedRoom: PlacedRoom,
  roomDef: RoomDefinition,
): number {
  if (roomDef.maxInhabitants < 0) return -1;

  const effects = roomUpgradeGetAppliedEffects(placedRoom);
  let bonus = 0;
  for (const effect of effects) {
    if (effect.type === 'maxInhabitantBonus') {
      bonus += effect.value;
    }
  }

  return roomDef.maxInhabitants + bonus;
}
