import { contentGetEntriesByType } from '@helpers/content';
import { createLazyCache } from '@helpers/lazy-cache';
import { researchUnlockIsBiomeUnlocked } from '@helpers/research-unlocks';
import type { BiomeType } from '@interfaces/biome';
import type { BiomeContent } from '@interfaces/content-biome';

const biomeByTypeCache = createLazyCache((): Map<BiomeType, BiomeContent> => {
  const biomes = contentGetEntriesByType<BiomeContent>('biome');
  const map = new Map<BiomeType, BiomeContent>();
  for (const biome of biomes) {
    map.set(biome.biomeType as BiomeType, biome);
  }
  return map;
});

/**
 * Get a BiomeContent by BiomeType.
 * Returns undefined if the biome type is not found in content.
 */
export function biomeGetContent(biome: BiomeType): BiomeContent | undefined {
  return biomeByTypeCache.get().get(biome);
}

/**
 * Get all loaded BiomeContent entries.
 */
export function biomeGetAll(): BiomeContent[] {
  return [...biomeByTypeCache.get().values()];
}

/**
 * Reset the biome lookup cache. Called when content is reloaded.
 */
export function biomeResetCache(): void {
  biomeByTypeCache.reset();
}

/**
 * Check if a biome is unlocked. Returns true if the biome has no research
 * requirement or if the biome has been unlocked via research.
 */
export function biomeIsUnlocked(biome: BiomeType): boolean {
  const data = biomeGetContent(biome);
  if (!data || !data.requiresResearch) return true;
  return researchUnlockIsBiomeUnlocked(biome);
}
