import { computed } from '@angular/core';
import { sortBy } from 'es-toolkit/compat';
import { combatAbilityInitStates } from '@helpers/combat-abilities';
import { contentGetEntry } from '@helpers/content';
import { roomGetDisplayName } from '@helpers/room-upgrades';
import { effectiveStatsCalculate } from '@helpers/effective-stats';
import { fearLevelCalculateAllForFloor } from '@helpers/fear-level';
import {
  stateModifierGetAttackMultiplier,
  stateModifierGetDefenseMultiplier,
} from '@helpers/state-modifiers';
import {
  combatantHasStatus,
  invasionCombatAdvanceTurn,
  invasionCombatBuildTurnQueue,
  invasionCombatCreateCombatant,
  invasionCombatExecuteAiTurn,
  invasionCombatGetAliveCombatants,
  invasionCombatGetCurrentActor,
  invasionCombatIsRoundComplete,
  invasionCombatStartNewRound,
} from '@helpers/invasion-combat';
import { invasionEventTryTrigger } from '@helpers/invasion-events';
import { invasionCompositionCalculateDungeonProfile, invasionCompositionGenerateParty } from '@helpers/invasion-composition';
import { invasionThreatGetPartySizeBonus, invasionThreatGetStatBonus } from '@helpers/invasion-threat';
import { invasionObjectiveAssign, invasionObjectiveUpdateProgress } from '@helpers/invasion-objectives';
import {
  invasionRewardCalculateDefensePenalties,
  invasionRewardCalculateDefenseRewards,
  invasionRewardRollPrisonerCaptures,
} from '@helpers/invasion-rewards';
import {
  invasionWinLossApplyObjectiveDebuff,
  invasionWinLossCheckEnd,
  invasionWinLossCreateState,
  invasionWinLossDamageAltar,
  invasionWinLossEnd,
  invasionWinLossMarkKilled,
  invasionWinLossRecordDefenderLoss,
  invasionWinLossResolveDetailedResult,
} from '@helpers/invasion-win-loss';
import {
  moraleApply,
  moraleApplyAllyDeath,
  moraleApplyFearRoomEntry,
  moraleApplyLeaderDeath,
  moraleApplyRoomCapture,
  moraleApplyTrapTrigger,
  moraleInit,
  moraleIsRetreating,
} from '@helpers/morale';
import { researchUnlockGetPassiveBonusWithMastery } from '@helpers/research-unlocks';
import { throneRoomGetRulerBonusValue } from '@helpers/throne-room';
import {
  pathfindingBuildDungeonGraph,
  pathfindingFindPath,
  pathfindingFindWithObjectives,
  pathfindingGetCost,
} from '@helpers/pathfinding';
import { roomRoleFindById } from '@helpers/room-roles';
import { trapApplyTrigger, trapGetAtTile, trapGetDefinition, trapRollTrigger } from '@helpers/traps';
import { invaderGetDefinitionById } from '@helpers/invaders';
import { legendaryAuraGetBonus } from '@helpers/legendary-inhabitant';
import { gamestate } from '@helpers/state-game';
import type { AbilityState } from '@interfaces/combat';
import type { AbilityEffectContent } from '@interfaces/content-abilityeffect';
import type { CombatAbilityContent } from '@interfaces/content-combatability';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';
import type {
  ActiveInvasion,
  CombatantId,
  DungeonProfile,
  Floor,
  GameState,
  HallwayTraversalState,
  InhabitantInstanceId,
  InvasionObjective,
  InvasionOrchestratorResult,
  InvasionThemeType,
  ObjectiveType,
  PendingInvasionWarning,
  PlacedRoom,
  PlacedRoomId,
  ResourceType,
  SpecialInvasionType,
} from '@interfaces';
import type { InvaderInstance } from '@interfaces/invader';
import type { SecondaryObjective } from '@interfaces/pathfinding';
import seedrandom from 'seedrandom';

// --- Constants ---

const INVASION_BASE_TICKS_PER_ROOM = 4;
const INVASION_TICKS_PER_DEFENDER = 3;
const MAX_ROUNDS_PER_ROOM = 15;

export const FOCUSED_ASSAULT_ATTACK_BONUS = 2; // +2 attack per unreachable objective
export const INVASION_ESCALATION_EXTRA_INVADERS = 1; // extra invaders per unreachable objective (from last invasion)

// --- Computed signals ---

export const invasionIsActive = computed(() => {
  const inv = gamestate().world.activeInvasion;
  return !!inv && !inv.completed;
});

export const invasionIsCompleted = computed(() => {
  const inv = gamestate().world.activeInvasion;
  return !!inv && inv.completed;
});

export const invasionEntryRoomId = computed(() => {
  const inv = gamestate().world.activeInvasion;
  if (!inv || inv.completed) return undefined;
  return inv.entryRoomId;
});

export const invasionCurrentRoomId = computed(() => {
  const inv = gamestate().world.activeInvasion;
  if (!inv || inv.completed) return undefined;
  return inv.path[inv.currentRoomIndex];
});

export const invasionPathRoomIds = computed(() => {
  const inv = gamestate().world.activeInvasion;
  if (!inv || inv.completed) return new Set<PlacedRoomId>();
  return new Set<PlacedRoomId>(inv.path);
});

export const invasionBattleLog = computed(() => {
  const inv = gamestate().world.activeInvasion;
  if (!inv) return [];
  return inv.battleLog;
});

export const invasionCurrentHallwayTile = computed((): { x: number; y: number; floorIndex: number } | undefined => {
  const inv = gamestate().world.activeInvasion;
  if (!inv || inv.completed || !inv.hallwayTraversal) return undefined;
  const { tiles, currentTileIndex, floorIndex } = inv.hallwayTraversal;
  if (currentTileIndex < 0 || currentTileIndex >= tiles.length) return undefined;
  const tile = tiles[currentTileIndex];
  return { x: tile.x, y: tile.y, floorIndex };
});

// --- Anti-turtling: count unreachable objectives ---

/**
 * Count secondary objectives whose target rooms are NOT on the invasion path.
 * These are "unreachable" objectives that invaders cannot visit.
 */
export function invasionCountUnreachableObjectives(
  objectives: InvasionObjective[],
  path: PlacedRoomId[],
): number {
  const pathSet = new Set<string>(path);
  return objectives.filter(
    (o) => !o.isPrimary && o.targetId && !pathSet.has(o.targetId),
  ).length;
}

// --- Multi-floor path building ---

/**
 * Find a transport room on the current floor that connects to the next floor
 * via a shared transportGroupId.
 */
function findTransportToNextFloor(
  currentFloor: Floor,
  nextFloor: Floor,
): { currentFloorRoom: PlacedRoom; nextFloorRoom: PlacedRoom } | undefined {
  const currentTransports = currentFloor.rooms.filter(
    (r) => r.transportType && r.transportGroupId,
  );
  const nextTransports = nextFloor.rooms.filter(
    (r) => r.transportType && r.transportGroupId,
  );

  for (const ct of currentTransports) {
    const match = nextTransports.find(
      (nt) => nt.transportGroupId === ct.transportGroupId,
    );
    if (match) {
      return { currentFloorRoom: ct, nextFloorRoom: match };
    }
  }

  return undefined;
}

/**
 * Find a transport connection between two arbitrary floors.
 * Walks floor-by-floor from currentFloorIndex toward targetFloorIndex,
 * returning the first/last transport pair for a single hop.
 */
function findTransportBetweenFloors(
  floors: Floor[],
  currentFloorIndex: number,
  targetFloorIndex: number,
): { currentFloorRoom: PlacedRoom; nextFloorRoom: PlacedRoom } | undefined {
  if (currentFloorIndex === targetFloorIndex) return undefined;

  const step = currentFloorIndex < targetFloorIndex ? 1 : -1;
  let fi = currentFloorIndex;

  while (fi !== targetFloorIndex) {
    const nextFi = fi + step;
    if (nextFi < 0 || nextFi >= floors.length) return undefined;

    const transport = findTransportToNextFloor(floors[fi], floors[nextFi]);
    if (!transport) return undefined;

    // For a single hop, return the first transport found
    if (nextFi === targetFloorIndex || fi === currentFloorIndex) {
      return transport;
    }

    fi = nextFi;
  }

  return undefined;
}

/**
 * Convert a FearLevelBreakdown map to a simple numeric map for pathfinding.
 */
function fearBreakdownToNumericMap(
  breakdownMap: Map<PlacedRoomId, { effectiveFear: number }>,
): Map<PlacedRoomId, number> {
  const result = new Map<PlacedRoomId, number>();
  for (const [roomId, breakdown] of breakdownMap) {
    result.set(roomId, breakdown.effectiveFear);
  }
  return result;
}

/**
 * Find a random entry room on any floor for an invasion.
 * Picks a random non-altar, non-transport room from all floors.
 * Edge case: if no eligible rooms, returns altar room on its floor.
 */
export function invasionFindEntryRoom(
  state: GameState,
  rng?: seedrandom.PRNG,
): { room: PlacedRoom; floorIndex: number } | undefined {
  const floors = state.world.floors;
  if (floors.length === 0) return undefined;

  const altarTypeId = roomRoleFindById('altar');

  // Collect all eligible rooms across all floors
  const candidates: { room: PlacedRoom; floorIndex: number }[] = [];
  let altarRoom: { room: PlacedRoom; floorIndex: number } | undefined;

  for (let fi = 0; fi < floors.length; fi++) {
    const floor = floors[fi];
    for (const room of floor.rooms) {
      // Track altar room as fallback
      if (altarTypeId && room.roomTypeId === altarTypeId) {
        altarRoom = { room, floorIndex: fi };
        continue;
      }
      // Exclude transport rooms
      if (room.transportType) continue;
      candidates.push({ room, floorIndex: fi });
    }
  }

  // Edge case: no eligible rooms, return altar room
  if (candidates.length === 0) {
    return altarRoom;
  }

  // Pick uniformly at random
  if (rng) {
    const idx = Math.floor(rng() * candidates.length);
    return candidates[idx];
  }

  // Fallback: return first candidate if no rng provided
  return candidates[0];
}

/**
 * Build a path through one or more dungeon floors from an arbitrary entry room
 * to the altar room. Visits secondary objective floors first, then paths to the altar.
 * Returns the full room path, a map of roomId → floorIndex, and fear levels.
 */
function buildMultiFloorPath(
  state: GameState,
  entryRoom: PlacedRoom,
  entryFloorIndex: number,
  altarRoom: { room: PlacedRoom; floorIndex: number } | undefined,
  objectives: InvasionObjective[],
  rng?: seedrandom.PRNG,
): {
  path: PlacedRoomId[];
  roomFloorMap: Record<string, number>;
  roomFearLevels: Record<string, number>;
} {
  const floors = state.world.floors;
  const entryFloor = floors[entryFloorIndex];
  if (!entryFloor) return { path: [], roomFloorMap: {}, roomFearLevels: {} };

  const roomFloorMap: Record<string, number> = {};
  const roomFearLevels: Record<string, number> = {};
  const altarFloorIndex = altarRoom?.floorIndex ?? 0;
  const goalRoomId = altarRoom?.room.id ?? entryRoom.id;

  // Noise options for suboptimal pathing
  const noiseOptions: { noiseRng?: () => number; noiseChance?: number; maxNoiseFactor?: number } =
    rng ? { noiseRng: rng, noiseChance: 0.25, maxNoiseFactor: 1.5 } : {};

  // Build per-floor objective map
  const objectivesByFloor = new Map<number, SecondaryObjective[]>();
  for (const obj of objectives) {
    if (!obj.targetId || obj.isPrimary) continue;
    for (let fi = 0; fi < floors.length; fi++) {
      if (floors[fi].rooms.some((r) => r.id === obj.targetId)) {
        if (!objectivesByFloor.has(fi)) objectivesByFloor.set(fi, []);
        objectivesByFloor.get(fi)!.push({
          roomId: obj.targetId as PlacedRoomId,
          priority: 1,
        });
        break;
      }
    }
  }

  // Helper: build graph for a floor
  function buildFloorGraph(fi: number): {
    graph: ReturnType<typeof pathfindingBuildDungeonGraph>;
    fearMap: Map<PlacedRoomId, number>;
  } {
    const floor = floors[fi];
    const fearBreakdown = fearLevelCalculateAllForFloor(floor);
    const fearMap = fearBreakdownToNumericMap(fearBreakdown);
    const graph = pathfindingBuildDungeonGraph(floor, fearMap);
    return { graph, fearMap };
  }

  // Helper: append a room to fullPath
  function appendRoom(
    fullPath: PlacedRoomId[],
    rid: PlacedRoomId,
    fi: number,
    fearMap: Map<PlacedRoomId, number>,
  ): void {
    if (fullPath.length > 0 && fullPath[fullPath.length - 1] === rid) return;
    fullPath.push(rid);
    roomFloorMap[rid] = fi;
    roomFearLevels[rid] = fearMap.get(rid) ?? 0;
  }

  // Collect floors that need to be visited for objectives (excluding altar floor for now)
  const objectiveFloors = sortBy(
    [...objectivesByFloor.keys()].filter((f) => f !== altarFloorIndex),
    [(f: number) => Math.abs(f - entryFloorIndex)],
  );

  // Build ordered floor visit list: objective floors first, altar floor last
  const floorVisitOrder: number[] = [];

  // Always start on entry floor
  // Add objective floors (sorted by proximity to entry floor)
  for (const fi of objectiveFloors) {
    if (!floorVisitOrder.includes(fi)) floorVisitOrder.push(fi);
  }
  // Add altar floor last (if not already visited)
  if (!floorVisitOrder.includes(altarFloorIndex)) {
    floorVisitOrder.push(altarFloorIndex);
  }

  // --- Single floor case (entry and altar on same floor, no objectives elsewhere) ---
  if (entryFloorIndex === altarFloorIndex && objectiveFloors.length === 0) {
    const { graph, fearMap } = buildFloorGraph(entryFloorIndex);
    const floorObjectives = objectivesByFloor.get(entryFloorIndex) ?? [];
    const path = pathfindingFindWithObjectives(
      graph, entryRoom.id, goalRoomId, floorObjectives, noiseOptions,
    );

    // Fallback with no noise if noisy path is too expensive
    if (rng && path.length > 0) {
      const optimalPath = pathfindingFindWithObjectives(
        graph, entryRoom.id, goalRoomId, floorObjectives,
      );
      const optimalCost = pathfindingGetCost(graph, optimalPath);
      const noisyCost = pathfindingGetCost(graph, path);
      if (optimalCost > 0 && noisyCost > optimalCost * 1.5) {
        for (const rid of optimalPath) {
          appendRoom(optimalPath, rid, entryFloorIndex, fearMap);
        }
        // Use optimal path
        for (const rid of optimalPath) {
          roomFloorMap[rid] = entryFloorIndex;
          roomFearLevels[rid] = fearMap.get(rid) ?? 0;
        }
        return { path: optimalPath, roomFloorMap, roomFearLevels };
      }
    }

    for (const rid of path) {
      roomFloorMap[rid] = entryFloorIndex;
      roomFearLevels[rid] = fearMap.get(rid) ?? 0;
    }
    return { path: path.length > 0 ? path : [entryRoom.id], roomFloorMap, roomFearLevels };
  }

  // --- Multi-floor path ---
  const fullPath: PlacedRoomId[] = [];
  let currentFloorIndex = entryFloorIndex;
  let currentPos = entryRoom.id;

  // First, handle objectives on the entry floor (before leaving it)
  const entryFloorObjectives = objectivesByFloor.get(entryFloorIndex) ?? [];

  // Collect all floors to visit in order (objectives first, then altar)
  const allFloorsToVisit: number[] = [];
  for (const fi of objectiveFloors) {
    if (fi !== entryFloorIndex && !allFloorsToVisit.includes(fi)) {
      allFloorsToVisit.push(fi);
    }
  }
  // Always end at altar floor
  if (!allFloorsToVisit.includes(altarFloorIndex) && altarFloorIndex !== entryFloorIndex) {
    allFloorsToVisit.push(altarFloorIndex);
  }

  // Path through entry floor's objectives first, then to transport if needed
  if (allFloorsToVisit.length === 0) {
    // All objectives on entry floor, altar also on entry floor
    const { graph, fearMap } = buildFloorGraph(entryFloorIndex);
    const floorObjectives = objectivesByFloor.get(entryFloorIndex) ?? [];
    const path = pathfindingFindWithObjectives(
      graph, entryRoom.id, goalRoomId, floorObjectives, noiseOptions,
    );
    for (const rid of path) {
      roomFloorMap[rid] = entryFloorIndex;
      roomFearLevels[rid] = fearMap.get(rid) ?? 0;
    }
    return { path: path.length > 0 ? path : [entryRoom.id], roomFloorMap, roomFearLevels };
  }

  // Multi-floor traversal
  for (let visitIdx = 0; visitIdx <= allFloorsToVisit.length; visitIdx++) {
    const targetFloorIndex = visitIdx < allFloorsToVisit.length
      ? allFloorsToVisit[visitIdx]
      : altarFloorIndex;

    const isLastVisit = visitIdx === allFloorsToVisit.length
      || targetFloorIndex === altarFloorIndex;

    const { graph: currentGraph, fearMap: currentFearMap } = buildFloorGraph(currentFloorIndex);
    const currentFloorObjs = (currentFloorIndex === entryFloorIndex && fullPath.length === 0)
      ? entryFloorObjectives
      : (objectivesByFloor.get(currentFloorIndex) ?? []);

    if (currentFloorIndex === targetFloorIndex) {
      // Same floor — path to altar with objectives
      const subPath = pathfindingFindWithObjectives(
        currentGraph, currentPos, goalRoomId, currentFloorObjs, noiseOptions,
      );
      for (const rid of subPath) {
        appendRoom(fullPath, rid, currentFloorIndex, currentFearMap);
      }
      break;
    }

    // Find transport between floors (works bidirectionally)
    const transportPair = findTransportBetweenFloors(floors, currentFloorIndex, targetFloorIndex);
    if (!transportPair) {
      // Can't reach target floor — path directly to altar on current floor if possible
      if (currentFloorIndex === altarFloorIndex) {
        const subPath = pathfindingFindWithObjectives(
          currentGraph, currentPos, goalRoomId, currentFloorObjs, noiseOptions,
        );
        for (const rid of subPath) {
          appendRoom(fullPath, rid, currentFloorIndex, currentFearMap);
        }
      }
      break;
    }

    // Path from current position to transport (with current floor objectives)
    const pathToTransport = pathfindingFindWithObjectives(
      currentGraph, currentPos, transportPair.currentFloorRoom.id, currentFloorObjs, noiseOptions,
    );
    if (pathToTransport.length === 0) continue;

    for (const rid of pathToTransport) {
      appendRoom(fullPath, rid, currentFloorIndex, currentFearMap);
    }

    // Cross to target floor via transport
    const { fearMap: targetFearMap } = buildFloorGraph(targetFloorIndex);
    appendRoom(fullPath, transportPair.nextFloorRoom.id, targetFloorIndex, targetFearMap);

    currentFloorIndex = targetFloorIndex;
    currentPos = transportPair.nextFloorRoom.id;

    // If this is the altar floor, path to altar with its objectives
    if (isLastVisit && targetFloorIndex === altarFloorIndex) {
      const { graph: altarGraph, fearMap: altarFearMap } = buildFloorGraph(altarFloorIndex);
      const altarFloorObjs = objectivesByFloor.get(altarFloorIndex) ?? [];
      const finalPath = pathfindingFindWithObjectives(
        altarGraph, currentPos, goalRoomId, altarFloorObjs, noiseOptions,
      );
      for (const rid of finalPath) {
        appendRoom(fullPath, rid, altarFloorIndex, altarFearMap);
      }
      break;
    }
  }

  // Fallback
  if (fullPath.length === 0) {
    const { graph, fearMap } = buildFloorGraph(entryFloorIndex);
    const path = pathfindingFindPath(graph, entryRoom.id, entryRoom.id);
    if (path.length > 0) {
      for (const rid of path) {
        roomFloorMap[rid] = entryFloorIndex;
        roomFearLevels[rid] = fearMap.get(rid) ?? 0;
      }
      return { path, roomFloorMap, roomFearLevels };
    }
    roomFloorMap[entryRoom.id] = entryFloorIndex;
    return { path: [entryRoom.id], roomFloorMap, roomFearLevels: {} };
  }

  return { path: fullPath, roomFloorMap, roomFearLevels };
}

// --- Start function ---

/**
 * Initialize a tick-based invasion. Sets up activeInvasion on the state.
 * Called from within updateGamestate (during tick).
 */
export function invasionStart(
  state: GameState,
  seed: string,
  invasionType: 'scheduled' | SpecialInvasionType,
  warning?: PendingInvasionWarning,
): void {
  const day = state.clock.day;

  // 0. Compute escalation + threat party size bonus
  const lastHistory = state.world.invasionSchedule.invasionHistory;
  const lastUnreachable = lastHistory.length > 0
    ? (lastHistory[lastHistory.length - 1].unreachableObjectiveCount ?? 0)
    : 0;
  const profile = warning?.profile ?? invasionCompositionCalculateDungeonProfile(state);
  const bonusSize = lastUnreachable * INVASION_ESCALATION_EXTRA_INVADERS
    + invasionThreatGetPartySizeBonus(profile.threatLevel);

  // 1. Generate invader party (use pre-computed from warning if available)
  let invaders: InvaderInstance[];
  let partyTheme: InvasionThemeType | undefined;
  let pairedObjectives: ObjectiveType[] | undefined;

  if (warning?.invaders) {
    invaders = warning.invaders;
    partyTheme = warning.themedInvasionType;
  } else {
    const partyResult = invasionCompositionGenerateParty(profile, seed, bonusSize);
    invaders = partyResult.invaders;
    partyTheme = partyResult.themedInvasionType;
    pairedObjectives = partyResult.pairedObjectives;
  }

  if (invaders.length === 0) {
    state.world.activeInvasion = createEmptyCompletedInvasion(seed, invasionType, day, profile);
    return;
  }

  // 2. Assign objectives (use pre-computed from warning if available)
  const objectives = warning?.objectives ?? invasionObjectiveAssign(state, seed, pairedObjectives);

  // 3. Find altar room across all floors
  const altarTypeId = roomRoleFindById('altar');
  let altarRoom: { room: PlacedRoom; floorIndex: number } | undefined;
  for (let fi = 0; fi < state.world.floors.length; fi++) {
    const floor = state.world.floors[fi];
    const room = altarTypeId ? floor.rooms.find((r) => r.roomTypeId === altarTypeId) : undefined;
    if (room) {
      altarRoom = { room, floorIndex: fi };
      break;
    }
  }

  if (state.world.floors.length === 0) {
    state.world.activeInvasion = createEmptyCompletedInvasion(seed, invasionType, day, profile);
    return;
  }

  // 3b. Find entry room (random from any floor)
  const rng = seedrandom(seed);
  const entryResult = warning
    ? { room: state.world.floors[warning.entryFloorIndex]?.rooms.find((r) => r.id === warning.entryRoomId), floorIndex: warning.entryFloorIndex }
    : invasionFindEntryRoom(state, rng);

  if (!entryResult?.room) {
    state.world.activeInvasion = createEmptyCompletedInvasion(seed, invasionType, day, profile);
    return;
  }

  const entryRoom = entryResult.room;
  const entryFloorIndex = entryResult.floorIndex;
  const themedInvasionType = partyTheme;

  // 4. Build multi-floor invasion path
  const { path, roomFloorMap, roomFearLevels } = buildMultiFloorPath(
    state,
    entryRoom,
    entryFloorIndex,
    altarRoom,
    objectives,
    rng,
  );

  if (path.length === 0) {
    console.warn('[INV] EMPTY: no path');
    state.world.activeInvasion = createEmptyCompletedInvasion(seed, invasionType, day, profile);
    return;
  }

  const entryRoomId = path[0];

  // 4b. Count unreachable secondary objectives (anti-turtling)
  const unreachableObjectiveCount = invasionCountUnreachableObjectives(objectives, path);

  // 5. Count all defenders across floors in the path
  const pathRoomSet = new Set(path);
  const defenderIds = state.world.inhabitants
    .filter((i) => i.assignedRoomId !== undefined && pathRoomSet.has(i.assignedRoomId as PlacedRoomId))
    .map((i) => i.instanceId);

  // 6. Create invasion state
  const invasionState = invasionWinLossCreateState(
    invaders,
    objectives,
    defenderIds.length,
  );

  // 7. Init morale
  moraleInit();

  // 7b. Apply research-based morale penalty
  const researchMoralePenalty = researchUnlockGetPassiveBonusWithMastery('invaderMoralePenalty');
  if (researchMoralePenalty > 0) {
    moraleApply('research_penalty', -researchMoralePenalty, 0, 'Dungeon wards');
  }

  // 7c. Apply throne room ruler morale penalty
  const rulerMoralePenalty = throneRoomGetRulerBonusValue(state.world.floors, 'invaderMorale');
  if (rulerMoralePenalty !== 0) {
    moraleApply('ruler_presence', Math.round(rulerMoralePenalty * 100), 0, "Ruler's presence");
  }

  // 8. Build invader HP map
  const invaderHpMap: Record<string, number> = {};
  for (const inv of invaders) {
    invaderHpMap[inv.id] = inv.currentHp;
  }

  // 9. Calculate ticks for first room
  const firstRoomDefenders = state.world.inhabitants.filter(
    (i) => i.assignedRoomId === entryRoomId,
  );
  const firstRoomTicks = calculateRoomTicks(firstRoomDefenders.length);

  // 10. Store active invasion
  const battleLog: ActiveInvasion['battleLog'] = [];

  if (unreachableObjectiveCount > 0) {
    const totalBonus = unreachableObjectiveCount * FOCUSED_ASSAULT_ATTACK_BONUS;
    battleLog.push({
      turn: 0,
      type: 'room_enter',
      message: `The invaders are focused — no distractions! (+${totalBonus} attack)`,
    });
  }

  // Log themed invasion
  if (themedInvasionType) {
    const themeLabels: Record<InvasionThemeType, string> = {
      stealth_raid: 'A stealth raid approaches!',
      crusade: 'A holy crusade marches on the dungeon!',
      arcane_assault: 'An arcane assault force materializes!',
      berserker_horde: 'A berserker horde charges in!',
    };
    battleLog.push({
      turn: 0,
      type: 'room_enter',
      message: themeLabels[themedInvasionType],
    });
  }

  state.world.activeInvasion = {
    seed,
    invasionType,
    day,
    path,
    entryRoomId,
    entryFloorIndex,
    currentRoomIndex: 0,
    currentRoomTicksElapsed: 0,
    currentRoomTicksTotal: firstRoomTicks,
    roomFloorMap,
    isAltarLooping: false,
    invaderHpMap,
    killedDefenderIds: [],
    killedInvaderClasses: [],
    invasionState,
    currentRoomTurnQueue: undefined,
    currentRoomDefenderIds: firstRoomDefenders.map((i) => i.instanceId),
    battleLog,
    currentTurn: 0,
    hallwayTraversal: undefined,
    scoutedRoomIds: [],
    roomFearLevels,
    unreachableObjectiveCount,
    altarMaxHpMultiplier: 1.0,
    themedInvasionType,
    profile,
    completed: false,
  };
}

// --- Tick processor ---

/**
 * Process one tick of an active invasion. Called each game tick from the gameloop.
 */
export function invasionProcess(state: GameState): void {
  const invasion = state.world.activeInvasion;
  if (!invasion || invasion.completed) return;

  const rng = seedrandom(`${invasion.seed}-tick-${invasion.currentTurn}`);

  // Hallway traversal phase: invaders step one tile per tick
  if (invasion.hallwayTraversal) {
    invasion.currentTurn++;
    invasion.invasionState = { ...invasion.invasionState, currentTurn: invasion.currentTurn };
    processHallwayTraversalTick(state, invasion, rng);
    return;
  }

  invasion.currentRoomTicksElapsed++;
  invasion.currentTurn++;
  invasion.invasionState = { ...invasion.invasionState, currentTurn: invasion.currentTurn };

  const roomId = invasion.path[invasion.currentRoomIndex];
  const floorIndex = invasion.roomFloorMap[roomId] ?? 0;
  const currentFloor = state.world.floors[floorIndex];
  if (!currentFloor) {
    invasionProcessComplete(state, invasion, rng);
    return;
  }

  const room = currentFloor.rooms.find((r) => r.id === roomId);
  const roomDef = room ? contentGetEntry<RoomContent>(room.roomTypeId) : undefined;
  const floorLabel = `F${floorIndex + 1}`;
  const roomName = `${room ? roomGetDisplayName(room) : 'Unknown Room'} (${floorLabel})`;

  const tickInRoom = invasion.currentRoomTicksElapsed;
  const isFirstTick = tickInRoom === 1;
  const isLastTick = tickInRoom >= invasion.currentRoomTicksTotal;

  // --- First tick: entering room ---
  if (isFirstTick) {
    if (!invasion.isAltarLooping) {
      invasion.battleLog.push({
        turn: invasion.currentTurn,
        type: 'room_enter',
        roomId,
        message: `Invaders enter ${roomName}.`,
      });
    }

    // Random mid-invasion events (skip on first room entry and altar looping)
    if (invasion.currentRoomIndex > 0 && !invasion.isAltarLooping) {
      const eventResult = invasionEventTryTrigger(invasion, rng);
      if (eventResult) {
        invasion.invasionState = eventResult.invasionState;
        invasion.invaderHpMap = eventResult.invaderHpMap;
        invasion.battleLog.push(...eventResult.logEntries);

        // If reinforcements arrived, add them to the invasion state
        if (eventResult.addedInvaders?.length) {
          for (const added of eventResult.addedInvaders) {
            invasion.invaderHpMap[added.id] = added.currentHp;
          }
        }

        // Check if the event ended the invasion (all invaders dead)
        const endReason = invasionWinLossCheckEnd(invasion.invasionState);
        if (endReason) {
          invasionProcessComplete(state, invasion, rng);
          return;
        }
      }
    }

    // Fear room entry morale
    const roomFear = invasion.roomFearLevels[roomId] ?? 0;
    if (roomFear > 0) {
      const livingInvaders = invasion.invasionState.invaders.filter(
        (i) => i.currentHp > 0 && (invasion.invaderHpMap[i.id] ?? 0) > 0,
      );
      moraleApplyFearRoomEntry(roomFear, livingInvaders, invasion.currentTurn);

      if (moraleIsRetreating()) {
        invasion.battleLog.push({
          turn: invasion.currentTurn,
          type: 'retreat',
          message: 'The terrifying room causes invaders to retreat!',
        });
        invasionProcessComplete(state, invasion, rng);
        return;
      }
    }

    // Set up combatants if defenders present
    const roomDefenders = state.world.inhabitants.filter(
      (i) => i.assignedRoomId === roomId && !invasion.killedDefenderIds.includes(i.instanceId),
    );
    invasion.currentRoomDefenderIds = roomDefenders.map((i) => i.instanceId);

    if (roomDefenders.length > 0) {
      const defenderCombatants = roomDefenders.map((def, idx) => {
        const defContent = contentGetEntry<InhabitantContent>(def.definitionId);
        const stats = defContent
          ? effectiveStatsCalculate(defContent, def)
          : { hp: 10, attack: 5, defense: 5, speed: 5, workerEfficiency: 1 };

        // Apply state modifier penalties (scared/hungry/starving fight worse)
        const attackMul = stateModifierGetAttackMultiplier(def);
        const defenseMul = stateModifierGetDefenseMultiplier(def);
        const modifiedAttack = Math.max(0, Math.round(stats.attack * attackMul));
        const modifiedDefense = Math.max(0, Math.round(stats.defense * defenseMul));

        // Initialize ability states from content definition if not already set
        const defAbilityStates = def.abilityStates ?? initAbilityStatesFromContent(defContent);
        const defStatusEffects = def.statusEffects ?? [];
        return invasionCombatCreateCombatant(
          def.instanceId as unknown as CombatantId,
          'defender',
          def.name,
          { ...stats, attack: modifiedAttack, defense: modifiedDefense, maxHp: stats.hp },
          { x: idx, y: 0 },
          defAbilityStates,
          defStatusEffects,
        );
      });

      const livingInvaderInstances = invasion.invasionState.invaders.filter(
        (i) => i.currentHp > 0 && (invasion.invaderHpMap[i.id] ?? 0) > 0,
      );
      const focusedBonus = (invasion.unreachableObjectiveCount ?? 0) * FOCUSED_ASSAULT_ATTACK_BONUS;
      const threatStatBonus = invasionThreatGetStatBonus(invasion.profile.threatLevel);
      const invaderCombatants = livingInvaderInstances.map((inv, idx) => {
        const invDef = invaderGetDefinitionById(inv.definitionId);
        const baseAttack = invDef?.baseStats.attack ?? 5;
        const baseDefense = invDef?.baseStats.defense ?? 5;
        const baseSpeed = invDef?.baseStats.speed ?? 5;
        const baseHp = invasion.invaderHpMap[inv.id] ?? inv.currentHp;
        const baseMaxHp = inv.maxHp;
        return invasionCombatCreateCombatant(
          inv.id as unknown as CombatantId,
          'invader',
          invDef?.name ?? 'Invader',
          {
            hp: baseHp + Math.round(baseHp * threatStatBonus),
            maxHp: baseMaxHp + Math.round(baseMaxHp * threatStatBonus),
            attack: baseAttack + focusedBonus + Math.round(baseAttack * threatStatBonus),
            defense: baseDefense + Math.round(baseDefense * threatStatBonus),
            speed: baseSpeed,
          },
          { x: idx + roomDefenders.length + 1, y: 0 },
          inv.abilityStates,
          inv.statusEffects,
        );
      });

      invasion.currentRoomTurnQueue = invasionCombatBuildTurnQueue([
        ...defenderCombatants,
        ...invaderCombatants,
      ]);
    } else {
      invasion.currentRoomTurnQueue = undefined;
    }
  }

  // --- Middle ticks: combat ---
  if (!isFirstTick && !isLastTick && invasion.currentRoomTurnQueue) {
    processCombatRound(invasion, rng, state);
  }

  // --- Last tick: clearing room ---
  if (isLastTick) {
    // Run final combat if turn queue still active
    if (invasion.currentRoomTurnQueue) {
      processCombatRound(invasion, rng, state);
    }

    // Update invader HP from combat results
    if (invasion.currentRoomTurnQueue) {
      const aliveCombatants = invasionCombatGetAliveCombatants(invasion.currentRoomTurnQueue);
      for (const c of aliveCombatants) {
        if (c.side === 'invader') {
          invasion.invaderHpMap[c.id as unknown as string] = c.hp;
        }
      }

      const invadersAlive = aliveCombatants.filter((c) => c.side === 'invader');
      if (invadersAlive.length === 0) {
        invasion.battleLog.push({
          turn: invasion.currentTurn,
          type: 'room_cleared',
          roomId,
          message: `All invaders in ${roomName} have been defeated!`,
        });
      } else {
        const isHighValue = roomDef?.objectiveTypes
          ? roomDef.objectiveTypes.length > 0
          : false;
        moraleApplyRoomCapture(isHighValue, invasion.currentTurn);

        invasion.battleLog.push({
          turn: invasion.currentTurn,
          type: 'room_cleared',
          roomId,
          message: `Invaders cleared ${roomName} of defenders.`,
        });
      }
    } else if (!invasion.isAltarLooping) {
      invasion.battleLog.push({
        turn: invasion.currentTurn,
        type: 'room_cleared',
        roomId,
        message: `Invaders pass through ${roomName}.`,
      });
    }

    // Check and complete secondary objectives when invaders clear a room
    if (!invasion.isAltarLooping) {
      const secondaryObjectives = invasion.invasionState.objectives.filter(
        (o) => !o.isPrimary && !o.isCompleted && o.targetId === roomId,
      );
      for (const obj of secondaryObjectives) {
        const updated = invasionObjectiveUpdateProgress(obj, 100);
        invasion.invasionState = {
          ...invasion.invasionState,
          objectives: invasion.invasionState.objectives.map((o) =>
            o.id === obj.id ? updated : o,
          ),
        };

        // Apply altar debuff for completed secondary objective
        const debuffResult = invasionWinLossApplyObjectiveDebuff(
          invasion.invasionState,
          invasion.altarMaxHpMultiplier,
        );
        invasion.invasionState = debuffResult.state;
        invasion.altarMaxHpMultiplier = debuffResult.newMultiplier;

        invasion.battleLog.push({
          turn: invasion.currentTurn,
          type: 'random_event',
          roomId,
          message: `Objective completed: ${obj.name}! The altar weakens... (${invasion.invasionState.altarMaxHp} max HP)`,
        });
      }
    }

    // Altar damage — find altar on the current room's floor
    const altarTypeIdCheck = roomRoleFindById('altar');
    const altarRoomOnFloor = altarTypeIdCheck
      ? currentFloor.rooms.find((r) => r.roomTypeId === altarTypeIdCheck)
      : undefined;

    if (altarRoomOnFloor && roomId === altarRoomOnFloor.id) {
      const livingInvaders = invasion.invasionState.invaders.filter(
        (i) => i.currentHp > 0 && (invasion.invaderHpMap[i.id] ?? 0) > 0,
      );
      if (livingInvaders.length > 0) {
        let totalDamage = 0;
        for (const inv of livingInvaders) {
          const invDef = invaderGetDefinitionById(inv.definitionId);
          totalDamage += invDef?.baseStats.attack ?? 5;
        }
        // Throne room ruler durability bonus reduces incoming altar damage
        const durabilityBonus = throneRoomGetRulerBonusValue(state.world.floors, 'roomDurability');
        if (durabilityBonus > 0) {
          totalDamage = Math.max(1, Math.round(totalDamage * (1 - durabilityBonus)));
        }
        // Legendary aura room regen reduces altar damage
        const roomRegenAura = legendaryAuraGetBonus(state.world.inhabitants, 'aura_room_regen');
        if (roomRegenAura > 0) {
          totalDamage = Math.max(1, Math.round(totalDamage * (1 - roomRegenAura * 0.15)));
        }
        invasion.invasionState = invasionWinLossDamageAltar(invasion.invasionState, totalDamage);
        invasion.battleLog.push({
          turn: invasion.currentTurn,
          type: 'altar_damage',
          roomId,
          message: `Invaders attack the altar for ${totalDamage} damage! (${invasion.invasionState.altarHp}/${invasion.invasionState.altarMaxHp} HP)`,
        });
      }
    }

    // Check end conditions
    const endReason = invasionWinLossCheckEnd(invasion.invasionState);
    if (endReason || moraleIsRetreating()) {
      if (moraleIsRetreating() && !endReason) {
        invasion.battleLog.push({
          turn: invasion.currentTurn,
          type: 'retreat',
          message: 'Invaders retreat in fear!',
        });
      }
      invasionProcessComplete(state, invasion, rng);
      return;
    }

    // Start hallway traversal to next room (or advance directly if no hallway)
    startHallwayTraversal(state, invasion);
  }
}

// --- Internal helpers ---

function calculateRoomTicks(defenderCount: number): number {
  return INVASION_BASE_TICKS_PER_ROOM + (defenderCount * INVASION_TICKS_PER_DEFENDER);
}

/**
 * Initialize ability states from an inhabitant's content definition.
 */
function initAbilityStatesFromContent(content: InhabitantContent | undefined): AbilityState[] {
  if (!content?.combatAbilityIds?.length) return [];
  const abilities = content.combatAbilityIds
    .map((id) => contentGetEntry<CombatAbilityContent>(id))
    .filter((a): a is CombatAbilityContent => a !== undefined);
  return combatAbilityInitStates(abilities);
}

/**
 * Find an invader with the Disarm Trap ability and return the disarm chance + invader name.
 */
function findDisarmInvader(
  invasion: ActiveInvasion,
): { invaderName: string; chance: number } | undefined {
  const livingInvaders = invasion.invasionState.invaders.filter(
    (i) => i.currentHp > 0 && (invasion.invaderHpMap[i.id] ?? 0) > 0,
  );

  for (const inv of livingInvaders) {
    const invDef = invaderGetDefinitionById(inv.definitionId);
    if (!invDef) continue;

    for (const abilityState of inv.abilityStates) {
      const ability = contentGetEntry<CombatAbilityContent>(abilityState.abilityId);
      if (!ability) continue;
      for (const abilityEffect of ability.effects) {
        const effectDef = contentGetEntry<AbilityEffectContent>(abilityEffect.effectType);
        if (effectDef?.statusName === 'disarm') {
          return { invaderName: invDef.name, chance: abilityEffect.value };
        }
      }
    }
  }

  return undefined;
}

// --- Hallway traversal ---

/**
 * Begin tile-by-tile hallway traversal from the current room to the next room.
 * Falls back to direct advanceToRoom() if no hallway exists or rooms are on different floors.
 */
function startHallwayTraversal(
  state: GameState,
  invasion: ActiveInvasion,
): void {
  const nextRoomIndex = invasion.currentRoomIndex + 1;

  // End of path — enter altar looping
  if (nextRoomIndex >= invasion.path.length) {
    invasion.currentRoomIndex = invasion.path.length - 1;
    invasion.isAltarLooping = true;
    invasion.currentRoomTicksElapsed = 0;
    invasion.currentRoomTicksTotal = INVASION_BASE_TICKS_PER_ROOM;
    invasion.currentRoomTurnQueue = undefined;
    return;
  }

  const currentRoomId = invasion.path[invasion.currentRoomIndex];
  const nextRoomId = invasion.path[nextRoomIndex];

  // Cross-floor transitions skip hallway traversal
  const currentFloorIndex = invasion.roomFloorMap[currentRoomId] ?? 0;
  const nextFloorIndex = invasion.roomFloorMap[nextRoomId] ?? 0;
  if (currentFloorIndex !== nextFloorIndex) {
    advanceToRoom(state, invasion, nextRoomIndex);
    return;
  }

  const floor = state.world.floors[currentFloorIndex];
  if (!floor) {
    advanceToRoom(state, invasion, nextRoomIndex);
    return;
  }

  // Find hallway connecting the two rooms
  const hallway = floor.hallways.find(
    (h) =>
      (h.startRoomId === currentRoomId && h.endRoomId === nextRoomId) ||
      (h.startRoomId === nextRoomId && h.endRoomId === currentRoomId),
  );

  if (!hallway || hallway.tiles.length === 0) {
    advanceToRoom(state, invasion, nextRoomIndex);
    return;
  }

  // Order tiles by travel direction: if hallway goes from current→next, use as-is;
  // if hallway goes from next→current, reverse the tiles
  const tiles = hallway.startRoomId === currentRoomId
    ? [...hallway.tiles]
    : [...hallway.tiles].reverse();

  // Log scouted hallway bypass
  if (invasion.scoutedRoomIds.includes(nextRoomId)) {
    invasion.battleLog.push({
      turn: invasion.currentTurn,
      type: 'ability_scout',
      message: `The party bypasses traps in a scouted hallway.`,
    });
  }

  const traversal: HallwayTraversalState = {
    hallwayId: hallway.id,
    floorIndex: currentFloorIndex,
    tiles,
    currentTileIndex: -1,
    destinationRoomIndex: nextRoomIndex,
  };

  invasion.hallwayTraversal = traversal;
  invasion.battleLog.push({
    turn: invasion.currentTurn,
    type: 'hallway_enter',
    message: `Invaders enter the hallway (${tiles.length} tiles).`,
  });
}

/**
 * Process one tick of hallway traversal: advance one tile and trigger traps.
 */
function processHallwayTraversalTick(
  state: GameState,
  invasion: ActiveInvasion,
  rng: seedrandom.PRNG,
): void {
  const traversal = invasion.hallwayTraversal;
  if (!traversal) return;

  traversal.currentTileIndex++;

  // Reached end of hallway
  if (traversal.currentTileIndex >= traversal.tiles.length) {
    completeHallwayTraversal(state, invasion);
    return;
  }

  // Process trap at this tile (skip if destination room is scouted)
  const destRoomId = invasion.path[traversal.destinationRoomIndex];
  if (!invasion.scoutedRoomIds.includes(destRoomId)) {
    processHallwayTrapAtTile(state, invasion, rng, traversal);
  }

  // Check end after trap
  const endAfterTraps = invasionWinLossCheckEnd(invasion.invasionState);
  if (endAfterTraps || moraleIsRetreating()) {
    if (moraleIsRetreating() && !endAfterTraps) {
      invasion.battleLog.push({
        turn: invasion.currentTurn,
        type: 'retreat',
        message: 'Invaders lose their nerve and retreat!',
      });
    }
    invasion.hallwayTraversal = undefined;
    invasionProcessComplete(state, invasion, rng);
  }
}

/**
 * Process a single trap at the current hallway tile.
 */
function processHallwayTrapAtTile(
  state: GameState,
  invasion: ActiveInvasion,
  rng: seedrandom.PRNG,
  traversal: HallwayTraversalState,
): void {
  const tile = traversal.tiles[traversal.currentTileIndex];
  let floor = state.world.floors[traversal.floorIndex];
  if (!floor) return;

  const trap = trapGetAtTile(floor, tile.x, tile.y);
  if (!trap || !trap.isArmed || trap.remainingCharges <= 0) return;

  const destRoomId = invasion.path[traversal.destinationRoomIndex];

  // Check for Disarm Trap ability
  const disarmInvader = findDisarmInvader(invasion);
  if (disarmInvader) {
    const disarmRoll = rng() * 100;
    if (disarmRoll <= disarmInvader.chance) {
      const trapDef = trapGetDefinition(trap.trapTypeId);
      const trapName = trapDef?.name ?? 'a trap';
      floor = trapApplyTrigger(floor, trap.id, {
        triggered: false,
        disarmed: true,
        trapName,
        damage: 0,
        effectType: '',
        duration: 0,
        trapDestroyed: false,
        moralePenalty: 0,
      });
      state.world.floors[traversal.floorIndex] = floor;

      invasion.battleLog.push({
        turn: invasion.currentTurn,
        type: 'ability_disarm',
        roomId: destRoomId,
        message: `${disarmInvader.invaderName} disarms ${trapName}!`,
        details: { abilityName: 'Disarm Trap', effectType: 'Disarm' },
      });
      return;
    }
  }

  const livingInvaders = invasion.invasionState.invaders.filter(
    (i) => i.currentHp > 0 && (invasion.invaderHpMap[i.id] ?? 0) > 0,
  );
  if (livingInvaders.length === 0) return;

  const targetInvader = livingInvaders[Math.floor(rng() * livingInvaders.length)];
  const targetDef = invaderGetDefinitionById(targetInvader.definitionId);
  const isRogue = targetDef?.invaderClass === 'rogue';
  const roll = rng();

  const triggerResult = trapRollTrigger(trap, isRogue, roll);
  floor = trapApplyTrigger(floor, trap.id, triggerResult);
  state.world.floors[traversal.floorIndex] = floor;

  if (triggerResult.disarmed) {
    invasion.battleLog.push({
      turn: invasion.currentTurn,
      type: 'trap_disarm',
      roomId: destRoomId,
      message: `${targetDef?.name ?? 'Invader'} disarmed ${triggerResult.trapName}!`,
    });
  } else if (triggerResult.triggered) {
    const newHp = Math.max(0, (invasion.invaderHpMap[targetInvader.id] ?? 0) - triggerResult.damage);
    invasion.invaderHpMap[targetInvader.id] = newHp;

    const isFearGlyph = triggerResult.effectType === 'fear';
    moraleApplyTrapTrigger(isFearGlyph, invasion.currentTurn, invasion.invasionState.invaders);

    if (newHp <= 0) {
      invasion.invasionState = invasionWinLossMarkKilled(invasion.invasionState, targetInvader.id);
      invasion.killedInvaderClasses.push(targetDef?.invaderClass ?? 'warrior');
      if (targetInvader.isLeader) {
        moraleApplyLeaderDeath(targetInvader, invasion.currentTurn);
      } else {
        moraleApplyAllyDeath(targetInvader, invasion.currentTurn, invasion.invasionState.invaders);
      }
      invasion.battleLog.push({
        turn: invasion.currentTurn,
        type: 'combat_kill',
        roomId: destRoomId,
        message: `${triggerResult.trapName} killed ${targetDef?.name ?? 'Invader'}! (${triggerResult.damage} damage)`,
      });
    } else {
      invasion.battleLog.push({
        turn: invasion.currentTurn,
        type: 'trap_trigger',
        roomId: destRoomId,
        message: `${triggerResult.trapName} hit ${targetDef?.name ?? 'Invader'} for ${triggerResult.damage} damage.`,
      });
    }
  } else {
    invasion.battleLog.push({
      turn: invasion.currentTurn,
      type: 'trap_miss',
      roomId: destRoomId,
      message: `${targetDef?.name ?? 'Invader'} avoided ${triggerResult.trapName}.`,
    });
  }
}

/**
 * Complete hallway traversal and advance to the destination room.
 */
function completeHallwayTraversal(
  state: GameState,
  invasion: ActiveInvasion,
): void {
  const destIndex = invasion.hallwayTraversal?.destinationRoomIndex;
  invasion.hallwayTraversal = undefined;

  if (destIndex !== undefined) {
    advanceToRoom(state, invasion, destIndex);
  }
}

/**
 * Advance invasion to a specific room index, setting up ticks for the new room.
 */
function advanceToRoom(
  state: GameState,
  invasion: ActiveInvasion,
  roomIndex: number,
): void {
  invasion.currentRoomIndex = roomIndex;
  const nextRoomId = invasion.path[roomIndex];
  const nextRoomDefenders = state.world.inhabitants.filter(
    (i) => i.assignedRoomId === nextRoomId && !invasion.killedDefenderIds.includes(i.instanceId),
  );
  invasion.currentRoomTicksElapsed = 0;
  invasion.currentRoomTicksTotal = calculateRoomTicks(nextRoomDefenders.length);
  invasion.currentRoomTurnQueue = undefined;
}

function processCombatKill(
  invasion: ActiveInvasion,
  actor: { name: string },
  target: { id: string; name: string; side: string },
  roomId: string,
  damage: number,
  sourceLabel?: string,
): void {
  if (target.side === 'invader') {
    const invId = target.id as unknown as string;
    invasion.invasionState = invasionWinLossMarkKilled(invasion.invasionState, invId);
    invasion.invaderHpMap[invId] = 0;
    const invDef = invasion.invasionState.invaders.find((i) => i.id === invId);
    const classDef = invDef ? invaderGetDefinitionById(invDef.definitionId) : undefined;
    invasion.killedInvaderClasses.push(classDef?.invaderClass ?? 'warrior');

    // Check if the killed invader is the leader
    if (invDef?.isLeader) {
      moraleApplyLeaderDeath(invDef, invasion.currentTurn);
    } else {
      // Check if allies have courage status before applying morale penalty
      const aliveInvaders = invasion.currentRoomTurnQueue?.combatants.filter(
        (c) => c.hp > 0 && c.side === 'invader' && c.id !== target.id,
      ) ?? [];
      const allHaveCourage = aliveInvaders.length > 0 && aliveInvaders.every((c) => combatantHasStatus(c, 'courage'));
      if (!allHaveCourage) {
        moraleApplyAllyDeath(
          invDef ?? invasion.invasionState.invaders[0],
          invasion.currentTurn,
          invasion.invasionState.invaders,
        );
      }
    }

    const msg = sourceLabel
      ? `${actor.name}'s ${sourceLabel} kills ${target.name}!`
      : `${actor.name} killed ${target.name}!`;
    invasion.battleLog.push({
      turn: invasion.currentTurn,
      type: 'combat_kill',
      roomId,
      message: msg,
      details: { damage },
    });
  } else {
    const defId = target.id as unknown as InhabitantInstanceId;
    invasion.killedDefenderIds.push(defId);
    invasion.invasionState = invasionWinLossRecordDefenderLoss(invasion.invasionState);

    invasion.battleLog.push({
      turn: invasion.currentTurn,
      type: 'defender_killed',
      roomId,
      message: `${target.name} has fallen to ${actor.name}!`,
      details: { damage },
    });
  }
}

function processAbilityResult(
  invasion: ActiveInvasion,
  actor: { name: string; id: string },
  actionResult: { abilityActivation?: { abilityName: string; effects: Array<{ effectType: string; damage: number; statusApplied?: string; statusDuration: number; targetIds: string[]; targetsHit: number; targetType: string }> } | undefined },
  roomId: string,
): void {
  const activation = actionResult.abilityActivation;
  if (!activation) return;

  const { abilityName } = activation;

  for (const effect of activation.effects) {
    const { effectType, damage, statusApplied, statusDuration, targetIds, targetsHit, targetType } = effect;

    // Handle Scout effect
    if (effectType === 'Scout Effect' || effectType === 'Scout') {
      const allInhabitants = gamestate()?.world?.inhabitants ?? [];
      const negateScout = legendaryAuraGetBonus(allInhabitants, 'aura_negate_scout');
      if (negateScout > 0) {
        invasion.battleLog.push({
          turn: invasion.currentTurn,
          type: 'ability_scout',
          roomId,
          message: `${actor.name} tries to scout ahead, but antimagic energy negates their efforts!`,
          details: { abilityName, effectType },
        });
        continue;
      }

      const scoutCount = targetsHit || 2;
      const currentIdx = invasion.currentRoomIndex;
      for (let i = 1; i <= scoutCount; i++) {
        const idx = currentIdx + i;
        if (idx < invasion.path.length) {
          const rid = invasion.path[idx];
          if (!invasion.scoutedRoomIds.includes(rid)) {
            invasion.scoutedRoomIds.push(rid);
          }
        }
      }
      invasion.battleLog.push({
        turn: invasion.currentTurn,
        type: 'ability_scout',
        roomId,
        message: `${actor.name} scouts ahead, revealing ${scoutCount} rooms!`,
        details: { abilityName, effectType },
      });
      continue;
    }

    // Handle damage
    if (damage > 0) {
      const logType = targetType === 'aoe' && targetsHit > 1
        ? `${actor.name} uses ${abilityName}, hitting ${targetsHit} targets for ${damage} damage each!`
        : `${actor.name} uses ${abilityName} for ${damage} damage!`;

      invasion.battleLog.push({
        turn: invasion.currentTurn,
        type: 'ability_use',
        roomId,
        message: logType,
        details: { abilityName, effectType, damage },
      });

      // Check for kills and sync HP
      for (const tid of targetIds) {
        const target = invasion.currentRoomTurnQueue?.combatants.find((c) => c.id === tid);
        if (!target) continue;
        if (target.side === 'invader') {
          invasion.invaderHpMap[target.id as unknown as string] = target.hp;
        }
        if (target.hp <= 0) {
          processCombatKill(invasion, actor, target, roomId, damage, abilityName);
        }
      }
      continue;
    }

    // Handle heal
    if (effectType === 'Heal Effect' || effectType === 'Heal') {
      const targetName = invasion.currentRoomTurnQueue?.combatants.find((c) => targetIds.includes(c.id as string))?.name ?? 'ally';
      invasion.battleLog.push({
        turn: invasion.currentTurn,
        type: 'ability_heal',
        roomId,
        message: `${actor.name} uses ${abilityName} on ${targetName}, restoring HP!`,
        details: { abilityName, effectType },
      });

      // Sync healed invader HP
      for (const tid of targetIds) {
        const target = invasion.currentRoomTurnQueue?.combatants.find((c) => c.id === tid);
        if (target?.side === 'invader') {
          invasion.invaderHpMap[target.id as unknown as string] = target.hp;
        }
      }
      continue;
    }

    // Handle resurrect
    if (statusApplied === 'resurrected') {
      const targetName = invasion.currentRoomTurnQueue?.combatants.find((c) => targetIds.includes(c.id as string))?.name ?? 'fallen ally';
      invasion.battleLog.push({
        turn: invasion.currentTurn,
        type: 'ability_heal',
        roomId,
        message: `${actor.name} resurrects ${targetName}!`,
        details: { abilityName, effectType },
      });
      continue;
    }

    // Handle buff
    if (statusApplied === 'shielded' || statusApplied === 'courage') {
      const durationMsg = statusDuration > 0 ? ` for ${statusDuration} turns` : '';
      invasion.battleLog.push({
        turn: invasion.currentTurn,
        type: 'ability_buff',
        roomId,
        message: `${actor.name} uses ${abilityName}, gaining ${statusApplied}${durationMsg}!`,
        details: { abilityName, effectType, statusApplied, duration: statusDuration },
      });
      continue;
    }

    // Handle debuff (stun, mark, dispel)
    if (statusApplied === 'stunned' || statusApplied === 'marked' || statusApplied === 'dispel') {
      const targetName = invasion.currentRoomTurnQueue?.combatants.find((c) => targetIds.includes(c.id as string))?.name ?? 'target';
      const statusLabel = statusApplied === 'dispel' ? 'removing all effects' : `inflicting ${statusApplied}`;
      invasion.battleLog.push({
        turn: invasion.currentTurn,
        type: 'ability_debuff',
        roomId,
        message: `${actor.name} uses ${abilityName} on ${targetName}, ${statusLabel}!`,
        details: { abilityName, effectType, statusApplied, duration: statusDuration },
      });
      continue;
    }

    // Fallback log for any other effect
    invasion.battleLog.push({
      turn: invasion.currentTurn,
      type: 'ability_use',
      roomId,
      message: `${actor.name} uses ${abilityName}!`,
      details: { abilityName, effectType },
    });
  }
}

function processCombatRound(
  invasion: ActiveInvasion,
  rng: seedrandom.PRNG,
  state?: GameState,
): void {
  if (!invasion.currentRoomTurnQueue) return;

  const roomId = invasion.path[invasion.currentRoomIndex];

  // Run one full round of combat
  for (let round = 0; round < MAX_ROUNDS_PER_ROOM; round++) {
    while (!invasionCombatIsRoundComplete(invasion.currentRoomTurnQueue)) {
      const actor = invasionCombatGetCurrentActor(invasion.currentRoomTurnQueue);
      if (!actor) break;

      // Log stun skip
      if (actor.statusEffects.some((s) => s.name === 'stunned')) {
        invasion.battleLog.push({
          turn: invasion.currentTurn,
          type: 'ability_debuff',
          roomId,
          message: `${actor.name} is stunned and cannot act!`,
        });
      }

      const { queue: newQueue, result: actionResult } = invasionCombatExecuteAiTurn(
        invasion.currentRoomTurnQueue,
        rng,
      );
      invasion.currentRoomTurnQueue = newQueue;

      // Handle attack results
      if (actionResult.action === 'attack' && actionResult.combatResult) {
        const target = invasion.currentRoomTurnQueue.combatants.find(
          (c) => c.id === actionResult.targetId,
        );
        if (actionResult.combatResult.hit) {
          if (actionResult.combatResult.defenderDead && target) {
            processCombatKill(invasion, actor, target, roomId, actionResult.combatResult.damage);
          } else {
            invasion.battleLog.push({
              turn: invasion.currentTurn,
              type: 'combat_attack',
              roomId,
              message: `${actor.name} hit ${target?.name ?? 'target'} for ${actionResult.combatResult.damage} damage.`,
            });
            if (target?.side === 'invader') {
              invasion.invaderHpMap[target.id as unknown as string] = target.hp;
            }
          }
        } else {
          // Check if miss was due to evasion
          const wasEvaded = actionResult.combatResult.roll === 0 && target && target.abilityStates.some((s) => {
            const ability = contentGetEntry<CombatAbilityContent>(s.abilityId);
            if (!ability) return false;
            return ability.effects.some((ae) => {
              const effectDef = contentGetEntry<AbilityEffectContent>(ae.effectType);
              return effectDef?.overrideTargetsHit === 0;
            });
          });
          if (wasEvaded) {
            invasion.battleLog.push({
              turn: invasion.currentTurn,
              type: 'combat_miss',
              roomId,
              message: `${target?.name ?? 'target'} evades ${actor.name}'s attack!`,
            });
          } else {
            invasion.battleLog.push({
              turn: invasion.currentTurn,
              type: 'combat_miss',
              roomId,
              message: `${actor.name} missed ${target?.name ?? 'target'}.`,
            });
          }
        }
      }

      // Handle ability results
      if (actionResult.action === 'ability' && actionResult.abilityActivation) {
        processAbilityResult(invasion, actor, actionResult, roomId);
      }

      invasion.currentRoomTurnQueue = invasionCombatAdvanceTurn(invasion.currentRoomTurnQueue);
    }

    // Check if one side is eliminated
    const alive = invasionCombatGetAliveCombatants(invasion.currentRoomTurnQueue);
    const invadersAlive = alive.filter((c) => c.side === 'invader');
    const defendersAlive = alive.filter((c) => c.side === 'defender');

    if (invadersAlive.length === 0 || defendersAlive.length === 0) {
      // Sync ability states back to invader/inhabitant instances
      syncCombatStateBack(invasion, state);
      break;
    }

    invasion.currentRoomTurnQueue = invasionCombatStartNewRound(invasion.currentRoomTurnQueue);

    // Legendary aura petrify: chance to stun invaders at start of each round
    const petrifyInhabitants = state?.world?.inhabitants ?? [];
    const petrifyChance = legendaryAuraGetBonus(petrifyInhabitants, 'aura_petrify');
    if (petrifyChance > 0) {
      const updatedCombatants = invasion.currentRoomTurnQueue.combatants.map((c) => {
        if (c.side !== 'invader' || c.hp <= 0) return c;
        if (combatantHasStatus(c, 'stunned')) return c;
        if (rng() < petrifyChance) {
          invasion.battleLog.push({
            turn: invasion.currentTurn,
            type: 'ability_debuff',
            roomId,
            message: `${c.name} is petrified by a dread gaze!`,
          });
          return {
            ...c,
            statusEffects: [...c.statusEffects, { name: 'stunned', remainingDuration: 2 }],
          };
        }
        return c;
      });
      invasion.currentRoomTurnQueue = {
        ...invasion.currentRoomTurnQueue,
        combatants: updatedCombatants,
      };
    }

    break; // Only one round per tick
  }
}

/**
 * Sync ability states and status effects from combatants back to invader/inhabitant instances.
 */
function syncCombatStateBack(invasion: ActiveInvasion, state?: GameState): void {
  if (!invasion.currentRoomTurnQueue) return;

  for (const combatant of invasion.currentRoomTurnQueue.combatants) {
    if (combatant.side === 'invader') {
      const invId = combatant.id as unknown as string;
      const invader = invasion.invasionState.invaders.find((i) => i.id === invId);
      if (invader) {
        invader.abilityStates = combatant.abilityStates;
        invader.statusEffects = combatant.statusEffects;
      }
      invasion.invaderHpMap[invId] = combatant.hp;
    } else if (combatant.side === 'defender' && state) {
      const defId = combatant.id as unknown as InhabitantInstanceId;
      const inhabitant = state.world.inhabitants.find((i) => i.instanceId === defId);
      if (inhabitant) {
        inhabitant.abilityStates = combatant.abilityStates;
        inhabitant.statusEffects = combatant.statusEffects;
      }
    }
  }
}

function invasionProcessComplete(
  state: GameState,
  invasion: ActiveInvasion,
  rng: seedrandom.PRNG,
): void {
  const endReason = invasionWinLossCheckEnd(invasion.invasionState) ?? 'turn_limit_reached';
  invasion.invasionState = invasionWinLossEnd(invasion.invasionState);

  // Calculate penetration depth: how far invaders got through the dungeon
  const totalPathRooms = invasion.path.length;
  const roomsReached = Math.min(invasion.currentRoomIndex + 1, totalPathRooms);
  const penetrationDepth = invasion.isAltarLooping
    ? 1.0
    : Math.min(1.0, invasion.currentRoomIndex / Math.max(1, totalPathRooms - 1));

  const detailedResult = invasionWinLossResolveDetailedResult(
    invasion.invasionState,
    invasion.day,
    endReason,
    penetrationDepth,
    roomsReached,
    totalPathRooms,
    invasion.altarMaxHpMultiplier,
  );

  invasion.battleLog.push({
    turn: invasion.currentTurn,
    type: 'invasion_end',
    message: detailedResult.outcome === 'victory'
      ? 'The invaders have been repelled! Victory!'
      : 'The dungeon has fallen to the invaders...',
  });

  // Calculate rewards/penalties
  let rewards: InvasionOrchestratorResult['rewards'];
  let penalties: InvasionOrchestratorResult['penalties'];

  if (detailedResult.outcome === 'victory') {
    rewards = invasionRewardCalculateDefenseRewards(
      detailedResult,
      invasion.killedInvaderClasses,
      rng,
    );
  } else {
    const currentResources: Partial<Record<ResourceType, number>> = {};
    for (const [key, val] of Object.entries(state.world.resources) as [ResourceType, { current: number; max: number }][]) {
      currentResources[key] = val.current;
    }
    penalties = invasionRewardCalculateDefensePenalties(
      detailedResult,
      currentResources,
    );
    penalties.killedInhabitantIds = [...invasion.killedDefenderIds];
  }

  // Roll prisoner captures (only if at least one invader was killed in combat)
  const survivingInvaders = invasion.invasionState.invaders.filter(
    (i) => i.currentHp > 0 && (invasion.invaderHpMap[i.id] ?? 0) > 0,
  );
  const hasKills = invasion.killedInvaderClasses.length > 0;
  const capturedPrisoners = detailedResult.outcome === 'victory' && hasKills
    ? invasionRewardRollPrisonerCaptures(survivingInvaders, invasion.day, rng)
    : [];

  if (rewards && capturedPrisoners.length > 0) {
    rewards.capturedPrisoners = capturedPrisoners;
  }

  invasion.completed = true;
  invasion.result = {
    detailedResult,
    rewards,
    penalties,
    battleLog: invasion.battleLog,
    capturedPrisoners,
    killedDefenderIds: invasion.killedDefenderIds,
    survivingInvaders,
  };
}

function createEmptyCompletedInvasion(
  seed: string,
  invasionType: 'scheduled' | SpecialInvasionType,
  day: number,
  profile: DungeonProfile,
): ActiveInvasion {
  const emptyResult: InvasionOrchestratorResult = {
    detailedResult: {
      invasionId: 'empty' as unknown as InvasionOrchestratorResult['detailedResult']['invasionId'],
      day,
      outcome: 'victory',
      endReason: 'all_invaders_eliminated',
      turnsTaken: 0,
      invaderCount: 0,
      invadersKilled: 0,
      defenderCount: 0,
      defendersLost: 0,
      objectivesCompleted: 0,
      objectivesTotal: 0,
      rewardMultiplier: 0.5,
      penetrationDepth: 0,
      roomsReached: 0,
      totalPathRooms: 0,
      altarMaxHpMultiplier: 1.0,
    },
    battleLog: [{ turn: 0, type: 'invasion_end', message: 'No invaders appeared.' }],
    capturedPrisoners: [],
    killedDefenderIds: [],
    survivingInvaders: [],
  };

  return {
    seed,
    invasionType,
    day,
    path: [],
    entryRoomId: '' as PlacedRoomId,
    entryFloorIndex: 0,
    currentRoomIndex: 0,
    currentRoomTicksElapsed: 0,
    currentRoomTicksTotal: 0,
    roomFloorMap: {},
    isAltarLooping: false,
    invaderHpMap: {},
    killedDefenderIds: [],
    killedInvaderClasses: [],
    invasionState: {
      invasionId: 'empty' as unknown as InvasionOrchestratorResult['detailedResult']['invasionId'],
      currentTurn: 0,
      maxTurns: 0,
      altarHp: 0,
      altarMaxHp: 0,
      invaders: [],
      objectives: [],
      defenderCount: 0,
      defendersLost: 0,
      invadersKilled: 0,
      isActive: false,
    },
    currentRoomDefenderIds: [],
    battleLog: [{ turn: 0, type: 'invasion_end', message: 'No invaders appeared.' }],
    currentTurn: 0,
    hallwayTraversal: undefined,
    scoutedRoomIds: [],
    roomFearLevels: {},
    unreachableObjectiveCount: 0,
    altarMaxHpMultiplier: 1.0,
    profile,
    completed: true,
    result: emptyResult,
  };
}
