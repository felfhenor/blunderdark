import { defaultCorruptionEffectState, defaultInvasionSchedule, defaultResources } from '@helpers/defaults';
import type {
  CorruptionEffectState,
  GameId,
  GameState,
  InhabitantId,
  InhabitantInstance,
  InhabitantInstanceId,
  InvasionSchedule,
  MutationTraitContent,
  MutationTraitId,
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

const mockTraits: MutationTraitContent[] = [
  {
    id: 'mt-test-atk' as MutationTraitId,
    name: 'Iron Muscles',
    __type: 'mutationtrait',
    description: '',
    modifiers: [{ stat: 'attack', bonus: 2 }],
    rarity: 'common',
  },
  {
    id: 'mt-test-neg' as MutationTraitId,
    name: 'Withered Limbs',
    __type: 'mutationtrait',
    description: '',
    modifiers: [{ stat: 'attack', bonus: -2 }],
    rarity: 'common',
    isNegative: true,
  },
];

vi.mock('@helpers/content', () => ({
  contentGetEntriesByType: vi.fn(() => mockTraits),
  contentGetEntry: vi.fn(() => undefined),
}));

const {
  corruptionEffectSelectMutationTarget,
  corruptionEffectApplyMutationTrait,
  corruptionEffectProcess,
  corruptionEffectEvent$,
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
    instanceId: 'inst-1' as InhabitantInstanceId,
    definitionId: 'def-1' as InhabitantId,
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
    gameId: 'test-game' as GameId,
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
      forgeInventory: [],
      forgeCraftingQueues: [],
      alchemyConversions: [],
      prisoners: [],
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

describe('corruptionEffectSelectMutationTarget', () => {
  it('should return undefined for empty array', () => {
    const rng = seedrandom('empty');
    expect(corruptionEffectSelectMutationTarget([], rng)).toBeUndefined();
  });

  it('should return a valid inhabitant', () => {
    const rng = seedrandom('valid');
    const inhabitants = [
      makeInhabitant({ instanceId: 'a' as InhabitantInstanceId }),
      makeInhabitant({ instanceId: 'b' as InhabitantInstanceId }),
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

describe('corruptionEffectApplyMutationTrait', () => {
  it('should add a mutation trait to the target', () => {
    const inhabitants = [makeInhabitant()];
    const rng = seedrandom('apply-trait');
    const result = corruptionEffectApplyMutationTrait(inhabitants, 0, rng);
    expect(result).toBeDefined();
    expect(result!.traitName).toBeTruthy();
    expect(inhabitants[0].mutationTraitIds).toBeDefined();
    expect(inhabitants[0].mutationTraitIds!.length).toBeGreaterThan(0);
    expect(inhabitants[0].mutated).toBe(true);
  });

  it('should append trait to existing mutationTraitIds', () => {
    const inhabitants = [makeInhabitant({ mutationTraitIds: ['mt-existing'] })];
    const rng = seedrandom('append');
    corruptionEffectApplyMutationTrait(inhabitants, 0, rng);
    expect(inhabitants[0].mutationTraitIds!.length).toBeGreaterThanOrEqual(2);
    expect(inhabitants[0].mutationTraitIds).toContain('mt-existing');
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

  it('should fire mutation on crossing 500', () => {
    const inhabitants = [makeInhabitant()];
    const state = makeGameState({ corruption: 500, inhabitants });
    const rng = seedrandom('mutation-500');
    corruptionEffectProcess(state, rng);
    expect(state.world.corruptionEffects.lastMutationCorruption).toBe(500);
    expect(inhabitants[0].mutationTraitIds?.length).toBeGreaterThan(0);
  });

  it('should not fire below 500', () => {
    const inhabitants = [makeInhabitant()];
    const state = makeGameState({ corruption: 499, inhabitants });
    const rng = seedrandom('below-500');
    corruptionEffectProcess(state, rng);
    expect(inhabitants[0].mutationTraitIds).toBeUndefined();
  });

  it('should not fire when already at same milestone and tracked', () => {
    const inhabitants = [makeInhabitant()];
    const state = makeGameState({
      corruption: 650,
      inhabitants,
      corruptionEffects: { lastMutationCorruption: 500 },
    });
    const rng = seedrandom('no-refire');
    corruptionEffectProcess(state, rng);
    expect(inhabitants[0].mutationTraitIds).toBeUndefined();
  });

  it('should fire again at next 500 milestone', () => {
    const inhabitants = [makeInhabitant()];
    const state = makeGameState({ corruption: 500, inhabitants });
    const rng1 = seedrandom('milestone-1');
    corruptionEffectProcess(state, rng1);
    expect(state.world.corruptionEffects.lastMutationCorruption).toBe(500);

    // Not yet at 1000
    state.world.resources.corruption.current = 800;
    const rng2 = seedrandom('milestone-2');
    corruptionEffectProcess(state, rng2);
    expect(state.world.corruptionEffects.lastMutationCorruption).toBe(500);

    // Reaches 1000
    state.world.resources.corruption.current = 1000;
    const rng3 = seedrandom('milestone-3');
    corruptionEffectProcess(state, rng3);
    expect(state.world.corruptionEffects.lastMutationCorruption).toBe(1000);
  });

  it('should not re-fire when corruption drops and returns to same milestone', () => {
    const inhabitants = [makeInhabitant()];
    const state = makeGameState({ corruption: 500, inhabitants });
    const rng1 = seedrandom('drop-1');
    corruptionEffectProcess(state, rng1);
    expect(state.world.corruptionEffects.lastMutationCorruption).toBe(500);

    // Drop below 500
    state.world.resources.corruption.current = 300;
    const rng2 = seedrandom('drop-2');
    corruptionEffectProcess(state, rng2);
    expect(state.world.corruptionEffects.lastMutationCorruption).toBe(500);

    // Back above 500 but below 1000
    state.world.resources.corruption.current = 600;
    const rng3 = seedrandom('drop-3');
    corruptionEffectProcess(state, rng3);
    expect(state.world.corruptionEffects.lastMutationCorruption).toBe(500);
  });

  it('should handle no inhabitants gracefully', () => {
    const state = makeGameState({ corruption: 500 });
    const rng = seedrandom('no-inhabitants');
    corruptionEffectProcess(state, rng);
    expect(state.world.corruptionEffects.lastMutationCorruption).toBe(500);
  });

  it('should emit mutation_applied event with trait name', () => {
    const nextSpy = vi.spyOn(corruptionEffectEvent$, 'next');

    const inhabitants = [makeInhabitant()];
    const state = makeGameState({ corruption: 500, inhabitants });
    const rng = seedrandom('mutation-event');
    corruptionEffectProcess(state, rng);

    const mutationCalls = nextSpy.mock.calls.filter(
      ([e]) => e.type === 'mutation_applied',
    );
    expect(mutationCalls).toHaveLength(1);
    expect(mutationCalls[0][0].description).toContain('gained');

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

  it('should handle 0 → 500 crossing all thresholds at once', () => {
    const nextSpy = vi.spyOn(corruptionEffectEvent$, 'next');

    const inhabitants = [makeInhabitant()];
    const state = makeGameState({
      corruption: 500,
      inhabitants,
      day: 15,
    });
    const rng = seedrandom('combined');
    corruptionEffectProcess(state, rng);

    // All thresholds should fire
    expect(state.world.corruptionEffects.darkUpgradeUnlocked).toBe(true);
    expect(state.world.corruptionEffects.lastMutationCorruption).toBe(500);
    expect(state.world.corruptionEffects.lastCrusadeCorruption).toBe(500);
    expect(inhabitants[0].mutationTraitIds?.length).toBeGreaterThan(0);
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
    expect(CORRUPTION_EFFECT_THRESHOLD_MUTATION).toBe(500);
    expect(CORRUPTION_EFFECT_THRESHOLD_CRUSADE).toBe(200);
  });
});
