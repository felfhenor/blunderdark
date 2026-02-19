import { researchUnlockIsFeatureUnlocked } from '@helpers/research-unlocks';
import { BIOME_DATA, type BiomeType } from '@interfaces/biome';

/**
 * Check if a biome is unlocked. Returns true if the biome has no featureFlag
 * requirement or if its feature flag has been unlocked via research.
 */
export function biomeIsUnlocked(biome: BiomeType): boolean {
  const data = BIOME_DATA[biome];
  if (!data.featureFlag) return true;
  return researchUnlockIsFeatureUnlocked(data.featureFlag);
}
