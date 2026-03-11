import { contentGetEntriesByType, contentGetEntry } from '@helpers/content';
import { rngShuffle, rngUuid } from '@helpers/rng';
import { roomRoleFindById } from '@helpers/room-roles';
import type {
  GameState,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { InvasionObjectiveContent } from '@interfaces/content-invasionobjective';
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

// --- Content-driven eligibility and targeting ---

function invasionObjectiveIsEligible(
  content: InvasionObjectiveContent,
  state: GameState,
): boolean {
  switch (content.eligibility) {
    case 'always':
      return true;
    case 'room':
      return invasionObjectiveHasRoomWithType(state, content.objectiveType);
    case 'inhabitant_tier': {
      const minTier = content.eligibilityMinTier ?? 1;
      return state.world.inhabitants.some(
        (i) => invasionObjectiveGetInhabitantTier(i.definitionId) >= minTier,
      );
    }
    case 'room_count': {
      const minCount = content.eligibilityMinCount ?? 1;
      let totalRooms = 0;
      for (const floor of state.world.floors) {
        totalRooms += floor.rooms.length;
      }
      return totalRooms >= minCount;
    }
    case 'floor_count': {
      const minCount = content.eligibilityMinCount ?? 1;
      return state.world.floors.length >= minCount;
    }
  }
}

function invasionObjectiveGetTargetId(
  content: InvasionObjectiveContent,
  state: GameState,
): string | undefined {
  switch (content.targeting) {
    case 'none':
    case 'dynamic_path':
      return undefined;
    case 'room':
      return invasionObjectiveFindRoomByType(state, content.objectiveType);
    case 'inhabitant': {
      const minTier = content.targetMinTier ?? 1;
      const target = state.world.inhabitants.find(
        (i) => invasionObjectiveGetInhabitantTier(i.definitionId) >= minTier,
      );
      return target?.instanceId ?? undefined;
    }
  }
}

// --- Constants ---

export const INVASION_OBJECTIVE_SURVIVE_N_TURNS_TARGET = 50;

// --- Objective assignment ---

export function invasionObjectiveAssign(
  state: GameState,
  seed: string,
  preferredObjectives?: ObjectiveType[],
): InvasionObjective[] {
  const rng = seedrandom(seed);
  const objectives: InvasionObjective[] = [];
  const allObjectives = contentGetEntriesByType<InvasionObjectiveContent>(
    'invasionobjective',
  );

  // Primary: find primary objective content and assign it
  const primaryContent = allObjectives.find((o) => o.isPrimary);
  if (primaryContent) {
    const altarId = invasionObjectiveFindAltarRoomId(state);
    objectives.push({
      id: rngUuid<InvasionObjectiveId>(),
      type: primaryContent.objectiveType,
      name: primaryContent.name,
      description: primaryContent.description,
      targetId: altarId,
      isPrimary: true,
      isCompleted: false,
      progress: 0,
    });
  }

  // Secondary: select 2 from eligible pool
  const secondaryContent = allObjectives.filter((o) => !o.isPrimary);
  const eligible = secondaryContent.filter((t) =>
    invasionObjectiveIsEligible(t, state),
  );

  // Shuffle eligible, then sort preferred types to front
  let shuffled = rngShuffle(eligible, rng);
  if (preferredObjectives?.length) {
    const preferredSet = new Set(preferredObjectives);
    const preferred = shuffled.filter((t) => preferredSet.has(t.objectiveType));
    const rest = shuffled.filter((t) => !preferredSet.has(t.objectiveType));
    shuffled = [...preferred, ...rest];
  }

  const selectedTypes = new Set<string>();

  for (const template of shuffled) {
    if (selectedTypes.size >= 2) break;
    if (selectedTypes.has(template.objectiveType)) continue;

    selectedTypes.add(template.objectiveType);
    objectives.push({
      id: rngUuid<InvasionObjectiveId>(),
      type: template.objectiveType,
      name: template.name,
      description: template.description,
      targetId: invasionObjectiveGetTargetId(template, state),
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

export function invasionObjectiveCalculateSlayMonsterProgress(
  currentHp: number,
  maxHp: number,
): number {
  if (maxHp <= 0) return 0;
  return Math.round(((maxHp - currentHp) / maxHp) * 100);
}

export function invasionObjectiveCalculateStealTreasureProgress(
  goldLooted: number,
  goldTarget: number,
): number {
  if (goldTarget <= 0) return 0;
  return Math.min(100, Math.round((goldLooted / goldTarget) * 100));
}

export function invasionObjectiveCalculateSealPortalProgress(
  turnsSpent: number,
  turnsRequired: number,
): number {
  if (turnsRequired <= 0) return 0;
  return Math.min(100, Math.round((turnsSpent / turnsRequired) * 100));
}

export function invasionObjectiveCalculateSurviveNTurnsProgress(
  currentTurn: number,
  targetTurns: number,
): number {
  if (targetTurns <= 0) return 0;
  return Math.min(100, Math.round((currentTurn / targetTurns) * 100));
}

export function invasionObjectiveCalculateReachDepthProgress(
  currentRoomIndex: number,
  targetRoomIndex: number,
): number {
  if (targetRoomIndex <= 0) return 0;
  return Math.min(100, Math.round((currentRoomIndex / targetRoomIndex) * 100));
}

export function invasionObjectiveSetDynamicTargets(
  objectives: InvasionObjective[],
  path: string[],
): InvasionObjective[] {
  if (path.length === 0) return objectives;

  const allObjectives = contentGetEntriesByType<InvasionObjectiveContent>(
    'invasionobjective',
  );
  const dynamicPathMap = new Map<string, number>();
  for (const content of allObjectives) {
    if (content.targeting === 'dynamic_path' && content.targetPathPercent !== undefined) {
      dynamicPathMap.set(content.objectiveType, content.targetPathPercent);
    }
  }

  return objectives.map((obj) => {
    const pathPercent = dynamicPathMap.get(obj.type);
    if (pathPercent !== undefined && !obj.targetId) {
      const targetIndex = Math.min(
        path.length - 1,
        Math.floor(path.length * pathPercent),
      );
      return { ...obj, targetId: path[targetIndex] };
    }
    return obj;
  });
}

// --- Victory resolution ---

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

// --- Penalty lookup ---

export function invasionObjectiveGetPenalties(
  objectiveType: string,
): InvasionObjectiveContent['penalties'] {
  const allObjectives = contentGetEntriesByType<InvasionObjectiveContent>(
    'invasionobjective',
  );
  const content = allObjectives.find((o) => o.objectiveType === objectiveType);
  return content?.penalties ?? [];
}
