import { biomeIsUnlocked } from '@helpers/biome';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockIsFeatureUnlocked = vi.fn();

vi.mock('@helpers/research-unlocks', () => ({
  researchUnlockIsFeatureUnlocked: (...args: unknown[]) => mockIsFeatureUnlocked(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockIsFeatureUnlocked.mockReturnValue(false);
});

describe('biomeIsUnlocked', () => {
  it('should return true for biomes without a feature flag', () => {
    expect(biomeIsUnlocked('neutral')).toBe(true);
    expect(biomeIsUnlocked('volcanic')).toBe(true);
    expect(biomeIsUnlocked('flooded')).toBe(true);
    expect(biomeIsUnlocked('fungal')).toBe(true);
    expect(mockIsFeatureUnlocked).not.toHaveBeenCalled();
  });

  it('should return false for gated biomes when feature flag is not unlocked', () => {
    mockIsFeatureUnlocked.mockReturnValue(false);
    expect(biomeIsUnlocked('corrupted')).toBe(false);
    expect(biomeIsUnlocked('crystal')).toBe(false);
  });

  it('should return true for gated biomes when feature flag is unlocked', () => {
    mockIsFeatureUnlocked.mockReturnValue(true);
    expect(biomeIsUnlocked('corrupted')).toBe(true);
    expect(biomeIsUnlocked('crystal')).toBe(true);
  });

  it('should check the correct feature flag for corrupted', () => {
    biomeIsUnlocked('corrupted');
    expect(mockIsFeatureUnlocked).toHaveBeenCalledWith('biome_corrupted');
  });

  it('should check the correct feature flag for crystal', () => {
    biomeIsUnlocked('crystal');
    expect(mockIsFeatureUnlocked).toHaveBeenCalledWith('biome_crystal');
  });
});
