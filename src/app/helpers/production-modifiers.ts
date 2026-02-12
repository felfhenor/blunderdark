import { getEntriesByType } from '@helpers/content';
import type { BiomeType, IsContentItem, RoomDefinition } from '@interfaces';

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

// Time thresholds
export const NIGHT_START = 18;
export const NIGHT_END = 6;

// Depth bonus
export const DEPTH_BONUS_PER_LEVEL = 0.05;

// --- Lazy lookup maps built from room data ---

let timeOfDayMap: { day: Map<string, number>; night: Map<string, number> } | null = null;
let biomeMap: Map<string, Map<string, number>> | null = null;

function buildTimeOfDayMap(): { day: Map<string, number>; night: Map<string, number> } {
  const rooms = getEntriesByType<RoomDefinition & IsContentItem>('room');
  const day = new Map<string, number>();
  const night = new Map<string, number>();
  for (const room of rooms) {
    if (room.timeOfDayBonus) {
      if (room.timeOfDayBonus.period === 'day') {
        day.set(room.id, room.timeOfDayBonus.bonus);
      } else {
        night.set(room.id, room.timeOfDayBonus.bonus);
      }
    }
  }
  return { day, night };
}

function getTimeOfDayMap(): { day: Map<string, number>; night: Map<string, number> } {
  if (!timeOfDayMap) {
    timeOfDayMap = buildTimeOfDayMap();
  }
  return timeOfDayMap;
}

function buildBiomeMap(): Map<string, Map<string, number>> {
  const rooms = getEntriesByType<RoomDefinition & IsContentItem>('room');
  const map = new Map<string, Map<string, number>>();
  for (const room of rooms) {
    if (room.biomeBonuses) {
      for (const [biome, bonus] of Object.entries(room.biomeBonuses)) {
        if (bonus === null || bonus === undefined) continue;
        if (!map.has(biome)) {
          map.set(biome, new Map());
        }
        map.get(biome)!.set(room.id, bonus);
      }
    }
  }
  return map;
}

function getBiomeMap(): Map<string, Map<string, number>> {
  if (!biomeMap) {
    biomeMap = buildBiomeMap();
  }
  return biomeMap;
}

export function resetProductionModifierCache(): void {
  timeOfDayMap = null;
  biomeMap = null;
}

// --- Time-of-day helpers ---

export function isNightTime(hour: number): boolean {
  return hour >= NIGHT_START || hour < NIGHT_END;
}

export function isDayTime(hour: number): boolean {
  return !isNightTime(hour);
}

// --- Time-of-day modifier ---

function evaluateTimeOfDay(context: ProductionModifierContext): number {
  const map = getTimeOfDayMap();
  if (isNightTime(context.hour)) {
    return 1.0 + (map.night.get(context.roomTypeId) ?? 0);
  }
  return 1.0 + (map.day.get(context.roomTypeId) ?? 0);
}

// --- Floor depth modifier ---

function evaluateFloorDepth(context: ProductionModifierContext): number {
  return 1.0 + context.floorDepth * DEPTH_BONUS_PER_LEVEL;
}

// --- Biome modifier ---

/**
 * Get the biome bonus multiplier for a specific room type on a specific biome.
 * Returns 1.0 for rooms not affected by the biome or for neutral biome.
 */
export function getBiomeBonus(biome: BiomeType, roomTypeId: string): number {
  const map = getBiomeMap();
  const biomeRooms = map.get(biome);
  if (!biomeRooms) return 1.0;
  return 1.0 + (biomeRooms.get(roomTypeId) ?? 0);
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
