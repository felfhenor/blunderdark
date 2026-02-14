import { beforeEach, describe, expect, it, vi } from 'vitest';

// Room type IDs (test-local)
const SHADOW_LIBRARY = 'aa100001-0001-0001-0001-000000000004';
const SOUL_WELL = 'aa100001-0001-0001-0001-000000000005';
const CRYSTAL_MINE = 'aa100001-0001-0001-0001-000000000002';
const MUSHROOM_GROVE = 'aa100001-0001-0001-0001-000000000003';
const DARK_FORGE = 'aa100001-0001-0001-0001-000000000006';
const UNDERGROUND_LAKE = 'aa100001-0001-0001-0001-000000000010';
const LEY_LINE_NEXUS = 'aa100001-0001-0001-0001-000000000011';
const THRONE_ROOM = 'aa100001-0001-0001-0001-000000000001';

// Mock room definitions with timeOfDayBonus and biomeBonuses
const mockRoomDefs = [
  { id: CRYSTAL_MINE, __type: 'room', timeOfDayBonus: { period: 'day', bonus: 0.10 }, biomeBonuses: { volcanic: 0.15, crystal: 0.40 } },
  { id: MUSHROOM_GROVE, __type: 'room', timeOfDayBonus: { period: 'day', bonus: 0.15 }, biomeBonuses: { fungal: 0.60 } },
  { id: SHADOW_LIBRARY, __type: 'room', timeOfDayBonus: { period: 'night', bonus: 0.20 }, biomeBonuses: { corrupted: 1.00 } },
  { id: SOUL_WELL, __type: 'room', timeOfDayBonus: { period: 'night', bonus: 0.15 }, biomeBonuses: { corrupted: 1.00 } },
  { id: DARK_FORGE, __type: 'room', biomeBonuses: { volcanic: 0.50 } },
  { id: UNDERGROUND_LAKE, __type: 'room', biomeBonuses: { flooded: 0.50 } },
  { id: LEY_LINE_NEXUS, __type: 'room', biomeBonuses: { crystal: 0.10 } },
  { id: THRONE_ROOM, __type: 'room' },
];

vi.mock('@helpers/content', () => ({
  contentGetEntriesByType: vi.fn((type: string) => {
    if (type === 'room') return mockRoomDefs;
    return [];
  }),
}));

import {
  productionModifierApply,
  productionModifierCalculate,
  productionModifierEvaluate,
  productionModifierGetBiomeBonus,
  productionModifierGetRegistry,
  productionModifierIsDayTime,
  productionModifierIsNightTime,
  productionModifierResetCache,
} from '@helpers/production-modifiers';
import type { RoomId } from '@interfaces';
import type { ProductionModifierContext } from '@interfaces/production-modifier';

function makeContext(overrides: Partial<ProductionModifierContext> = {}): ProductionModifierContext {
  return {
    roomTypeId: THRONE_ROOM as RoomId,
    floorDepth: 0,
    floorBiome: 'neutral',
    hour: 12,
    ...overrides,
  };
}

beforeEach(() => {
  productionModifierResetCache();
});

// --- Time helpers ---

describe('productionModifierIsNightTime', () => {
  it('should return true for hours >= 18', () => {
    expect(productionModifierIsNightTime(18)).toBe(true);
    expect(productionModifierIsNightTime(20)).toBe(true);
    expect(productionModifierIsNightTime(23)).toBe(true);
  });

  it('should return true for hours < 6', () => {
    expect(productionModifierIsNightTime(0)).toBe(true);
    expect(productionModifierIsNightTime(3)).toBe(true);
    expect(productionModifierIsNightTime(5)).toBe(true);
  });

  it('should return false for day hours', () => {
    expect(productionModifierIsNightTime(6)).toBe(false);
    expect(productionModifierIsNightTime(12)).toBe(false);
    expect(productionModifierIsNightTime(17)).toBe(false);
  });
});

describe('productionModifierIsDayTime', () => {
  it('should return true for day hours', () => {
    expect(productionModifierIsDayTime(6)).toBe(true);
    expect(productionModifierIsDayTime(12)).toBe(true);
    expect(productionModifierIsDayTime(17)).toBe(true);
  });

  it('should return false for night hours', () => {
    expect(productionModifierIsDayTime(0)).toBe(false);
    expect(productionModifierIsDayTime(5)).toBe(false);
    expect(productionModifierIsDayTime(18)).toBe(false);
    expect(productionModifierIsDayTime(23)).toBe(false);
  });
});

// --- Registry ---

describe('productionModifierGetRegistry', () => {
  it('should return all registered modifiers', () => {
    const registry = productionModifierGetRegistry();
    expect(registry.length).toBe(2);
    expect(registry.map((m) => m.type)).toEqual(['time_of_day', 'biome']);
  });

  it('should have unique ids', () => {
    const registry = productionModifierGetRegistry();
    const ids = new Set(registry.map((m) => m.id));
    expect(ids.size).toBe(registry.length);
  });
});

// --- productionModifierApply ---

describe('productionModifierApply', () => {
  it('should return base when no modifiers', () => {
    expect(productionModifierApply(10, [])).toBe(10);
  });

  it('should apply a single modifier', () => {
    expect(productionModifierApply(10, [1.2])).toBeCloseTo(12);
  });

  it('should multiply two modifiers', () => {
    expect(productionModifierApply(10, [1.2, 0.5])).toBeCloseTo(6);
  });

  it('should multiply five modifiers', () => {
    // 10 * 1.1 * 1.2 * 0.8 * 1.5 * 0.9
    const result = productionModifierApply(10, [1.1, 1.2, 0.8, 1.5, 0.9]);
    expect(result).toBeCloseTo(10 * 1.1 * 1.2 * 0.8 * 1.5 * 0.9);
  });

  it('should handle zero modifier', () => {
    expect(productionModifierApply(10, [0])).toBe(0);
  });
});

// --- Time-of-day modifiers ---

describe('time-of-day modifiers', () => {
  it('should give Shadow Library +20% bonus at night', () => {
    const context = makeContext({ roomTypeId: SHADOW_LIBRARY as RoomId, hour: 22 });
    const result = productionModifierCalculate(context);
    expect(result).toBeCloseTo(1.20);
  });

  it('should give Soul Well +15% bonus at night', () => {
    const context = makeContext({ roomTypeId: SOUL_WELL as RoomId, hour: 0 });
    const result = productionModifierCalculate(context);
    expect(result).toBeCloseTo(1.15);
  });

  it('should give Mushroom Grove +15% bonus during day', () => {
    const context = makeContext({ roomTypeId: MUSHROOM_GROVE as RoomId, hour: 12 });
    const result = productionModifierCalculate(context);
    expect(result).toBeCloseTo(1.15);
  });

  it('should give Crystal Mine +10% bonus during day', () => {
    const context = makeContext({ roomTypeId: CRYSTAL_MINE as RoomId, hour: 10 });
    const result = productionModifierCalculate(context);
    expect(result).toBeCloseTo(1.10);
  });

  it('should give no time bonus to unrelated room during day', () => {
    const context = makeContext({ roomTypeId: THRONE_ROOM as RoomId, hour: 12 });
    const result = productionModifierCalculate(context);
    expect(result).toBe(1.0);
  });

  it('should give no time bonus to unrelated room at night', () => {
    const context = makeContext({ roomTypeId: THRONE_ROOM as RoomId, hour: 22 });
    const result = productionModifierCalculate(context);
    expect(result).toBe(1.0);
  });

  it('should not give Shadow Library day bonus', () => {
    const context = makeContext({ roomTypeId: SHADOW_LIBRARY as RoomId, hour: 12 });
    const result = productionModifierCalculate(context);
    expect(result).toBe(1.0);
  });

  it('should not give Mushroom Grove night bonus', () => {
    const context = makeContext({ roomTypeId: MUSHROOM_GROVE as RoomId, hour: 22 });
    const result = productionModifierCalculate(context);
    expect(result).toBe(1.0);
  });

  it('should transition at night start boundary (hour 18)', () => {
    // hour 17 = day, hour 18 = night
    const day = productionModifierCalculate(makeContext({ roomTypeId: SHADOW_LIBRARY as RoomId, hour: 17 }));
    const night = productionModifierCalculate(makeContext({ roomTypeId: SHADOW_LIBRARY as RoomId, hour: 18 }));
    expect(day).toBe(1.0);
    expect(night).toBeCloseTo(1.20);
  });

  it('should transition at night end boundary (hour 6)', () => {
    // hour 5 = night, hour 6 = day
    const night = productionModifierCalculate(makeContext({ roomTypeId: MUSHROOM_GROVE as RoomId, hour: 5 }));
    const day = productionModifierCalculate(makeContext({ roomTypeId: MUSHROOM_GROVE as RoomId, hour: 6 }));
    expect(night).toBe(1.0);
    expect(day).toBeCloseTo(1.15);
  });
});

// Floor depth modifiers moved to floor-modifiers.spec.ts (resource-specific depth modifiers)

// --- Biome modifiers ---

describe('biome modifiers', () => {
  // Use nighttime for rooms with day bonuses to isolate biome effect
  // Use daytime for rooms with night bonuses to isolate biome effect

  it('should give Dark Forge +50% in volcanic biome', () => {
    const context = makeContext({ roomTypeId: DARK_FORGE as RoomId, floorBiome: 'volcanic' });
    const result = productionModifierCalculate(context);
    expect(result).toBeCloseTo(1.50);
  });

  it('should give Crystal Mine +15% in volcanic biome', () => {
    const context = makeContext({ roomTypeId: CRYSTAL_MINE as RoomId, floorBiome: 'volcanic', hour: 22 });
    const result = productionModifierCalculate(context);
    expect(result).toBeCloseTo(1.15);
  });

  it('should give Mushroom Grove +60% in fungal biome', () => {
    const context = makeContext({ roomTypeId: MUSHROOM_GROVE as RoomId, floorBiome: 'fungal', hour: 22 });
    const result = productionModifierCalculate(context);
    expect(result).toBeCloseTo(1.60);
  });

  it('should give Crystal Mine +40% in crystal biome', () => {
    const context = makeContext({ roomTypeId: CRYSTAL_MINE as RoomId, floorBiome: 'crystal', hour: 22 });
    const result = productionModifierCalculate(context);
    expect(result).toBeCloseTo(1.40);
  });

  it('should give Ley Line Nexus +10% in crystal biome', () => {
    const context = makeContext({ roomTypeId: LEY_LINE_NEXUS as RoomId, floorBiome: 'crystal' });
    const result = productionModifierCalculate(context);
    expect(result).toBeCloseTo(1.10);
  });

  it('should give Soul Well +100% in corrupted biome', () => {
    const context = makeContext({ roomTypeId: SOUL_WELL as RoomId, floorBiome: 'corrupted' });
    const result = productionModifierCalculate(context);
    expect(result).toBeCloseTo(2.00);
  });

  it('should give Shadow Library +100% in corrupted biome', () => {
    const context = makeContext({ roomTypeId: SHADOW_LIBRARY as RoomId, floorBiome: 'corrupted' });
    const result = productionModifierCalculate(context);
    expect(result).toBeCloseTo(2.00);
  });

  it('should give Underground Lake +50% in flooded biome', () => {
    const context = makeContext({ roomTypeId: UNDERGROUND_LAKE as RoomId, floorBiome: 'flooded' });
    const result = productionModifierCalculate(context);
    expect(result).toBeCloseTo(1.50);
  });

  it('should give no biome bonus in neutral biome', () => {
    const context = makeContext({ roomTypeId: CRYSTAL_MINE as RoomId, floorBiome: 'neutral', hour: 22 });
    expect(productionModifierCalculate(context)).toBe(1.0);
  });

  it('should give no biome bonus to unrelated room type', () => {
    const context = makeContext({ roomTypeId: THRONE_ROOM as RoomId, floorBiome: 'volcanic' });
    expect(productionModifierCalculate(context)).toBe(1.0);
  });
});

// --- Combined modifiers (multiplicative stacking) ---

describe('multiplicative stacking', () => {
  it('should multiply time-of-day and biome modifiers', () => {
    // Shadow Library at night (1.20) in corrupted biome (2.00) = 1.20 * 2.00 = 2.40
    const context = makeContext({
      roomTypeId: SHADOW_LIBRARY as RoomId,
      hour: 22,
      floorBiome: 'corrupted',
    });
    expect(productionModifierCalculate(context)).toBeCloseTo(2.40);
  });

  it('should return 1.0 when no modifiers apply', () => {
    const context = makeContext({
      roomTypeId: THRONE_ROOM as RoomId,
      hour: 12,
      floorDepth: 0,
      floorBiome: 'neutral',
    });
    expect(productionModifierCalculate(context)).toBe(1.0);
  });
});

// --- productionModifierEvaluate ---

describe('productionModifierEvaluate', () => {
  it('should return empty array when no modifiers apply', () => {
    const context = makeContext({
      roomTypeId: THRONE_ROOM as RoomId,
      hour: 12,
      floorDepth: 0,
      floorBiome: 'neutral',
    });
    expect(productionModifierEvaluate(context)).toEqual([]);
  });

  it('should return only active modifiers', () => {
    const context = makeContext({
      roomTypeId: SHADOW_LIBRARY as RoomId,
      hour: 22,
      floorDepth: 0,
      floorBiome: 'neutral',
    });
    const results = productionModifierEvaluate(context);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('time_of_day');
    expect(results[0].multiplier).toBeCloseTo(1.20);
  });

  it('should return multiple active modifiers', () => {
    const context = makeContext({
      roomTypeId: SHADOW_LIBRARY as RoomId,
      hour: 22,
      floorDepth: 2,
      floorBiome: 'corrupted',
    });
    const results = productionModifierEvaluate(context);
    expect(results).toHaveLength(2);
    const types = results.map((r) => r.type);
    expect(types).toContain('time_of_day');
    expect(types).toContain('biome');
  });

  it('should include description in results', () => {
    const context = makeContext({
      roomTypeId: SHADOW_LIBRARY as RoomId,
      hour: 22,
    });
    const results = productionModifierEvaluate(context);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].description).toBeTruthy();
  });
});

// --- productionModifierGetBiomeBonus ---

describe('productionModifierGetBiomeBonus', () => {
  it('should return 1.0 for neutral biome', () => {
    expect(productionModifierGetBiomeBonus('neutral', CRYSTAL_MINE as RoomId)).toBe(1.0);
  });

  it('should return 1.0 for unrelated room type', () => {
    expect(productionModifierGetBiomeBonus('volcanic', THRONE_ROOM as RoomId)).toBe(1.0);
  });

  it('should return correct bonus for Dark Forge in volcanic', () => {
    expect(productionModifierGetBiomeBonus('volcanic', DARK_FORGE as RoomId)).toBeCloseTo(1.50);
  });

  it('should return correct bonus for Crystal Mine in volcanic', () => {
    expect(productionModifierGetBiomeBonus('volcanic', CRYSTAL_MINE as RoomId)).toBeCloseTo(1.15);
  });

  it('should return correct bonus for Mushroom Grove in fungal', () => {
    expect(productionModifierGetBiomeBonus('fungal', MUSHROOM_GROVE as RoomId)).toBeCloseTo(1.60);
  });

  it('should return correct bonus for Crystal Mine in crystal', () => {
    expect(productionModifierGetBiomeBonus('crystal', CRYSTAL_MINE as RoomId)).toBeCloseTo(1.40);
  });

  it('should return correct bonus for Soul Well in corrupted', () => {
    expect(productionModifierGetBiomeBonus('corrupted', SOUL_WELL as RoomId)).toBeCloseTo(2.00);
  });

  it('should return correct bonus for Shadow Library in corrupted', () => {
    expect(productionModifierGetBiomeBonus('corrupted', SHADOW_LIBRARY as RoomId)).toBeCloseTo(2.00);
  });

  it('should return correct bonus for Underground Lake in flooded', () => {
    expect(productionModifierGetBiomeBonus('flooded', UNDERGROUND_LAKE as RoomId)).toBeCloseTo(1.50);
  });
});

