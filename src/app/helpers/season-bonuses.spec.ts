import { describe, expect, it } from 'vitest';

import {
  SEASON_BONUS_DARKNESS_CORRUPTION,
  SEASON_BONUS_DARKNESS_DARK_SPAWN,
  SEASON_BONUS_GROWTH_FOOD,
  SEASON_BONUS_GROWTH_RECRUITMENT,
  SEASON_BONUS_HARVEST_ALL_PRODUCTION,
  SEASON_BONUS_STORMS_FLUX,
  seasonBonusAreRandomEventsEnabled,
  seasonBonusFormatMultiplier,
  seasonBonusGetActiveResourceModifiers,
  seasonBonusGetAllActive,
  seasonBonusGetRecruitmentCostMultiplier,
  seasonBonusGetResourceModifier,
  seasonBonusGetSeasonLabel,
  seasonBonusGetSpawnRateModifier,
  seasonBonusIsMerchantVisitEnabled,
} from '@helpers/season-bonuses';
import { recruitmentGetAdjustedCost } from '@helpers/recruitment';
import type { Season } from '@interfaces';

// --- Growth season ---

describe('Growth season', () => {
  const season: Season = 'growth';

  it('should return +50% food modifier', () => {
    expect(seasonBonusGetResourceModifier(season, 'food')).toBeCloseTo(SEASON_BONUS_GROWTH_FOOD);
  });

  it('should return 1.0 for non-food resources', () => {
    expect(seasonBonusGetResourceModifier(season, 'gold')).toBe(1.0);
    expect(seasonBonusGetResourceModifier(season, 'crystals')).toBe(1.0);
    expect(seasonBonusGetResourceModifier(season, 'corruption')).toBe(1.0);
    expect(seasonBonusGetResourceModifier(season, 'flux')).toBe(1.0);
    expect(seasonBonusGetResourceModifier(season, 'research')).toBe(1.0);
    expect(seasonBonusGetResourceModifier(season, 'essence')).toBe(1.0);
  });

  it('should return -25% recruitment cost', () => {
    expect(seasonBonusGetRecruitmentCostMultiplier(season)).toBeCloseTo(SEASON_BONUS_GROWTH_RECRUITMENT);
  });

  it('should not enable merchant visits', () => {
    expect(seasonBonusIsMerchantVisitEnabled(season)).toBe(false);
  });

  it('should not enable random events', () => {
    expect(seasonBonusAreRandomEventsEnabled(season)).toBe(false);
  });

  it('should have exactly 1 resource modifier', () => {
    expect(seasonBonusGetActiveResourceModifiers(season)).toHaveLength(1);
  });
});

// --- Harvest season ---

describe('Harvest season', () => {
  const season: Season = 'harvest';

  it('should return +20% for all resource types', () => {
    const resourceTypes = ['crystals', 'food', 'gold', 'flux', 'research', 'essence', 'corruption'];
    for (const type of resourceTypes) {
      expect(seasonBonusGetResourceModifier(season, type)).toBeCloseTo(SEASON_BONUS_HARVEST_ALL_PRODUCTION);
    }
  });

  it('should return 1.0 recruitment cost (no discount)', () => {
    expect(seasonBonusGetRecruitmentCostMultiplier(season)).toBe(1.0);
  });

  it('should enable merchant visits', () => {
    expect(seasonBonusIsMerchantVisitEnabled(season)).toBe(true);
  });

  it('should not enable random events', () => {
    expect(seasonBonusAreRandomEventsEnabled(season)).toBe(false);
  });

  it('should have 7 resource modifiers (one per resource type)', () => {
    expect(seasonBonusGetActiveResourceModifiers(season)).toHaveLength(7);
  });
});

// --- Darkness season ---

describe('Darkness season', () => {
  const season: Season = 'darkness';

  it('should return +100% corruption modifier', () => {
    expect(seasonBonusGetResourceModifier(season, 'corruption')).toBeCloseTo(SEASON_BONUS_DARKNESS_CORRUPTION);
  });

  it('should return 1.0 for non-corruption resources', () => {
    expect(seasonBonusGetResourceModifier(season, 'food')).toBe(1.0);
    expect(seasonBonusGetResourceModifier(season, 'gold')).toBe(1.0);
    expect(seasonBonusGetResourceModifier(season, 'flux')).toBe(1.0);
  });

  it('should return +50% dark creature spawn rate', () => {
    expect(seasonBonusGetSpawnRateModifier(season, 'dark')).toBeCloseTo(SEASON_BONUS_DARKNESS_DARK_SPAWN);
  });

  it('should return 1.0 spawn rate for non-dark creatures', () => {
    expect(seasonBonusGetSpawnRateModifier(season, 'creature')).toBe(1.0);
    expect(seasonBonusGetSpawnRateModifier(season, 'undead')).toBe(1.0);
  });

  it('should return 1.0 recruitment cost', () => {
    expect(seasonBonusGetRecruitmentCostMultiplier(season)).toBe(1.0);
  });

  it('should not enable merchant visits', () => {
    expect(seasonBonusIsMerchantVisitEnabled(season)).toBe(false);
  });
});

// --- Storms season ---

describe('Storms season', () => {
  const season: Season = 'storms';

  it('should return +80% flux modifier', () => {
    expect(seasonBonusGetResourceModifier(season, 'flux')).toBeCloseTo(SEASON_BONUS_STORMS_FLUX);
  });

  it('should return 1.0 for non-flux resources', () => {
    expect(seasonBonusGetResourceModifier(season, 'food')).toBe(1.0);
    expect(seasonBonusGetResourceModifier(season, 'gold')).toBe(1.0);
    expect(seasonBonusGetResourceModifier(season, 'corruption')).toBe(1.0);
  });

  it('should enable random events', () => {
    expect(seasonBonusAreRandomEventsEnabled(season)).toBe(true);
  });

  it('should not enable merchant visits', () => {
    expect(seasonBonusIsMerchantVisitEnabled(season)).toBe(false);
  });

  it('should return 1.0 recruitment cost', () => {
    expect(seasonBonusGetRecruitmentCostMultiplier(season)).toBe(1.0);
  });
});

// --- Cross-season isolation ---

describe('Cross-season isolation', () => {
  it('should not carry growth food bonus into harvest', () => {
    expect(seasonBonusGetResourceModifier('growth', 'food')).toBeCloseTo(1.50);
    expect(seasonBonusGetResourceModifier('harvest', 'food')).toBeCloseTo(1.20);
  });

  it('should not carry darkness corruption bonus into storms', () => {
    expect(seasonBonusGetResourceModifier('darkness', 'corruption')).toBeCloseTo(2.00);
    expect(seasonBonusGetResourceModifier('storms', 'corruption')).toBe(1.0);
  });

  it('should not carry growth recruitment discount into other seasons', () => {
    expect(seasonBonusGetRecruitmentCostMultiplier('growth')).toBeCloseTo(0.75);
    expect(seasonBonusGetRecruitmentCostMultiplier('harvest')).toBe(1.0);
    expect(seasonBonusGetRecruitmentCostMultiplier('darkness')).toBe(1.0);
    expect(seasonBonusGetRecruitmentCostMultiplier('storms')).toBe(1.0);
  });

  it('should not carry darkness spawn boost into other seasons', () => {
    expect(seasonBonusGetSpawnRateModifier('darkness', 'dark')).toBeCloseTo(1.50);
    expect(seasonBonusGetSpawnRateModifier('growth', 'dark')).toBe(1.0);
    expect(seasonBonusGetSpawnRateModifier('harvest', 'dark')).toBe(1.0);
    expect(seasonBonusGetSpawnRateModifier('storms', 'dark')).toBe(1.0);
  });
});

// --- Edge cases ---

describe('Edge cases', () => {
  it('should return 1.0 for unknown resource types', () => {
    expect(seasonBonusGetResourceModifier('growth', 'unknown_resource')).toBe(1.0);
    expect(seasonBonusGetResourceModifier('harvest', 'mana')).toBe(1.0);
  });

  it('should return 1.0 spawn rate for unknown creature types', () => {
    expect(seasonBonusGetSpawnRateModifier('darkness', 'unknown')).toBe(1.0);
  });
});

// --- Format helper ---

describe('seasonBonusFormatMultiplier', () => {
  it('should format bonus as positive percentage', () => {
    expect(seasonBonusFormatMultiplier(1.50)).toBe('+50%');
  });

  it('should format discount as negative percentage', () => {
    expect(seasonBonusFormatMultiplier(0.75)).toBe('-25%');
  });

  it('should format +100%', () => {
    expect(seasonBonusFormatMultiplier(2.0)).toBe('+100%');
  });

  it('should format +80%', () => {
    expect(seasonBonusFormatMultiplier(1.80)).toBe('+80%');
  });

  it('should format +20%', () => {
    expect(seasonBonusFormatMultiplier(1.20)).toBe('+20%');
  });

  it('should format 1.0 as +0%', () => {
    expect(seasonBonusFormatMultiplier(1.0)).toBe('+0%');
  });
});

// --- Season label ---

describe('seasonBonusGetSeasonLabel', () => {
  it('should return correct labels', () => {
    expect(seasonBonusGetSeasonLabel('growth')).toBe('Growth');
    expect(seasonBonusGetSeasonLabel('harvest')).toBe('Harvest');
    expect(seasonBonusGetSeasonLabel('darkness')).toBe('Darkness');
    expect(seasonBonusGetSeasonLabel('storms')).toBe('Storms');
  });
});

// --- Get all active ---

describe('seasonBonusGetAllActive', () => {
  it('should return growth data bundle', () => {
    const result = seasonBonusGetAllActive('growth');
    expect(result.season).toBe('growth');
    expect(result.resourceModifiers).toHaveLength(1);
    expect(result.recruitmentModifier).toBeDefined();
    expect(result.recruitmentModifier!.multiplier).toBeCloseTo(0.75);
    expect(result.spawnRateModifiers).toHaveLength(0);
    expect(result.merchantVisitEnabled).toBe(false);
    expect(result.randomEventsEnabled).toBe(false);
  });

  it('should return harvest data bundle with merchant visit', () => {
    const result = seasonBonusGetAllActive('harvest');
    expect(result.season).toBe('harvest');
    expect(result.resourceModifiers).toHaveLength(7);
    expect(result.recruitmentModifier).toBeUndefined();
    expect(result.merchantVisitEnabled).toBe(true);
    expect(result.randomEventsEnabled).toBe(false);
  });

  it('should return darkness data bundle with dark spawn boost', () => {
    const result = seasonBonusGetAllActive('darkness');
    expect(result.season).toBe('darkness');
    expect(result.resourceModifiers).toHaveLength(1);
    expect(result.spawnRateModifiers).toHaveLength(1);
    expect(result.spawnRateModifiers[0].creatureType).toBe('dark');
  });

  it('should return storms data bundle with random events', () => {
    const result = seasonBonusGetAllActive('storms');
    expect(result.season).toBe('storms');
    expect(result.resourceModifiers).toHaveLength(1);
    expect(result.randomEventsEnabled).toBe(true);
    expect(result.merchantVisitEnabled).toBe(false);
  });
});

// --- Recruitment adjusted cost ---

describe('recruitmentGetAdjustedCost', () => {
  it('should apply growth discount (-25%) to costs', () => {
    const cost = { gold: 100, food: 50 };
    const adjusted = recruitmentGetAdjustedCost(cost, 'growth');
    expect(adjusted.gold).toBe(75);
    expect(adjusted.food).toBe(38); // ceil(50 * 0.75) = 38
  });

  it('should return original cost for seasons without discount', () => {
    const cost = { gold: 100, food: 50 };
    const adjusted = recruitmentGetAdjustedCost(cost, 'harvest');
    expect(adjusted).toBe(cost); // same reference, no modification
  });

  it('should use Math.ceil for rounding', () => {
    const cost = { gold: 10 };
    const adjusted = recruitmentGetAdjustedCost(cost, 'growth');
    // ceil(10 * 0.75) = ceil(7.5) = 8
    expect(adjusted.gold).toBe(8);
  });

  it('should handle empty cost', () => {
    const adjusted = recruitmentGetAdjustedCost({}, 'growth');
    expect(Object.keys(adjusted)).toHaveLength(0);
  });
});
