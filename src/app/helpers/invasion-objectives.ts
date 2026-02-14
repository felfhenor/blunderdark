import { contentGetEntriesByType, contentGetEntry } from '@helpers/content';
import { roomRoleFindById } from '@helpers/room-roles';
import { rngShuffle, rngUuid } from '@helpers/rng';
import type {
  GameState,
  InhabitantDefinition,
  IsContentItem,
  RoomDefinition,
} from '@interfaces';
import type {
  InvasionObjective,
  InvasionObjectiveId,
  InvasionResult,
  ObjectiveType,
} from '@interfaces/invasion-objective';
import seedrandom from 'seedrandom';

// --- Helpers ---

function invasionObjectiveGetInhabitantTier(definitionId: string): number {
  const def = contentGetEntry<InhabitantDefinition & IsContentItem>(definitionId);
  return def?.tier ?? 1;
}

// --- Data-driven room lookup for objectives ---

let objectiveTypeCache: Map<string, string[]> | undefined = undefined;

function invasionObjectiveGetTypeMap(): Map<string, string[]> {
  if (!objectiveTypeCache) {
    const rooms = contentGetEntriesByType<RoomDefinition & IsContentItem>('room');
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

const SECONDARY_OBJECTIVE_TEMPLATES: ObjectiveTemplate[] = [
  {
    type: 'SlayMonster',
    name: 'Slay Monster',
    description: 'Kill a powerful creature defending the dungeon.',
    isEligible: (state) =>
      state.world.inhabitants.some((i) => invasionObjectiveGetInhabitantTier(i.definitionId) >= 2),
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
    isEligible: (state) => invasionObjectiveHasRoomWithType(state, 'StealTreasure'),
    getTargetId: (state) => invasionObjectiveFindRoomByType(state, 'StealTreasure'),
  },
  {
    type: 'DefileLibrary',
    name: 'Defile Library',
    description: 'Destroy forbidden knowledge stored in the shadow library.',
    isEligible: (state) => invasionObjectiveHasRoomWithType(state, 'DefileLibrary'),
    getTargetId: (state) => invasionObjectiveFindRoomByType(state, 'DefileLibrary'),
  },
  {
    type: 'SealPortal',
    name: 'Seal Portal',
    description: 'Seal a dark energy nexus to weaken the dungeon.',
    isEligible: (state) => invasionObjectiveHasRoomWithType(state, 'SealPortal'),
    getTargetId: (state) => invasionObjectiveFindRoomByType(state, 'SealPortal'),
  },
  {
    type: 'PlunderVault',
    name: 'Plunder Vault',
    description: 'Break into the treasure vault and carry away riches.',
    isEligible: (state) => invasionObjectiveHasRoomWithType(state, 'PlunderVault'),
    getTargetId: (state) => invasionObjectiveFindRoomByType(state, 'PlunderVault'),
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
];

// --- Objective assignment ---

/**
 * Assign invasion objectives: 1 primary (Destroy Altar) + 2 secondary.
 * Secondary objectives are selected from eligible pool based on game state.
 * Seed ensures deterministic selection.
 */
export function invasionObjectiveAssign(
  state: GameState,
  seed: string,
): InvasionObjective[] {
  const rng = seedrandom(seed);
  const objectives: InvasionObjective[] = [];

  // Primary: Destroy Altar
  const altarId = invasionObjectiveFindAltarRoomId(state);
  objectives.push({
    id: rngUuid() as InvasionObjectiveId,
    type: 'DestroyAltar',
    name: 'Destroy Altar',
    description:
      'Destroy the dungeon altar to cripple the dark lord\'s power.',
    targetId: altarId,
    isPrimary: true,
    isCompleted: false,
    progress: 0,
  });

  // Secondary: select 2 from eligible pool
  const eligible = SECONDARY_OBJECTIVE_TEMPLATES.filter((t) =>
    t.isEligible(state),
  );

  // Shuffle and pick up to 2 unique types
  const shuffled = rngShuffle(eligible, rng);
  const selectedTypes = new Set<ObjectiveType>();

  for (const template of shuffled) {
    if (selectedTypes.size >= 2) break;
    if (selectedTypes.has(template.type)) continue;

    selectedTypes.add(template.type);
    objectives.push({
      id: rngUuid() as InvasionObjectiveId,
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

function invasionObjectiveFindAltarRoomId(state: GameState): string | undefined {
  const altarTypeId = roomRoleFindById('altar');
  if (!altarTypeId) return undefined;

  for (const floor of state.world.floors) {
    const altar = floor.rooms.find(
      (r) => r.roomTypeId === altarTypeId,
    );
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

// --- Victory resolution ---

/**
 * Resolve the outcome of an invasion based on objective completion.
 * - Altar destroyed = defeat (regardless of other outcomes)
 * - All invaders killed with Altar intact = victory
 * - Reward multiplier: 1.0 base, +0.25 per prevented secondary, -0.25 per completed secondary
 */
export function invasionObjectiveResolveOutcome(
  objectives: InvasionObjective[],
): InvasionResult {
  const primary = objectives.find((o) => o.isPrimary);
  const secondaries = objectives.filter((o) => !o.isPrimary);
  const altarDestroyed = primary?.isCompleted ?? false;

  const secondariesCompleted = secondaries.filter(
    (o) => o.isCompleted,
  ).length;
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
    1.0 + preventedCount * 0.25 - secondariesCompleted * 0.25,
  );

  return {
    outcome: 'victory',
    altarDestroyed: false,
    secondariesCompleted,
    secondariesTotal,
    rewardMultiplier: Math.round(rewardMultiplier * 100) / 100,
  };
}
