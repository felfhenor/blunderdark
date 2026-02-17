import type {
  CombatAbilityId,
  GameState,
  IsContentItem,
  ResearchContent,
  UnlockEffect,
  UnlockedContent,
  UpgradePathId,
} from '@interfaces';
import type { InhabitantId } from '@interfaces/content-inhabitant';
import type { ResearchId } from '@interfaces/content-research';
import type { RoomId } from '@interfaces/content-room';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  researchUnlockApplyEffects,
  researchUnlockGetPassiveBonuses,
  researchUnlockGetRequiredResearchName,
  researchUnlockIsResearchGated,
  researchUnlockIsUnlocked,
  researchUnlockOnComplete,
  researchUnlockProcessCompletion,
} from '@helpers/research-unlocks';

// --- Constants ---

const ROOM_ID_A = 'room-aaa-111' as RoomId;
const ROOM_ID_B = 'room-bbb-222' as RoomId;
const INHABITANT_ID = 'inhab-111' as InhabitantId;
const NODE_ID = 'node-001' as ResearchId;

// --- Mock content ---

const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  contentGetEntry: (id: string) => mockContent.get(id) ?? undefined,
  contentGetEntriesByType: (type: string) => {
    return [...mockContent.values()].filter(
      (e: unknown) => (e as IsContentItem).__type === type,
    );
  },
}));

let mockGameState: GameState;
const mockUpdateGamestate = vi.fn();

vi.mock('@helpers/state-game', () => ({
  gamestate: () => mockGameState,
  updateGamestate: (...args: unknown[]) => mockUpdateGamestate(...args),
}));

// --- Helpers ---

function makeUnlockedContent(
  overrides: Partial<UnlockedContent> = {},
): UnlockedContent {
  return {
    rooms: [],
    inhabitants: [],
    abilities: [],
    upgrades: [],
    passiveBonuses: [],
    ...overrides,
  };
}

function makeResearchNode(
  overrides: Partial<ResearchContent> = {},
): ResearchContent {
  return {
    id: NODE_ID,
    name: 'Test Research',
    description: 'Test',
    __type: 'research',
    branch: 'dark',
    cost: {},
    prerequisiteResearchIds: [],
    unlocks: [],
    tier: 1,
    requiredTicks: 50,
    ...overrides,
  };
}

function makeGameState(
  unlockedContent: UnlockedContent = makeUnlockedContent(),
): GameState {
  return {
    meta: { version: 1, isSetup: true, isPaused: false, createdAt: 0 },
    gameId: 'test-game' as GameState['gameId'],
    clock: { numTicks: 0, lastSaveTick: 0, day: 1, hour: 0, minute: 0 },
    world: {
      grid: [] as unknown as GameState['world']['grid'],
      resources: {} as GameState['world']['resources'],
      inhabitants: [],
      hallways: [],
      season: { currentSeason: 'growth', dayInSeason: 1, totalSeasonCycles: 0 },
      research: {
        completedNodes: [],
        activeResearch: undefined,
        activeResearchProgress: 0,
        activeResearchStartTick: 0,
        unlockedContent,
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
        nextInvasionDay: undefined,
        nextInvasionVariance: 0,
        gracePeriodEnd: 30,
        invasionHistory: [],
        pendingSpecialInvasions: [],
        warningActive: false,
        warningDismissed: false,
      },
      corruptionEffects: {
        darkUpgradeUnlocked: false,
        lastMutationCorruption: undefined,
        lastCrusadeCorruption: undefined,
        warnedThresholds: [],
      },
      stairs: [],
      elevators: [],
      portals: [],
      victoryProgress: {
        consecutivePeacefulDays: 0,
        lastPeacefulCheckDay: 0,
        consecutiveZeroCorruptionDays: 0,
        lastZeroCorruptionCheckDay: 0,
        totalInvasionDefenseWins: 0,
      },
      merchant: {
        isPresent: false,
        arrivalDay: 0,
        departureDayRemaining: 0,
        inventory: [],
      },
    },
  };
}

beforeEach(() => {
  mockContent.clear();
  mockUpdateGamestate.mockReset();
  mockGameState = makeGameState();
  mockUpdateGamestate.mockImplementation(
    async (fn: (s: GameState) => GameState) => {
      mockGameState = fn(mockGameState);
      return mockGameState;
    },
  );
});

describe('researchUnlockIsUnlocked', () => {
  it('should return true for unlocked room', () => {
    const content = makeUnlockedContent({ rooms: [ROOM_ID_A] });
    expect(researchUnlockIsUnlocked('room', ROOM_ID_A, content)).toBe(true);
  });

  it('should return false for locked room', () => {
    const content = makeUnlockedContent();
    expect(researchUnlockIsUnlocked('room', ROOM_ID_A, content)).toBe(false);
  });

  it('should return true for unlocked inhabitant', () => {
    const content = makeUnlockedContent({ inhabitants: [INHABITANT_ID] });
    expect(researchUnlockIsUnlocked('inhabitant', INHABITANT_ID, content)).toBe(
      true,
    );
  });

  it('should return false for locked inhabitant', () => {
    const content = makeUnlockedContent();
    expect(researchUnlockIsUnlocked('inhabitant', INHABITANT_ID, content)).toBe(
      false,
    );
  });

  it('should check ability unlock status', () => {
    const content = makeUnlockedContent({
      abilities: ['ability-1' as CombatAbilityId],
    });
    expect(
      researchUnlockIsUnlocked(
        'ability',
        'ability-1' as CombatAbilityId,
        content,
      ),
    ).toBe(true);
    expect(
      researchUnlockIsUnlocked(
        'ability',
        'ability-2' as CombatAbilityId,
        content,
      ),
    ).toBe(false);
  });

  it('should check upgrade unlock status', () => {
    const content = makeUnlockedContent({
      upgrades: ['upgrade-1' as UpgradePathId],
    });
    expect(
      researchUnlockIsUnlocked(
        'upgrade',
        'upgrade-1' as UpgradePathId,
        content,
      ),
    ).toBe(true);
    expect(
      researchUnlockIsUnlocked(
        'upgrade',
        'upgrade-2' as UpgradePathId,
        content,
      ),
    ).toBe(false);
  });

  it('should read from gamestate when no content provided', () => {
    mockGameState = makeGameState(makeUnlockedContent({ rooms: [ROOM_ID_A] }));
    expect(researchUnlockIsUnlocked('room', ROOM_ID_A)).toBe(true);
  });
});

describe('researchUnlockGetPassiveBonuses', () => {
  it('should return 0 when no matching bonuses', () => {
    const content = makeUnlockedContent();
    expect(researchUnlockGetPassiveBonuses('goldProduction', content)).toBe(0);
  });

  it('should sum matching bonus values', () => {
    const content = makeUnlockedContent({
      passiveBonuses: [
        { bonusType: 'goldProduction', value: 0.1, description: '+10%' },
        { bonusType: 'goldProduction', value: 0.15, description: '+15%' },
        { bonusType: 'fluxProduction', value: 0.2, description: '+20%' },
      ],
    });
    expect(
      researchUnlockGetPassiveBonuses('goldProduction', content),
    ).toBeCloseTo(0.25);
  });

  it('should ignore non-matching bonus types', () => {
    const content = makeUnlockedContent({
      passiveBonuses: [
        { bonusType: 'fluxProduction', value: 0.2, description: '+20%' },
      ],
    });
    expect(researchUnlockGetPassiveBonuses('goldProduction', content)).toBe(0);
  });
});

describe('researchUnlockApplyEffects', () => {
  it('should add room unlock', () => {
    const effects: UnlockEffect[] = [{ type: 'room', targetRoomId: ROOM_ID_A }];
    const result = researchUnlockApplyEffects(effects, makeUnlockedContent());
    expect(result.rooms).toEqual([ROOM_ID_A]);
  });

  it('should not duplicate room unlock', () => {
    const effects: UnlockEffect[] = [{ type: 'room', targetRoomId: ROOM_ID_A }];
    const current = makeUnlockedContent({ rooms: [ROOM_ID_A] });
    const result = researchUnlockApplyEffects(effects, current);
    expect(result.rooms).toEqual([ROOM_ID_A]);
  });

  it('should add inhabitant unlock', () => {
    const effects: UnlockEffect[] = [
      { type: 'inhabitant', targetInhabitantId: INHABITANT_ID },
    ];
    const result = researchUnlockApplyEffects(effects, makeUnlockedContent());
    expect(result.inhabitants).toEqual([INHABITANT_ID]);
  });

  it('should add passive bonus', () => {
    const effects: UnlockEffect[] = [
      {
        type: 'passive_bonus',
        bonusType: 'goldProduction',
        value: 0.1,
        description: '+10%',
      },
    ];
    const result = researchUnlockApplyEffects(effects, makeUnlockedContent());
    expect(result.passiveBonuses).toEqual([
      { bonusType: 'goldProduction', value: 0.1, description: '+10%' },
    ]);
  });

  it('should handle multiple effects at once', () => {
    const effects: UnlockEffect[] = [
      { type: 'room', targetRoomId: ROOM_ID_A },
      { type: 'room', targetRoomId: ROOM_ID_B },
      { type: 'inhabitant', targetInhabitantId: INHABITANT_ID },
      {
        type: 'passive_bonus',
        bonusType: 'test',
        value: 0.5,
        description: 'test',
      },
    ];
    const result = researchUnlockApplyEffects(effects, makeUnlockedContent());
    expect(result.rooms).toEqual([ROOM_ID_A, ROOM_ID_B]);
    expect(result.inhabitants).toEqual([INHABITANT_ID]);
    expect(result.passiveBonuses.length).toBe(1);
  });

  it('should not mutate the original content', () => {
    const original = makeUnlockedContent();
    const effects: UnlockEffect[] = [{ type: 'room', targetRoomId: ROOM_ID_A }];
    researchUnlockApplyEffects(effects, original);
    expect(original.rooms).toEqual([]);
  });

  it('should add ability unlock', () => {
    const effects: UnlockEffect[] = [
      { type: 'ability', targetCombatabilityId: 'ability-1' as CombatAbilityId },
    ];
    const result = researchUnlockApplyEffects(effects, makeUnlockedContent());
    expect(result.abilities).toEqual(['ability-1' as CombatAbilityId]);
  });

  it('should add upgrade unlock', () => {
    const effects: UnlockEffect[] = [
      { type: 'upgrade', targetUpgradepathId: 'upgrade-1' as UpgradePathId },
    ];
    const result = researchUnlockApplyEffects(effects, makeUnlockedContent());
    expect(result.upgrades).toEqual(['upgrade-1' as UpgradePathId]);
  });
});

describe('researchUnlockIsResearchGated', () => {
  it('should return true when a research node unlocks the content', () => {
    const node = makeResearchNode({
      unlocks: [{ type: 'room', targetRoomId: ROOM_ID_A }],
    });
    mockContent.set(node.id, node);
    expect(researchUnlockIsResearchGated('room', ROOM_ID_A)).toBe(true);
  });

  it('should return false when no research node unlocks the content', () => {
    const node = makeResearchNode({ unlocks: [] });
    mockContent.set(node.id, node);
    expect(researchUnlockIsResearchGated('room', ROOM_ID_A)).toBe(false);
  });

  it('should match content type correctly', () => {
    const node = makeResearchNode({
      unlocks: [{ type: 'inhabitant', targetInhabitantId: INHABITANT_ID }],
    });
    mockContent.set(node.id, node);
    expect(researchUnlockIsResearchGated('room', INHABITANT_ID)).toBe(false);
    expect(researchUnlockIsResearchGated('inhabitant', INHABITANT_ID)).toBe(
      true,
    );
  });
});

describe('researchUnlockGetRequiredResearchName', () => {
  it('should return research node name for gated content', () => {
    const node = makeResearchNode({
      name: 'Dark Arts',
      unlocks: [{ type: 'room', targetRoomId: ROOM_ID_A }],
    });
    mockContent.set(node.id, node);
    expect(researchUnlockGetRequiredResearchName('room', ROOM_ID_A)).toBe(
      'Dark Arts',
    );
  });

  it('should return undefined for non-gated content', () => {
    const node = makeResearchNode({ unlocks: [] });
    mockContent.set(node.id, node);
    expect(
      researchUnlockGetRequiredResearchName('room', ROOM_ID_A),
    ).toBeUndefined();
  });
});

describe('researchUnlockOnComplete', () => {
  it('should apply unlock effects when node has unlocks', async () => {
    const node = makeResearchNode({
      id: NODE_ID,
      name: 'Dark Arts',
      unlocks: [{ type: 'room', targetRoomId: ROOM_ID_A }],
    });
    mockContent.set(NODE_ID, node);

    await researchUnlockOnComplete(NODE_ID);

    expect(mockUpdateGamestate).toHaveBeenCalled();
    expect(mockGameState.world.research.unlockedContent.rooms).toContain(
      ROOM_ID_A,
    );
  });

  it('should not update state if node has no unlocks', async () => {
    const node = makeResearchNode({ id: NODE_ID, unlocks: [] });
    mockContent.set(NODE_ID, node);

    await researchUnlockOnComplete(NODE_ID);

    expect(mockUpdateGamestate).not.toHaveBeenCalled();
  });

  it('should not update state if node not found', async () => {
    await researchUnlockOnComplete(NODE_ID);

    expect(mockUpdateGamestate).not.toHaveBeenCalled();
  });

  it('should add passive bonus to unlocked content', async () => {
    const node = makeResearchNode({
      id: NODE_ID,
      name: 'Soul Manipulation',
      unlocks: [
        {
          type: 'passive_bonus',
          bonusType: 'essenceProduction',
          value: 0.1,
          description: '+10%',
        },
      ],
    });
    mockContent.set(NODE_ID, node);

    await researchUnlockOnComplete(NODE_ID);

    expect(mockGameState.world.research.unlockedContent.passiveBonuses).toEqual(
      [{ bonusType: 'essenceProduction', value: 0.1, description: '+10%' }],
    );
  });
});

describe('researchUnlockProcessCompletion', () => {
  it('should mutate state in-place with unlock effects', () => {
    const node = makeResearchNode({
      id: NODE_ID,
      unlocks: [{ type: 'room', targetRoomId: ROOM_ID_A }],
    });
    mockContent.set(NODE_ID, node);

    researchUnlockProcessCompletion(NODE_ID, mockGameState);

    expect(mockGameState.world.research.unlockedContent.rooms).toContain(
      ROOM_ID_A,
    );
  });

  it('should not mutate state when node has no unlocks', () => {
    const node = makeResearchNode({ id: NODE_ID, unlocks: [] });
    mockContent.set(NODE_ID, node);

    const originalContent = mockGameState.world.research.unlockedContent;
    researchUnlockProcessCompletion(NODE_ID, mockGameState);

    expect(mockGameState.world.research.unlockedContent).toBe(originalContent);
  });

  it('should not mutate state when node is not found', () => {
    const originalContent = mockGameState.world.research.unlockedContent;
    researchUnlockProcessCompletion(NODE_ID, mockGameState);

    expect(mockGameState.world.research.unlockedContent).toBe(originalContent);
  });

  it('should apply multiple unlock effects in-place', () => {
    const node = makeResearchNode({
      id: NODE_ID,
      unlocks: [
        { type: 'room', targetRoomId: ROOM_ID_A },
        { type: 'inhabitant', targetInhabitantId: INHABITANT_ID },
        {
          type: 'passive_bonus',
          bonusType: 'test',
          value: 0.1,
          description: 'test',
        },
      ],
    });
    mockContent.set(NODE_ID, node);

    researchUnlockProcessCompletion(NODE_ID, mockGameState);

    expect(mockGameState.world.research.unlockedContent.rooms).toContain(
      ROOM_ID_A,
    );
    expect(mockGameState.world.research.unlockedContent.inhabitants).toContain(
      INHABITANT_ID,
    );
    expect(
      mockGameState.world.research.unlockedContent.passiveBonuses,
    ).toHaveLength(1);
  });

  it('should not call updateGamestate (synchronous in-place mutation)', () => {
    const node = makeResearchNode({
      id: NODE_ID,
      unlocks: [{ type: 'room', targetRoomId: ROOM_ID_A }],
    });
    mockContent.set(NODE_ID, node);

    researchUnlockProcessCompletion(NODE_ID, mockGameState);

    expect(mockUpdateGamestate).not.toHaveBeenCalled();
  });
});
