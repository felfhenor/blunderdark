import { describe, expect, it } from 'vitest';
import {
  FLOOR_MODIFIER_TIERS,
  floorModifierFormatPercentage,
  floorModifierGet,
  floorModifierGetMultiplier,
} from '@helpers/floor-modifiers';

// --- Tier configuration ---

describe('FLOOR_MODIFIER_TIERS', () => {
  it('should cover depths 1 through 10', () => {
    for (let d = 1; d <= 10; d++) {
      const tier = FLOOR_MODIFIER_TIERS.find(
        (t) => d >= t.minDepth && d <= t.maxDepth,
      );
      expect(tier).toBeDefined();
    }
  });

  it('should have non-overlapping depth ranges', () => {
    for (let i = 0; i < FLOOR_MODIFIER_TIERS.length; i++) {
      for (let j = i + 1; j < FLOOR_MODIFIER_TIERS.length; j++) {
        const a = FLOOR_MODIFIER_TIERS[i];
        const b = FLOOR_MODIFIER_TIERS[j];
        const overlaps = a.minDepth <= b.maxDepth && b.minDepth <= a.maxDepth;
        expect(overlaps).toBe(false);
      }
    }
  });

  it('should have each modifier specify a resourceType and percentage', () => {
    for (const tier of FLOOR_MODIFIER_TIERS) {
      for (const mod of tier.modifiers) {
        expect(mod.resourceType).toBeTruthy();
        expect(typeof mod.percentage).toBe('number');
        expect(mod.description).toBeTruthy();
      }
    }
  });
});

// --- floorModifierGet ---

describe('floorModifierGet', () => {
  it('should return +20% Food, -10% Corruption for floor 1', () => {
    const modifiers = floorModifierGet(1);
    expect(modifiers).toHaveLength(2);

    const food = modifiers.find((m) => m.resourceType === 'food');
    expect(food).toBeDefined();
    expect(food!.percentage).toBeCloseTo(0.20);

    const corruption = modifiers.find((m) => m.resourceType === 'corruption');
    expect(corruption).toBeDefined();
    expect(corruption!.percentage).toBeCloseTo(-0.10);
  });

  it('should return no modifiers for floor 2', () => {
    const modifiers = floorModifierGet(2);
    expect(modifiers).toHaveLength(0);
  });

  it('should return no modifiers for floor 3', () => {
    const modifiers = floorModifierGet(3);
    expect(modifiers).toHaveLength(0);
  });

  it('should return Crystal, Gold, Corruption, Food modifiers for floor 5', () => {
    const modifiers = floorModifierGet(5);
    expect(modifiers.length).toBe(4);

    const crystals = modifiers.find((m) => m.resourceType === 'crystals');
    expect(crystals).toBeDefined();
    expect(crystals!.percentage).toBeCloseTo(0.10);

    const gold = modifiers.find((m) => m.resourceType === 'gold');
    expect(gold).toBeDefined();
    expect(gold!.percentage).toBeCloseTo(0.10);

    const corruption = modifiers.find((m) => m.resourceType === 'corruption');
    expect(corruption).toBeDefined();
    expect(corruption!.percentage).toBeCloseTo(0.05);

    const food = modifiers.find((m) => m.resourceType === 'food');
    expect(food).toBeDefined();
    expect(food!.percentage).toBeCloseTo(-0.15);
  });

  it('should return deep modifiers for floor 8', () => {
    const modifiers = floorModifierGet(8);
    expect(modifiers.length).toBe(4);

    const crystals = modifiers.find((m) => m.resourceType === 'crystals');
    expect(crystals!.percentage).toBeCloseTo(0.20);

    const gold = modifiers.find((m) => m.resourceType === 'gold');
    expect(gold!.percentage).toBeCloseTo(0.20);

    const corruption = modifiers.find((m) => m.resourceType === 'corruption');
    expect(corruption!.percentage).toBeCloseTo(0.10);

    const food = modifiers.find((m) => m.resourceType === 'food');
    expect(food!.percentage).toBeCloseTo(-0.30);
  });

  it('should return +50% rare resources and -50% Food for floor 10', () => {
    const modifiers = floorModifierGet(10);
    expect(modifiers.length).toBe(4);

    const flux = modifiers.find((m) => m.resourceType === 'flux');
    expect(flux).toBeDefined();
    expect(flux!.percentage).toBeCloseTo(0.50);

    const essence = modifiers.find((m) => m.resourceType === 'essence');
    expect(essence).toBeDefined();
    expect(essence!.percentage).toBeCloseTo(0.50);

    const corruption = modifiers.find((m) => m.resourceType === 'corruption');
    expect(corruption).toBeDefined();
    expect(corruption!.percentage).toBeCloseTo(0.50);

    const food = modifiers.find((m) => m.resourceType === 'food');
    expect(food).toBeDefined();
    expect(food!.percentage).toBeCloseTo(-0.50);
  });

  it('should return empty array for depth 0', () => {
    expect(floorModifierGet(0)).toEqual([]);
  });

  it('should return empty array for depth beyond tiers', () => {
    expect(floorModifierGet(11)).toEqual([]);
  });
});

// --- floorModifierGetMultiplier ---

describe('floorModifierGetMultiplier', () => {
  it('should return 1.20 for food at depth 1', () => {
    expect(floorModifierGetMultiplier(1, 'food')).toBeCloseTo(1.20);
  });

  it('should return 0.90 for corruption at depth 1', () => {
    expect(floorModifierGetMultiplier(1, 'corruption')).toBeCloseTo(0.90);
  });

  it('should return 1.0 for crystals at depth 1 (no crystal modifier at depth 1)', () => {
    expect(floorModifierGetMultiplier(1, 'crystals')).toBe(1.0);
  });

  it('should return 1.0 for any resource at depth 2 (baseline)', () => {
    expect(floorModifierGetMultiplier(2, 'food')).toBe(1.0);
    expect(floorModifierGetMultiplier(2, 'crystals')).toBe(1.0);
    expect(floorModifierGetMultiplier(2, 'gold')).toBe(1.0);
    expect(floorModifierGetMultiplier(2, 'corruption')).toBe(1.0);
  });

  it('should return 1.10 for crystals at depth 5', () => {
    expect(floorModifierGetMultiplier(5, 'crystals')).toBeCloseTo(1.10);
  });

  it('should return 1.10 for gold at depth 5', () => {
    expect(floorModifierGetMultiplier(5, 'gold')).toBeCloseTo(1.10);
  });

  it('should return 1.05 for corruption at depth 5', () => {
    expect(floorModifierGetMultiplier(5, 'corruption')).toBeCloseTo(1.05);
  });

  it('should return 0.85 for food at depth 5', () => {
    expect(floorModifierGetMultiplier(5, 'food')).toBeCloseTo(0.85);
  });

  it('should return 1.20 for crystals at depth 7', () => {
    expect(floorModifierGetMultiplier(7, 'crystals')).toBeCloseTo(1.20);
  });

  it('should return 0.70 for food at depth 7', () => {
    expect(floorModifierGetMultiplier(7, 'food')).toBeCloseTo(0.70);
  });

  it('should return 1.50 for flux at depth 10', () => {
    expect(floorModifierGetMultiplier(10, 'flux')).toBeCloseTo(1.50);
  });

  it('should return 1.50 for essence at depth 10', () => {
    expect(floorModifierGetMultiplier(10, 'essence')).toBeCloseTo(1.50);
  });

  it('should return 0.50 for food at depth 10', () => {
    expect(floorModifierGetMultiplier(10, 'food')).toBeCloseTo(0.50);
  });

  it('should return 1.0 for unaffected resource types', () => {
    expect(floorModifierGetMultiplier(5, 'research')).toBe(1.0);
    expect(floorModifierGetMultiplier(10, 'gold')).toBe(1.0);
  });

  it('should return 1.0 for invalid depth', () => {
    expect(floorModifierGetMultiplier(0, 'food')).toBe(1.0);
    expect(floorModifierGetMultiplier(11, 'food')).toBe(1.0);
  });
});

// --- floorModifierFormatPercentage ---

describe('floorModifierFormatPercentage', () => {
  it('should format positive percentage with + sign', () => {
    expect(floorModifierFormatPercentage(0.20)).toBe('+20%');
  });

  it('should format negative percentage with - sign', () => {
    expect(floorModifierFormatPercentage(-0.15)).toBe('-15%');
  });

  it('should format zero as +0%', () => {
    expect(floorModifierFormatPercentage(0)).toBe('+0%');
  });

  it('should handle 50% correctly', () => {
    expect(floorModifierFormatPercentage(0.50)).toBe('+50%');
    expect(floorModifierFormatPercentage(-0.50)).toBe('-50%');
  });
});
