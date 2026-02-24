import { researchUnlockIsBiomeUnlocked } from '@helpers/research-unlocks';
import { BIOME_DATA, type BiomeType } from '@interfaces/biome';

/**
 * Check if a biome is unlocked. Returns true if the biome has no research
 * requirement or if the biome has been unlocked via research.
 */
export function biomeIsUnlocked(biome: BiomeType): boolean {
  const data = BIOME_DATA[biome];
  if (!data.requiresResearch) return true;
  return researchUnlockIsBiomeUnlocked(biome);
}
