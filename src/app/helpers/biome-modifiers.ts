import { biomeGetContent } from '@helpers/biome';
import { contentGetEntry } from '@helpers/content';
import type { BiomeType, InhabitantInstance, PlacedRoomId } from '@interfaces';
import type { BiomeContent, BiomeEffect } from '@interfaces/content-biome';
import type { InhabitantContent, InhabitantCreatureType } from '@interfaces/content-inhabitant';

// --- Helpers ---

function getEffects(biome: BiomeType): BiomeEffect[] {
  return biomeGetContent(biome)?.effects ?? [];
}

// --- Group A: Blanket biome resource production modifiers ---

/**
 * Get the blanket biome resource production multiplier for a resource type on a given biome.
 * Returns 1.0 if no modifier applies.
 */
export function biomeGetResourceModifier(biome: BiomeType, resourceType: string): number {
  const effect = getEffects(biome).find(
    (e) => e.effectType === 'resource_production_multiplier' && e.targetResourceType === resourceType,
  );
  return effect ? 1.0 + effect.effectValue : 1.0;
}

// --- Group B: Creature-type biome modifiers ---

/**
 * Get the creature-type production multiplier for a given biome and creature type.
 * Returns 1.0 if no modifier applies.
 */
export function biomeGetCreatureModifier(biome: BiomeType, creatureType: InhabitantCreatureType): number {
  const effect = getEffects(biome).find(
    (e) => e.effectType === 'creature_production_multiplier' && e.targetCreatureType === creatureType,
  );
  return effect ? 1.0 + effect.effectValue : 1.0;
}

/**
 * Calculate the weighted creature-type production modifier for a room based on
 * the creature types of its assigned inhabitants and the floor's biome.
 *
 * Returns 1.0 if no inhabitants are assigned or no modifiers apply.
 */
export function biomeCalculateCreatureProductionModifier(
  biome: BiomeType,
  inhabitants: InhabitantInstance[],
  roomId: PlacedRoomId,
): number {
  const assigned = inhabitants.filter((i) => i.assignedRoomId === roomId);
  if (assigned.length === 0) return 1.0;

  let weightedSum = 0;

  for (const inhabitant of assigned) {
    const def = contentGetEntry<InhabitantContent>(inhabitant.definitionId);
    if (!def) {
      weightedSum += 1.0;
      continue;
    }
    weightedSum += biomeGetCreatureModifier(biome, def.type);
  }

  return weightedSum / assigned.length;
}

/**
 * Pure version of creature production modifier that takes creature types directly.
 * Used for testing without content system dependency.
 */
export function biomeCalculateCreatureProductionModifierPure(
  biome: BiomeType,
  creatureTypes: InhabitantCreatureType[],
): number {
  if (creatureTypes.length === 0) return 1.0;

  let weightedSum = 0;
  for (const type of creatureTypes) {
    weightedSum += biomeGetCreatureModifier(biome, type);
  }

  return weightedSum / creatureTypes.length;
}

// --- Group C: Combat modifiers ---

/**
 * Get the combat stat multiplier for a given biome, side, and stat.
 * Returns 1.0 if no modifier applies.
 */
export function biomeGetCombatModifier(
  biome: BiomeType,
  side: 'defender' | 'invader',
  stat: 'attack' | 'defense',
): number {
  const effectType = `${side}_${stat}_multiplier` as BiomeEffect['effectType'];
  const effect = getEffects(biome).find((e) => e.effectType === effectType);
  return effect ? 1.0 + effect.effectValue : 1.0;
}

// --- Group D: Fear reduction ---

/**
 * Get the fear reduction amount for a given biome.
 * Returns 0 if no fear modifier applies.
 */
export function biomeGetFearReduction(biome: BiomeType): number {
  const effect = getEffects(biome).find((e) => e.effectType === 'fear_reduction');
  return effect?.effectValue ?? 0;
}

// --- Group E: Corruption amplification ---

/**
 * Get the corruption generation multiplier for a given biome.
 * Returns 1.0 if no modifier applies.
 */
export function biomeGetCorruptionMultiplier(biome: BiomeType): number {
  const effect = getEffects(biome).find((e) => e.effectType === 'corruption_multiplier');
  return effect ? 1.0 + effect.effectValue : 1.0;
}

// --- Display helpers ---

/**
 * Get all effects for a biome (for UI display).
 */
export function biomeGetAllEffects(biome: BiomeType): BiomeEffect[] {
  return getEffects(biome);
}

/**
 * Get a BiomeContent by type (convenience re-export for components).
 */
export function biomeGetData(biome: BiomeType): BiomeContent | undefined {
  return biomeGetContent(biome);
}
