import type {
  Floor,
  FloorId,
  GameState,
  InhabitantInstance,
  IsContentItem,
  PlacedRoom,
  PlacedRoomId,
  ResearchContent,
  ResearchState,
  RoomContent,
  RoomId,
  RoomShapeId,
} from '@interfaces';
import type { ResearchId } from '@interfaces/content-research';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Constants ---

const NODE_DARK_FUNDAMENTALS_ID =
  'aa000001-0001-0001-0001-000000000001' as ResearchId;
const NODE_SOUL_MANIPULATION_ID =
  'aa000001-0001-0001-0001-000000000002' as ResearchId;
const NODE_SHADOW_MAGIC_ID =
  'aa000001-0001-0001-0001-000000000003' as ResearchId;
const SHADOW_LIBRARY_ID = 'aa000001-0001-0001-0001-000000000010' as RoomId;

// --- Mock content ---

const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  contentGetEntry: (id: string) => mockContent.get(id) ?? undefined,
  contentGetEntriesByType: (type: string) => {
    return [...mockContent.values()].filter(
      (e: unknown) => (e as IsContentItem).__type === type,
    );
  },
  contentAllIdsByName: vi.fn(() => new Map()),
}));

vi.mock('@helpers/room-roles', () => ({
  roomRoleFindById: vi.fn(() => undefined),
  roomRoleResetCache: vi.fn(),
}));

let mockGameState: GameState;
const mockUpdateGamestate = vi.fn();
const mockResourceCanAfford = vi.fn();
const mockResourcePayCost = vi.fn();

vi.mock('@helpers/state-game', () => ({
  gamestate: () => mockGameState,
  updateGamestate: (...args: unknown[]) => mockUpdateGamestate(...args),
}));

vi.mock('@helpers/resources', () => ({
  resourceCanAfford: (...args: unknown[]) => mockResourceCanAfford(...args),
  resourcePayCost: (...args: unknown[]) => mockResourcePayCost(...args),
}));

vi.mock('@helpers/throne-room', () => ({
  throneRoomGetRulerBonusValue: vi.fn((_floors: Floor[], bonusType: string) => {
    if (bonusType === 'researchSpeed') return 0;
    return 0;
  }),
}));

const mockResearchUnlockProcessCompletion = vi.fn();

vi.mock('@helpers/research-unlocks', () => ({
  researchUnlockProcessCompletion: (...args: unknown[]) =>
    mockResearchUnlockProcessCompletion(...args),
}));

// --- Imports after mocks ---

import {
  RESEARCH_BASE_PROGRESS_PER_TICK,
  RESEARCH_LIBRARY_BONUS_PER_ROOM,
  researchArePrerequisitesMet,
  researchCalculateSpeedModifier,
  researchCanStart,
  researchCancel,
  researchProcess,
  researchStart,
} from '@helpers/research-progress';
import { throneRoomGetRulerBonusValue } from '@helpers/throne-room';

// --- Mock data ---

const darkFundamentalsNode: ResearchContent = {
  id: NODE_DARK_FUNDAMENTALS_ID,
  name: 'Dark Arts Fundamentals',
  __type: 'research',
  description: 'Root dark node',
  branch: 'dark',
  cost: { research: 10 },
  prerequisiteResearchIds: [],
  unlocks: [],
  tier: 1,
  requiredTicks: 50,
};

const soulManipulationNode: ResearchContent = {
  id: NODE_SOUL_MANIPULATION_ID,
  name: 'Soul Manipulation',
  __type: 'research',
  description: 'Tier 2 dark node',
  branch: 'dark',
  cost: { research: 25, essence: 5 },
  prerequisiteResearchIds: [NODE_DARK_FUNDAMENTALS_ID],
  unlocks: [],
  tier: 2,
  requiredTicks: 150,
};

const shadowMagicNode: ResearchContent = {
  id: NODE_SHADOW_MAGIC_ID,
  name: 'Shadow Magic',
  __type: 'research',
  description: 'Tier 2 dark node',
  branch: 'dark',
  cost: { research: 25, essence: 5 },
  prerequisiteResearchIds: [NODE_DARK_FUNDAMENTALS_ID],
  unlocks: [],
  tier: 2,
  requiredTicks: 150,
};

const shadowLibraryRoom: RoomContent = {
  id: SHADOW_LIBRARY_ID as RoomId,
  name: 'Shadow Library',
  __type: 'room',
  description: '',
  shapeId: 'shape-l' as RoomShapeId,
  cost: { gold: 80, crystals: 30 },
  production: { research: 0.6, corruption: 0.2 },
  requiresWorkers: true,
  adjacencyBonuses: [],
  isUnique: false,
  removable: true,
  maxInhabitants: 1,
  inhabitantRestriction: undefined,
  fearLevel: 2,
  fearReductionAura: 0,
  upgradePaths: [],
  autoPlace: false,
};

// --- Helpers ---

function makeFloor(
  rooms: PlacedRoom[] = [],
  inhabitants: InhabitantInstance[] = [],
): Floor {
  return {
    id: 'floor-1' as FloorId,
    name: 'Floor 1',
    depth: 1,
    biome: 'neutral',
    grid: { tiles: [] } as unknown as Floor['grid'],
    rooms,
    hallways: [],
    inhabitants,
    connections: [],
    traps: [],
  };
}

function makeResearchState(
  overrides: Partial<ResearchState> = {},
): ResearchState {
  return {
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
    ...overrides,
  };
}

function makeGameState(overrides: Partial<GameState['world']> = {}): GameState {
  return {
    meta: {
      version: 1,
      isSetup: true,
      isPaused: false,
      createdAt: Date.now(),
    },
    gameId: 'test-game' as GameState['gameId'],
    clock: {
      numTicks: 100,
      lastSaveTick: 0,
      day: 1,
      hour: 0,
      minute: 0,
    },
    world: {
      grid: { tiles: [] } as unknown as GameState['world']['grid'],
      resources: {
        crystals: { current: 100, max: 500 },
        food: { current: 50, max: 500 },
        gold: { current: 100, max: 1000 },
        flux: { current: 50, max: 200 },
        research: { current: 50, max: 300 },
        essence: { current: 50, max: 200 },
        corruption: { current: 0, max: Number.MAX_SAFE_INTEGER },
      },
      inhabitants: [],
      hallways: [],
      season: { currentSeason: 'growth', dayInSeason: 1, totalSeasonCycles: 0 },
      research: makeResearchState(),
      reputation: { terror: 0, wealth: 0, knowledge: 0, harmony: 0, chaos: 0 },
      floors: [makeFloor()],
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
      ...overrides,
    },
  };
}

// --- Setup ---

beforeEach(() => {
  mockContent.clear();
  mockContent.set(NODE_DARK_FUNDAMENTALS_ID, darkFundamentalsNode);
  mockContent.set(NODE_SOUL_MANIPULATION_ID, soulManipulationNode);
  mockContent.set(NODE_SHADOW_MAGIC_ID, shadowMagicNode);
  mockContent.set(SHADOW_LIBRARY_ID, shadowLibraryRoom);

  mockGameState = makeGameState();
  mockUpdateGamestate.mockImplementation(
    async (fn: (s: GameState) => GameState) => {
      mockGameState = fn(mockGameState);
    },
  );
  mockResourceCanAfford.mockReturnValue(true);
  mockResourcePayCost.mockResolvedValue(true);
  mockResearchUnlockProcessCompletion.mockReset();

  vi.mocked(throneRoomGetRulerBonusValue).mockReturnValue(0);
});

// ===================================================================
// US-001: Start Research
// ===================================================================

describe('US-001: Start Research', () => {
  describe('researchArePrerequisitesMet', () => {
    it('should return true for root nodes with no prerequisites', () => {
      expect(researchArePrerequisitesMet(darkFundamentalsNode, [])).toBe(true);
    });

    it('should return false when prerequisites are not completed', () => {
      expect(researchArePrerequisitesMet(soulManipulationNode, [])).toBe(false);
    });

    it('should return true when all prerequisites are completed', () => {
      expect(
        researchArePrerequisitesMet(soulManipulationNode, [
          NODE_DARK_FUNDAMENTALS_ID,
        ]),
      ).toBe(true);
    });
  });

  describe('researchCanStart', () => {
    it('should allow starting a root node with sufficient resources', () => {
      const result = researchCanStart(
        NODE_DARK_FUNDAMENTALS_ID,
        makeResearchState(),
      );
      expect(result.canStart).toBe(true);
    });

    it('should block when another research is already active', () => {
      const result = researchCanStart(
        NODE_DARK_FUNDAMENTALS_ID,
        makeResearchState({ activeResearch: NODE_SOUL_MANIPULATION_ID }),
      );
      expect(result.canStart).toBe(false);
      expect(result.error).toBe('Another research is already active');
    });

    it('should block when prerequisites are not met', () => {
      const result = researchCanStart(
        NODE_SOUL_MANIPULATION_ID,
        makeResearchState(),
      );
      expect(result.canStart).toBe(false);
      expect(result.error).toBe('Prerequisites not met');
    });

    it('should block when research is already completed', () => {
      const result = researchCanStart(
        NODE_DARK_FUNDAMENTALS_ID,
        makeResearchState({ completedNodes: [NODE_DARK_FUNDAMENTALS_ID] }),
      );
      expect(result.canStart).toBe(false);
      expect(result.error).toBe('Research already completed');
    });

    it('should block when player cannot afford the cost', () => {
      mockResourceCanAfford.mockReturnValue(false);
      const result = researchCanStart(
        NODE_DARK_FUNDAMENTALS_ID,
        makeResearchState(),
      );
      expect(result.canStart).toBe(false);
      expect(result.error).toBe('Insufficient resources');
    });

    it('should block for unknown node ID', () => {
      const result = researchCanStart(
        'nonexistent-id' as ResearchId,
        makeResearchState(),
      );
      expect(result.canStart).toBe(false);
      expect(result.error).toBe('Research node not found');
    });
  });

  describe('researchStart', () => {
    it('should deduct resources and set active research', async () => {
      const result = await researchStart(NODE_DARK_FUNDAMENTALS_ID);
      expect(result.success).toBe(true);
      expect(mockResourcePayCost).toHaveBeenCalledWith({ research: 10 });
      expect(mockGameState.world.research.activeResearch).toBe(
        NODE_DARK_FUNDAMENTALS_ID,
      );
      expect(mockGameState.world.research.activeResearchProgress).toBe(0);
    });

    it('should fail when resources cannot be paid', async () => {
      mockResourcePayCost.mockResolvedValue(false);
      const result = await researchStart(NODE_DARK_FUNDAMENTALS_ID);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to deduct resources');
    });

    it('should fail when another research is active', async () => {
      mockGameState = makeGameState({
        research: makeResearchState({
          activeResearch: NODE_SOUL_MANIPULATION_ID,
        }),
      });
      const result = await researchStart(NODE_DARK_FUNDAMENTALS_ID);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Another research is already active');
    });
  });
});

// ===================================================================
// US-002: Research Tick Advancement
// ===================================================================

describe('US-002: Research Tick Advancement', () => {
  it('should advance progress by base amount each tick', () => {
    const state = makeGameState({
      research: makeResearchState({
        activeResearch: NODE_DARK_FUNDAMENTALS_ID,
        activeResearchProgress: 0,
      }),
    });

    researchProcess(state);

    expect(state.world.research.activeResearchProgress).toBe(
      RESEARCH_BASE_PROGRESS_PER_TICK,
    );
  });

  it('should accumulate progress across multiple ticks', () => {
    const state = makeGameState({
      research: makeResearchState({
        activeResearch: NODE_DARK_FUNDAMENTALS_ID,
        activeResearchProgress: 10,
      }),
    });

    researchProcess(state);

    expect(state.world.research.activeResearchProgress).toBe(
      10 + RESEARCH_BASE_PROGRESS_PER_TICK,
    );
  });

  it('should not advance when no active research', () => {
    const state = makeGameState({
      research: makeResearchState(),
    });

    researchProcess(state);

    expect(state.world.research.activeResearchProgress).toBe(0);
  });

  it('should not advance for unknown research node', () => {
    const state = makeGameState({
      research: makeResearchState({
        activeResearch: 'nonexistent-id' as ResearchId,
        activeResearchProgress: 5,
      }),
    });

    researchProcess(state);

    expect(state.world.research.activeResearchProgress).toBe(5);
  });

  it('should store progress as raw ticks, not a percentage', () => {
    const state = makeGameState({
      research: makeResearchState({
        activeResearch: NODE_DARK_FUNDAMENTALS_ID,
        activeResearchProgress: 0,
      }),
    });

    researchProcess(state);

    // Progress should be 1 (not 0.02 or 2%), stored as absolute ticks
    expect(state.world.research.activeResearchProgress).toBe(1);
    expect(state.world.research.activeResearchProgress).toBeLessThan(
      darkFundamentalsNode.requiredTicks,
    );
  });
});

// ===================================================================
// US-003: Research Speed Modifiers
// ===================================================================

describe('US-003: Research Speed Modifiers', () => {
  describe('researchCalculateSpeedModifier', () => {
    it('should return 1.0 with no Library rooms or bonuses', () => {
      const modifier = researchCalculateSpeedModifier([makeFloor()]);
      expect(modifier).toBe(1.0);
    });

    it('should add bonus for each Library room producing research', () => {
      const floors = [
        makeFloor([
          {
            id: 'lib-1' as PlacedRoomId,
            roomTypeId: SHADOW_LIBRARY_ID as RoomId,
            shapeId: 'shape-l' as RoomShapeId,
            anchorX: 0,
            anchorY: 0,
          },
        ]),
      ];

      const modifier = researchCalculateSpeedModifier(floors);
      expect(modifier).toBeCloseTo(1.0 + RESEARCH_LIBRARY_BONUS_PER_ROOM);
    });

    it('should stack library bonuses additively', () => {
      const floors = [
        makeFloor([
          {
            id: 'lib-1' as PlacedRoomId,
            roomTypeId: SHADOW_LIBRARY_ID as RoomId,
            shapeId: 'shape-l' as RoomShapeId,
            anchorX: 0,
            anchorY: 0,
          },
          {
            id: 'lib-2' as PlacedRoomId,
            roomTypeId: SHADOW_LIBRARY_ID as RoomId,
            shapeId: 'shape-l' as RoomShapeId,
            anchorX: 5,
            anchorY: 0,
          },
        ]),
      ];

      const modifier = researchCalculateSpeedModifier(floors);
      expect(modifier).toBeCloseTo(1.0 + 2 * RESEARCH_LIBRARY_BONUS_PER_ROOM);
    });

    it('should include ruler research speed bonus', () => {
      vi.mocked(throneRoomGetRulerBonusValue).mockReturnValue(0.2);

      const modifier = researchCalculateSpeedModifier([makeFloor()]);
      expect(modifier).toBeCloseTo(1.2);
    });

    it('should combine library and ruler bonuses additively', () => {
      vi.mocked(throneRoomGetRulerBonusValue).mockReturnValue(0.2);

      const floors = [
        makeFloor([
          {
            id: 'lib-1' as PlacedRoomId,
            roomTypeId: SHADOW_LIBRARY_ID as RoomId,
            shapeId: 'shape-l' as RoomShapeId,
            anchorX: 0,
            anchorY: 0,
          },
        ]),
      ];

      const modifier = researchCalculateSpeedModifier(floors);
      // 1 + 0.1 (library) + 0.2 (ruler) = 1.3
      expect(modifier).toBeCloseTo(1.3);
    });
  });

  it('should apply speed modifier to progress advancement', () => {
    vi.mocked(throneRoomGetRulerBonusValue).mockReturnValue(0.5);

    const state = makeGameState({
      research: makeResearchState({
        activeResearch: NODE_DARK_FUNDAMENTALS_ID,
        activeResearchProgress: 0,
      }),
    });

    researchProcess(state);

    // base * (1 + 0.5) = 1 * 1.5 = 1.5
    expect(state.world.research.activeResearchProgress).toBeCloseTo(1.5);
  });
});

// ===================================================================
// US-004: Research Completion
// ===================================================================

describe('US-004: Research Completion', () => {
  it('should complete research when progress reaches requiredTicks', () => {
    const state = makeGameState({
      research: makeResearchState({
        activeResearch: NODE_DARK_FUNDAMENTALS_ID,
        activeResearchProgress: 49, // one tick away from 50
      }),
    });

    researchProcess(state);

    expect(state.world.research.completedNodes).toContain(
      NODE_DARK_FUNDAMENTALS_ID,
    );
    expect(state.world.research.activeResearch).toBeUndefined();
    expect(state.world.research.activeResearchProgress).toBe(0);
  });

  it('should complete research when progress exceeds requiredTicks', () => {
    const state = makeGameState({
      research: makeResearchState({
        activeResearch: NODE_DARK_FUNDAMENTALS_ID,
        activeResearchProgress: 55, // already past
      }),
    });

    researchProcess(state);

    expect(state.world.research.completedNodes).toContain(
      NODE_DARK_FUNDAMENTALS_ID,
    );
  });

  it('should add to existing completedNodes', () => {
    const state = makeGameState({
      research: makeResearchState({
        completedNodes: [NODE_DARK_FUNDAMENTALS_ID],
        activeResearch: NODE_SOUL_MANIPULATION_ID,
        activeResearchProgress: 149,
      }),
    });

    researchProcess(state);

    expect(state.world.research.completedNodes).toEqual([
      NODE_DARK_FUNDAMENTALS_ID,
      NODE_SOUL_MANIPULATION_ID,
    ]);
  });

  it('should reset progress and activeResearch on completion', () => {
    const state = makeGameState({
      research: makeResearchState({
        activeResearch: NODE_DARK_FUNDAMENTALS_ID,
        activeResearchProgress: 49,
        activeResearchStartTick: 50,
      }),
    });

    researchProcess(state);

    expect(state.world.research.activeResearch).toBeUndefined();
    expect(state.world.research.activeResearchProgress).toBe(0);
    expect(state.world.research.activeResearchStartTick).toBe(0);
  });

  it('should call researchUnlockProcessCompletion on completion', () => {
    const state = makeGameState({
      research: makeResearchState({
        activeResearch: NODE_DARK_FUNDAMENTALS_ID,
        activeResearchProgress: 49,
      }),
    });

    researchProcess(state);

    expect(mockResearchUnlockProcessCompletion).toHaveBeenCalledWith(
      NODE_DARK_FUNDAMENTALS_ID,
      state,
    );
  });

  it('should not call researchUnlockProcessCompletion when not completing', () => {
    const state = makeGameState({
      research: makeResearchState({
        activeResearch: NODE_DARK_FUNDAMENTALS_ID,
        activeResearchProgress: 20,
      }),
    });

    researchProcess(state);

    expect(mockResearchUnlockProcessCompletion).not.toHaveBeenCalled();
  });

  it('should not complete when progress is below requiredTicks', () => {
    const state = makeGameState({
      research: makeResearchState({
        activeResearch: NODE_DARK_FUNDAMENTALS_ID,
        activeResearchProgress: 20,
      }),
    });

    researchProcess(state);

    expect(state.world.research.completedNodes).toEqual([]);
    expect(state.world.research.activeResearch).toBe(NODE_DARK_FUNDAMENTALS_ID);
  });
});

// ===================================================================
// US-005: Cancel Active Research
// ===================================================================

describe('US-005: Cancel Active Research', () => {
  it('should clear active research and progress', async () => {
    mockGameState = makeGameState({
      research: makeResearchState({
        activeResearch: NODE_DARK_FUNDAMENTALS_ID,
        activeResearchProgress: 25,
        activeResearchStartTick: 50,
      }),
    });

    const result = await researchCancel();

    expect(result).toBe(true);
    expect(mockGameState.world.research.activeResearch).toBeUndefined();
    expect(mockGameState.world.research.activeResearchProgress).toBe(0);
    expect(mockGameState.world.research.activeResearchStartTick).toBe(0);
  });

  it('should return false when no active research', async () => {
    mockGameState = makeGameState({
      research: makeResearchState(),
    });

    const result = await researchCancel();
    expect(result).toBe(false);
  });

  it('should preserve completed nodes after cancellation', async () => {
    mockGameState = makeGameState({
      research: makeResearchState({
        completedNodes: [NODE_DARK_FUNDAMENTALS_ID],
        activeResearch: NODE_SOUL_MANIPULATION_ID,
        activeResearchProgress: 75,
      }),
    });

    await researchCancel();

    expect(mockGameState.world.research.completedNodes).toEqual([
      NODE_DARK_FUNDAMENTALS_ID,
    ]);
  });

  it('should allow restarting the same research after cancellation', async () => {
    mockGameState = makeGameState({
      research: makeResearchState({
        activeResearch: NODE_DARK_FUNDAMENTALS_ID,
        activeResearchProgress: 25,
      }),
    });

    await researchCancel();

    const validation = researchCanStart(
      NODE_DARK_FUNDAMENTALS_ID,
      mockGameState.world.research,
    );
    expect(validation.canStart).toBe(true);
  });
});

// ===================================================================
// US-006: Persist Research Progress
// ===================================================================

describe('US-006: Persist Research Progress', () => {
  it('should include research state in GameStateWorld', () => {
    const state = makeGameState();
    expect(state.world.research).toBeDefined();
    expect(state.world.research.completedNodes).toEqual([]);
    expect(state.world.research.activeResearch).toBeUndefined();
    expect(state.world.research.activeResearchProgress).toBe(0);
  });

  it('should preserve completed nodes through state operations', () => {
    const state = makeGameState({
      research: makeResearchState({
        completedNodes: [NODE_DARK_FUNDAMENTALS_ID, NODE_SOUL_MANIPULATION_ID],
        activeResearch: NODE_SHADOW_MAGIC_ID,
        activeResearchProgress: 42,
        activeResearchStartTick: 100,
      }),
    });

    expect(state.world.research.completedNodes).toHaveLength(2);
    expect(state.world.research.activeResearch).toBe(NODE_SHADOW_MAGIC_ID);
    expect(state.world.research.activeResearchProgress).toBe(42);
    expect(state.world.research.activeResearchStartTick).toBe(100);
  });

  it('should resume active research from saved progress', () => {
    const savedProgress = 30;
    const state = makeGameState({
      research: makeResearchState({
        activeResearch: NODE_DARK_FUNDAMENTALS_ID,
        activeResearchProgress: savedProgress,
      }),
    });

    researchProcess(state);

    expect(state.world.research.activeResearchProgress).toBe(
      savedProgress + RESEARCH_BASE_PROGRESS_PER_TICK,
    );
  });

  it('should restore completed nodes and reflect them in prerequisite checks', () => {
    const state = makeGameState({
      research: makeResearchState({
        completedNodes: [NODE_DARK_FUNDAMENTALS_ID],
      }),
    });

    const canStartSoul = researchCanStart(
      NODE_SOUL_MANIPULATION_ID,
      state.world.research,
    );
    expect(canStartSoul.canStart).toBe(true);

    const canStartDark = researchCanStart(
      NODE_DARK_FUNDAMENTALS_ID,
      state.world.research,
    );
    expect(canStartDark.canStart).toBe(false);
    expect(canStartDark.error).toBe('Research already completed');
  });
});
