import { getEntriesByType, getEntry } from '@helpers/content';
import { findRoomIdByRole } from '@helpers/room-roles';
import { rngShuffle, rngUuid } from '@helpers/rng';
import type {
  GameState,
  InhabitantDefinition,
  IsContentItem,
  RoomDefinition,
} from '@interfaces';
import type {
  InvasionObjective,
  InvasionResult,
  ObjectiveType,
} from '@interfaces/invasion-objective';
import seedrandom from 'seedrandom';

// --- Helpers ---

function getInhabitantTier(definitionId: string): number {
  const def = getEntry<InhabitantDefinition & IsContentItem>(definitionId);
  return def?.tier ?? 1;
}

// --- Data-driven room lookup for objectives ---

let objectiveTypeCache: Map<string, string[]> | null = null;

function getObjectiveTypeMap(): Map<string, string[]> {
  if (!objectiveTypeCache) {
    const rooms = getEntriesByType<RoomDefinition & IsContentItem>('room');
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

export function resetInvasionObjectivesCache(): void {
  objectiveTypeCache = null;
}

function findRoomByObjectiveType(
  state: GameState,
  objectiveType: string,
): string | null {
  const map = getObjectiveTypeMap();
  const roomTypeIds = map.get(objectiveType);
  if (!roomTypeIds || roomTypeIds.length === 0) return null;

  for (const floor of state.world.floors) {
    for (const room of floor.rooms) {
      if (roomTypeIds.includes(room.roomTypeId)) {
        return room.id;
      }
    }
  }
  return null;
}

function hasRoomWithObjectiveType(
  state: GameState,
  objectiveType: string,
): boolean {
  return findRoomByObjectiveType(state, objectiveType) !== null;
}

// --- Objective definitions ---

type ObjectiveTemplate = {
  type: ObjectiveType;
  name: string;
  description: string;
  isEligible: (state: GameState) => boolean;
  getTargetId: (state: GameState) => string | null;
};

const SECONDARY_OBJECTIVE_TEMPLATES: ObjectiveTemplate[] = [
  {
    type: 'SlayMonster',
    name: 'Slay Monster',
    description: 'Kill a powerful creature defending the dungeon.',
    isEligible: (state) =>
      state.world.inhabitants.some((i) => getInhabitantTier(i.definitionId) >= 2),
    getTargetId: (state) => {
      const target = state.world.inhabitants.find(
        (i) => getInhabitantTier(i.definitionId) >= 2,
      );
      return target?.instanceId ?? null;
    },
  },
  {
    type: 'StealTreasure',
    name: 'Steal Treasure',
    description: 'Loot gold from the dungeon treasury.',
    isEligible: (state) => hasRoomWithObjectiveType(state, 'StealTreasure'),
    getTargetId: (state) => findRoomByObjectiveType(state, 'StealTreasure'),
  },
  {
    type: 'DefileLibrary',
    name: 'Defile Library',
    description: 'Destroy forbidden knowledge stored in the shadow library.',
    isEligible: (state) => hasRoomWithObjectiveType(state, 'DefileLibrary'),
    getTargetId: (state) => findRoomByObjectiveType(state, 'DefileLibrary'),
  },
  {
    type: 'SealPortal',
    name: 'Seal Portal',
    description: 'Seal a dark energy nexus to weaken the dungeon.',
    isEligible: (state) => hasRoomWithObjectiveType(state, 'SealPortal'),
    getTargetId: (state) => findRoomByObjectiveType(state, 'SealPortal'),
  },
  {
    type: 'PlunderVault',
    name: 'Plunder Vault',
    description: 'Break into the treasure vault and carry away riches.',
    isEligible: (state) => hasRoomWithObjectiveType(state, 'PlunderVault'),
    getTargetId: (state) => findRoomByObjectiveType(state, 'PlunderVault'),
  },
  {
    type: 'RescuePrisoner',
    name: 'Rescue Prisoner',
    description: 'Free a captive creature from the dungeon.',
    isEligible: (state) => state.world.inhabitants.length > 0,
    getTargetId: (state) => state.world.inhabitants[0]?.instanceId ?? null,
  },
  {
    type: 'ScoutDungeon',
    name: 'Scout Dungeon',
    description: 'Map the dungeon layout for future invasions.',
    isEligible: () => true,
    getTargetId: () => null,
  },
];

// --- Objective assignment ---

/**
 * Assign invasion objectives: 1 primary (Destroy Altar) + 2 secondary.
 * Secondary objectives are selected from eligible pool based on game state.
 * Seed ensures deterministic selection.
 */
export function assignInvasionObjectives(
  state: GameState,
  seed: string,
): InvasionObjective[] {
  const rng = seedrandom(seed);
  const objectives: InvasionObjective[] = [];

  // Primary: Destroy Altar
  const altarId = findAltarRoomId(state);
  objectives.push({
    id: rngUuid(),
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
      id: rngUuid(),
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

function findAltarRoomId(state: GameState): string | null {
  const altarTypeId = findRoomIdByRole('altar');
  if (!altarTypeId) return null;

  for (const floor of state.world.floors) {
    const altar = floor.rooms.find(
      (r) => r.roomTypeId === altarTypeId,
    );
    if (altar) return altar.id;
  }
  return null;
}

// --- Progress tracking ---

/**
 * Update objective progress. Progress is clamped to 0-100.
 * Returns a new objective (does not mutate).
 */
export function updateObjectiveProgress(
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
export function calculateSlayMonsterProgress(
  currentHp: number,
  maxHp: number,
): number {
  if (maxHp <= 0) return 0;
  return Math.round(((maxHp - currentHp) / maxHp) * 100);
}

/**
 * Calculate StealTreasure progress from gold looted.
 */
export function calculateStealTreasureProgress(
  goldLooted: number,
  goldTarget: number,
): number {
  if (goldTarget <= 0) return 0;
  return Math.min(100, Math.round((goldLooted / goldTarget) * 100));
}

/**
 * Calculate SealPortal progress from turns spent.
 */
export function calculateSealPortalProgress(
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
export function resolveInvasionOutcome(
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
