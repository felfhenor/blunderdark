import { describe, expect, it } from 'vitest';
import {
  DEPTH_BONUS_PER_LEVEL,
  applyModifiers,
  calculateProductionModifiers,
  evaluateModifiers,
  getModifierRegistry,
  isDayTime,
  isNightTime,
} from '@helpers/production-modifiers';
import type { ProductionModifierContext } from '@helpers/production-modifiers';

// Room type IDs matching production-modifiers.ts constants
const SHADOW_LIBRARY = 'aa100001-0001-0001-0001-000000000004';
const SOUL_WELL = 'aa100001-0001-0001-0001-000000000005';
const CRYSTAL_MINE = 'aa100001-0001-0001-0001-000000000002';
const MUSHROOM_GROVE = 'aa100001-0001-0001-0001-000000000003';
const UNDERGROUND_LAKE = 'aa100001-0001-0001-0001-000000000010';
const LEY_LINE_NEXUS = 'aa100001-0001-0001-0001-000000000011';
const THRONE_ROOM = 'aa100001-0001-0001-0001-000000000001';

function makeContext(overrides: Partial<ProductionModifierContext> = {}): ProductionModifierContext {
  return {
    roomTypeId: THRONE_ROOM,
    floorDepth: 0,
    floorBiome: 'neutral',
    hour: 12,
    ...overrides,
  };
}

// --- Time helpers ---

describe('isNightTime', () => {
  it('should return true for hours >= 18', () => {
    expect(isNightTime(18)).toBe(true);
    expect(isNightTime(20)).toBe(true);
    expect(isNightTime(23)).toBe(true);
  });

  it('should return true for hours < 6', () => {
    expect(isNightTime(0)).toBe(true);
    expect(isNightTime(3)).toBe(true);
    expect(isNightTime(5)).toBe(true);
  });

  it('should return false for day hours', () => {
    expect(isNightTime(6)).toBe(false);
    expect(isNightTime(12)).toBe(false);
    expect(isNightTime(17)).toBe(false);
  });
});

describe('isDayTime', () => {
  it('should return true for day hours', () => {
    expect(isDayTime(6)).toBe(true);
    expect(isDayTime(12)).toBe(true);
    expect(isDayTime(17)).toBe(true);
  });

  it('should return false for night hours', () => {
    expect(isDayTime(0)).toBe(false);
    expect(isDayTime(5)).toBe(false);
    expect(isDayTime(18)).toBe(false);
    expect(isDayTime(23)).toBe(false);
  });
});

// --- Registry ---

describe('getModifierRegistry', () => {
  it('should return all registered modifiers', () => {
    const registry = getModifierRegistry();
    expect(registry.length).toBe(3);
    expect(registry.map((m) => m.type)).toEqual(['time_of_day', 'floor_depth', 'biome']);
  });

  it('should have unique ids', () => {
    const registry = getModifierRegistry();
    const ids = new Set(registry.map((m) => m.id));
    expect(ids.size).toBe(registry.length);
  });
});

// --- applyModifiers ---

describe('applyModifiers', () => {
  it('should return base when no modifiers', () => {
    expect(applyModifiers(10, [])).toBe(10);
  });

  it('should apply a single modifier', () => {
    expect(applyModifiers(10, [1.2])).toBeCloseTo(12);
  });

  it('should multiply two modifiers', () => {
    expect(applyModifiers(10, [1.2, 0.5])).toBeCloseTo(6);
  });

  it('should multiply five modifiers', () => {
    // 10 * 1.1 * 1.2 * 0.8 * 1.5 * 0.9
    const result = applyModifiers(10, [1.1, 1.2, 0.8, 1.5, 0.9]);
    expect(result).toBeCloseTo(10 * 1.1 * 1.2 * 0.8 * 1.5 * 0.9);
  });

  it('should handle zero modifier', () => {
    expect(applyModifiers(10, [0])).toBe(0);
  });
});

// --- Time-of-day modifiers ---

describe('time-of-day modifiers', () => {
  it('should give Shadow Library +20% bonus at night', () => {
    const context = makeContext({ roomTypeId: SHADOW_LIBRARY, hour: 22 });
    const result = calculateProductionModifiers(context);
    expect(result).toBeCloseTo(1.20);
  });

  it('should give Soul Well +15% bonus at night', () => {
    const context = makeContext({ roomTypeId: SOUL_WELL, hour: 0 });
    const result = calculateProductionModifiers(context);
    expect(result).toBeCloseTo(1.15);
  });

  it('should give Mushroom Grove +15% bonus during day', () => {
    const context = makeContext({ roomTypeId: MUSHROOM_GROVE, hour: 12 });
    const result = calculateProductionModifiers(context);
    expect(result).toBeCloseTo(1.15);
  });

  it('should give Crystal Mine +10% bonus during day', () => {
    const context = makeContext({ roomTypeId: CRYSTAL_MINE, hour: 10 });
    const result = calculateProductionModifiers(context);
    expect(result).toBeCloseTo(1.10);
  });

  it('should give no time bonus to unrelated room during day', () => {
    const context = makeContext({ roomTypeId: THRONE_ROOM, hour: 12 });
    const result = calculateProductionModifiers(context);
    expect(result).toBe(1.0);
  });

  it('should give no time bonus to unrelated room at night', () => {
    const context = makeContext({ roomTypeId: THRONE_ROOM, hour: 22 });
    const result = calculateProductionModifiers(context);
    expect(result).toBe(1.0);
  });

  it('should not give Shadow Library day bonus', () => {
    const context = makeContext({ roomTypeId: SHADOW_LIBRARY, hour: 12 });
    const result = calculateProductionModifiers(context);
    expect(result).toBe(1.0);
  });

  it('should not give Mushroom Grove night bonus', () => {
    const context = makeContext({ roomTypeId: MUSHROOM_GROVE, hour: 22 });
    const result = calculateProductionModifiers(context);
    expect(result).toBe(1.0);
  });

  it('should transition at night start boundary (hour 18)', () => {
    // hour 17 = day, hour 18 = night
    const day = calculateProductionModifiers(makeContext({ roomTypeId: SHADOW_LIBRARY, hour: 17 }));
    const night = calculateProductionModifiers(makeContext({ roomTypeId: SHADOW_LIBRARY, hour: 18 }));
    expect(day).toBe(1.0);
    expect(night).toBeCloseTo(1.20);
  });

  it('should transition at night end boundary (hour 6)', () => {
    // hour 5 = night, hour 6 = day
    const night = calculateProductionModifiers(makeContext({ roomTypeId: MUSHROOM_GROVE, hour: 5 }));
    const day = calculateProductionModifiers(makeContext({ roomTypeId: MUSHROOM_GROVE, hour: 6 }));
    expect(night).toBe(1.0);
    expect(day).toBeCloseTo(1.15);
  });
});

// --- Floor depth modifiers ---

describe('floor depth modifiers', () => {
  it('should give no bonus at depth 0', () => {
    const context = makeContext({ floorDepth: 0 });
    expect(calculateProductionModifiers(context)).toBe(1.0);
  });

  it('should give +5% at depth 1', () => {
    const context = makeContext({ floorDepth: 1 });
    expect(calculateProductionModifiers(context)).toBeCloseTo(1.05);
  });

  it('should give +10% at depth 2', () => {
    const context = makeContext({ floorDepth: 2 });
    expect(calculateProductionModifiers(context)).toBeCloseTo(1.10);
  });

  it('should give +25% at depth 5', () => {
    const context = makeContext({ floorDepth: 5 });
    expect(calculateProductionModifiers(context)).toBeCloseTo(1.25);
  });

  it('should scale linearly with depth', () => {
    for (let d = 0; d <= 9; d++) {
      const context = makeContext({ floorDepth: d });
      const expected = 1.0 + d * DEPTH_BONUS_PER_LEVEL;
      expect(calculateProductionModifiers(context)).toBeCloseTo(expected);
    }
  });
});

// --- Biome modifiers ---

describe('biome modifiers', () => {
  // Use nighttime for rooms with day bonuses to isolate biome effect
  // Use daytime for rooms with night bonuses to isolate biome effect

  it('should give Crystal Mine +15% in volcanic biome', () => {
    const context = makeContext({ roomTypeId: CRYSTAL_MINE, floorBiome: 'volcanic', hour: 22 });
    const result = calculateProductionModifiers(context);
    expect(result).toBeCloseTo(1.15);
  });

  it('should give Mushroom Grove +20% in fungal biome', () => {
    const context = makeContext({ roomTypeId: MUSHROOM_GROVE, floorBiome: 'fungal', hour: 22 });
    const result = calculateProductionModifiers(context);
    expect(result).toBeCloseTo(1.20);
  });

  it('should give Crystal Mine +25% in crystal biome', () => {
    const context = makeContext({ roomTypeId: CRYSTAL_MINE, floorBiome: 'crystal', hour: 22 });
    const result = calculateProductionModifiers(context);
    expect(result).toBeCloseTo(1.25);
  });

  it('should give Ley Line Nexus +10% in crystal biome', () => {
    const context = makeContext({ roomTypeId: LEY_LINE_NEXUS, floorBiome: 'crystal' });
    const result = calculateProductionModifiers(context);
    expect(result).toBeCloseTo(1.10);
  });

  it('should give Soul Well +20% in corrupted biome', () => {
    const context = makeContext({ roomTypeId: SOUL_WELL, floorBiome: 'corrupted' });
    const result = calculateProductionModifiers(context);
    expect(result).toBeCloseTo(1.20);
  });

  it('should give Shadow Library +15% in corrupted biome', () => {
    const context = makeContext({ roomTypeId: SHADOW_LIBRARY, floorBiome: 'corrupted' });
    const result = calculateProductionModifiers(context);
    expect(result).toBeCloseTo(1.15);
  });

  it('should give Underground Lake +20% in flooded biome', () => {
    const context = makeContext({ roomTypeId: UNDERGROUND_LAKE, floorBiome: 'flooded' });
    const result = calculateProductionModifiers(context);
    expect(result).toBeCloseTo(1.20);
  });

  it('should give no biome bonus in neutral biome', () => {
    const context = makeContext({ roomTypeId: CRYSTAL_MINE, floorBiome: 'neutral', hour: 22 });
    expect(calculateProductionModifiers(context)).toBe(1.0);
  });

  it('should give no biome bonus to unrelated room type', () => {
    const context = makeContext({ roomTypeId: THRONE_ROOM, floorBiome: 'volcanic' });
    expect(calculateProductionModifiers(context)).toBe(1.0);
  });
});

// --- Combined modifiers (multiplicative stacking) ---

describe('multiplicative stacking', () => {
  it('should multiply time-of-day and depth modifiers', () => {
    // Shadow Library at night (1.20) at depth 2 (1.10) = 1.20 * 1.10 = 1.32
    const context = makeContext({
      roomTypeId: SHADOW_LIBRARY,
      hour: 22,
      floorDepth: 2,
    });
    expect(calculateProductionModifiers(context)).toBeCloseTo(1.32);
  });

  it('should multiply time-of-day and biome modifiers', () => {
    // Shadow Library at night (1.20) in corrupted biome (1.15) = 1.20 * 1.15 = 1.38
    const context = makeContext({
      roomTypeId: SHADOW_LIBRARY,
      hour: 22,
      floorBiome: 'corrupted',
    });
    expect(calculateProductionModifiers(context)).toBeCloseTo(1.38);
  });

  it('should multiply all three modifiers', () => {
    // Soul Well at night (1.15) at depth 3 (1.15) in corrupted biome (1.20)
    // = 1.15 * 1.15 * 1.20 = 1.587
    const context = makeContext({
      roomTypeId: SOUL_WELL,
      hour: 0,
      floorDepth: 3,
      floorBiome: 'corrupted',
    });
    expect(calculateProductionModifiers(context)).toBeCloseTo(1.15 * 1.15 * 1.20);
  });

  it('should return 1.0 when no modifiers apply', () => {
    const context = makeContext({
      roomTypeId: THRONE_ROOM,
      hour: 12,
      floorDepth: 0,
      floorBiome: 'neutral',
    });
    expect(calculateProductionModifiers(context)).toBe(1.0);
  });
});

// --- evaluateModifiers ---

describe('evaluateModifiers', () => {
  it('should return empty array when no modifiers apply', () => {
    const context = makeContext({
      roomTypeId: THRONE_ROOM,
      hour: 12,
      floorDepth: 0,
      floorBiome: 'neutral',
    });
    expect(evaluateModifiers(context)).toEqual([]);
  });

  it('should return only active modifiers', () => {
    const context = makeContext({
      roomTypeId: SHADOW_LIBRARY,
      hour: 22,
      floorDepth: 0,
      floorBiome: 'neutral',
    });
    const results = evaluateModifiers(context);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('time_of_day');
    expect(results[0].multiplier).toBeCloseTo(1.20);
  });

  it('should return multiple active modifiers', () => {
    const context = makeContext({
      roomTypeId: SHADOW_LIBRARY,
      hour: 22,
      floorDepth: 2,
      floorBiome: 'corrupted',
    });
    const results = evaluateModifiers(context);
    expect(results).toHaveLength(3);
    const types = results.map((r) => r.type);
    expect(types).toContain('time_of_day');
    expect(types).toContain('floor_depth');
    expect(types).toContain('biome');
  });

  it('should include description in results', () => {
    const context = makeContext({
      roomTypeId: SHADOW_LIBRARY,
      hour: 22,
    });
    const results = evaluateModifiers(context);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].description).toBeTruthy();
  });
});
