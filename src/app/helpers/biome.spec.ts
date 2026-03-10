import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BiomeContent } from '@interfaces/content-biome';

const mockBiomeEntries: BiomeContent[] = [];
const mockIsBiomeUnlocked = vi.fn();

vi.mock('@helpers/content', () => ({
  contentGetEntriesByType: vi.fn(() => mockBiomeEntries),
}));

vi.mock('@helpers/research-unlocks', () => ({
  researchUnlockIsBiomeUnlocked: (...args: unknown[]) =>
    mockIsBiomeUnlocked(...args),
}));

// Must import after mocks
import { biomeIsUnlocked, biomeResetCache } from '@helpers/biome';

function makeBiome(name: string, biomeType: string, requiresResearch: boolean): BiomeContent {
  return {
    id: `mock-${biomeType}`,
    __type: 'biome',
    name,
    biomeType,
    description: '',
    color: '#000',
    icon: '',
    requiresResearch,
    effects: [],
    roomRestrictions: [],
  } as unknown as BiomeContent;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsBiomeUnlocked.mockReturnValue(false);

  mockBiomeEntries.length = 0;
  mockBiomeEntries.push(
    makeBiome('Neutral', 'neutral', false),
    makeBiome('Volcanic', 'volcanic', false),
    makeBiome('Flooded', 'flooded', false),
    makeBiome('Fungal', 'fungal', false),
    makeBiome('Crystal Caverns', 'crystal', true),
    makeBiome('Corrupted', 'corrupted', true),
  );

  biomeResetCache();
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
