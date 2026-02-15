import { contentGetEntry, contentGetEntriesByType } from '@helpers/content';
import type {
  GameState,
  InhabitantContent,
  IsContentItem,
  ResourceType,
  RoomContent,
  VictoryConditionProgress,
  VictoryPathContent,
  VictoryPathProgress,
} from '@interfaces';
import { REPUTATION_THRESHOLDS } from '@interfaces/reputation';

// --- Terror Lord ---

export function victoryConditionCheckCorruption(
  state: GameState,
  target: number,
): VictoryConditionProgress {
  const current = state.world.resources.corruption.current;
  return {
    conditionId: 'terror_corruption',
    currentValue: current,
    met: current >= target,
  };
}

export function victoryConditionCheckInvasionDefenses(
  state: GameState,
  target: number,
): VictoryConditionProgress {
  const wins = state.world.victoryProgress.totalInvasionDefenseWins;
  return {
    conditionId: 'terror_defenses',
    currentValue: wins,
    met: wins >= target,
  };
}

export function victoryConditionCheckFloorDepth(
  state: GameState,
  target: number,
): VictoryConditionProgress {
  const maxDepth = state.world.floors.reduce(
    (max, floor) => Math.max(max, floor.depth),
    0,
  );
  return {
    conditionId: 'terror_depth',
    currentValue: maxDepth,
    met: maxDepth >= target,
  };
}

export function victoryConditionCheckInhabitantByName(
  state: GameState,
  inhabitantName: string,
  conditionId: string,
): VictoryConditionProgress {
  const content = contentGetEntry<InhabitantContent>(inhabitantName);
  if (!content) {
    return { conditionId, currentValue: 0, met: false };
  }
  const found = state.world.inhabitants.some(
    (i) => i.definitionId === content.id,
  );
  return { conditionId, currentValue: found ? 1 : 0, met: found };
}

// --- Dragon's Hoard ---

export function victoryConditionCheckGold(
  state: GameState,
  target: number,
): VictoryConditionProgress {
  const current = state.world.resources.gold.current;
  return {
    conditionId: 'hoard_gold',
    currentValue: current,
    met: current >= target,
  };
}

export function victoryConditionCheckRoomsBuilt(
  state: GameState,
  roomNames: string[],
  conditionId: string,
): VictoryConditionProgress {
  const builtRoomNames = new Set<string>();
  for (const floor of state.world.floors) {
    for (const room of floor.rooms) {
      const roomContent = contentGetEntry<RoomContent>(room.roomTypeId);
      if (roomContent) {
        builtRoomNames.add(roomContent.name);
      }
    }
  }
  const allBuilt = roomNames.every((name) => builtRoomNames.has(name));
  const builtCount = roomNames.filter((name) =>
    builtRoomNames.has(name),
  ).length;
  return {
    conditionId,
    currentValue: builtCount,
    met: allBuilt,
  };
}

export function victoryConditionCheckConsecutivePeacefulDays(
  state: GameState,
  target: number,
): VictoryConditionProgress {
  const days = state.world.victoryProgress.consecutivePeacefulDays;
  return {
    conditionId: 'hoard_peace',
    currentValue: days,
    met: days >= target,
  };
}

// --- Mad Scientist ---

export function victoryConditionCheckAllResearchComplete(
  state: GameState,
): VictoryConditionProgress {
  const allResearch = contentGetEntriesByType<IsContentItem>('research');
  const completedSet = new Set<string>(state.world.research.completedNodes);
  const allDone =
    allResearch.length > 0 &&
    allResearch.every((r) => completedSet.has(r.id));
  return {
    conditionId: 'scientist_research',
    currentValue: allDone ? 1 : 0,
    met: allDone,
  };
}

export function victoryConditionCheckHybridCount(
  state: GameState,
  target: number,
): VictoryConditionProgress {
  const hybrids = state.world.inhabitants.filter((i) => i.isHybrid);
  const uniqueDefinitions = new Set(hybrids.map((i) => i.definitionId));
  return {
    conditionId: 'scientist_hybrids',
    currentValue: uniqueDefinitions.size,
    met: uniqueDefinitions.size >= target,
  };
}

export function victoryConditionCheckRoomCountByName(
  state: GameState,
  roomName: string,
  target: number,
  conditionId: string,
): VictoryConditionProgress {
  let count = 0;
  for (const floor of state.world.floors) {
    for (const room of floor.rooms) {
      const roomContent = contentGetEntry<RoomContent>(room.roomTypeId);
      if (roomContent?.name === roomName) {
        count++;
      }
    }
  }
  return { conditionId, currentValue: count, met: count >= target };
}

export function victoryConditionCheckPerfectCreature(
  state: GameState,
): VictoryConditionProgress {
  const content = contentGetEntry<InhabitantContent>('Perfect Creature');
  if (!content) {
    return { conditionId: 'scientist_perfect', currentValue: 0, met: false };
  }
  const found = state.world.inhabitants.some(
    (i) => i.definitionId === content.id,
  );
  return {
    conditionId: 'scientist_perfect',
    currentValue: found ? 1 : 0,
    met: found,
  };
}

// --- Harmonious Kingdom ---

export function victoryConditionCheckConsecutiveZeroCorruptionDays(
  state: GameState,
  target: number,
): VictoryConditionProgress {
  const days = state.world.victoryProgress.consecutiveZeroCorruptionDays;
  return {
    conditionId: 'harmony_corruption',
    currentValue: days,
    met: days >= target,
  };
}

export function victoryConditionCheckInhabitantCount(
  state: GameState,
  target: number,
  conditionId: string,
): VictoryConditionProgress {
  const count = state.world.inhabitants.length;
  return { conditionId, currentValue: count, met: count >= target };
}

export function victoryConditionCheckFloorCount(
  state: GameState,
  target: number,
): VictoryConditionProgress {
  const count = state.world.floors.length;
  return {
    conditionId: 'harmony_floors',
    currentValue: count,
    met: count >= target,
  };
}

export function victoryConditionCheckLegendaryHarmony(
  state: GameState,
): VictoryConditionProgress {
  const harmonyPoints = state.world.reputation.harmony;
  const isLegendary = harmonyPoints >= REPUTATION_THRESHOLDS.legendary;
  return {
    conditionId: 'harmony_reputation',
    currentValue: harmonyPoints,
    met: isLegendary,
  };
}

// --- Eternal Empire ---

export function victoryConditionCheckDayReached(
  state: GameState,
  target: number,
): VictoryConditionProgress {
  const day = state.clock.day;
  return {
    conditionId: 'empire_time',
    currentValue: day,
    met: day >= target,
  };
}

export function victoryConditionCheckAllResourcesPositive(
  state: GameState,
): VictoryConditionProgress {
  const resources = state.world.resources;
  const resourceTypes: ResourceType[] = [
    'gold',
    'crystals',
    'food',
    'flux',
    'research',
    'essence',
  ];
  const allPositive = resourceTypes.every((t) => resources[t].current > 0);
  return {
    conditionId: 'empire_resources',
    currentValue: allPositive ? 1 : 0,
    met: allPositive,
  };
}

export function victoryConditionCheckUniqueInhabitants(
  state: GameState,
  target: number,
): VictoryConditionProgress {
  const uniqueCount = state.world.inhabitants.filter(
    (i) => {
      const content = contentGetEntry<InhabitantContent>(i.definitionId);
      return content?.restrictionTags?.includes('unique');
    },
  ).length;
  return {
    conditionId: 'empire_unique',
    currentValue: uniqueCount,
    met: uniqueCount >= target,
  };
}

export function victoryConditionCheckTotalRoomCount(
  state: GameState,
  target: number,
): VictoryConditionProgress {
  let count = 0;
  for (const floor of state.world.floors) {
    count += floor.rooms.length;
  }
  return {
    conditionId: 'empire_rooms',
    currentValue: count,
    met: count >= target,
  };
}

// --- Day tracking processes ---

export function victoryConditionProcessDayTracking(state: GameState): void {
  const progress = state.world.victoryProgress;
  const currentDay = state.clock.day;

  // Peaceful day tracking
  if (currentDay > progress.lastPeacefulCheckDay) {
    const hadInvasionToday = state.world.invasionSchedule.invasionHistory.some(
      (h) => h.day === currentDay,
    );
    if (hadInvasionToday) {
      progress.consecutivePeacefulDays = 0;
    } else {
      progress.consecutivePeacefulDays++;
    }
    progress.lastPeacefulCheckDay = currentDay;
  }

  // Zero corruption tracking
  if (currentDay > progress.lastZeroCorruptionCheckDay) {
    if (state.world.resources.corruption.current === 0) {
      progress.consecutiveZeroCorruptionDays++;
    } else {
      progress.consecutiveZeroCorruptionDays = 0;
    }
    progress.lastZeroCorruptionCheckDay = currentDay;
  }
}

// --- Evaluate all paths ---

export function victoryConditionEvaluatePath(
  pathContent: VictoryPathContent,
  state: GameState,
): VictoryPathProgress {
  const conditions: VictoryConditionProgress[] = pathContent.conditions.map(
    (condition) => victoryConditionEvaluateSingle(condition.id, condition.target, state),
  );
  return {
    pathId: pathContent.id,
    conditions,
    complete: conditions.every((c) => c.met),
  };
}

function victoryConditionEvaluateSingle(
  conditionId: string,
  target: number,
  state: GameState,
): VictoryConditionProgress {
  switch (conditionId) {
    // Terror Lord
    case 'terror_corruption':
      return victoryConditionCheckCorruption(state, target);
    case 'terror_defenses':
      return victoryConditionCheckInvasionDefenses(state, target);
    case 'terror_depth':
      return victoryConditionCheckFloorDepth(state, target);
    case 'terror_demon_lord':
      return victoryConditionCheckInhabitantByName(
        state,
        'Demon Lord',
        conditionId,
      );

    // Dragon's Hoard
    case 'hoard_gold':
      return victoryConditionCheckGold(state, target);
    case 'hoard_rooms':
      return victoryConditionCheckRoomsBuilt(
        state,
        ['Throne Room', 'Dragon Lair'],
        conditionId,
      );
    case 'hoard_dragon':
      return victoryConditionCheckInhabitantByName(
        state,
        'Dragon',
        conditionId,
      );
    case 'hoard_peace':
      return victoryConditionCheckConsecutivePeacefulDays(state, target);

    // Mad Scientist
    case 'scientist_research':
      return victoryConditionCheckAllResearchComplete(state);
    case 'scientist_hybrids':
      return victoryConditionCheckHybridCount(state, target);
    case 'scientist_pits':
      return victoryConditionCheckRoomCountByName(
        state,
        'Breeding Pits',
        target,
        conditionId,
      );
    case 'scientist_perfect':
      return victoryConditionCheckPerfectCreature(state);

    // Harmonious Kingdom
    case 'harmony_corruption':
      return victoryConditionCheckConsecutiveZeroCorruptionDays(state, target);
    case 'harmony_population':
      return victoryConditionCheckInhabitantCount(state, target, conditionId);
    case 'harmony_floors':
      return victoryConditionCheckFloorCount(state, target);
    case 'harmony_reputation':
      return victoryConditionCheckLegendaryHarmony(state);

    // Eternal Empire
    case 'empire_time':
      return victoryConditionCheckDayReached(state, target);
    case 'empire_resources':
      return victoryConditionCheckAllResourcesPositive(state);
    case 'empire_unique':
      return victoryConditionCheckUniqueInhabitants(state, target);
    case 'empire_rooms':
      return victoryConditionCheckTotalRoomCount(state, target);

    default:
      return { conditionId, currentValue: 0, met: false };
  }
}
