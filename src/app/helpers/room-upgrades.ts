import { getEntry } from '@helpers/content';
import type {
  IsContentItem,
  PlacedRoom,
  RoomDefinition,
  RoomUpgradeEffect,
  RoomUpgradePath,
} from '@interfaces';

export type UpgradeValidation = {
  valid: boolean;
  reason?: string;
};

export function getUpgradePaths(roomTypeId: string): RoomUpgradePath[] {
  const room = getEntry<RoomDefinition & IsContentItem>(roomTypeId);
  if (!room) return [];
  return room.upgradePaths ?? [];
}

export function getAppliedUpgrade(
  placedRoom: PlacedRoom,
): RoomUpgradePath | undefined {
  if (!placedRoom.appliedUpgradePathId) return undefined;

  const paths = getUpgradePaths(placedRoom.roomTypeId);
  return paths.find((p) => p.id === placedRoom.appliedUpgradePathId) ?? undefined;
}

export function getAppliedUpgradeEffects(
  placedRoom: PlacedRoom,
): RoomUpgradeEffect[] {
  const upgrade = getAppliedUpgrade(placedRoom);
  return upgrade?.effects ?? [];
}

export function canApplyUpgrade(
  placedRoom: PlacedRoom,
  upgradePathId: string,
): UpgradeValidation {
  if (placedRoom.appliedUpgradePathId) {
    return {
      valid: false,
      reason: 'Room already has an upgrade applied',
    };
  }

  const paths = getUpgradePaths(placedRoom.roomTypeId);
  const path = paths.find((p) => p.id === upgradePathId);
  if (!path) {
    return {
      valid: false,
      reason: 'Invalid upgrade path for this room type',
    };
  }

  return { valid: true };
}

export function applyUpgrade(
  placedRoom: PlacedRoom,
  upgradePathId: string,
): PlacedRoom {
  return {
    ...placedRoom,
    appliedUpgradePathId: upgradePathId,
  };
}

export function getAvailableUpgrades(
  placedRoom: PlacedRoom,
): RoomUpgradePath[] {
  if (placedRoom.appliedUpgradePathId) return [];
  return getUpgradePaths(placedRoom.roomTypeId);
}

/**
 * Calculate the effective max inhabitants for a placed room,
 * accounting for upgrade bonuses (maxInhabitantBonus).
 * Returns -1 for unlimited capacity.
 */
export function getEffectiveMaxInhabitants(
  placedRoom: PlacedRoom,
  roomDef: RoomDefinition,
): number {
  if (roomDef.maxInhabitants < 0) return -1;

  const effects = getAppliedUpgradeEffects(placedRoom);
  let bonus = 0;
  for (const effect of effects) {
    if (effect.type === 'maxInhabitantBonus') {
      bonus += effect.value;
    }
  }

  return roomDef.maxInhabitants + bonus;
}
