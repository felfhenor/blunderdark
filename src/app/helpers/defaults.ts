import { gridCreateEmpty } from '@helpers/grid';
import { rngUuid } from '@helpers/rng';
import type {
  CorruptionEffectState,
  Floor,
  FloorId,
  GameId,
  GameState,
  InvasionSchedule,
  MerchantState,
  ReputationState,
  ResearchState,
  ResourceMap,
  SeasonState,
  UnlockedContent,
  VictoryProgress,
} from '@interfaces';

export function defaultGameState(): GameState {
  return {
    meta: {
      version: 1,
      isSetup: false,
      isPaused: false,
      createdAt: Date.now(),
    },
    gameId: rngUuid<GameId>(),
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
      victoryProgress: defaultVictoryProgress(),
      merchant: defaultMerchantState(),
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
    featureFlags: [],
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
    id: rngUuid<FloorId>(),
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

export function defaultVictoryProgress(): VictoryProgress {
  return {
    consecutivePeacefulDays: 0,
    lastPeacefulCheckDay: 0,
    consecutiveZeroCorruptionDays: 0,
    lastZeroCorruptionCheckDay: 0,
    totalInvasionDefenseWins: 0,
  };
}

export function defaultMerchantState(): MerchantState {
  return {
    isPresent: false,
    arrivalDay: 0,
    departureDayRemaining: 0,
    inventory: [],
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
