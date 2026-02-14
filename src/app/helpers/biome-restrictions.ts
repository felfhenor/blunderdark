import { contentGetEntry } from '@helpers/content';
import type { BiomeType, Floor, RoomId } from '@interfaces';
import type { BiomeRestrictionRule, BiomeRestrictionResult } from '@interfaces/biome-restriction';
import type { RoomContent } from '@interfaces/content-room';


/**
 * Map of biome type → room name → restriction rule.
 * Room names must match exactly the `name` field in gamedata/room/base.yml.
 *
 * Volcanic: Cannot build Underground Lake, Mushroom Grove
 * Flooded: Cannot build Soul Well
 * Crystal Cave: Max 5 Crystal Mines per floor
 * Corrupted: Cannot build Mushroom Grove, Underground Lake (pure/harmony rooms)
 * Fungal: No specific restrictions
 * Neutral: No restrictions
 */
export const BIOME_RESTRICTION_MAP: Record<
  BiomeType,
  Record<string, BiomeRestrictionRule>
> = {
  volcanic: {
    'Underground Lake': { blocked: true },
    'Mushroom Grove': { blocked: true },
  },
  flooded: {
    'Soul Well': { blocked: true },
  },
  crystal: {
    'Crystal Mine': { maxPerFloor: 5 },
  },
  corrupted: {
    'Mushroom Grove': { blocked: true },
    'Underground Lake': { blocked: true },
  },
  fungal: {},
  neutral: {},
};

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

  const restrictions = BIOME_RESTRICTION_MAP[biome];
  if (!restrictions) return { allowed: true };

  const rule = restrictions[roomDef.name];
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

  const restrictions = BIOME_RESTRICTION_MAP[biome];
  if (!restrictions) return { restricted: false };

  const rule = restrictions[roomDef.name];
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
