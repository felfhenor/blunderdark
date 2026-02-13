import { defaultCorruptionEffectState, defaultInvasionSchedule, defaultResources } from '@helpers/defaults';
import type {
  CorruptionEffectState,
  GameState,
  InhabitantInstance,
  InvasionSchedule,
} from '@interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import seedrandom from 'seedrandom';

vi.mock('@helpers/state-game', () => ({
  gamestate: vi.fn(() => ({})),
  updateGamestate: vi.fn(),
}));

vi.mock('@helpers/invasion-triggers', () => ({
  invasionTriggerAddSpecial: vi.fn(
    (schedule: InvasionSchedule, type: string, day: number) => ({
      ...schedule,
      pendingSpecialInvasions: [
        ...schedule.pendingSpecialInvasions,
        { type, triggerDay: day + 1 },
      ],
    }),
  ),
}));

const {
  corruptionEffectRollMutation,
  corruptionEffectApplyMutation,
  corruptionEffectSelectMutationTarget,
  corruptionEffectProcess,
  corruptionEffectEvent$,
  CORRUPTION_EFFECT_MUTATION_STATS,
  CORRUPTION_EFFECT_MUTATION_MIN_DELTA,
  CORRUPTION_EFFECT_MUTATION_MAX_DELTA,
  CORRUPTION_EFFECT_THRESHOLD_DARK_UPGRADE,
  CORRUPTION_EFFECT_THRESHOLD_MUTATION,
  CORRUPTION_EFFECT_THRESHOLD_CRUSADE,
} = await import('@helpers/corruption-effects');

const { invasionTriggerAddSpecial } = await import(
  '@helpers/invasion-triggers'
);

function makeInhabitant(
  overrides: Partial<InhabitantInstance> = {},
): InhabitantInstance {
  return {
    instanceId: 'inst-1',
    definitionId: 'def-1',
    name: 'Test Creature',
    state: 'normal',
    assignedRoomId: undefined,
    ...overrides,
  };
}

function makeGameState(overrides: {
  corruption?: number;
  inhabitants?: InhabitantInstance[];
  corruptionEffects?: Partial<CorruptionEffectState>;
  day?: number;
  schedule?: Partial<InvasionSchedule>;
}): GameState {
  return {
    meta: { version: 1, isSetup: true, isPaused: false, createdAt: 0 },
    gameId: 'test-game' as GameState['gameId'],
    clock: {
      numTicks: 0,
      lastSaveTick: 0,
      day: overrides.day ?? 1,
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
      inhabitants: overrides.inhabitants ?? [],
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
      invasionSchedule: {
        ...defaultInvasionSchedule(),
        ...overrides.schedule,
      },
      corruptionEffects: {
        ...defaultCorruptionEffectState(),
        ...overrides.corruptionEffects,
      },
    },
  } as unknown as GameState;
}

describe('corruptionEffectRollMutation', () => {
  it('should return a valid stat key', () => {
    const rng = seedrandom('stat-key');
    const mutation = corruptionEffectRollMutation(rng);
    expect(CORRUPTION_EFFECT_MUTATION_STATS).toContain(mutation.stat);
  });

  it('should return a non-zero delta', () => {
    for (let i = 0; i < 50; i++) {
      const rng = seedrandom(`non-zero-${i}`);
      const mutation = corruptionEffectRollMutation(rng);
      expect(mutation.delta).not.toBe(0);
    }
  });

  it('should return delta within range [-3, 5]', () => {
    for (let i = 0; i < 100; i++) {
      const rng = seedrandom(`range-${i}`);
      const mutation = corruptionEffectRollMutation(rng);
      expect(mutation.delta).toBeGreaterThanOrEqual(
        CORRUPTION_EFFECT_MUTATION_MIN_DELTA,
      );
      expect(mutation.delta).toBeLessThanOrEqual(
        CORRUPTION_EFFECT_MUTATION_MAX_DELTA,
      );
    }
  });

  it('should be deterministic with the same seed', () => {
    const rng1 = seedrandom('deterministic');
    const rng2 = seedrandom('deterministic');
    expect(corruptionEffectRollMutation(rng1)).toEqual(
      corruptionEffectRollMutation(rng2),
    );
  });
});

describe('corruptionEffectApplyMutation', () => {
  it('should create mutationBonuses if undefined', () => {
    const inhabitant = makeInhabitant();
    expect(inhabitant.mutationBonuses).toBeUndefined();
    corruptionEffectApplyMutation(inhabitant, { stat: 'attack', delta: 3 });
    expect(inhabitant.mutationBonuses).toEqual({ attack: 3 });
  });

  it('should accumulate bonuses on the same stat', () => {
    const inhabitant = makeInhabitant({ mutationBonuses: { attack: 2 } });
    corruptionEffectApplyMutation(inhabitant, { stat: 'attack', delta: 3 });
    expect(inhabitant.mutationBonuses!.attack).toBe(5);
  });

  it('should handle negative deltas', () => {
    const inhabitant = makeInhabitant({ mutationBonuses: { defense: 1 } });
    corruptionEffectApplyMutation(inhabitant, { stat: 'defense', delta: -3 });
    expect(inhabitant.mutationBonuses!.defense).toBe(-2);
  });

  it('should add a new stat key without affecting existing ones', () => {
    const inhabitant = makeInhabitant({ mutationBonuses: { hp: 5 } });
    corruptionEffectApplyMutation(inhabitant, { stat: 'speed', delta: 2 });
    expect(inhabitant.mutationBonuses).toEqual({ hp: 5, speed: 2 });
  });
});

describe('corruptionEffectSelectMutationTarget', () => {
  it('should return undefined for empty array', () => {
    const rng = seedrandom('empty');
    expect(corruptionEffectSelectMutationTarget([], rng)).toBeUndefined();
  });

  it('should return a valid inhabitant', () => {
    const rng = seedrandom('valid');
    const inhabitants = [
      makeInhabitant({ instanceId: 'a' }),
      makeInhabitant({ instanceId: 'b' }),
    ];
    const result = corruptionEffectSelectMutationTarget(inhabitants, rng);
    expect(result).toBeDefined();
    expect(inhabitants).toContain(result);
  });

  it('should return the only inhabitant when array has one element', () => {
    const rng = seedrandom('single');
    const inhabitant = makeInhabitant();
    expect(
      corruptionEffectSelectMutationTarget([inhabitant], rng),
    ).toBe(inhabitant);
  });
});

describe('corruptionEffectProcess — dark upgrades', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should unlock dark upgrades at 50 corruption', () => {
    const state = makeGameState({ corruption: 50 });
    const rng = seedrandom('dark-50');
    corruptionEffectProcess(state, rng);
    expect(state.world.corruptionEffects.darkUpgradeUnlocked).toBe(true);
  });

  it('should not unlock below 50', () => {
    const state = makeGameState({ corruption: 49 });
    const rng = seedrandom('dark-49');
    corruptionEffectProcess(state, rng);
    expect(state.world.corruptionEffects.darkUpgradeUnlocked).toBe(false);
  });

  it('should stay unlocked permanently', () => {
    const state = makeGameState({
      corruption: 10,
      corruptionEffects: { darkUpgradeUnlocked: true },
    });
    const rng = seedrandom('dark-permanent');
    corruptionEffectProcess(state, rng);
    expect(state.world.corruptionEffects.darkUpgradeUnlocked).toBe(true);
  });

  it('should not re-trigger event when already unlocked', () => {
    const nextSpy = vi.spyOn(corruptionEffectEvent$, 'next');

    const state = makeGameState({
      corruption: 100,
      corruptionEffects: { darkUpgradeUnlocked: true },
    });
    const rng = seedrandom('no-retrigger');
    corruptionEffectProcess(state, rng);
    const darkCalls = nextSpy.mock.calls.filter(
      ([e]) => e.type === 'dark_upgrade_unlocked',
    );
    expect(darkCalls).toHaveLength(0);
    nextSpy.mockRestore();
  });

  it('should emit dark_upgrade_unlocked event', () => {
    const nextSpy = vi.spyOn(corruptionEffectEvent$, 'next');

    const state = makeGameState({ corruption: 50 });
    const rng = seedrandom('dark-event');
    corruptionEffectProcess(state, rng);
    expect(nextSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'dark_upgrade_unlocked' }),
    );
    nextSpy.mockRestore();
  });
});

describe('corruptionEffectProcess — mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fire mutation on crossing 100', () => {
    const inhabitants = [makeInhabitant()];
    const state = makeGameState({ corruption: 100, inhabitants });
    const rng = seedrandom('mutation-100');
    corruptionEffectProcess(state, rng);
    expect(state.world.corruptionEffects.lastMutationCorruption).toBe(100);
    expect(inhabitants[0].mutationBonuses).toBeDefined();
  });

  it('should not fire when already above 100 and tracked', () => {
    const inhabitants = [makeInhabitant()];
    const state = makeGameState({
      corruption: 150,
      inhabitants,
      corruptionEffects: { lastMutationCorruption: 120 },
    });
    const rng = seedrandom('no-refire');
    corruptionEffectProcess(state, rng);
    expect(inhabitants[0].mutationBonuses).toBeUndefined();
  });

  it('should re-fire on re-crossing (drop below then back above)', () => {
    const inhabitants = [makeInhabitant()];

    // First: corruption at 100, fires mutation
    const state = makeGameState({ corruption: 100, inhabitants });
    const rng1 = seedrandom('recross-1');
    corruptionEffectProcess(state, rng1);
    expect(state.world.corruptionEffects.lastMutationCorruption).toBe(100);

    // Drop below 100 — resets tracking
    state.world.resources.corruption.current = 80;
    const rng2 = seedrandom('recross-2');
    corruptionEffectProcess(state, rng2);
    expect(state.world.corruptionEffects.lastMutationCorruption).toBeUndefined();

    // Back above 100 — fires again
    state.world.resources.corruption.current = 110;
    const rng3 = seedrandom('recross-3');
    corruptionEffectProcess(state, rng3);
    expect(state.world.corruptionEffects.lastMutationCorruption).toBe(110);
  });

  it('should handle no inhabitants gracefully', () => {
    const state = makeGameState({ corruption: 100 });
    const rng = seedrandom('no-inhabitants');
    corruptionEffectProcess(state, rng);
    expect(state.world.corruptionEffects.lastMutationCorruption).toBe(100);
  });

  it('should emit mutation_applied event', () => {
    const nextSpy = vi.spyOn(corruptionEffectEvent$, 'next');

    const inhabitants = [makeInhabitant()];
    const state = makeGameState({ corruption: 100, inhabitants });
    const rng = seedrandom('mutation-event');
    corruptionEffectProcess(state, rng);

    expect(nextSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'mutation_applied' }),
    );
    nextSpy.mockRestore();
  });
});

describe('corruptionEffectProcess — crusade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should trigger crusade on crossing 200', () => {
    const state = makeGameState({ corruption: 200, day: 10 });
    const rng = seedrandom('crusade-200');
    corruptionEffectProcess(state, rng);
    expect(state.world.corruptionEffects.lastCrusadeCorruption).toBe(200);
    expect(vi.mocked(invasionTriggerAddSpecial)).toHaveBeenCalledWith(
      expect.anything(),
      'crusade',
      10,
    );
  });

  it('should not trigger below 200', () => {
    const state = makeGameState({ corruption: 199 });
    const rng = seedrandom('no-crusade');
    corruptionEffectProcess(state, rng);
    expect(state.world.corruptionEffects.lastCrusadeCorruption).toBeUndefined();
    expect(vi.mocked(invasionTriggerAddSpecial)).not.toHaveBeenCalled();
  });

  it('should re-fire on re-crossing', () => {
    const state = makeGameState({ corruption: 200, day: 10 });
    const rng1 = seedrandom('recross-crusade-1');
    corruptionEffectProcess(state, rng1);
    expect(vi.mocked(invasionTriggerAddSpecial)).toHaveBeenCalledTimes(1);

    // Drop below
    state.world.resources.corruption.current = 150;
    const rng2 = seedrandom('recross-crusade-2');
    corruptionEffectProcess(state, rng2);
    expect(state.world.corruptionEffects.lastCrusadeCorruption).toBeUndefined();

    // Back above
    vi.mocked(invasionTriggerAddSpecial).mockClear();
    state.world.resources.corruption.current = 250;
    const rng3 = seedrandom('recross-crusade-3');
    corruptionEffectProcess(state, rng3);
    expect(vi.mocked(invasionTriggerAddSpecial)).toHaveBeenCalledTimes(1);
  });

  it('should not re-trigger when already above and tracked', () => {
    const state = makeGameState({
      corruption: 300,
      corruptionEffects: { lastCrusadeCorruption: 250 },
    });
    const rng = seedrandom('no-retrigger-crusade');
    corruptionEffectProcess(state, rng);
    expect(vi.mocked(invasionTriggerAddSpecial)).not.toHaveBeenCalled();
  });

  it('should emit crusade_triggered event', () => {
    const nextSpy = vi.spyOn(corruptionEffectEvent$, 'next');

    const state = makeGameState({ corruption: 200, day: 5 });
    const rng = seedrandom('crusade-event');
    corruptionEffectProcess(state, rng);

    expect(nextSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'crusade_triggered' }),
    );
    nextSpy.mockRestore();
  });
});

describe('corruptionEffectProcess — combined thresholds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle 0 → 250 crossing all thresholds at once', () => {
    const nextSpy = vi.spyOn(corruptionEffectEvent$, 'next');

    const inhabitants = [makeInhabitant()];
    const state = makeGameState({
      corruption: 250,
      inhabitants,
      day: 15,
    });
    const rng = seedrandom('combined');
    corruptionEffectProcess(state, rng);

    // All thresholds should fire
    expect(state.world.corruptionEffects.darkUpgradeUnlocked).toBe(true);
    expect(state.world.corruptionEffects.lastMutationCorruption).toBe(250);
    expect(state.world.corruptionEffects.lastCrusadeCorruption).toBe(250);
    expect(inhabitants[0].mutationBonuses).toBeDefined();
    expect(vi.mocked(invasionTriggerAddSpecial)).toHaveBeenCalledWith(
      expect.anything(),
      'crusade',
      15,
    );

    const eventTypes = nextSpy.mock.calls.map(([e]) => e.type);
    expect(eventTypes).toContain('dark_upgrade_unlocked');
    expect(eventTypes).toContain('mutation_applied');
    expect(eventTypes).toContain('crusade_triggered');

    nextSpy.mockRestore();
  });

  it('should do nothing at 0 corruption', () => {
    const state = makeGameState({ corruption: 0 });
    const rng = seedrandom('zero');
    corruptionEffectProcess(state, rng);
    expect(state.world.corruptionEffects.darkUpgradeUnlocked).toBe(false);
    expect(state.world.corruptionEffects.lastMutationCorruption).toBeUndefined();
    expect(state.world.corruptionEffects.lastCrusadeCorruption).toBeUndefined();
  });
});

describe('constants', () => {
  it('should have correct threshold values', () => {
    expect(CORRUPTION_EFFECT_THRESHOLD_DARK_UPGRADE).toBe(50);
    expect(CORRUPTION_EFFECT_THRESHOLD_MUTATION).toBe(100);
    expect(CORRUPTION_EFFECT_THRESHOLD_CRUSADE).toBe(200);
  });

  it('should have correct mutation range', () => {
    expect(CORRUPTION_EFFECT_MUTATION_MIN_DELTA).toBe(-3);
    expect(CORRUPTION_EFFECT_MUTATION_MAX_DELTA).toBe(5);
  });

  it('should have all 5 inhabitant stats', () => {
    expect(CORRUPTION_EFFECT_MUTATION_STATS).toHaveLength(5);
    expect(CORRUPTION_EFFECT_MUTATION_STATS).toContain('hp');
    expect(CORRUPTION_EFFECT_MUTATION_STATS).toContain('attack');
    expect(CORRUPTION_EFFECT_MUTATION_STATS).toContain('defense');
    expect(CORRUPTION_EFFECT_MUTATION_STATS).toContain('speed');
    expect(CORRUPTION_EFFECT_MUTATION_STATS).toContain('workerEfficiency');
  });
});
