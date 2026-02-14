/**
 * Biome restriction rule.
 * - `blocked: true` means the room type cannot be built on that biome at all.
 * - `maxPerFloor` means at most N of that room type per floor.
 */
export type BiomeRestrictionRule = {
  blocked?: boolean;
  maxPerFloor?: number;
};

export type BiomeRestrictionResult = {
  allowed: boolean;
  reason?: string;
};
