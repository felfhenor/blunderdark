import { biomeGetContent } from '@helpers/biome';
import { contentGetEntry } from '@helpers/content';
import type { BiomeType, Floor, RoomId } from '@interfaces';
import type { BiomeRestrictionResult } from '@interfaces/biome-restriction';
import type { BiomeRoomRestriction } from '@interfaces/content-biome';
import type { RoomContent } from '@interfaces/content-room';

/**
 * Get the room restriction rule for a given biome and room name.
 * Reads from BiomeContent.roomRestrictions defined in gamedata.
 */
function getRestriction(biome: BiomeType, roomName: string): BiomeRoomRestriction | undefined {
  const data = biomeGetContent(biome);
  if (!data) return undefined;
  return data.roomRestrictions.find((r) => r.roomId === roomName);
}

/**
 * Count how many rooms of a given type are placed on a floor.
 */
export function biomeRestrictionCountRoomType(
  floor: Floor,
  roomTypeId: RoomId,
): number {
  return floor.rooms.filter((r) => r.roomTypeId === roomTypeId).length;
}

/**
 * Check whether a room type can be built on a floor with the given biome.
 *
 * Pure function — no signal or service dependencies.
 *
 * @param roomTypeId - The room type ID (UUID)
 * @param biome - The floor's biome type
 * @param floor - The floor to check room counts against (for maxPerFloor rules)
 */
export function biomeRestrictionCanBuild(
  roomTypeId: RoomId,
  biome: BiomeType,
  floor: Floor,
): BiomeRestrictionResult {
  const roomDef = contentGetEntry<RoomContent>(roomTypeId);
  if (!roomDef) return { allowed: true };

  const rule = getRestriction(biome, roomDef.name);
  if (!rule) return { allowed: true };

  if (rule.blocked) {
    return {
      allowed: false,
      reason: `${roomDef.name} cannot be built in ${biome} biomes`,
    };
  }

  if (rule.maxPerFloor !== undefined) {
    const currentCount = biomeRestrictionCountRoomType(floor, roomTypeId);
    if (currentCount >= rule.maxPerFloor) {
      return {
        allowed: false,
        reason: `${roomDef.name} is limited to ${rule.maxPerFloor} per floor in ${biome} biomes (${currentCount}/${rule.maxPerFloor})`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Get the restriction status of a room type on a floor for UI display.
 * Returns the rule and current count info for count-limited rooms.
 */
export function biomeRestrictionGetRoomInfo(
  roomTypeId: RoomId,
  biome: BiomeType,
  floor: Floor,
): {
  restricted: boolean;
  reason?: string;
  currentCount?: number;
  maxCount?: number;
} {
  const roomDef = contentGetEntry<RoomContent>(roomTypeId);
  if (!roomDef) return { restricted: false };

  const rule = getRestriction(biome, roomDef.name);
  if (!rule) return { restricted: false };

  if (rule.blocked) {
    return {
      restricted: true,
      reason: `Cannot build in ${biome} biomes`,
    };
  }

  if (rule.maxPerFloor !== undefined) {
    const currentCount = biomeRestrictionCountRoomType(floor, roomTypeId);
    const atLimit = currentCount >= rule.maxPerFloor;
    return {
      restricted: atLimit,
      reason: atLimit
        ? `Limit reached (${currentCount}/${rule.maxPerFloor})`
        : undefined,
      currentCount,
      maxCount: rule.maxPerFloor,
    };
  }

  return { restricted: false };
}
