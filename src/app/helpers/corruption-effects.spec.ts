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
import type {
  CorruptionEffectContent,
  CorruptionEffectId,
} from '@interfaces/content-corruptioneffect';
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

vi.mock('@helpers/reputation', () => ({
  reputationAwardInPlace: vi.fn(),
}));

vi.mock('@helpers/research-unlocks', () => ({
  researchUnlockGetPassiveBonusWithMastery: vi.fn(() => 0),
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

// --- Mock effects that mimic the gamedata definitions ---

const EFFECT_DARK_UPGRADE: CorruptionEffectContent = {
  id: 'eff-dark-upgrade' as CorruptionEffectId,
  __type: 'corruptioneffect',
  name: 'Dark Upgrade Unlock',
  description: '',
  triggerType: 'threshold',
  triggerValue: 50,
  oneTime: true,
  behavior: 'event',
  effectType: 'unlock',
  effectParams: { feature: 'dark_upgrades' },
  notification: { title: 'Dark Upgrades', message: 'Unlocked!', severity: 'info' },
};

const EFFECT_CRUSADE: CorruptionEffectContent = {
  id: 'eff-crusade' as CorruptionEffectId,
  __type: 'corruptioneffect',
  name: 'Crusade Invasion',
  description: '',
  triggerType: 'threshold',
  triggerValue: 200,
  retriggerable: true,
  behavior: 'event',
  effectType: 'trigger_invasion',
  effectParams: { invasionType: 'crusade' },
  notification: { title: 'Crusade!', message: 'A crusade approaches!', severity: 'warning' },
};

const EFFECT_MUTATION: CorruptionEffectContent = {
  id: 'eff-mutation' as CorruptionEffectId,
  __type: 'corruptioneffect',
  name: 'Corruption Mutation',
  description: '',
  triggerType: 'interval',
  triggerValue: 500,
  behavior: 'event',
  effectType: 'mutate_inhabitant',
  notification: { title: 'Mutation', message: 'An inhabitant mutated', severity: 'warning' },
};

const EFFECT_RESOURCE_GRANT: CorruptionEffectContent = {
  id: 'eff-resource' as CorruptionEffectId,
  __type: 'corruptioneffect',
  name: 'Abyssal Harvest',
  description: '',
  triggerType: 'interval',
  triggerValue: 400,
  probability: 1, // always fires in tests
  behavior: 'event',
  effectType: 'resource_grant',
  effectParams: { resource: 'essence', amount: 50 },
  notification: { title: 'Harvest', message: 'Essence granted', severity: 'info' },
};

let mockEffects: CorruptionEffectContent[] = [];

vi.mock('@helpers/content', () => ({
  contentGetEntriesByType: vi.fn(() => {
    // Return mutation traits when asked for mutationtrait, corruption effects for corruptioneffect
    return mockEffects;
  }),
  contentGetEntry: vi.fn(() => undefined),
}));

// Override contentGetEntriesByType to handle both types
const { contentGetEntriesByType } = vi.mocked(await import('@helpers/content'));
contentGetEntriesByType.mockImplementation((type: string) => {
  if (type === 'corruptioneffect') return mockEffects as never;
  if (type === 'mutationtrait') return mockTraits as never;
  return [] as never;
});

const {
  corruptionEffectSelectMutationTarget,
  corruptionEffectApplyMutationTrait,
  corruptionEffectProcessAll,
  corruptionEffectEvent$,
  corruptionEffectIsDarkUpgradeUnlocked,
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
  numTicks?: number;
  schedule?: Partial<InvasionSchedule>;
}): GameState {
  return {
    meta: { version: 1, isSetup: true, isPaused: false, createdAt: 0 },
    gameId: 'test-game' as GameId,
    clock: {
      numTicks: overrides.numTicks ?? 0,
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
        unlockedContent: { rooms: [], inhabitants: [], abilities: [], roomupgrades: [], passiveBonuses: [] },
      },
      reputation: { terror: 0, wealth: 0, knowledge: 0, harmony: 0, chaos: 0 },
      floors: [],
      currentFloorIndex: 0,
      trapInventory: [],
      forgeInventory: [],
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

describe('corruptionEffectProcessAll — one-time threshold (dark upgrade)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEffects = [EFFECT_DARK_UPGRADE];
  });

  it('should fire one-time effect when corruption meets threshold', () => {
    const state = makeGameState({ corruption: 50 });
    const rng = seedrandom('dark-50');
    corruptionEffectProcessAll(state, rng);
    expect(state.world.corruptionEffects.firedOneTimeEffects).toContain(EFFECT_DARK_UPGRADE.id);
  });

  it('should not fire below threshold', () => {
    const state = makeGameState({ corruption: 49 });
    const rng = seedrandom('dark-49');
    corruptionEffectProcessAll(state, rng);
    expect(state.world.corruptionEffects.firedOneTimeEffects).toHaveLength(0);
  });

  it('should not re-fire when already in firedOneTimeEffects', () => {
    const nextSpy = vi.spyOn(corruptionEffectEvent$, 'next');

    const state = makeGameState({
      corruption: 100,
      corruptionEffects: {
        firedOneTimeEffects: [EFFECT_DARK_UPGRADE.id],
      },
    });
    const rng = seedrandom('no-retrigger');
    corruptionEffectProcessAll(state, rng);
    expect(nextSpy).not.toHaveBeenCalled();
    nextSpy.mockRestore();
  });

  it('should emit notification event on first trigger', () => {
    const nextSpy = vi.spyOn(corruptionEffectEvent$, 'next');

    const state = makeGameState({ corruption: 50 });
    const rng = seedrandom('dark-event');
    corruptionEffectProcessAll(state, rng);
    expect(nextSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Dark Upgrades' }),
    );
    nextSpy.mockRestore();
  });
});

describe('corruptionEffectProcessAll — retriggerable threshold (crusade)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEffects = [EFFECT_CRUSADE];
  });

  it('should trigger invasion when corruption meets threshold', () => {
    const state = makeGameState({ corruption: 200, day: 10 });
    const rng = seedrandom('crusade-200');
    corruptionEffectProcessAll(state, rng);
    expect(vi.mocked(invasionTriggerAddSpecial)).toHaveBeenCalledWith(
      expect.anything(),
      'crusade',
      10,
    );
  });

  it('should not trigger below threshold', () => {
    const state = makeGameState({ corruption: 199 });
    const rng = seedrandom('no-crusade');
    corruptionEffectProcessAll(state, rng);
    expect(vi.mocked(invasionTriggerAddSpecial)).not.toHaveBeenCalled();
  });

  it('should re-arm after corruption drops below threshold', () => {
    const state = makeGameState({ corruption: 200, day: 10 });
    const rng1 = seedrandom('recross-1');
    corruptionEffectProcessAll(state, rng1);
    expect(vi.mocked(invasionTriggerAddSpecial)).toHaveBeenCalledTimes(1);

    // Drop below threshold — should arm the effect
    state.world.resources.corruption.current = 150;
    const rng2 = seedrandom('recross-2');
    corruptionEffectProcessAll(state, rng2);
    expect(state.world.corruptionEffects.retriggeredEffects[EFFECT_CRUSADE.id]).toBe(true);

    // Back above — should fire again
    vi.mocked(invasionTriggerAddSpecial).mockClear();
    state.world.resources.corruption.current = 250;
    const rng3 = seedrandom('recross-3');
    corruptionEffectProcessAll(state, rng3);
    expect(vi.mocked(invasionTriggerAddSpecial)).toHaveBeenCalledTimes(1);
  });

  it('should not re-trigger while still above threshold', () => {
    const state = makeGameState({
      corruption: 300,
      corruptionEffects: {
        retriggeredEffects: { [EFFECT_CRUSADE.id]: false },
      },
    });
    const rng = seedrandom('no-retrigger-crusade');
    corruptionEffectProcessAll(state, rng);
    expect(vi.mocked(invasionTriggerAddSpecial)).not.toHaveBeenCalled();
  });
});

describe('corruptionEffectProcessAll — interval (mutation)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEffects = [EFFECT_MUTATION];
  });

  it('should fire mutation at interval milestone', () => {
    const inhabitants = [makeInhabitant()];
    const state = makeGameState({ corruption: 500, inhabitants });
    const rng = seedrandom('mutation-500');
    corruptionEffectProcessAll(state, rng);
    expect(state.world.corruptionEffects.lastIntervalValues[EFFECT_MUTATION.id]).toBe(500);
    expect(inhabitants[0].mutationTraitIds?.length).toBeGreaterThan(0);
  });

  it('should not fire below first interval', () => {
    const inhabitants = [makeInhabitant()];
    const state = makeGameState({ corruption: 499, inhabitants });
    const rng = seedrandom('below-500');
    corruptionEffectProcessAll(state, rng);
    expect(inhabitants[0].mutationTraitIds).toBeUndefined();
  });

  it('should not fire when already at same milestone', () => {
    const inhabitants = [makeInhabitant()];
    const state = makeGameState({
      corruption: 650,
      inhabitants,
      corruptionEffects: {
        lastIntervalValues: { [EFFECT_MUTATION.id]: 500 },
      },
    });
    const rng = seedrandom('no-refire');
    corruptionEffectProcessAll(state, rng);
    expect(inhabitants[0].mutationTraitIds).toBeUndefined();
  });

  it('should fire again at next interval milestone', () => {
    const inhabitants = [makeInhabitant()];
    const state = makeGameState({ corruption: 500, inhabitants });
    const rng1 = seedrandom('milestone-1');
    corruptionEffectProcessAll(state, rng1);
    expect(state.world.corruptionEffects.lastIntervalValues[EFFECT_MUTATION.id]).toBe(500);

    // Not yet at 1000
    state.world.resources.corruption.current = 800;
    const rng2 = seedrandom('milestone-2');
    corruptionEffectProcessAll(state, rng2);
    expect(state.world.corruptionEffects.lastIntervalValues[EFFECT_MUTATION.id]).toBe(500);

    // Reaches 1000
    state.world.resources.corruption.current = 1000;
    const rng3 = seedrandom('milestone-3');
    corruptionEffectProcessAll(state, rng3);
    expect(state.world.corruptionEffects.lastIntervalValues[EFFECT_MUTATION.id]).toBe(1000);
  });

  it('should handle no inhabitants gracefully', () => {
    const state = makeGameState({ corruption: 500 });
    const rng = seedrandom('no-inhabitants');
    corruptionEffectProcessAll(state, rng);
    expect(state.world.corruptionEffects.lastIntervalValues[EFFECT_MUTATION.id]).toBe(500);
  });
});

describe('corruptionEffectProcessAll — resource grant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEffects = [EFFECT_RESOURCE_GRANT];
  });

  it('should grant resources at interval milestone', () => {
    const state = makeGameState({ corruption: 400 });
    const rng = seedrandom('resource-grant');
    corruptionEffectProcessAll(state, rng);
    expect(state.world.resources.essence.current).toBe(50);
    expect(state.world.corruptionEffects.lastIntervalValues[EFFECT_RESOURCE_GRANT.id]).toBe(400);
  });

  it('should cap resource grant to max', () => {
    const state = makeGameState({ corruption: 400 });
    state.world.resources.essence.current = state.world.resources.essence.max - 10;
    const rng = seedrandom('resource-cap');
    corruptionEffectProcessAll(state, rng);
    expect(state.world.resources.essence.current).toBe(state.world.resources.essence.max);
  });
});

describe('corruptionEffectProcessAll — conditions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should skip effect when minFloorDepth condition is not met', () => {
    const conditionedEffect: CorruptionEffectContent = {
      ...EFFECT_DARK_UPGRADE,
      id: 'eff-conditioned' as CorruptionEffectId,
      conditions: { minFloorDepth: 3 },
    };
    mockEffects = [conditionedEffect];

    const state = makeGameState({ corruption: 100 });
    const rng = seedrandom('no-depth');
    corruptionEffectProcessAll(state, rng);
    expect(state.world.corruptionEffects.firedOneTimeEffects).toHaveLength(0);
  });

  it('should skip effect when minInhabitants condition is not met', () => {
    const conditionedEffect: CorruptionEffectContent = {
      ...EFFECT_DARK_UPGRADE,
      id: 'eff-min-inh' as CorruptionEffectId,
      conditions: { minInhabitants: 5 },
    };
    mockEffects = [conditionedEffect];

    const state = makeGameState({ corruption: 100 });
    const rng = seedrandom('no-inhabitants');
    corruptionEffectProcessAll(state, rng);
    expect(state.world.corruptionEffects.firedOneTimeEffects).toHaveLength(0);
  });
});

describe('corruptionEffectProcessAll — passive effects are skipped', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not process passive effects during tick processing', () => {
    const passiveEffect: CorruptionEffectContent = {
      id: 'eff-passive' as CorruptionEffectId,
      __type: 'corruptioneffect',
      name: 'Passive Bonus',
      description: '',
      triggerType: 'threshold',
      triggerValue: 10,
      behavior: 'passive',
      effectType: 'production_modifier',
      effectParams: { multiplier: 1.1 },
    };
    mockEffects = [passiveEffect];

    const nextSpy = vi.spyOn(corruptionEffectEvent$, 'next');
    const state = makeGameState({ corruption: 100 });
    const rng = seedrandom('passive');
    corruptionEffectProcessAll(state, rng);

    // Passive effects should NOT be processed as events
    expect(nextSpy).not.toHaveBeenCalled();
    expect(state.world.corruptionEffects.firedOneTimeEffects).toHaveLength(0);
    nextSpy.mockRestore();
  });
});

describe('corruptionEffectProcessAll — combined effects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEffects = [EFFECT_DARK_UPGRADE, EFFECT_CRUSADE, EFFECT_MUTATION];
  });

  it('should process multiple effects in one pass', () => {
    const nextSpy = vi.spyOn(corruptionEffectEvent$, 'next');

    const inhabitants = [makeInhabitant()];
    const state = makeGameState({
      corruption: 500,
      inhabitants,
      day: 15,
    });
    const rng = seedrandom('combined');
    corruptionEffectProcessAll(state, rng);

    // Dark upgrade (one-time threshold at 50) should fire
    expect(state.world.corruptionEffects.firedOneTimeEffects).toContain(EFFECT_DARK_UPGRADE.id);

    // Crusade (retriggerable threshold at 200) should fire
    expect(vi.mocked(invasionTriggerAddSpecial)).toHaveBeenCalledWith(
      expect.anything(),
      'crusade',
      15,
    );

    // Mutation (interval at 500) should fire
    expect(state.world.corruptionEffects.lastIntervalValues[EFFECT_MUTATION.id]).toBe(500);
    expect(inhabitants[0].mutationTraitIds?.length).toBeGreaterThan(0);

    expect(nextSpy).toHaveBeenCalled();
    nextSpy.mockRestore();
  });

  it('should do nothing at 0 corruption', () => {
    const state = makeGameState({ corruption: 0 });
    const rng = seedrandom('zero');
    corruptionEffectProcessAll(state, rng);
    expect(state.world.corruptionEffects.firedOneTimeEffects).toHaveLength(0);
    expect(Object.keys(state.world.corruptionEffects.lastIntervalValues)).toHaveLength(0);
  });
});

describe('corruptionEffectIsDarkUpgradeUnlocked', () => {
  beforeEach(() => {
    mockEffects = [EFFECT_DARK_UPGRADE];
  });

  it('should return true when dark upgrade effect has been fired', () => {
    const effects: CorruptionEffectState = {
      ...defaultCorruptionEffectState(),
      firedOneTimeEffects: [EFFECT_DARK_UPGRADE.id],
    };
    expect(corruptionEffectIsDarkUpgradeUnlocked(effects)).toBe(true);
  });

  it('should return false when dark upgrade effect has not been fired', () => {
    const effects = defaultCorruptionEffectState();
    expect(corruptionEffectIsDarkUpgradeUnlocked(effects)).toBe(false);
  });
});
