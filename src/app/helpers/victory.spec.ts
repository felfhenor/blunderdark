import { describe, expect, it, vi, beforeEach } from 'vitest';
import type {
  GameState,
  VictoryConditionProgress,
  VictoryPathContent,
  VictoryPathId,
  VictoryPathProgress,
} from '@interfaces';

const TEST_PATH_A_ID = 'path-a-id' as VictoryPathId;
const TEST_PATH_B_ID = 'path-b-id' as VictoryPathId;

const mockProcessDayTracking = vi.fn();
const mockEvaluatePath = vi.fn();

vi.mock('@helpers/content', () => ({
  contentGetEntriesByType: vi.fn(() => []),
}));

vi.mock('@helpers/state-game', () => ({
  gamestate: vi.fn(() => ({})),
  updateGamestate: vi.fn(),
}));

vi.mock('@helpers/victory-conditions', () => ({
  victoryConditionProcessDayTracking: (...args: unknown[]) =>
    mockProcessDayTracking(...args),
  victoryConditionEvaluatePath: (...args: unknown[]) =>
    mockEvaluatePath(...args),
}));

const { contentGetEntriesByType } = await import('@helpers/content');

const {
  victoryProcess,
  victoryIsPathComplete,
  victoryGetProgress,
  victoryRecordDefenseWin,
  victoryReset,
  victoryAchievedPathId,
  victoryProgressMap,
  victoryIsAchieved,
  victoryCalculatePathCompletionPercent,
} = await import('@helpers/victory');

function makePathContent(
  id: VictoryPathId,
  name: string,
): VictoryPathContent {
  return {
    id,
    name,
    description: `${name} description`,
    __type: 'victorypath',
    conditions: [
      {
        id: `${name.toLowerCase()}_cond_1`,
        description: 'Condition 1',
        checkType: 'count',
        target: 10,
      },
    ],
  };
}

function makeProgress(
  pathId: VictoryPathId,
  complete: boolean,
  conditions?: VictoryConditionProgress[],
): VictoryPathProgress {
  return {
    pathId,
    conditions: conditions ?? [
      { conditionId: 'cond_1', currentValue: complete ? 10 : 5, met: complete },
    ],
    complete,
  };
}

function makeState(overrides: {
  numTicks?: number;
  achievedPathId?: VictoryPathId;
  achievedDay?: number;
  defenseWins?: number;
}): GameState {
  return {
    meta: { version: 1, isSetup: true, isPaused: false, createdAt: 0 },
    gameId: 'test' as GameState['gameId'],
    clock: {
      numTicks: overrides.numTicks ?? 0,
      lastSaveTick: 0,
      day: 1,
      hour: 12,
      minute: 0,
    },
    world: {
      resources: {
        gold: { current: 0, max: 1000 },
        crystals: { current: 0, max: 500 },
        food: { current: 50, max: 500 },
        flux: { current: 0, max: 200 },
        research: { current: 0, max: 300 },
        essence: { current: 0, max: 200 },
        corruption: { current: 0, max: Number.MAX_SAFE_INTEGER },
      },
      inhabitants: [],
      floors: [],
      reputation: { terror: 0, wealth: 0, knowledge: 0, harmony: 0, chaos: 0 },
      research: {
        completedNodes: [],
        activeResearch: undefined,
        activeResearchProgress: 0,
        activeResearchStartTick: 0,
        unlockedContent: {
          rooms: [],
          inhabitants: [],
          abilities: [],
          upgrades: [],
          passiveBonuses: [],
        },
      },
      invasionSchedule: {
        nextInvasionDay: undefined,
        nextInvasionVariance: 0,
        gracePeriodEnd: 30,
        invasionHistory: [],
        pendingSpecialInvasions: [],
        warningActive: false,
        warningDismissed: false,
      },
      victoryProgress: {
        consecutivePeacefulDays: 0,
        lastPeacefulCheckDay: 0,
        consecutiveZeroCorruptionDays: 0,
        lastZeroCorruptionCheckDay: 0,
        totalInvasionDefenseWins: overrides.defenseWins ?? 0,
        achievedVictoryPathId: overrides.achievedPathId,
        achievedVictoryDay: overrides.achievedDay,
      },
    },
  } as unknown as GameState;
}

beforeEach(() => {
  vi.clearAllMocks();
  victoryReset();
});

describe('victoryProcess', () => {
  it('calls day tracking every tick', () => {
    const state = makeState({ numTicks: 1 });
    victoryProcess(state);
    expect(mockProcessDayTracking).toHaveBeenCalledWith(state);
  });

  it('skips full evaluation when not on interval tick', () => {
    const state = makeState({ numTicks: 30 });
    victoryProcess(state);
    expect(mockProcessDayTracking).toHaveBeenCalledWith(state);
    expect(mockEvaluatePath).not.toHaveBeenCalled();
  });

  it('evaluates all paths on interval tick (every 60)', () => {
    const pathA = makePathContent(TEST_PATH_A_ID, 'PathA');
    const pathB = makePathContent(TEST_PATH_B_ID, 'PathB');
    vi.mocked(contentGetEntriesByType).mockReturnValue([pathA, pathB]);
    mockEvaluatePath.mockImplementation((path: VictoryPathContent) =>
      makeProgress(path.id, false),
    );

    const state = makeState({ numTicks: 60 });
    victoryProcess(state);

    expect(mockEvaluatePath).toHaveBeenCalledTimes(2);
    expect(mockEvaluatePath).toHaveBeenCalledWith(pathA, state);
    expect(mockEvaluatePath).toHaveBeenCalledWith(pathB, state);
  });

  it('evaluates on tick 0', () => {
    const pathA = makePathContent(TEST_PATH_A_ID, 'PathA');
    vi.mocked(contentGetEntriesByType).mockReturnValue([pathA]);
    mockEvaluatePath.mockReturnValue(makeProgress(TEST_PATH_A_ID, false));

    const state = makeState({ numTicks: 0 });
    victoryProcess(state);

    expect(mockEvaluatePath).toHaveBeenCalledTimes(1);
  });

  it('sets victoryAchievedPathId when a path is complete', () => {
    const pathA = makePathContent(TEST_PATH_A_ID, 'PathA');
    vi.mocked(contentGetEntriesByType).mockReturnValue([pathA]);
    mockEvaluatePath.mockReturnValue(makeProgress(TEST_PATH_A_ID, true));

    const state = makeState({ numTicks: 60 });
    victoryProcess(state);

    expect(victoryAchievedPathId()).toBe(TEST_PATH_A_ID);
    expect(victoryIsAchieved()).toBe(true);
    expect(state.world.victoryProgress.achievedVictoryPathId).toBe(
      TEST_PATH_A_ID,
    );
    expect(state.world.victoryProgress.achievedVictoryDay).toBe(1);
  });

  it('updates progress map for all paths', () => {
    const pathA = makePathContent(TEST_PATH_A_ID, 'PathA');
    const pathB = makePathContent(TEST_PATH_B_ID, 'PathB');
    vi.mocked(contentGetEntriesByType).mockReturnValue([pathA, pathB]);

    const progressA = makeProgress(TEST_PATH_A_ID, false);
    const progressB = makeProgress(TEST_PATH_B_ID, true);
    mockEvaluatePath.mockImplementation((path: VictoryPathContent) =>
      path.id === TEST_PATH_A_ID ? progressA : progressB,
    );

    const state = makeState({ numTicks: 120 });
    victoryProcess(state);

    const map = victoryProgressMap();
    expect(map.get(TEST_PATH_A_ID)).toEqual(progressA);
    expect(map.get(TEST_PATH_B_ID)).toEqual(progressB);
  });

  it('skips evaluation when already won', () => {
    const pathA = makePathContent(TEST_PATH_A_ID, 'PathA');
    vi.mocked(contentGetEntriesByType).mockReturnValue([pathA]);

    const state = makeState({
      numTicks: 60,
      achievedPathId: TEST_PATH_A_ID,
    });
    victoryProcess(state);

    expect(mockEvaluatePath).not.toHaveBeenCalled();
  });

  it('does not overwrite first victory if multiple paths complete', () => {
    const pathA = makePathContent(TEST_PATH_A_ID, 'PathA');
    const pathB = makePathContent(TEST_PATH_B_ID, 'PathB');
    vi.mocked(contentGetEntriesByType).mockReturnValue([pathA, pathB]);
    mockEvaluatePath.mockImplementation((path: VictoryPathContent) =>
      makeProgress(path.id, true),
    );

    const state = makeState({ numTicks: 60 });
    victoryProcess(state);

    expect(victoryAchievedPathId()).toBe(TEST_PATH_A_ID);
    expect(state.world.victoryProgress.achievedVictoryPathId).toBe(
      TEST_PATH_A_ID,
    );
  });

  it('handles empty victory path list gracefully', () => {
    vi.mocked(contentGetEntriesByType).mockReturnValue([]);

    const state = makeState({ numTicks: 60 });
    victoryProcess(state);

    expect(mockEvaluatePath).not.toHaveBeenCalled();
    expect(victoryAchievedPathId()).toBeUndefined();
  });
});

describe('victoryIsPathComplete', () => {
  it('returns false when path has no progress', () => {
    expect(victoryIsPathComplete(TEST_PATH_A_ID)).toBe(false);
  });

  it('returns true after path is evaluated as complete', () => {
    const pathA = makePathContent(TEST_PATH_A_ID, 'PathA');
    vi.mocked(contentGetEntriesByType).mockReturnValue([pathA]);
    mockEvaluatePath.mockReturnValue(makeProgress(TEST_PATH_A_ID, true));

    const state = makeState({ numTicks: 60 });
    victoryProcess(state);

    expect(victoryIsPathComplete(TEST_PATH_A_ID)).toBe(true);
  });

  it('returns false when path is evaluated as incomplete', () => {
    const pathA = makePathContent(TEST_PATH_A_ID, 'PathA');
    vi.mocked(contentGetEntriesByType).mockReturnValue([pathA]);
    mockEvaluatePath.mockReturnValue(makeProgress(TEST_PATH_A_ID, false));

    const state = makeState({ numTicks: 60 });
    victoryProcess(state);

    expect(victoryIsPathComplete(TEST_PATH_A_ID)).toBe(false);
  });
});

describe('victoryGetProgress', () => {
  it('returns undefined when path has no progress', () => {
    expect(victoryGetProgress(TEST_PATH_A_ID)).toBeUndefined();
  });

  it('returns progress after evaluation', () => {
    const pathA = makePathContent(TEST_PATH_A_ID, 'PathA');
    vi.mocked(contentGetEntriesByType).mockReturnValue([pathA]);
    const expected = makeProgress(TEST_PATH_A_ID, false);
    mockEvaluatePath.mockReturnValue(expected);

    const state = makeState({ numTicks: 0 });
    victoryProcess(state);

    expect(victoryGetProgress(TEST_PATH_A_ID)).toEqual(expected);
  });
});

describe('victoryRecordDefenseWin', () => {
  it('increments totalInvasionDefenseWins', () => {
    const state = makeState({ defenseWins: 5 });
    victoryRecordDefenseWin(state);
    expect(state.world.victoryProgress.totalInvasionDefenseWins).toBe(6);
  });

  it('increments from 0', () => {
    const state = makeState({});
    victoryRecordDefenseWin(state);
    expect(state.world.victoryProgress.totalInvasionDefenseWins).toBe(1);
  });
});

describe('victoryReset', () => {
  it('clears achieved path and progress map', () => {
    const pathA = makePathContent(TEST_PATH_A_ID, 'PathA');
    vi.mocked(contentGetEntriesByType).mockReturnValue([pathA]);
    mockEvaluatePath.mockReturnValue(makeProgress(TEST_PATH_A_ID, true));

    const state = makeState({ numTicks: 0 });
    victoryProcess(state);

    expect(victoryIsAchieved()).toBe(true);
    expect(victoryProgressMap().size).toBe(1);

    victoryReset();

    expect(victoryAchievedPathId()).toBeUndefined();
    expect(victoryIsAchieved()).toBe(false);
    expect(victoryProgressMap().size).toBe(0);
  });
});

describe('victoryCalculatePathCompletionPercent', () => {
  function makeMultiConditionPath(
    condCount: number,
  ): VictoryPathContent {
    return {
      id: TEST_PATH_A_ID,
      name: 'TestPath',
      description: 'desc',
      __type: 'victorypath',
      conditions: Array.from({ length: condCount }, (_, i) => ({
        id: `cond_${i}`,
        description: `Condition ${i}`,
        checkType: 'count' as const,
        target: 100,
      })),
    };
  }

  it('returns 0 when progress is undefined', () => {
    const path = makeMultiConditionPath(3);
    expect(victoryCalculatePathCompletionPercent(path, undefined)).toBe(0);
  });

  it('returns 0 when path has no conditions', () => {
    const path: VictoryPathContent = {
      id: TEST_PATH_A_ID,
      name: 'Empty',
      description: 'desc',
      __type: 'victorypath',
      conditions: [],
    };
    const progress: VictoryPathProgress = {
      pathId: TEST_PATH_A_ID,
      conditions: [],
      complete: false,
    };
    expect(victoryCalculatePathCompletionPercent(path, progress)).toBe(0);
  });

  it('returns 100 when all conditions are fully met', () => {
    const path = makeMultiConditionPath(3);
    const progress: VictoryPathProgress = {
      pathId: TEST_PATH_A_ID,
      conditions: [
        { conditionId: 'cond_0', currentValue: 100, met: true },
        { conditionId: 'cond_1', currentValue: 100, met: true },
        { conditionId: 'cond_2', currentValue: 100, met: true },
      ],
      complete: true,
    };
    expect(victoryCalculatePathCompletionPercent(path, progress)).toBe(100);
  });

  it('returns weighted average for partial progress', () => {
    const path = makeMultiConditionPath(2);
    const progress: VictoryPathProgress = {
      pathId: TEST_PATH_A_ID,
      conditions: [
        { conditionId: 'cond_0', currentValue: 50, met: false },
        { conditionId: 'cond_1', currentValue: 100, met: true },
      ],
      complete: false,
    };
    // (0.5 + 1.0) / 2 * 100 = 75
    expect(victoryCalculatePathCompletionPercent(path, progress)).toBe(75);
  });

  it('clamps individual condition progress to 100%', () => {
    const path = makeMultiConditionPath(1);
    const progress: VictoryPathProgress = {
      pathId: TEST_PATH_A_ID,
      conditions: [
        { conditionId: 'cond_0', currentValue: 200, met: true },
      ],
      complete: true,
    };
    expect(victoryCalculatePathCompletionPercent(path, progress)).toBe(100);
  });

  it('handles flag conditions (target=1) correctly', () => {
    const path: VictoryPathContent = {
      id: TEST_PATH_A_ID,
      name: 'FlagPath',
      description: 'desc',
      __type: 'victorypath',
      conditions: [
        { id: 'flag_cond', description: 'Flag', checkType: 'flag', target: 1 },
        { id: 'count_cond', description: 'Count', checkType: 'count', target: 10 },
      ],
    };
    const progress: VictoryPathProgress = {
      pathId: TEST_PATH_A_ID,
      conditions: [
        { conditionId: 'flag_cond', currentValue: 1, met: true },
        { conditionId: 'count_cond', currentValue: 5, met: false },
      ],
      complete: false,
    };
    // (1.0 + 0.5) / 2 * 100 = 75
    expect(victoryCalculatePathCompletionPercent(path, progress)).toBe(75);
  });

  it('returns 0 when no conditions have progress entries', () => {
    const path = makeMultiConditionPath(2);
    const progress: VictoryPathProgress = {
      pathId: TEST_PATH_A_ID,
      conditions: [],
      complete: false,
    };
    expect(victoryCalculatePathCompletionPercent(path, progress)).toBe(0);
  });

  it('handles tied paths (both return same percent)', () => {
    const pathA = makeMultiConditionPath(2);
    const pathB: VictoryPathContent = {
      ...makeMultiConditionPath(2),
      id: TEST_PATH_B_ID,
    };

    const progressA: VictoryPathProgress = {
      pathId: TEST_PATH_A_ID,
      conditions: [
        { conditionId: 'cond_0', currentValue: 50, met: false },
        { conditionId: 'cond_1', currentValue: 50, met: false },
      ],
      complete: false,
    };
    const progressB: VictoryPathProgress = {
      pathId: TEST_PATH_B_ID,
      conditions: [
        { conditionId: 'cond_0', currentValue: 50, met: false },
        { conditionId: 'cond_1', currentValue: 50, met: false },
      ],
      complete: false,
    };

    const percentA = victoryCalculatePathCompletionPercent(pathA, progressA);
    const percentB = victoryCalculatePathCompletionPercent(pathB, progressB);
    expect(percentA).toBe(percentB);
    expect(percentA).toBe(50);
  });
});
