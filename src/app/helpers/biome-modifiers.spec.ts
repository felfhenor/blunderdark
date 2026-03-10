import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BiomeContent } from '@interfaces/content-biome';

// Mock biome content data matching gamedata/biome/base.yml
const mockBiomes = new Map<string, BiomeContent>();

function makeBiome(name: string, biomeType: string, effects: BiomeContent['effects']): BiomeContent {
  return {
    id: `mock-${biomeType}`,
    __type: 'biome',
    name,
    biomeType,
    description: '',
    color: '#000',
    icon: '',
    requiresResearch: false,
    effects,
    roomRestrictions: [],
  } as unknown as BiomeContent;
}

vi.mock('@helpers/biome', () => ({
  biomeGetContent: vi.fn((biome: string) => mockBiomes.get(biome)),
  biomeGetAll: vi.fn(() => [...mockBiomes.values()]),
  biomeResetCache: vi.fn(),
}));

import {
  biomeCalculateCreatureProductionModifierPure,
  biomeGetCombatModifier,
  biomeGetCorruptionMultiplier,
  biomeGetCreatureModifier,
  biomeGetFearReduction,
  biomeGetResourceModifier,
} from '@helpers/biome-modifiers';

beforeEach(() => {
  mockBiomes.clear();

  mockBiomes.set('neutral', makeBiome('Neutral', 'neutral', []));

  mockBiomes.set('volcanic', makeBiome('Volcanic', 'volcanic', [
    { effectType: 'defender_attack_multiplier', effectValue: 0.20, description: '' },
    { effectType: 'creature_production_multiplier', effectValue: -0.20, targetCreatureType: 'ooze', description: '' },
  ]));

  mockBiomes.set('flooded', makeBiome('Flooded', 'flooded', [
    { effectType: 'creature_production_multiplier', effectValue: 0.25, targetCreatureType: 'ooze', description: '' },
    { effectType: 'resource_production_multiplier', effectValue: 0.15, targetResourceType: 'food', description: '' },
  ]));

  mockBiomes.set('crystal', makeBiome('Crystal Caverns', 'crystal', [
    { effectType: 'resource_production_multiplier', effectValue: 0.20, targetResourceType: 'crystals', description: '' },
    { effectType: 'fear_reduction', effectValue: 0.5, description: '' },
  ]));

  mockBiomes.set('corrupted', makeBiome('Corrupted', 'corrupted', [
    { effectType: 'corruption_multiplier', effectValue: 0.30, description: '' },
    { effectType: 'resource_production_multiplier', effectValue: 0.25, targetResourceType: 'essence', description: '' },
  ]));

  mockBiomes.set('fungal', makeBiome('Fungal', 'fungal', [
    { effectType: 'resource_production_multiplier', effectValue: 0.10, targetResourceType: 'food', description: '' },
    { effectType: 'invader_attack_multiplier', effectValue: -0.15, description: '' },
    { effectType: 'invader_defense_multiplier', effectValue: -0.10, description: '' },
  ]));
});

// --- biomeGetResourceModifier ---

describe('biomeGetResourceModifier', () => {
  it('returns 1.15 for food on flooded biome', () => {
    expect(biomeGetResourceModifier('flooded', 'food')).toBeCloseTo(1.15);
  });

  it('returns 1.20 for crystals on crystal biome', () => {
    expect(biomeGetResourceModifier('crystal', 'crystals')).toBeCloseTo(1.20);
  });

  it('returns 1.25 for essence on corrupted biome', () => {
    expect(biomeGetResourceModifier('corrupted', 'essence')).toBeCloseTo(1.25);
  });

  it('returns 1.10 for food on fungal biome', () => {
    expect(biomeGetResourceModifier('fungal', 'food')).toBeCloseTo(1.10);
  });

  it('returns 1.0 for unaffected resource on biome', () => {
    expect(biomeGetResourceModifier('volcanic', 'food')).toBe(1.0);
    expect(biomeGetResourceModifier('neutral', 'crystals')).toBe(1.0);
    expect(biomeGetResourceModifier('crystal', 'food')).toBe(1.0);
  });

  it('returns 1.0 for neutral biome', () => {
    expect(biomeGetResourceModifier('neutral', 'food')).toBe(1.0);
    expect(biomeGetResourceModifier('neutral', 'crystals')).toBe(1.0);
    expect(biomeGetResourceModifier('neutral', 'essence')).toBe(1.0);
  });
});

// --- biomeGetCreatureModifier ---

describe('biomeGetCreatureModifier', () => {
  it('returns 0.80 for ooze on volcanic biome', () => {
    expect(biomeGetCreatureModifier('volcanic', 'ooze')).toBeCloseTo(0.80);
  });

  it('returns 1.25 for ooze on flooded biome', () => {
    expect(biomeGetCreatureModifier('flooded', 'ooze')).toBeCloseTo(1.25);
  });

  it('returns 1.0 for non-ooze creatures on volcanic', () => {
    expect(biomeGetCreatureModifier('volcanic', 'creature')).toBe(1.0);
    expect(biomeGetCreatureModifier('volcanic', 'undead')).toBe(1.0);
    expect(biomeGetCreatureModifier('volcanic', 'demon')).toBe(1.0);
  });

  it('returns 1.0 for ooze on neutral biome', () => {
    expect(biomeGetCreatureModifier('neutral', 'ooze')).toBe(1.0);
  });
});

// --- biomeCalculateCreatureProductionModifierPure ---

describe('biomeCalculateCreatureProductionModifierPure', () => {
  it('returns 1.0 for empty creature list', () => {
    expect(biomeCalculateCreatureProductionModifierPure('volcanic', [])).toBe(1.0);
  });

  it('returns penalty for all-ooze on volcanic', () => {
    expect(biomeCalculateCreatureProductionModifierPure('volcanic', ['ooze', 'ooze'])).toBeCloseTo(0.80);
  });

  it('returns bonus for all-ooze on flooded', () => {
    expect(biomeCalculateCreatureProductionModifierPure('flooded', ['ooze', 'ooze'])).toBeCloseTo(1.25);
  });

  it('returns weighted average for mixed types on volcanic', () => {
    const result = biomeCalculateCreatureProductionModifierPure('volcanic', ['creature', 'creature', 'ooze']);
    expect(result).toBeCloseTo(0.933, 2);
  });

  it('returns 1.0 for non-ooze on any biome', () => {
    expect(biomeCalculateCreatureProductionModifierPure('volcanic', ['creature', 'undead'])).toBe(1.0);
    expect(biomeCalculateCreatureProductionModifierPure('flooded', ['creature', 'demon'])).toBe(1.0);
  });
});

// --- biomeGetCombatModifier ---

describe('biomeGetCombatModifier', () => {
  it('returns 1.20 for defender attack on volcanic', () => {
    expect(biomeGetCombatModifier('volcanic', 'defender', 'attack')).toBeCloseTo(1.20);
  });

  it('returns 0.85 for invader attack on fungal', () => {
    expect(biomeGetCombatModifier('fungal', 'invader', 'attack')).toBeCloseTo(0.85);
  });

  it('returns 0.90 for invader defense on fungal', () => {
    expect(biomeGetCombatModifier('fungal', 'invader', 'defense')).toBeCloseTo(0.90);
  });

  it('returns 1.0 for unaffected combatant types', () => {
    expect(biomeGetCombatModifier('volcanic', 'invader', 'attack')).toBe(1.0);
    expect(biomeGetCombatModifier('volcanic', 'defender', 'defense')).toBe(1.0);
    expect(biomeGetCombatModifier('neutral', 'defender', 'attack')).toBe(1.0);
    expect(biomeGetCombatModifier('neutral', 'invader', 'attack')).toBe(1.0);
  });
});

// --- biomeGetFearReduction ---

describe('biomeGetFearReduction', () => {
  it('returns 0.5 for crystal biome', () => {
    expect(biomeGetFearReduction('crystal')).toBe(0.5);
  });

  it('returns 0 for non-crystal biomes', () => {
    expect(biomeGetFearReduction('volcanic')).toBe(0);
    expect(biomeGetFearReduction('flooded')).toBe(0);
    expect(biomeGetFearReduction('corrupted')).toBe(0);
    expect(biomeGetFearReduction('fungal')).toBe(0);
    expect(biomeGetFearReduction('neutral')).toBe(0);
  });
});

// --- biomeGetCorruptionMultiplier ---

describe('biomeGetCorruptionMultiplier', () => {
  it('returns 1.30 for corrupted biome', () => {
    expect(biomeGetCorruptionMultiplier('corrupted')).toBeCloseTo(1.30);
  });

  it('returns 1.0 for non-corrupted biomes', () => {
    expect(biomeGetCorruptionMultiplier('volcanic')).toBe(1.0);
    expect(biomeGetCorruptionMultiplier('flooded')).toBe(1.0);
    expect(biomeGetCorruptionMultiplier('crystal')).toBe(1.0);
    expect(biomeGetCorruptionMultiplier('fungal')).toBe(1.0);
    expect(biomeGetCorruptionMultiplier('neutral')).toBe(1.0);
  });
});
