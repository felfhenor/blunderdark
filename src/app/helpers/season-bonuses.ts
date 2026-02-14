import type { Season } from '@interfaces';
import type { SeasonResourceModifier, SeasonRecruitmentModifier, SeasonSpawnRateModifier } from '@interfaces/season-bonus';

// --- Constants ---

export const SEASON_BONUS_GROWTH_FOOD = 1.50;
export const SEASON_BONUS_GROWTH_RECRUITMENT = 0.75;
export const SEASON_BONUS_HARVEST_ALL_PRODUCTION = 1.20;
export const SEASON_BONUS_DARKNESS_CORRUPTION = 2.00;
export const SEASON_BONUS_DARKNESS_DARK_SPAWN = 1.50;
export const SEASON_BONUS_STORMS_FLUX = 1.80;

// --- Resource modifier configuration ---

const SEASON_BONUS_RESOURCE_MODIFIERS: readonly SeasonResourceModifier[] = [
  {
    source: 'season',
    season: 'growth',
    resourceType: 'food',
    multiplier: SEASON_BONUS_GROWTH_FOOD,
    description: 'Growth season food bonus (+50%)',
  },
  {
    source: 'season',
    season: 'harvest',
    resourceType: 'crystals',
    multiplier: SEASON_BONUS_HARVEST_ALL_PRODUCTION,
    description: 'Harvest season crystal bonus (+20%)',
  },
  {
    source: 'season',
    season: 'harvest',
    resourceType: 'food',
    multiplier: SEASON_BONUS_HARVEST_ALL_PRODUCTION,
    description: 'Harvest season food bonus (+20%)',
  },
  {
    source: 'season',
    season: 'harvest',
    resourceType: 'gold',
    multiplier: SEASON_BONUS_HARVEST_ALL_PRODUCTION,
    description: 'Harvest season gold bonus (+20%)',
  },
  {
    source: 'season',
    season: 'harvest',
    resourceType: 'flux',
    multiplier: SEASON_BONUS_HARVEST_ALL_PRODUCTION,
    description: 'Harvest season flux bonus (+20%)',
  },
  {
    source: 'season',
    season: 'harvest',
    resourceType: 'research',
    multiplier: SEASON_BONUS_HARVEST_ALL_PRODUCTION,
    description: 'Harvest season research bonus (+20%)',
  },
  {
    source: 'season',
    season: 'harvest',
    resourceType: 'essence',
    multiplier: SEASON_BONUS_HARVEST_ALL_PRODUCTION,
    description: 'Harvest season essence bonus (+20%)',
  },
  {
    source: 'season',
    season: 'harvest',
    resourceType: 'corruption',
    multiplier: SEASON_BONUS_HARVEST_ALL_PRODUCTION,
    description: 'Harvest season corruption bonus (+20%)',
  },
  {
    source: 'season',
    season: 'darkness',
    resourceType: 'corruption',
    multiplier: SEASON_BONUS_DARKNESS_CORRUPTION,
    description: 'Darkness season corruption surge (+100%)',
  },
  {
    source: 'season',
    season: 'storms',
    resourceType: 'flux',
    multiplier: SEASON_BONUS_STORMS_FLUX,
    description: 'Storms season flux surge (+80%)',
  },
];

// --- Recruitment modifier configuration ---

const SEASON_BONUS_RECRUITMENT_MODIFIERS: readonly SeasonRecruitmentModifier[] = [
  {
    source: 'season',
    season: 'growth',
    multiplier: SEASON_BONUS_GROWTH_RECRUITMENT,
    description: 'Growth season recruitment discount (-25%)',
  },
];

// --- Spawn rate modifier configuration ---

const SEASON_BONUS_SPAWN_RATE_MODIFIERS: readonly SeasonSpawnRateModifier[] = [
  {
    source: 'season',
    season: 'darkness',
    creatureType: 'dark',
    multiplier: SEASON_BONUS_DARKNESS_DARK_SPAWN,
    description: 'Darkness season dark creature spawn boost (+50%)',
  },
];

// --- Resource modifier functions ---

/**
 * Get the season resource production multiplier for a specific resource type.
 * Returns 1.0 if no modifier applies.
 */
export function seasonBonusGetResourceModifier(season: Season, resourceType: string): number {
  const modifier = SEASON_BONUS_RESOURCE_MODIFIERS.find(
    (m) => m.season === season && m.resourceType === resourceType,
  );
  return modifier?.multiplier ?? 1.0;
}

/**
 * Get all active resource modifiers for the current season.
 */
export function seasonBonusGetActiveResourceModifiers(season: Season): SeasonResourceModifier[] {
  return SEASON_BONUS_RESOURCE_MODIFIERS.filter((m) => m.season === season);
}

// --- Recruitment modifier functions ---

/**
 * Get the recruitment cost multiplier for the current season.
 * Returns 1.0 if no modifier applies.
 */
export function seasonBonusGetRecruitmentCostMultiplier(season: Season): number {
  const modifier = SEASON_BONUS_RECRUITMENT_MODIFIERS.find(
    (m) => m.season === season,
  );
  return modifier?.multiplier ?? 1.0;
}

// --- Spawn rate modifier functions ---

/**
 * Get the spawn rate multiplier for a specific creature type in the current season.
 * Returns 1.0 if no modifier applies.
 */
export function seasonBonusGetSpawnRateModifier(season: Season, creatureType: string): number {
  const modifier = SEASON_BONUS_SPAWN_RATE_MODIFIERS.find(
    (m) => m.season === season && m.creatureType === creatureType,
  );
  return modifier?.multiplier ?? 1.0;
}

// --- Flag-based queries ---

/**
 * Whether merchant visits are enabled for the current season.
 */
export function seasonBonusIsMerchantVisitEnabled(season: Season): boolean {
  return season === 'harvest';
}

/**
 * Whether random events are enabled for the current season.
 */
export function seasonBonusAreRandomEventsEnabled(season: Season): boolean {
  return season === 'storms';
}

// --- Display helpers ---

/**
 * Get all active modifiers for display purposes.
 */
export function seasonBonusGetAllActive(season: Season): {
  season: Season;
  resourceModifiers: SeasonResourceModifier[];
  recruitmentModifier: SeasonRecruitmentModifier | undefined;
  spawnRateModifiers: SeasonSpawnRateModifier[];
  merchantVisitEnabled: boolean;
  randomEventsEnabled: boolean;
} {
  return {
    season,
    resourceModifiers: seasonBonusGetActiveResourceModifiers(season),
    recruitmentModifier: SEASON_BONUS_RECRUITMENT_MODIFIERS.find((m) => m.season === season),
    spawnRateModifiers: SEASON_BONUS_SPAWN_RATE_MODIFIERS.filter((m) => m.season === season),
    merchantVisitEnabled: seasonBonusIsMerchantVisitEnabled(season),
    randomEventsEnabled: seasonBonusAreRandomEventsEnabled(season),
  };
}

/**
 * Format a multiplier as a percentage string.
 * e.g., 1.50 → "+50%", 0.75 → "-25%"
 */
export function seasonBonusFormatMultiplier(multiplier: number): string {
  const percentage = Math.round((multiplier - 1.0) * 100);
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage}%`;
}

/**
 * Get a display label for a season.
 */
export function seasonBonusGetSeasonLabel(season: Season): string {
  const labels: Record<Season, string> = {
    growth: 'Growth',
    harvest: 'Harvest',
    darkness: 'Darkness',
    storms: 'Storms',
  };
  return labels[season];
}
