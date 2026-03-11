import { contentGetEntriesByType, contentGetEntry } from '@helpers/content';
import { rngShuffle, rngUuid } from '@helpers/rng';
import { roomRoleFindById } from '@helpers/room-roles';
import type {
  GameState,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';
import type {
  InvasionObjective,
  InvasionObjectiveId,
  InvasionResult,
  ObjectiveType,
} from '@interfaces/invasion-objective';
import seedrandom from 'seedrandom';

// --- Helpers ---

function invasionObjectiveGetInhabitantTier(definitionId: string): number {
  const def = contentGetEntry<InhabitantContent>(
    definitionId,
  );
  return def?.tier ?? 1;
}

// --- Data-driven room lookup for objectives ---

let objectiveTypeCache: Map<string, string[]> | undefined = undefined;

function invasionObjectiveGetTypeMap(): Map<string, string[]> {
  if (!objectiveTypeCache) {
    const rooms = contentGetEntriesByType<RoomContent>(
      'room',
    );
    objectiveTypeCache = new Map();
    for (const room of rooms) {
      if (room.objectiveTypes) {
        for (const objType of room.objectiveTypes) {
          if (!objectiveTypeCache.has(objType)) {
            objectiveTypeCache.set(objType, []);
          }
          objectiveTypeCache.get(objType)!.push(room.id);
        }
      }
    }
  }
  return objectiveTypeCache;
}

export function invasionObjectiveResetCache(): void {
  objectiveTypeCache = undefined;
}

function invasionObjectiveFindRoomByType(
  state: GameState,
  objectiveType: string,
): string | undefined {
  const map = invasionObjectiveGetTypeMap();
  const roomTypeIds = map.get(objectiveType);
  if (!roomTypeIds || roomTypeIds.length === 0) return undefined;

  for (const floor of state.world.floors) {
    for (const room of floor.rooms) {
      if (roomTypeIds.includes(room.roomTypeId)) {
        return room.id;
      }
    }
  }
  return undefined;
}

function invasionObjectiveHasRoomWithType(
  state: GameState,
  objectiveType: string,
): boolean {
  return invasionObjectiveFindRoomByType(state, objectiveType) !== undefined;
}

// --- Objective definitions ---

type ObjectiveTemplate = {
  type: ObjectiveType;
  name: string;
  description: string;
  isEligible: (state: GameState) => boolean;
  getTargetId: (state: GameState) => string | undefined;
};

// --- Constants ---

export const INVASION_OBJECTIVE_SURVIVE_N_TURNS_TARGET = 50;
export const INVASION_OBJECTIVE_SURVIVE_N_TURNS_MIN_PATH_ROOMS = 10;
export const INVASION_OBJECTIVE_DEPTH_MIN_FLOORS = 5;

const SECONDARY_OBJECTIVE_TEMPLATES: ObjectiveTemplate[] = [
  {
    type: 'SlayMonster',
    name: 'Slay Monster',
    description: 'Kill a powerful creature defending the dungeon.',
    isEligible: (state) =>
      state.world.inhabitants.some(
        (i) => invasionObjectiveGetInhabitantTier(i.definitionId) >= 2,
      ),
    getTargetId: (state) => {
      const target = state.world.inhabitants.find(
        (i) => invasionObjectiveGetInhabitantTier(i.definitionId) >= 2,
      );
      return target?.instanceId ?? undefined;
    },
  },
  {
    type: 'StealTreasure',
    name: 'Steal Treasure',
    description: 'Loot gold from the dungeon treasury.',
    isEligible: (state) =>
      invasionObjectiveHasRoomWithType(state, 'StealTreasure'),
    getTargetId: (state) =>
      invasionObjectiveFindRoomByType(state, 'StealTreasure'),
  },
  {
    type: 'DefileLibrary',
    name: 'Defile Library',
    description: 'Destroy forbidden knowledge stored in the shadow library.',
    isEligible: (state) =>
      invasionObjectiveHasRoomWithType(state, 'DefileLibrary'),
    getTargetId: (state) =>
      invasionObjectiveFindRoomByType(state, 'DefileLibrary'),
  },
  {
    type: 'SealPortal',
    name: 'Seal Portal',
    description: 'Seal a dark energy nexus to weaken the dungeon.',
    isEligible: (state) =>
      invasionObjectiveHasRoomWithType(state, 'SealPortal'),
    getTargetId: (state) =>
      invasionObjectiveFindRoomByType(state, 'SealPortal'),
  },
  {
    type: 'PlunderVault',
    name: 'Plunder Vault',
    description: 'Break into the treasure vault and carry away riches.',
    isEligible: (state) =>
      invasionObjectiveHasRoomWithType(state, 'PlunderVault'),
    getTargetId: (state) =>
      invasionObjectiveFindRoomByType(state, 'PlunderVault'),
  },
  {
    type: 'RescuePrisoner',
    name: 'Rescue Prisoner',
    description: 'Free a captive creature from the dungeon.',
    isEligible: (state) => state.world.inhabitants.length > 0,
    getTargetId: (state) => state.world.inhabitants[0]?.instanceId ?? undefined,
  },
  {
    type: 'ScoutDungeon',
    name: 'Scout Dungeon',
    description: 'Map the dungeon layout for future invasions.',
    isEligible: () => true,
    getTargetId: () => undefined,
  },
  {
    type: 'SabotageForge',
    name: 'Sabotage Forge',
    description: 'Wreck the dark forge to halt weapon crafting.',
    isEligible: (state) =>
      invasionObjectiveHasRoomWithType(state, 'SabotageForge'),
    getTargetId: (state) =>
      invasionObjectiveFindRoomByType(state, 'SabotageForge'),
  },
  {
    type: 'DisruptBreeding',
    name: 'Disrupt Breeding',
    description: 'Shut down the breeding pits to stop monster production.',
    isEligible: (state) =>
      invasionObjectiveHasRoomWithType(state, 'DisruptBreeding'),
    getTargetId: (state) =>
      invasionObjectiveFindRoomByType(state, 'DisruptBreeding'),
  },
  {
    type: 'BanishSummons',
    name: 'Banish Summons',
    description: 'Disrupt the summoning circle to sever planar connections.',
    isEligible: (state) =>
      invasionObjectiveHasRoomWithType(state, 'BanishSummons'),
    getTargetId: (state) =>
      invasionObjectiveFindRoomByType(state, 'BanishSummons'),
  },
  {
    type: 'PurifyShrine',
    name: 'Purify Shrine',
    description: 'Cleanse the corrupted soul well of dark energy.',
    isEligible: (state) =>
      invasionObjectiveHasRoomWithType(state, 'PurifyShrine'),
    getTargetId: (state) =>
      invasionObjectiveFindRoomByType(state, 'PurifyShrine'),
  },
  {
    type: 'PoisonSupply',
    name: 'Poison Supply',
    description: 'Contaminate food stores to starve the dungeon.',
    isEligible: (state) =>
      invasionObjectiveHasRoomWithType(state, 'PoisonSupply'),
    getTargetId: (state) =>
      invasionObjectiveFindRoomByType(state, 'PoisonSupply'),
  },
  {
    type: 'StealBlueprints',
    name: 'Steal Blueprints',
    description: 'Steal research notes and arcane blueprints from the library.',
    isEligible: (state) =>
      invasionObjectiveHasRoomWithType(state, 'StealBlueprints'),
    getTargetId: (state) =>
      invasionObjectiveFindRoomByType(state, 'StealBlueprints'),
  },
  {
    type: 'AssassinateCommander',
    name: 'Assassinate Commander',
    description: 'Hunt down and kill a high-tier commander defending the dungeon.',
    isEligible: (state) =>
      state.world.inhabitants.some(
        (i) => invasionObjectiveGetInhabitantTier(i.definitionId) >= 4,
      ),
    getTargetId: (state) => {
      const target = state.world.inhabitants.find(
        (i) => invasionObjectiveGetInhabitantTier(i.definitionId) >= 4,
      );
      return target?.instanceId ?? undefined;
    },
  },
  {
    type: 'SurviveNTurns',
    name: 'Survive the Gauntlet',
    description: 'Survive deep within the dungeon long enough to weaken its defenses.',
    isEligible: (state) => {
      let totalRooms = 0;
      for (const floor of state.world.floors) {
        totalRooms += floor.rooms.length;
      }
      return totalRooms >= INVASION_OBJECTIVE_SURVIVE_N_TURNS_MIN_PATH_ROOMS;
    },
    getTargetId: () => undefined,
  },
  {
    type: 'ReachDepth',
    name: 'Reach the Depths',
    description: 'Penetrate deep into the dungeon to expose its inner sanctum.',
    isEligible: (state) =>
      state.world.floors.length >= INVASION_OBJECTIVE_DEPTH_MIN_FLOORS,
    getTargetId: () => undefined,
  },
  {
    type: 'PlantBeacon',
    name: 'Plant Beacon',
    description: 'Plant a tracking beacon deep in the dungeon to guide future invasions.',
    isEligible: (state) =>
      state.world.floors.length >= INVASION_OBJECTIVE_DEPTH_MIN_FLOORS,
    getTargetId: () => undefined,
  },
];

// --- Objective assignment ---

/**
 * Assign invasion objectives: 1 primary (Destroy Altar) + 2 secondary.
 * Secondary objectives are selected from eligible pool based on game state.
 * Seed ensures deterministic selection.
 * Optional preferredObjectives sorts matching types first in the shuffle.
 */
export function invasionObjectiveAssign(
  state: GameState,
  seed: string,
  preferredObjectives?: ObjectiveType[],
): InvasionObjective[] {
  const rng = seedrandom(seed);
  const objectives: InvasionObjective[] = [];

  // Primary: Destroy Altar
  const altarId = invasionObjectiveFindAltarRoomId(state);
  objectives.push({
    id: rngUuid<InvasionObjectiveId>(),
    type: 'DestroyAltar',
    name: 'Destroy Altar',
    description: "Destroy the dungeon altar to cripple the dark lord's power.",
    targetId: altarId,
    isPrimary: true,
    isCompleted: false,
    progress: 0,
  });

  // Secondary: select 2 from eligible pool
  const eligible = SECONDARY_OBJECTIVE_TEMPLATES.filter((t) =>
    t.isEligible(state),
  );

  // Shuffle eligible, then sort preferred types to front
  let shuffled = rngShuffle(eligible, rng);
  if (preferredObjectives?.length) {
    const preferredSet = new Set(preferredObjectives);
    const preferred = shuffled.filter((t) => preferredSet.has(t.type));
    const rest = shuffled.filter((t) => !preferredSet.has(t.type));
    shuffled = [...preferred, ...rest];
  }

  const selectedTypes = new Set<ObjectiveType>();

  for (const template of shuffled) {
    if (selectedTypes.size >= 2) break;
    if (selectedTypes.has(template.type)) continue;

    selectedTypes.add(template.type);
    objectives.push({
      id: rngUuid<InvasionObjectiveId>(),
      type: template.type,
      name: template.name,
      description: template.description,
      targetId: template.getTargetId(state),
      isPrimary: false,
      isCompleted: false,
      progress: 0,
    });
  }

  return objectives;
}

function invasionObjectiveFindAltarRoomId(
  state: GameState,
): string | undefined {
  const altarTypeId = roomRoleFindById('altar');
  if (!altarTypeId) return undefined;

  for (const floor of state.world.floors) {
    const altar = floor.rooms.find((r) => r.roomTypeId === altarTypeId);
    if (altar) return altar.id;
  }
  return undefined;
}

// --- Progress tracking ---

/**
 * Update objective progress. Progress is clamped to 0-100.
 * Returns a new objective (does not mutate).
 */
export function invasionObjectiveUpdateProgress(
  objective: InvasionObjective,
  progress: number,
): InvasionObjective {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  return {
    ...objective,
    progress: clampedProgress,
    isCompleted: clampedProgress >= 100,
  };
}

/**
 * Calculate SlayMonster progress from HP lost percentage.
 */
export function invasionObjectiveCalculateSlayMonsterProgress(
  currentHp: number,
  maxHp: number,
): number {
  if (maxHp <= 0) return 0;
  return Math.round(((maxHp - currentHp) / maxHp) * 100);
}

/**
 * Calculate StealTreasure progress from gold looted.
 */
export function invasionObjectiveCalculateStealTreasureProgress(
  goldLooted: number,
  goldTarget: number,
): number {
  if (goldTarget <= 0) return 0;
  return Math.min(100, Math.round((goldLooted / goldTarget) * 100));
}

/**
 * Calculate SealPortal progress from turns spent.
 */
export function invasionObjectiveCalculateSealPortalProgress(
  turnsSpent: number,
  turnsRequired: number,
): number {
  if (turnsRequired <= 0) return 0;
  return Math.min(100, Math.round((turnsSpent / turnsRequired) * 100));
}

/**
 * Calculate SurviveNTurns progress from current turn count.
 */
export function invasionObjectiveCalculateSurviveNTurnsProgress(
  currentTurn: number,
  targetTurns: number,
): number {
  if (targetTurns <= 0) return 0;
  return Math.min(100, Math.round((currentTurn / targetTurns) * 100));
}

/**
 * Calculate ReachDepth progress from current room index vs target room index.
 */
export function invasionObjectiveCalculateReachDepthProgress(
  currentRoomIndex: number,
  targetRoomIndex: number,
): number {
  if (targetRoomIndex <= 0) return 0;
  return Math.min(100, Math.round((currentRoomIndex / targetRoomIndex) * 100));
}

/**
 * Set dynamic targetIds for path-dependent objectives (ReachDepth, PlantBeacon).
 * Must be called after the invasion path is computed.
 */
export function invasionObjectiveSetDynamicTargets(
  objectives: InvasionObjective[],
  path: string[],
): InvasionObjective[] {
  if (path.length === 0) return objectives;

  return objectives.map((obj) => {
    if (obj.type === 'ReachDepth' && !obj.targetId) {
      const targetIndex = Math.min(
        path.length - 1,
        Math.floor(path.length * 0.75),
      );
      return { ...obj, targetId: path[targetIndex] };
    }
    if (obj.type === 'PlantBeacon' && !obj.targetId) {
      const targetIndex = Math.min(
        path.length - 1,
        Math.floor(path.length * 0.6),
      );
      return { ...obj, targetId: path[targetIndex] };
    }
    return obj;
  });
}

// --- Victory resolution ---

/**
 * Resolve the outcome of an invasion based on objective completion.
 * - Altar destroyed = defeat (regardless of other outcomes)
 * - All invaders killed with Altar intact = victory
 * - Reward multiplier: 1.0 base, +0.25 per prevented secondary, -0.15 per completed secondary
 */
export function invasionObjectiveResolveOutcome(
  objectives: InvasionObjective[],
): InvasionResult {
  const primary = objectives.find((o) => o.isPrimary);
  const secondaries = objectives.filter((o) => !o.isPrimary);
  const altarDestroyed = primary?.isCompleted ?? false;

  const secondariesCompleted = secondaries.filter((o) => o.isCompleted).length;
  const secondariesTotal = secondaries.length;

  if (altarDestroyed) {
    return {
      outcome: 'defeat',
      altarDestroyed: true,
      secondariesCompleted,
      secondariesTotal,
      rewardMultiplier: 0,
    };
  }

  // Victory: Altar intact
  const preventedCount = secondariesTotal - secondariesCompleted;
  const rewardMultiplier = Math.max(
    0,
    1.0 + preventedCount * 0.25 - secondariesCompleted * 0.15,
  );

  return {
    outcome: 'victory',
    altarDestroyed: false,
    secondariesCompleted,
    secondariesTotal,
    rewardMultiplier: Math.round(rewardMultiplier * 100) / 100,
  };
}
