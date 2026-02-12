import type { BiomeType } from '@interfaces';

// --- Types ---

export type ProductionModifierType =
  | 'time_of_day'
  | 'floor_depth'
  | 'biome';

export type ProductionModifierContext = {
  roomTypeId: string;
  floorDepth: number;
  floorBiome: BiomeType;
  hour: number;
};

export type ProductionModifierResult = {
  type: ProductionModifierType;
  multiplier: number;
  description: string;
};

export type ProductionModifierDefinition = {
  id: string;
  type: ProductionModifierType;
  description: string;
  evaluate: (context: ProductionModifierContext) => number;
};

// --- Constants ---

// Room type IDs
const SHADOW_LIBRARY = 'aa100001-0001-0001-0001-000000000004';
const SOUL_WELL = 'aa100001-0001-0001-0001-000000000005';
const CRYSTAL_MINE = 'aa100001-0001-0001-0001-000000000002';
const MUSHROOM_GROVE = 'aa100001-0001-0001-0001-000000000003';
const DARK_FORGE = 'aa100001-0001-0001-0001-000000000006';
const UNDERGROUND_LAKE = 'aa100001-0001-0001-0001-000000000010';
const LEY_LINE_NEXUS = 'aa100001-0001-0001-0001-000000000011';

// Time thresholds
export const NIGHT_START = 18;
export const NIGHT_END = 6;

// Depth bonus
export const DEPTH_BONUS_PER_LEVEL = 0.05;

// --- Time-of-day helpers ---

export function isNightTime(hour: number): boolean {
  return hour >= NIGHT_START || hour < NIGHT_END;
}

export function isDayTime(hour: number): boolean {
  return !isNightTime(hour);
}

// --- Time-of-day modifier ---

const NIGHT_BONUS_ROOMS: Record<string, number> = {
  [SHADOW_LIBRARY]: 0.20,
  [SOUL_WELL]: 0.15,
};

const DAY_BONUS_ROOMS: Record<string, number> = {
  [MUSHROOM_GROVE]: 0.15,
  [CRYSTAL_MINE]: 0.10,
};

function evaluateTimeOfDay(context: ProductionModifierContext): number {
  if (isNightTime(context.hour)) {
    return 1.0 + (NIGHT_BONUS_ROOMS[context.roomTypeId] ?? 0);
  }
  return 1.0 + (DAY_BONUS_ROOMS[context.roomTypeId] ?? 0);
}

// --- Floor depth modifier ---

function evaluateFloorDepth(context: ProductionModifierContext): number {
  return 1.0 + context.floorDepth * DEPTH_BONUS_PER_LEVEL;
}

// --- Biome modifier ---

export const BIOME_ROOM_BONUSES: Partial<Record<BiomeType, Record<string, number>>> = {
  volcanic: {
    [DARK_FORGE]: 0.50,
    [CRYSTAL_MINE]: 0.15,
  },
  fungal: {
    [MUSHROOM_GROVE]: 0.60,
  },
  crystal: {
    [CRYSTAL_MINE]: 0.40,
    [LEY_LINE_NEXUS]: 0.10,
  },
  corrupted: {
    [SOUL_WELL]: 1.00,
    [SHADOW_LIBRARY]: 1.00,
  },
  flooded: {
    [UNDERGROUND_LAKE]: 0.50,
  },
};

/**
 * Get the biome bonus multiplier for a specific room type on a specific biome.
 * Returns 1.0 for rooms not affected by the biome or for neutral biome.
 */
export function getBiomeBonus(biome: BiomeType, roomTypeId: string): number {
  const biomeRooms = BIOME_ROOM_BONUSES[biome];
  if (!biomeRooms) return 1.0;
  return 1.0 + (biomeRooms[roomTypeId] ?? 0);
}

function evaluateBiome(context: ProductionModifierContext): number {
  return getBiomeBonus(context.floorBiome, context.roomTypeId);
}

// --- Modifier registry ---

const MODIFIER_REGISTRY: ProductionModifierDefinition[] = [
  {
    id: 'time-of-day',
    type: 'time_of_day',
    description: 'Time-of-day production bonus',
    evaluate: evaluateTimeOfDay,
  },
  {
    id: 'floor-depth',
    type: 'floor_depth',
    description: 'Deeper floors grant production bonuses',
    evaluate: evaluateFloorDepth,
  },
  {
    id: 'biome',
    type: 'biome',
    description: 'Biome-specific production bonus',
    evaluate: evaluateBiome,
  },
];

/**
 * Get all registered production modifier definitions.
 */
export function getModifierRegistry(): readonly ProductionModifierDefinition[] {
  return MODIFIER_REGISTRY;
}

// --- Evaluation ---

/**
 * Evaluate all registered modifiers for a given context.
 * Returns individual modifier results.
 */
export function evaluateModifiers(
  context: ProductionModifierContext,
): ProductionModifierResult[] {
  const results: ProductionModifierResult[] = [];

  for (const def of MODIFIER_REGISTRY) {
    const multiplier = def.evaluate(context);
    if (multiplier !== 1.0) {
      results.push({
        type: def.type,
        multiplier,
        description: def.description,
      });
    }
  }

  return results;
}

/**
 * Apply modifiers multiplicatively: base * mod1 * mod2 * ... * modN.
 */
export function applyModifiers(base: number, modifiers: number[]): number {
  let result = base;
  for (const mod of modifiers) {
    result *= mod;
  }
  return result;
}

/**
 * Calculate the combined production modifier multiplier for a room in context.
 * Multiplies all applicable modifiers together.
 */
export function calculateProductionModifiers(
  context: ProductionModifierContext,
): number {
  let combined = 1.0;

  for (const def of MODIFIER_REGISTRY) {
    combined *= def.evaluate(context);
  }

  return combined;
}
