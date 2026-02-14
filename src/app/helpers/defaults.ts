import { gridCreateEmpty } from '@helpers/grid';
import { rngUuid } from '@helpers/rng';
import type {
  CorruptionEffectState,
  Floor,
  GameId,
  GameState,
  InvasionSchedule,
  ReputationState,
  ResearchState,
  ResourceMap,
  SeasonState,
  StatBlock,
  UnlockedContent,
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
      day: 1,
      hour: 0,
      minute: 0,
    },
    world: {
      grid: gridCreateEmpty(),
      resources: defaultResources(),
      inhabitants: [],
      hallways: [],
      season: defaultSeasonState(),
      research: defaultResearchState(),
      reputation: defaultReputationState(),
      floors: [defaultFloor()],
      currentFloorIndex: 0,
      trapInventory: [],
      trapCraftingQueues: [],
      forgeInventory: [],
      forgeCraftingQueues: [],
      alchemyConversions: [],
      prisoners: [],
      invasionSchedule: defaultInvasionSchedule(),
      corruptionEffects: defaultCorruptionEffectState(),
      stairs: [],
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

export function defaultReputationState(): ReputationState {
  return {
    terror: 0,
    wealth: 0,
    knowledge: 0,
    harmony: 0,
    chaos: 0,
  };
}

export function defaultResearchState(): ResearchState {
  return {
    completedNodes: [],
    activeResearch: undefined,
    activeResearchProgress: 0,
    activeResearchStartTick: 0,
    unlockedContent: defaultUnlockedContent(),
  };
}

export function defaultUnlockedContent(): UnlockedContent {
  return {
    rooms: [],
    inhabitants: [],
    abilities: [],
    upgrades: [],
    passiveBonuses: [],
  };
}

/**
 * Creates a default floor with the specified biome.
 * Used for the starting floor when a new game begins.
 * @param depth Floor depth (defaults to 1)
 * @param biome Floor biome (defaults to 'neutral')
 */
export function defaultFloor(
  depth = 1,
  biome: Floor['biome'] = 'neutral',
): Floor {
  return {
    id: rngUuid(),
    name: `Floor ${depth}`,
    depth,
    biome,
    grid: gridCreateEmpty(),
    rooms: [],
    hallways: [],
    inhabitants: [],
    connections: [],
    traps: [],
  };
}

export function defaultInvasionSchedule(): InvasionSchedule {
  return {
    nextInvasionDay: undefined,
    nextInvasionVariance: 0,
    gracePeriodEnd: 30,
    invasionHistory: [],
    pendingSpecialInvasions: [],
    warningActive: false,
    warningDismissed: false,
  };
}

export function defaultCorruptionEffectState(): CorruptionEffectState {
  return {
    darkUpgradeUnlocked: false,
    lastMutationCorruption: undefined,
    lastCrusadeCorruption: undefined,
    warnedThresholds: [],
  };
}

export function defaultResources(): ResourceMap {
  return {
    crystals: { current: 0, max: 500 },
    food: { current: 50, max: 500 },
    gold: { current: 100, max: 1000 },
    flux: { current: 0, max: 200 },
    research: { current: 0, max: 300 },
    essence: { current: 0, max: 200 },
    corruption: { current: 0, max: Number.MAX_SAFE_INTEGER },
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
