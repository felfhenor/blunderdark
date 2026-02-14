import { defaultCorruptionEffectState, defaultInvasionSchedule, defaultResources } from '@helpers/defaults';
import type {
  CorruptionEffectState,
  GameState,
} from '@interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@helpers/state-game', () => ({
  gamestate: vi.fn(() => ({})),
  updateGamestate: vi.fn(),
}));

vi.mock('@helpers/corruption', () => ({
  CORRUPTION_THRESHOLD_LOW: 0,
  CORRUPTION_THRESHOLD_MEDIUM: 50,
  CORRUPTION_THRESHOLD_HIGH: 100,
  CORRUPTION_THRESHOLD_CRITICAL: 200,
  corruptionCurrent: vi.fn(() => 0),
}));

const {
  CORRUPTION_THRESHOLD_ALL,
  CORRUPTION_THRESHOLD_WARNING_FACTOR,
  corruptionThresholdGetNext,
  corruptionThresholdGetEffectDescription,
  corruptionThresholdCheckWarnings,
  corruptionThresholdProcess,
  corruptionThresholdWarning$,
} = await import('@helpers/corruption-thresholds');

function makeGameState(overrides: {
  corruption?: number;
  corruptionEffects?: Partial<CorruptionEffectState>;
}): GameState {
  return {
    meta: { version: 1, isSetup: true, isPaused: false, createdAt: 0 },
    gameId: 'test-game' as GameState['gameId'],
    clock: {
      numTicks: 0,
      lastSaveTick: 0,
      day: 1,
      hour: 0,
      minute: 0,
    },
    world: {
      grid: { tiles: [], width: 0, height: 0 },
      resources: {
        ...defaultResources(),
        corruption: {
          current: overrides.corruption ?? 0,
          max: Number.MAX_SAFE_INTEGER,
        },
      },
      inhabitants: [],
      hallways: [],
      season: {
        currentSeason: 'growth',
        dayInSeason: 1,
        totalSeasonCycles: 0,
      },
      research: {
        completedNodes: [],
        activeResearch: undefined,
        activeResearchProgress: 0,
        activeResearchStartTick: 0,
        unlockedContent: { rooms: [], inhabitants: [], abilities: [], upgrades: [], passiveBonuses: [] },
      },
      reputation: { terror: 0, wealth: 0, knowledge: 0, harmony: 0, chaos: 0 },
      floors: [],
      currentFloorIndex: 0,
      trapInventory: [],
      trapCraftingQueues: [],
      forgeInventory: [],
      forgeCraftingQueues: [],
      alchemyConversions: [],
      prisoners: [],
      invasionSchedule: defaultInvasionSchedule(),
      corruptionEffects: {
        ...defaultCorruptionEffectState(),
        ...overrides.corruptionEffects,
      },
    },
  } as unknown as GameState;
}

describe('constants', () => {
  it('should have all three thresholds', () => {
    expect(CORRUPTION_THRESHOLD_ALL).toEqual([50, 100, 200]);
  });

  it('should use 80% warning factor', () => {
    expect(CORRUPTION_THRESHOLD_WARNING_FACTOR).toBe(0.8);
  });
});

describe('corruptionThresholdGetNext', () => {
  it('should return 50 when corruption is 0', () => {
    expect(corruptionThresholdGetNext(0)).toBe(50);
  });

  it('should return 50 when corruption is 49', () => {
    expect(corruptionThresholdGetNext(49)).toBe(50);
  });

  it('should return 100 when corruption is 50', () => {
    expect(corruptionThresholdGetNext(50)).toBe(100);
  });

  it('should return 100 when corruption is 99', () => {
    expect(corruptionThresholdGetNext(99)).toBe(100);
  });

  it('should return 200 when corruption is 100', () => {
    expect(corruptionThresholdGetNext(100)).toBe(200);
  });

  it('should return 200 when corruption is 199', () => {
    expect(corruptionThresholdGetNext(199)).toBe(200);
  });

  it('should return undefined when corruption is 200 or above', () => {
    expect(corruptionThresholdGetNext(200)).toBeUndefined();
    expect(corruptionThresholdGetNext(500)).toBeUndefined();
  });
});

describe('corruptionThresholdGetEffectDescription', () => {
  it('should return dark upgrade description for 50', () => {
    expect(corruptionThresholdGetEffectDescription(50)).toBe(
      'Dark upgrades will be unlocked',
    );
  });

  it('should return mutation description for 100', () => {
    expect(corruptionThresholdGetEffectDescription(100)).toBe(
      'Inhabitants may be mutated',
    );
  });

  it('should return crusade description for 200', () => {
    expect(corruptionThresholdGetEffectDescription(200)).toBe(
      'A holy crusade will be triggered',
    );
  });

  it('should return unknown for unrecognized threshold', () => {
    expect(corruptionThresholdGetEffectDescription(999)).toBe(
      'Unknown corruption effect',
    );
  });
});

describe('corruptionThresholdCheckWarnings', () => {
  let effects: CorruptionEffectState;

  beforeEach(() => {
    effects = defaultCorruptionEffectState();
  });

  it('should not warn when corruption is below all warning levels', () => {
    const { newWarnings, updatedWarnedThresholds } =
      corruptionThresholdCheckWarnings(30, [], effects);
    expect(newWarnings).toHaveLength(0);
    expect(updatedWarnedThresholds).toHaveLength(0);
  });

  it('should warn at 80% of threshold 50 (corruption = 40)', () => {
    const { newWarnings, updatedWarnedThresholds } =
      corruptionThresholdCheckWarnings(40, [], effects);
    expect(newWarnings).toHaveLength(1);
    expect(newWarnings[0].threshold).toBe(50);
    expect(newWarnings[0].warningLevel).toBe(40);
    expect(newWarnings[0].currentCorruption).toBe(40);
    expect(updatedWarnedThresholds).toContain(50);
  });

  it('should warn at 80% of threshold 100 (corruption = 80)', () => {
    const effects100: CorruptionEffectState = {
      ...defaultCorruptionEffectState(),
      darkUpgradeUnlocked: true,
    };
    const { newWarnings } = corruptionThresholdCheckWarnings(
      80,
      [],
      effects100,
    );
    expect(newWarnings).toHaveLength(1);
    expect(newWarnings[0].threshold).toBe(100);
  });

  it('should warn at 80% of threshold 200 (corruption = 160)', () => {
    const effects200: CorruptionEffectState = {
      ...defaultCorruptionEffectState(),
      darkUpgradeUnlocked: true,
      lastMutationCorruption: 110,
    };
    const { newWarnings } = corruptionThresholdCheckWarnings(
      160,
      [],
      effects200,
    );
    expect(newWarnings).toHaveLength(1);
    expect(newWarnings[0].threshold).toBe(200);
  });

  it('should not warn again if already warned', () => {
    const { newWarnings } = corruptionThresholdCheckWarnings(
      45,
      [50],
      effects,
    );
    expect(newWarnings).toHaveLength(0);
  });

  it('should clear warning when corruption drops below warning level', () => {
    const { updatedWarnedThresholds } = corruptionThresholdCheckWarnings(
      30,
      [50],
      effects,
    );
    expect(updatedWarnedThresholds).not.toContain(50);
  });

  it('should clear warning when threshold is crossed', () => {
    const { updatedWarnedThresholds } = corruptionThresholdCheckWarnings(
      55,
      [50],
      effects,
    );
    expect(updatedWarnedThresholds).not.toContain(50);
  });

  it('should re-warn after corruption drops below warning and rises again', () => {
    const result1 = corruptionThresholdCheckWarnings(42, [], effects);
    expect(result1.newWarnings).toHaveLength(1);
    expect(result1.updatedWarnedThresholds).toContain(50);

    const result2 = corruptionThresholdCheckWarnings(
      30,
      result1.updatedWarnedThresholds,
      effects,
    );
    expect(result2.updatedWarnedThresholds).not.toContain(50);

    const result3 = corruptionThresholdCheckWarnings(
      44,
      result2.updatedWarnedThresholds,
      effects,
    );
    expect(result3.newWarnings).toHaveLength(1);
    expect(result3.newWarnings[0].threshold).toBe(50);
  });

  it('should not warn if threshold effect already triggered (dark upgrade)', () => {
    const triggeredEffects: CorruptionEffectState = {
      ...defaultCorruptionEffectState(),
      darkUpgradeUnlocked: true,
    };
    const { newWarnings } = corruptionThresholdCheckWarnings(
      45,
      [],
      triggeredEffects,
    );
    expect(newWarnings).toHaveLength(0);
  });

  it('should not warn if threshold effect already triggered (mutation)', () => {
    const triggeredEffects: CorruptionEffectState = {
      ...defaultCorruptionEffectState(),
      darkUpgradeUnlocked: true,
      lastMutationCorruption: 105,
    };
    const { newWarnings } = corruptionThresholdCheckWarnings(
      85,
      [],
      triggeredEffects,
    );
    expect(newWarnings).toHaveLength(0);
  });

  it('should not warn if threshold effect already triggered (crusade)', () => {
    const triggeredEffects: CorruptionEffectState = {
      ...defaultCorruptionEffectState(),
      darkUpgradeUnlocked: true,
      lastMutationCorruption: 110,
      lastCrusadeCorruption: 210,
    };
    const { newWarnings } = corruptionThresholdCheckWarnings(
      170,
      [],
      triggeredEffects,
    );
    expect(newWarnings).toHaveLength(0);
  });
});

describe('corruptionThresholdProcess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should emit warning when corruption enters warning zone', () => {
    const nextSpy = vi.spyOn(corruptionThresholdWarning$, 'next');

    const state = makeGameState({ corruption: 42 });
    corruptionThresholdProcess(state);

    expect(nextSpy).toHaveBeenCalledTimes(1);
    expect(nextSpy).toHaveBeenCalledWith(
      expect.objectContaining({ threshold: 50, currentCorruption: 42 }),
    );

    nextSpy.mockRestore();
  });

  it('should not emit duplicate warnings on consecutive calls', () => {
    const nextSpy = vi.spyOn(corruptionThresholdWarning$, 'next');

    const state = makeGameState({ corruption: 42 });
    corruptionThresholdProcess(state);
    corruptionThresholdProcess(state);
    corruptionThresholdProcess(state);

    expect(nextSpy).toHaveBeenCalledTimes(1);

    nextSpy.mockRestore();
  });

  it('should update warnedThresholds in state', () => {
    const state = makeGameState({ corruption: 42 });
    corruptionThresholdProcess(state);
    expect(state.world.corruptionEffects.warnedThresholds).toContain(50);
  });

  it('should clear warnedThresholds when corruption drops', () => {
    const state = makeGameState({
      corruption: 30,
      corruptionEffects: { warnedThresholds: [50] },
    });
    corruptionThresholdProcess(state);
    expect(state.world.corruptionEffects.warnedThresholds).not.toContain(50);
  });

  it('should not emit when corruption is below all warning levels', () => {
    const nextSpy = vi.spyOn(corruptionThresholdWarning$, 'next');

    const state = makeGameState({ corruption: 10 });
    corruptionThresholdProcess(state);

    expect(nextSpy).not.toHaveBeenCalled();

    nextSpy.mockRestore();
  });

  it('should emit warning for 100 threshold at corruption 85', () => {
    const nextSpy = vi.spyOn(corruptionThresholdWarning$, 'next');

    const state = makeGameState({
      corruption: 85,
      corruptionEffects: { darkUpgradeUnlocked: true },
    });
    corruptionThresholdProcess(state);

    expect(nextSpy).toHaveBeenCalledTimes(1);
    expect(nextSpy).toHaveBeenCalledWith(
      expect.objectContaining({ threshold: 100 }),
    );

    nextSpy.mockRestore();
  });

  it('should emit warning for 200 threshold at corruption 165', () => {
    const nextSpy = vi.spyOn(corruptionThresholdWarning$, 'next');

    const state = makeGameState({
      corruption: 165,
      corruptionEffects: {
        darkUpgradeUnlocked: true,
        lastMutationCorruption: 110,
      },
    });
    corruptionThresholdProcess(state);

    expect(nextSpy).toHaveBeenCalledTimes(1);
    expect(nextSpy).toHaveBeenCalledWith(
      expect.objectContaining({ threshold: 200 }),
    );

    nextSpy.mockRestore();
  });

  it('should re-emit warning after drop and re-approach', () => {
    const nextSpy = vi.spyOn(corruptionThresholdWarning$, 'next');

    const state = makeGameState({ corruption: 42 });

    // First approach
    corruptionThresholdProcess(state);
    expect(nextSpy).toHaveBeenCalledTimes(1);

    // Drop below warning level
    state.world.resources.corruption.current = 30;
    corruptionThresholdProcess(state);

    // Re-approach
    state.world.resources.corruption.current = 44;
    corruptionThresholdProcess(state);
    expect(nextSpy).toHaveBeenCalledTimes(2);

    nextSpy.mockRestore();
  });

  it('should clear warning when threshold is crossed', () => {
    const state = makeGameState({ corruption: 42 });
    corruptionThresholdProcess(state);
    expect(state.world.corruptionEffects.warnedThresholds).toContain(50);

    // Cross the threshold
    state.world.resources.corruption.current = 55;
    corruptionThresholdProcess(state);
    expect(state.world.corruptionEffects.warnedThresholds).not.toContain(50);
  });

  it('should handle dropping below threshold before effect fires', () => {
    const nextSpy = vi.spyOn(corruptionThresholdWarning$, 'next');

    const state = makeGameState({ corruption: 42 });

    // Warned at 42
    corruptionThresholdProcess(state);
    expect(nextSpy).toHaveBeenCalledTimes(1);

    // Player reduces corruption below warning level
    state.world.resources.corruption.current = 35;
    corruptionThresholdProcess(state);
    expect(state.world.corruptionEffects.warnedThresholds).not.toContain(50);

    nextSpy.mockRestore();
  });
});

describe('threshold crossing detection (via corruptionThresholdCheckWarnings)', () => {
  it('crossing 50 should be detectable (dark unlock)', () => {
    const effects = defaultCorruptionEffectState();
    const { newWarnings } = corruptionThresholdCheckWarnings(40, [], effects);
    expect(newWarnings).toHaveLength(1);
    expect(newWarnings[0].threshold).toBe(50);
    expect(newWarnings[0].effectDescription).toContain('Dark upgrades');
  });

  it('crossing 100 should be detectable (mutation)', () => {
    const effects: CorruptionEffectState = {
      ...defaultCorruptionEffectState(),
      darkUpgradeUnlocked: true,
    };
    const { newWarnings } = corruptionThresholdCheckWarnings(82, [], effects);
    expect(newWarnings).toHaveLength(1);
    expect(newWarnings[0].threshold).toBe(100);
    expect(newWarnings[0].effectDescription).toContain('mutated');
  });

  it('crossing 200 should be detectable (crusade)', () => {
    const effects: CorruptionEffectState = {
      ...defaultCorruptionEffectState(),
      darkUpgradeUnlocked: true,
      lastMutationCorruption: 110,
    };
    const { newWarnings } = corruptionThresholdCheckWarnings(165, [], effects);
    expect(newWarnings).toHaveLength(1);
    expect(newWarnings[0].threshold).toBe(200);
    expect(newWarnings[0].effectDescription).toContain('crusade');
  });

  it('dropping below threshold and re-crossing should trigger again', () => {
    const effects = defaultCorruptionEffectState();

    const r1 = corruptionThresholdCheckWarnings(42, [], effects);
    expect(r1.newWarnings).toHaveLength(1);

    const r2 = corruptionThresholdCheckWarnings(
      30,
      r1.updatedWarnedThresholds,
      effects,
    );
    expect(r2.updatedWarnedThresholds).not.toContain(50);

    const r3 = corruptionThresholdCheckWarnings(
      45,
      r2.updatedWarnedThresholds,
      effects,
    );
    expect(r3.newWarnings).toHaveLength(1);
    expect(r3.newWarnings[0].threshold).toBe(50);
  });

  it('already-triggered threshold should not re-fire warning without dropping below', () => {
    const effects = defaultCorruptionEffectState();
    const r1 = corruptionThresholdCheckWarnings(42, [], effects);
    expect(r1.newWarnings).toHaveLength(1);

    const r2 = corruptionThresholdCheckWarnings(
      47,
      r1.updatedWarnedThresholds,
      effects,
    );
    expect(r2.newWarnings).toHaveLength(0);
  });
});
