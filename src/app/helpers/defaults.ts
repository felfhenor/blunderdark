import { createEmptyGrid } from '@helpers/grid';
import { rngUuid } from '@helpers/rng';
import type {
  GameId,
  GameState,
  ResourceMap,
  SeasonState,
  StatBlock,
} from '@interfaces';

export function defaultGameState(): GameState {
  return {
    meta: {
      version: 1,
      isSetup: false,
      isPaused: false,
      createdAt: Date.now(),
    },
    gameId: rngUuid() as GameId,
    clock: {
      numTicks: 0,
      lastSaveTick: 0,
    },
    world: {
      grid: createEmptyGrid(),
      resources: defaultResources(),
      inhabitants: [],
      hallways: [],
      season: defaultSeasonState(),
    },
  };
}

export function defaultSeasonState(): SeasonState {
  return {
    currentSeason: 'growth',
    dayInSeason: 1,
    totalSeasonCycles: 0,
  };
}

export function defaultResources(): ResourceMap {
  return {
    crystals: { current: 0, max: 500 },
    food: { current: 0, max: 500 },
    gold: { current: 0, max: 1000 },
    flux: { current: 0, max: 200 },
    research: { current: 0, max: 300 },
    essence: { current: 0, max: 200 },
    corruption: { current: 0, max: 100 },
  };
}

export function defaultStats(): StatBlock {
  return {
    Damage: 0,
    Defense: 0,
    Health: 0,
    Regen: 0,
    Shield: 0,
    Evasion: 0,
    Lifesteal: 0,
    Thorns: 0,
    CritChance: 0,
    CritDamage: 0,
    AttackSpeed: 0,
    ProjectileCount: 0,
    ProjectileSpeed: 0,
    ProjectileBounces: 0,
    Duration: 0,
    Knockback: 0,
    MovementSpeed: 0,
    Luck: 0,
    Difficulty: 0,
    ExpGain: 0,
    GoldGain: 0,
    FavorGain: 0,
    FreezeChance: 0,
    PoisonChance: 0,
  };
}
