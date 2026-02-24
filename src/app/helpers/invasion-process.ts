import { computed } from '@angular/core';
import { sortBy } from 'es-toolkit/compat';
import { contentGetEntry } from '@helpers/content';
import { effectiveStatsCalculate } from '@helpers/effective-stats';
import { fearLevelCalculateAllForFloor } from '@helpers/fear-level';
import {
  invasionCombatAdvanceTurn,
  invasionCombatBuildTurnQueue,
  invasionCombatCreateCombatant,
  invasionCombatExecuteAiTurn,
  invasionCombatGetAliveCombatants,
  invasionCombatGetCurrentActor,
  invasionCombatIsRoundComplete,
  invasionCombatStartNewRound,
} from '@helpers/invasion-combat';
import { invasionCompositionCalculateDungeonProfile, invasionCompositionGenerateParty } from '@helpers/invasion-composition';
import { invasionThreatGetPartySizeBonus, invasionThreatGetStatBonus } from '@helpers/invasion-threat';
import { invasionObjectiveAssign } from '@helpers/invasion-objectives';
import {
  invasionRewardCalculateDefensePenalties,
  invasionRewardCalculateDefenseRewards,
  invasionRewardRollPrisonerCaptures,
} from '@helpers/invasion-rewards';
import {
  invasionWinLossCheckEnd,
  invasionWinLossCreateState,
  invasionWinLossDamageAltar,
  invasionWinLossEnd,
  invasionWinLossMarkKilled,
  invasionWinLossRecordDefenderLoss,
  invasionWinLossResolveDetailedResult,
} from '@helpers/invasion-win-loss';
import {
  moraleApplyAllyDeath,
  moraleApplyFearRoomEntry,
  moraleApplyRoomCapture,
  moraleApplyTrapTrigger,
  moraleInit,
  moraleIsRetreating,
} from '@helpers/morale';
import {
  pathfindingBuildDungeonGraph,
  pathfindingFindPath,
  pathfindingFindWithObjectives,
} from '@helpers/pathfinding';
import { roomRoleFindById } from '@helpers/room-roles';
import { trapApplyTrigger, trapGetInHallway, trapRollTrigger } from '@helpers/traps';
import { invaderGetDefinitionById } from '@helpers/invaders';
import { gamestate } from '@helpers/state-game';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';
import type {
  ActiveInvasion,
  CombatantId,
  DungeonProfile,
  Floor,
  GameState,
  InhabitantInstanceId,
  InvasionObjective,
  InvasionOrchestratorResult,
  PendingInvasionWarning,
  PlacedRoom,
  PlacedRoomId,
  SpecialInvasionType,
} from '@interfaces';
import type { SecondaryObjective } from '@interfaces/pathfinding';
import seedrandom from 'seedrandom';

// --- Constants ---

const INVASION_BASE_TICKS_PER_ROOM = 2;
const INVASION_TICKS_PER_DEFENDER = 2;
const MAX_ROUNDS_PER_ROOM = 10;

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
 * Find the entry room on floor 0 for an invasion.
 * Picks the non-transport room farthest from the altar by graph distance,
 * or falls back to the top-left room if the altar isn't on floor 0.
 */
export function invasionFindEntryRoom(state: GameState): PlacedRoom | undefined {
  const floors = state.world.floors;
  const floor0 = floors[0];
  if (!floor0) return undefined;

  const regularRooms = floor0.rooms.filter((r) => !r.transportType);
  if (regularRooms.length === 0) return undefined;

  // Find altar room
  const altarTypeId = roomRoleFindById('altar');
  let altarRoom: { room: PlacedRoom; floorIndex: number } | undefined;
  for (let fi = 0; fi < floors.length; fi++) {
    const floor = floors[fi];
    const room = altarTypeId ? floor.rooms.find((r) => r.roomTypeId === altarTypeId) : undefined;
    if (room) {
      altarRoom = { room, floorIndex: fi };
      break;
    }
  }

  if (altarRoom && altarRoom.floorIndex === 0) {
    const fearBreakdown0 = fearLevelCalculateAllForFloor(floor0);
    const fearMap0 = fearBreakdownToNumericMap(fearBreakdown0);
    const graph0 = pathfindingBuildDungeonGraph(floor0, fearMap0);

    let bestRoom: PlacedRoom | undefined;
    let bestDist = 0;
    for (const room of regularRooms) {
      if (room.id === altarRoom.room.id) continue;
      const testPath = pathfindingFindPath(graph0, room.id, altarRoom.room.id);
      if (testPath.length > bestDist) {
        bestDist = testPath.length;
        bestRoom = room;
      }
    }
    return bestRoom ?? altarRoom.room;
  }

  return sortBy(regularRooms, [(r: PlacedRoom) => r.anchorX + r.anchorY])[0];
}

/**
 * Build a path through one or more dungeon floors from an entry room
 * (top-left on floor 0) to the altar room (possibly on a deeper floor).
 * Returns the full room path, a map of roomId → floorIndex, and fear levels.
 */
function buildMultiFloorPath(
  state: GameState,
  altarRoom: { room: PlacedRoom; floorIndex: number } | undefined,
  objectives: InvasionObjective[],
): {
  path: PlacedRoomId[];
  roomFloorMap: Record<string, number>;
  roomFearLevels: Record<string, number>;
} {
  const floors = state.world.floors;
  const floor0 = floors[0];
  if (!floor0) return { path: [], roomFloorMap: {}, roomFearLevels: {} };

  // Entry room on floor 0: non-transport, farthest from altar in graph
  const regularRooms = floor0.rooms.filter((r) => !r.transportType);
  if (regularRooms.length === 0) return { path: [], roomFloorMap: {}, roomFearLevels: {} };

  const roomFloorMap: Record<string, number> = {};
  const roomFearLevels: Record<string, number> = {};
  const altarFloorIndex = altarRoom?.floorIndex ?? 0;

  // Build floor 0 graph early so we can pick the entry room by graph distance
  const fearBreakdown0 = fearLevelCalculateAllForFloor(floor0);
  const fearMap0 = fearBreakdownToNumericMap(fearBreakdown0);
  const graph0 = pathfindingBuildDungeonGraph(floor0, fearMap0);

  // Pick entry room: farthest connected non-transport room from altar, by path length.
  // Fallback to top-left if altar not on floor 0 or no path found.
  const altarOnFloor0 = altarFloorIndex === 0 && altarRoom;
  let entryRoom: PlacedRoom;
  if (altarOnFloor0) {
    let bestRoom: PlacedRoom | undefined;
    let bestDist = 0;
    for (const room of regularRooms) {
      if (room.id === altarRoom.room.id) continue;
      const testPath = pathfindingFindPath(graph0, room.id, altarRoom.room.id);
      if (testPath.length > bestDist) {
        bestDist = testPath.length;
        bestRoom = room;
      }
    }
    // Fallback to altar room itself if no connected non-altar room exists
    entryRoom = bestRoom ?? altarRoom.room;
  } else {
    entryRoom = sortBy(regularRooms, [(r: PlacedRoom) => r.anchorX + r.anchorY])[0];
  }

  const goalRoomId = altarRoom?.room.id ?? entryRoom.id;

  // Build per-floor objective map for detour pathfinding
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

  // --- Altar on floor 0: single-floor or roundtrip path ---
  if (altarFloorIndex === 0) {
    const deeperObjectiveFloors = sortBy(
      [...objectivesByFloor.keys()].filter((f) => f > 0),
      [(f: number) => f],
    );

    if (deeperObjectiveFloors.length === 0) {
      // Pure single-floor path (no objectives on deeper floors)
      const floorObjectives = objectivesByFloor.get(0) ?? [];
      const path = pathfindingFindWithObjectives(graph0, entryRoom.id, goalRoomId, floorObjectives);

      for (const rid of path) {
        roomFloorMap[rid] = 0;
        roomFearLevels[rid] = fearMap0.get(rid) ?? 0;
      }

      return { path, roomFloorMap, roomFearLevels };
    }

    // Roundtrip path: visit deeper objective floors before heading to altar
    const fullPath: PlacedRoomId[] = [];
    let currentPos = entryRoom.id;

    for (const targetFloorIdx of deeperObjectiveFloors) {
      const targetFloor = floors[targetFloorIdx];
      if (!targetFloor) continue;

      // Validate: transport down exists
      const transportDown = findTransportToNextFloor(floor0, targetFloor);
      if (!transportDown) continue;

      // Validate: can path to transport on floor 0
      const pathToTransport = pathfindingFindPath(graph0, currentPos, transportDown.currentFloorRoom.id);
      if (pathToTransport.length === 0) continue;

      // Validate: transport back to floor 0 exists
      const transportUp = findTransportToNextFloor(targetFloor, floor0);
      if (!transportUp) continue;

      // Validate: can path on target floor
      const targetFearBreakdown = fearLevelCalculateAllForFloor(targetFloor);
      const targetFearMap = fearBreakdownToNumericMap(targetFearBreakdown);
      const targetGraph = pathfindingBuildDungeonGraph(targetFloor, targetFearMap);

      const floorObjectives = objectivesByFloor.get(targetFloorIdx) ?? [];
      const targetPath = pathfindingFindWithObjectives(
        targetGraph,
        transportDown.nextFloorRoom.id,
        transportUp.currentFloorRoom.id,
        floorObjectives,
      );
      if (targetPath.length === 0) continue;

      // All checks passed — commit floor-0 segment to transport
      for (const rid of pathToTransport) {
        if (fullPath.length === 0 || fullPath[fullPath.length - 1] !== rid) {
          fullPath.push(rid);
          roomFloorMap[rid] = 0;
          roomFearLevels[rid] = fearMap0.get(rid) ?? 0;
        }
      }

      // Cross to target floor
      fullPath.push(transportDown.nextFloorRoom.id);
      roomFloorMap[transportDown.nextFloorRoom.id] = targetFloorIdx;
      roomFearLevels[transportDown.nextFloorRoom.id] = targetFearMap.get(transportDown.nextFloorRoom.id) ?? 0;

      // Add target floor rooms (skip first if it duplicates transport landing)
      for (const rid of targetPath) {
        if (fullPath[fullPath.length - 1] === rid) continue;
        fullPath.push(rid);
        roomFloorMap[rid] = targetFloorIdx;
        roomFearLevels[rid] = targetFearMap.get(rid) ?? 0;
      }

      // Cross back to floor 0
      fullPath.push(transportUp.nextFloorRoom.id);
      roomFloorMap[transportUp.nextFloorRoom.id] = 0;
      roomFearLevels[transportUp.nextFloorRoom.id] = fearMap0.get(transportUp.nextFloorRoom.id) ?? 0;
      currentPos = transportUp.nextFloorRoom.id;
    }

    // Final segment: currentPos → altar on floor 0 (with floor-0 objectives)
    const floor0Objectives = objectivesByFloor.get(0) ?? [];
    const finalPath = pathfindingFindWithObjectives(graph0, currentPos, goalRoomId, floor0Objectives);

    for (const rid of finalPath) {
      if (fullPath.length > 0 && fullPath[fullPath.length - 1] === rid) continue;
      fullPath.push(rid);
      roomFloorMap[rid] = 0;
      roomFearLevels[rid] = fearMap0.get(rid) ?? 0;
    }

    if (fullPath.length === 0) {
      // Fallback: direct entry → altar
      const fallbackPath = pathfindingFindPath(graph0, entryRoom.id, goalRoomId);
      for (const rid of fallbackPath) {
        roomFloorMap[rid] = 0;
        roomFearLevels[rid] = fearMap0.get(rid) ?? 0;
      }
      return { path: fallbackPath.length > 0 ? fallbackPath : [entryRoom.id], roomFloorMap, roomFearLevels };
    }

    return { path: fullPath, roomFloorMap, roomFearLevels };
  }

  // --- Multi-floor path ---
  const fullPath: PlacedRoomId[] = [];

  for (let fi = 0; fi <= altarFloorIndex; fi++) {
    const floor = floors[fi];
    if (!floor) break;

    const fearBreakdown = fearLevelCalculateAllForFloor(floor);
    const fearMap = fearBreakdownToNumericMap(fearBreakdown);
    const graph = pathfindingBuildDungeonGraph(floor, fearMap);

    // Determine start room on this floor
    let startRoomId: PlacedRoomId;
    if (fi === 0) {
      startRoomId = entryRoom.id;
    } else {
      // Last room in fullPath is the transport-in on this floor
      startRoomId = fullPath[fullPath.length - 1];
    }

    // Determine end room on this floor
    let endRoomId: PlacedRoomId;
    let transportPair: { currentFloorRoom: PlacedRoom; nextFloorRoom: PlacedRoom } | undefined;

    if (fi === altarFloorIndex) {
      endRoomId = goalRoomId;
    } else {
      const nextFloor = floors[fi + 1];
      if (!nextFloor) break;
      transportPair = findTransportToNextFloor(floor, nextFloor);
      if (!transportPair) break;
      endRoomId = transportPair.currentFloorRoom.id;
    }

    // Pathfind within this floor
    const floorObjectives = objectivesByFloor.get(fi) ?? [];
    const subPath = pathfindingFindWithObjectives(graph, startRoomId, endRoomId, floorObjectives);
    if (subPath.length === 0) break;

    // Append sub-path (skip first if it overlaps with previous floor's last room)
    const skipFirst = fi > 0 && fullPath.length > 0 && subPath[0] === fullPath[fullPath.length - 1];
    for (let i = skipFirst ? 1 : 0; i < subPath.length; i++) {
      fullPath.push(subPath[i]);
      roomFloorMap[subPath[i]] = fi;
      roomFearLevels[subPath[i]] = fearMap.get(subPath[i]) ?? 0;
    }

    // Add transport-in room on the next floor
    if (transportPair && fi < altarFloorIndex) {
      const nextFloor = floors[fi + 1];
      const nextFearBreakdown = fearLevelCalculateAllForFloor(nextFloor);
      const nextFearMap = fearBreakdownToNumericMap(nextFearBreakdown);

      fullPath.push(transportPair.nextFloorRoom.id);
      roomFloorMap[transportPair.nextFloorRoom.id] = fi + 1;
      roomFearLevels[transportPair.nextFloorRoom.id] = nextFearMap.get(transportPair.nextFloorRoom.id) ?? 0;
    }
  }

  // Fallback: if multi-floor path failed, do single-floor on floor 0
  if (fullPath.length === 0) {
    const fearBreakdown = fearLevelCalculateAllForFloor(floor0);
    const fearMap = fearBreakdownToNumericMap(fearBreakdown);
    const graph = pathfindingBuildDungeonGraph(floor0, fearMap);
    const path = pathfindingFindPath(graph, entryRoom.id, entryRoom.id);

    if (path.length > 0) {
      for (const roomId of path) {
        roomFloorMap[roomId] = 0;
        roomFearLevels[roomId] = fearMap.get(roomId) ?? 0;
      }
      return { path, roomFloorMap, roomFearLevels };
    }

    roomFloorMap[entryRoom.id] = 0;
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
  const invaders = warning?.invaders ?? invasionCompositionGenerateParty(
    profile, seed, bonusSize,
  );

  if (invaders.length === 0) {
    state.world.activeInvasion = createEmptyCompletedInvasion(seed, invasionType, day, profile);
    return;
  }

  // 2. Assign objectives (use pre-computed from warning if available)
  const objectives = warning?.objectives ?? invasionObjectiveAssign(state, seed);

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

  const floor0 = state.world.floors[0];
  if (!floor0) {
    state.world.activeInvasion = createEmptyCompletedInvasion(seed, invasionType, day, profile);
    return;
  }

  // 4. Build multi-floor invasion path
  const { path, roomFloorMap, roomFearLevels } = buildMultiFloorPath(
    state,
    altarRoom,
    objectives,
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

  state.world.activeInvasion = {
    seed,
    invasionType,
    day,
    path,
    entryRoomId,
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
    roomFearLevels,
    unreachableObjectiveCount,
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
  const roomName = `${roomDef?.name ?? 'Unknown Room'} (${floorLabel})`;

  const tickInRoom = invasion.currentRoomTicksElapsed;
  const isFirstTick = tickInRoom === 1;
  const isLastTick = tickInRoom >= invasion.currentRoomTicksTotal;

  // --- First tick: entering room ---
  if (isFirstTick) {
    // Process hallway traps when entering (except for first room)
    if (invasion.currentRoomIndex > 0) {
      processHallwayTraps(state, invasion, rng);

      // Check end after traps
      const endAfterTraps = invasionWinLossCheckEnd(invasion.invasionState);
      if (endAfterTraps || moraleIsRetreating()) {
        if (moraleIsRetreating()) {
          invasion.battleLog.push({
            turn: invasion.currentTurn,
            type: 'retreat',
            message: 'Invaders lose their nerve and retreat!',
          });
        }
        invasionProcessComplete(state, invasion, rng);
        return;
      }
    }

    if (!invasion.isAltarLooping) {
      invasion.battleLog.push({
        turn: invasion.currentTurn,
        type: 'room_enter',
        roomId,
        message: `Invaders enter ${roomName}.`,
      });
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
        return invasionCombatCreateCombatant(
          def.instanceId as unknown as CombatantId,
          'defender',
          def.name,
          { ...stats, maxHp: stats.hp },
          { x: idx, y: 0 },
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
    processCombatRound(invasion, rng);
  }

  // --- Last tick: clearing room ---
  if (isLastTick) {
    // Run final combat if turn queue still active
    if (invasion.currentRoomTurnQueue) {
      processCombatRound(invasion, rng);
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

    // Advance to next room
    invasion.currentRoomIndex++;
    if (invasion.currentRoomIndex >= invasion.path.length) {
      // Reached end of path — stay at altar and keep attacking each tick
      invasion.currentRoomIndex = invasion.path.length - 1;
      invasion.isAltarLooping = true;
      invasion.currentRoomTicksElapsed = 0;
      invasion.currentRoomTicksTotal = INVASION_BASE_TICKS_PER_ROOM;
      invasion.currentRoomTurnQueue = undefined;
      return;
    }

    // Calculate ticks for next room
    const nextRoomId = invasion.path[invasion.currentRoomIndex];
    const nextRoomDefenders = state.world.inhabitants.filter(
      (i) => i.assignedRoomId === nextRoomId && !invasion.killedDefenderIds.includes(i.instanceId),
    );
    invasion.currentRoomTicksElapsed = 0;
    invasion.currentRoomTicksTotal = calculateRoomTicks(nextRoomDefenders.length);
    invasion.currentRoomTurnQueue = undefined;
  }
}

// --- Internal helpers ---

function calculateRoomTicks(defenderCount: number): number {
  return INVASION_BASE_TICKS_PER_ROOM + (defenderCount * INVASION_TICKS_PER_DEFENDER);
}

function processHallwayTraps(
  state: GameState,
  invasion: ActiveInvasion,
  rng: seedrandom.PRNG,
): void {
  const prevRoomId = invasion.path[invasion.currentRoomIndex - 1];
  const roomId = invasion.path[invasion.currentRoomIndex];

  // Both rooms must be on the same floor for hallway traps to apply
  const prevFloorIndex = invasion.roomFloorMap[prevRoomId] ?? 0;
  const curFloorIndex = invasion.roomFloorMap[roomId] ?? 0;
  if (prevFloorIndex !== curFloorIndex) return;

  const floorIdx = curFloorIndex;
  let currentFloor = state.world.floors[floorIdx];
  if (!currentFloor) return;

  const connection = currentFloor.connections.find(
    (c) =>
      (c.roomAId === prevRoomId && c.roomBId === roomId) ||
      (c.roomAId === roomId && c.roomBId === prevRoomId),
  );

  if (!connection) return;

  const hallway = currentFloor.hallways.find(
    (h) =>
      (h.startRoomId === prevRoomId && h.endRoomId === roomId) ||
      (h.startRoomId === roomId && h.endRoomId === prevRoomId),
  );

  if (!hallway) return;

  const traps = trapGetInHallway(currentFloor, hallway.id);
  for (const trap of traps) {
    if (!trap.isArmed || trap.remainingCharges <= 0) continue;

    const livingInvaders = invasion.invasionState.invaders.filter(
      (i) => i.currentHp > 0 && (invasion.invaderHpMap[i.id] ?? 0) > 0,
    );
    if (livingInvaders.length === 0) break;

    const targetInvader = livingInvaders[Math.floor(rng() * livingInvaders.length)];
    const targetDef = invaderGetDefinitionById(targetInvader.definitionId);
    const isRogue = targetDef?.invaderClass === 'rogue';
    const roll = rng();

    const triggerResult = trapRollTrigger(trap, isRogue, roll);
    currentFloor = trapApplyTrigger(currentFloor, trap.id, triggerResult);

    // Update floor in state
    state.world.floors[floorIdx] = currentFloor;

    if (triggerResult.disarmed) {
      invasion.battleLog.push({
        turn: invasion.currentTurn,
        type: 'trap_disarm',
        roomId,
        message: `${targetDef?.name ?? 'Invader'} disarmed ${triggerResult.trapName}!`,
      });
    } else if (triggerResult.triggered) {
      const newHp = Math.max(0, (invasion.invaderHpMap[targetInvader.id] ?? 0) - triggerResult.damage);
      invasion.invaderHpMap[targetInvader.id] = newHp;

      const isFearGlyph = triggerResult.effectType === 'fear';
      moraleApplyTrapTrigger(isFearGlyph, invasion.currentTurn);

      if (newHp <= 0) {
        invasion.invasionState = invasionWinLossMarkKilled(invasion.invasionState, targetInvader.id);
        invasion.killedInvaderClasses.push(targetDef?.invaderClass ?? 'warrior');
        invasion.battleLog.push({
          turn: invasion.currentTurn,
          type: 'combat_kill',
          roomId,
          message: `${triggerResult.trapName} killed ${targetDef?.name ?? 'Invader'}! (${triggerResult.damage} damage)`,
        });
      } else {
        invasion.battleLog.push({
          turn: invasion.currentTurn,
          type: 'trap_trigger',
          roomId,
          message: `${triggerResult.trapName} hit ${targetDef?.name ?? 'Invader'} for ${triggerResult.damage} damage.`,
        });
      }
    } else {
      invasion.battleLog.push({
        turn: invasion.currentTurn,
        type: 'trap_miss',
        roomId,
        message: `${targetDef?.name ?? 'Invader'} avoided ${triggerResult.trapName}.`,
      });
    }
  }
}

function processCombatRound(
  invasion: ActiveInvasion,
  rng: seedrandom.PRNG,
): void {
  if (!invasion.currentRoomTurnQueue) return;

  const roomId = invasion.path[invasion.currentRoomIndex];

  // Run one full round of combat
  for (let round = 0; round < MAX_ROUNDS_PER_ROOM; round++) {
    while (!invasionCombatIsRoundComplete(invasion.currentRoomTurnQueue)) {
      const actor = invasionCombatGetCurrentActor(invasion.currentRoomTurnQueue);
      if (!actor) break;

      const { queue: newQueue, result: actionResult } = invasionCombatExecuteAiTurn(
        invasion.currentRoomTurnQueue,
        rng,
      );
      invasion.currentRoomTurnQueue = newQueue;

      if (actionResult.action === 'attack' && actionResult.combatResult) {
        const target = invasion.currentRoomTurnQueue.combatants.find(
          (c) => c.id === actionResult.targetId,
        );
        if (actionResult.combatResult.hit) {
          if (actionResult.combatResult.defenderDead && target) {
            if (target.side === 'invader') {
              const invId = target.id as unknown as string;
              invasion.invasionState = invasionWinLossMarkKilled(invasion.invasionState, invId);
              invasion.invaderHpMap[invId] = 0;
              const invDef = invasion.invasionState.invaders.find((i) => i.id === invId);
              const classDef = invDef ? invaderGetDefinitionById(invDef.definitionId) : undefined;
              invasion.killedInvaderClasses.push(classDef?.invaderClass ?? 'warrior');

              moraleApplyAllyDeath(
                invDef ?? invasion.invasionState.invaders[0],
                invasion.currentTurn,
              );

              invasion.battleLog.push({
                turn: invasion.currentTurn,
                type: 'combat_kill',
                roomId,
                message: `${actor.name} killed ${target.name}!`,
                details: { damage: actionResult.combatResult.damage },
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
                details: { damage: actionResult.combatResult.damage },
              });
            }
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
          invasion.battleLog.push({
            turn: invasion.currentTurn,
            type: 'combat_miss',
            roomId,
            message: `${actor.name} missed ${target?.name ?? 'target'}.`,
          });
        }
      }

      invasion.currentRoomTurnQueue = invasionCombatAdvanceTurn(invasion.currentRoomTurnQueue);
    }

    // Check if one side is eliminated
    const alive = invasionCombatGetAliveCombatants(invasion.currentRoomTurnQueue);
    const invadersAlive = alive.filter((c) => c.side === 'invader');
    const defendersAlive = alive.filter((c) => c.side === 'defender');

    if (invadersAlive.length === 0 || defendersAlive.length === 0) {
      break;
    }

    invasion.currentRoomTurnQueue = invasionCombatStartNewRound(invasion.currentRoomTurnQueue);
    break; // Only one round per tick
  }
}

function invasionProcessComplete(
  state: GameState,
  invasion: ActiveInvasion,
  rng: seedrandom.PRNG,
): void {
  const endReason = invasionWinLossCheckEnd(invasion.invasionState) ?? 'turn_limit_reached';
  invasion.invasionState = invasionWinLossEnd(invasion.invasionState);

  const detailedResult = invasionWinLossResolveDetailedResult(
    invasion.invasionState,
    invasion.day,
    endReason,
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
    penalties = invasionRewardCalculateDefensePenalties(
      detailedResult,
      state.world.resources.gold?.current ?? 0,
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
    roomFearLevels: {},
    unreachableObjectiveCount: 0,
    profile,
    completed: true,
    result: emptyResult,
  };
}
