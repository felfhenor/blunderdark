import { biomeIsUnlocked } from '@helpers/biome';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockIsBiomeUnlocked = vi.fn();

vi.mock('@helpers/research-unlocks', () => ({
  researchUnlockIsBiomeUnlocked: (...args: unknown[]) =>
    mockIsBiomeUnlocked(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockIsBiomeUnlocked.mockReturnValue(false);
});

describe('biomeIsUnlocked', () => {
  it('should return true for biomes without a research requirement', () => {
    expect(biomeIsUnlocked('neutral')).toBe(true);
    expect(biomeIsUnlocked('volcanic')).toBe(true);
    expect(biomeIsUnlocked('flooded')).toBe(true);
    expect(biomeIsUnlocked('fungal')).toBe(true);
    expect(mockIsBiomeUnlocked).not.toHaveBeenCalled();
  });

  it('should return false for gated biomes when biome is not unlocked', () => {
    mockIsBiomeUnlocked.mockReturnValue(false);
    expect(biomeIsUnlocked('corrupted')).toBe(false);
    expect(biomeIsUnlocked('crystal')).toBe(false);
  });

  it('should return true for gated biomes when biome is unlocked', () => {
    mockIsBiomeUnlocked.mockReturnValue(true);
    expect(biomeIsUnlocked('corrupted')).toBe(true);
    expect(biomeIsUnlocked('crystal')).toBe(true);
  });

  it('should check with the correct biome type for corrupted', () => {
    biomeIsUnlocked('corrupted');
    expect(mockIsBiomeUnlocked).toHaveBeenCalledWith('corrupted');
  });

  it('should check with the correct biome type for crystal', () => {
    biomeIsUnlocked('crystal');
    expect(mockIsBiomeUnlocked).toHaveBeenCalledWith('crystal');
  });
});
