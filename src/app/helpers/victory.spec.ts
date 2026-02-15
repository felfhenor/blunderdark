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
