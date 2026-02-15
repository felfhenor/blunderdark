import type {
  GameState,
  InhabitantContent,
  InhabitantId,
  InhabitantInstance,
  InhabitantInstanceId,
  PlacedRoom,
  PlacedRoomId,
  RoomId,
  VictoryPathContent,
  VictoryPathId,
} from '@interfaces';
import { describe, expect, it, vi } from 'vitest';

const TEST_DEMON_LORD_ID = 'demon-lord-id' as InhabitantId;
const TEST_DRAGON_ID = 'dragon-id' as InhabitantId;
const TEST_PERFECT_CREATURE_ID = 'perfect-creature-id' as InhabitantId;
const TEST_UNIQUE_INHABITANT_ID = 'unique-inh-id' as InhabitantId;
const TEST_THRONE_ROOM_ID = 'throne-room-id' as RoomId;
const TEST_DRAGON_LAIR_ID = 'dragon-lair-id' as RoomId;
const TEST_BREEDING_PITS_ID = 'breeding-pits-id' as RoomId;
const TEST_RESEARCH_A = 'research-a';
const TEST_RESEARCH_B = 'research-b';

vi.mock('@helpers/content', () => ({
  contentGetEntry: vi.fn((idOrName: string) => {
    switch (idOrName) {
      case 'Demon Lord':
        return {
          id: TEST_DEMON_LORD_ID,
          name: 'Demon Lord',
          __type: 'inhabitant',
        };
      case 'Dragon':
        return {
          id: TEST_DRAGON_ID,
          name: 'Dragon',
          __type: 'inhabitant',
        };
      case 'Perfect Creature':
        return {
          id: TEST_PERFECT_CREATURE_ID,
          name: 'Perfect Creature',
          __type: 'inhabitant',
        };
      case TEST_UNIQUE_INHABITANT_ID:
        return {
          id: TEST_UNIQUE_INHABITANT_ID,
          name: 'Beholder',
          __type: 'inhabitant',
          restrictionTags: ['unique'],
        } as InhabitantContent;
      case TEST_THRONE_ROOM_ID:
        return { name: 'Throne Room', __type: 'room' };
      case TEST_DRAGON_LAIR_ID:
        return { name: 'Dragon Lair', __type: 'room' };
      case TEST_BREEDING_PITS_ID:
        return { name: 'Breeding Pits', __type: 'room' };
      default:
        return undefined;
    }
  }),
  contentGetEntriesByType: vi.fn((type: string) => {
    if (type === 'research') {
      return [
        { id: TEST_RESEARCH_A },
        { id: TEST_RESEARCH_B },
      ];
    }
    return [];
  }),
}));

const {
  victoryConditionCheckCorruption,
  victoryConditionCheckInvasionDefenses,
  victoryConditionCheckFloorDepth,
  victoryConditionCheckInhabitantByName,
  victoryConditionCheckGold,
  victoryConditionCheckRoomsBuilt,
  victoryConditionCheckConsecutivePeacefulDays,
  victoryConditionCheckAllResearchComplete,
  victoryConditionCheckHybridCount,
  victoryConditionCheckRoomCountByName,
  victoryConditionCheckPerfectCreature,
  victoryConditionCheckConsecutiveZeroCorruptionDays,
  victoryConditionCheckInhabitantCount,
  victoryConditionCheckFloorCount,
  victoryConditionCheckLegendaryHarmony,
  victoryConditionCheckDayReached,
  victoryConditionCheckAllResourcesPositive,
  victoryConditionCheckUniqueInhabitants,
  victoryConditionCheckTotalRoomCount,
  victoryConditionProcessDayTracking,
  victoryConditionEvaluatePath,
} = await import('@helpers/victory-conditions');

function makeInhabitant(
  definitionId: InhabitantId,
  overrides: Partial<InhabitantInstance> = {},
): InhabitantInstance {
  return {
    instanceId: 'inst-1' as InhabitantInstanceId,
    definitionId,
    name: 'Test',
    state: 'normal',
    assignedRoomId: undefined,
    ...overrides,
  };
}

function makeRoom(
  roomTypeId: RoomId,
  overrides: Partial<PlacedRoom> = {},
): PlacedRoom {
  return {
    id: 'room-1' as PlacedRoomId,
    roomTypeId,
    shapeId: '' as PlacedRoom['shapeId'],
    anchorX: 0,
    anchorY: 0,
    ...overrides,
  };
}

function makeState(overrides: Partial<{
  corruption: number;
  gold: number;
  food: number;
  crystals: number;
  flux: number;
  research: number;
  essence: number;
  inhabitants: InhabitantInstance[];
  floors: GameState['world']['floors'];
  day: number;
  defenseWins: number;
  peacefulDays: number;
  lastPeacefulDay: number;
  zeroCorruptionDays: number;
  lastZeroCorruptionDay: number;
  completedResearch: string[];
  invasionHistory: GameState['world']['invasionSchedule']['invasionHistory'];
  reputation: GameState['world']['reputation'];
}>): GameState {
  return {
    meta: { version: 1, isSetup: true, isPaused: false, createdAt: 0 },
    gameId: 'test' as GameState['gameId'],
    clock: {
      numTicks: 0,
      lastSaveTick: 0,
      day: overrides.day ?? 1,
      hour: 12,
      minute: 0,
    },
    world: {
      resources: {
        gold: { current: overrides.gold ?? 0, max: 1000 },
        crystals: { current: overrides.crystals ?? 0, max: 500 },
        food: { current: overrides.food ?? 50, max: 500 },
        flux: { current: overrides.flux ?? 0, max: 200 },
        research: { current: overrides.research ?? 0, max: 300 },
        essence: { current: overrides.essence ?? 0, max: 200 },
        corruption: {
          current: overrides.corruption ?? 0,
          max: Number.MAX_SAFE_INTEGER,
        },
      },
      inhabitants: overrides.inhabitants ?? [],
      floors: overrides.floors ?? [
        {
          id: 'floor-1',
          name: 'Floor 1',
          depth: 1,
          biome: 'neutral',
          grid: [],
          rooms: [],
          hallways: [],
          inhabitants: [],
          connections: [],
          traps: [],
        },
      ],
      reputation: overrides.reputation ?? {
        terror: 0,
        wealth: 0,
        knowledge: 0,
        harmony: 0,
        chaos: 0,
      },
      research: {
        completedNodes: overrides.completedResearch ?? [],
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
        invasionHistory: overrides.invasionHistory ?? [],
        pendingSpecialInvasions: [],
        warningActive: false,
        warningDismissed: false,
      },
      victoryProgress: {
        consecutivePeacefulDays: overrides.peacefulDays ?? 0,
        lastPeacefulCheckDay: overrides.lastPeacefulDay ?? 0,
        consecutiveZeroCorruptionDays: overrides.zeroCorruptionDays ?? 0,
        lastZeroCorruptionCheckDay: overrides.lastZeroCorruptionDay ?? 0,
        totalInvasionDefenseWins: overrides.defenseWins ?? 0,
      },
    },
  } as unknown as GameState;
}

// === Terror Lord ===

describe('Terror Lord conditions', () => {
  describe('victoryConditionCheckCorruption', () => {
    it('returns met when corruption >= target', () => {
      const state = makeState({ corruption: 500 });
      const result = victoryConditionCheckCorruption(state, 500);
      expect(result.met).toBe(true);
      expect(result.currentValue).toBe(500);
    });

    it('returns not met when corruption < target', () => {
      const state = makeState({ corruption: 499 });
      const result = victoryConditionCheckCorruption(state, 500);
      expect(result.met).toBe(false);
      expect(result.currentValue).toBe(499);
    });

    it('returns met when corruption exceeds target', () => {
      const state = makeState({ corruption: 1000 });
      const result = victoryConditionCheckCorruption(state, 500);
      expect(result.met).toBe(true);
    });
  });

  describe('victoryConditionCheckInvasionDefenses', () => {
    it('returns met at exactly 10 wins', () => {
      const state = makeState({ defenseWins: 10 });
      const result = victoryConditionCheckInvasionDefenses(state, 10);
      expect(result.met).toBe(true);
      expect(result.currentValue).toBe(10);
    });

    it('returns not met at 9 wins', () => {
      const state = makeState({ defenseWins: 9 });
      const result = victoryConditionCheckInvasionDefenses(state, 10);
      expect(result.met).toBe(false);
    });
  });

  describe('victoryConditionCheckFloorDepth', () => {
    it('returns met when max floor depth >= target', () => {
      const state = makeState({
        floors: [
          { id: 'f1', name: 'Floor 1', depth: 1, biome: 'neutral', grid: [], rooms: [], hallways: [], inhabitants: [], connections: [], traps: [] },
          { id: 'f10', name: 'Floor 10', depth: 10, biome: 'neutral', grid: [], rooms: [], hallways: [], inhabitants: [], connections: [], traps: [] },
        ] as unknown as GameState['world']['floors'],
      });
      const result = victoryConditionCheckFloorDepth(state, 10);
      expect(result.met).toBe(true);
      expect(result.currentValue).toBe(10);
    });

    it('returns not met when max depth < target', () => {
      const state = makeState({
        floors: [
          { id: 'f1', name: 'Floor 1', depth: 5, biome: 'neutral', grid: [], rooms: [], hallways: [], inhabitants: [], connections: [], traps: [] },
        ] as unknown as GameState['world']['floors'],
      });
      const result = victoryConditionCheckFloorDepth(state, 10);
      expect(result.met).toBe(false);
      expect(result.currentValue).toBe(5);
    });
  });

  describe('victoryConditionCheckInhabitantByName', () => {
    it('returns met when Demon Lord is present', () => {
      const state = makeState({
        inhabitants: [makeInhabitant(TEST_DEMON_LORD_ID)],
      });
      const result = victoryConditionCheckInhabitantByName(
        state,
        'Demon Lord',
        'terror_demon_lord',
      );
      expect(result.met).toBe(true);
    });

    it('returns not met when Demon Lord is absent', () => {
      const state = makeState({ inhabitants: [] });
      const result = victoryConditionCheckInhabitantByName(
        state,
        'Demon Lord',
        'terror_demon_lord',
      );
      expect(result.met).toBe(false);
    });
  });
});

// === Dragon's Hoard ===

describe("Dragon's Hoard conditions", () => {
  describe('victoryConditionCheckGold', () => {
    it('returns met at exactly 10000 gold', () => {
      const state = makeState({ gold: 10000 });
      const result = victoryConditionCheckGold(state, 10000);
      expect(result.met).toBe(true);
      expect(result.currentValue).toBe(10000);
    });

    it('returns not met at 9999 gold', () => {
      const state = makeState({ gold: 9999 });
      const result = victoryConditionCheckGold(state, 10000);
      expect(result.met).toBe(false);
    });
  });

  describe('victoryConditionCheckRoomsBuilt', () => {
    it('returns met when both rooms are built', () => {
      const state = makeState({
        floors: [{
          id: 'f1', name: 'Floor 1', depth: 1, biome: 'neutral', grid: [],
          rooms: [
            makeRoom(TEST_THRONE_ROOM_ID),
            makeRoom(TEST_DRAGON_LAIR_ID),
          ],
          hallways: [], inhabitants: [], connections: [], traps: [],
        }] as unknown as GameState['world']['floors'],
      });
      const result = victoryConditionCheckRoomsBuilt(
        state,
        ['Throne Room', 'Dragon Lair'],
        'hoard_rooms',
      );
      expect(result.met).toBe(true);
      expect(result.currentValue).toBe(2);
    });

    it('returns not met when only one room is built', () => {
      const state = makeState({
        floors: [{
          id: 'f1', name: 'Floor 1', depth: 1, biome: 'neutral', grid: [],
          rooms: [makeRoom(TEST_THRONE_ROOM_ID)],
          hallways: [], inhabitants: [], connections: [], traps: [],
        }] as unknown as GameState['world']['floors'],
      });
      const result = victoryConditionCheckRoomsBuilt(
        state,
        ['Throne Room', 'Dragon Lair'],
        'hoard_rooms',
      );
      expect(result.met).toBe(false);
      expect(result.currentValue).toBe(1);
    });
  });

  describe('victoryConditionCheckConsecutivePeacefulDays', () => {
    it('returns met at 30 peaceful days', () => {
      const state = makeState({ peacefulDays: 30 });
      const result = victoryConditionCheckConsecutivePeacefulDays(state, 30);
      expect(result.met).toBe(true);
    });

    it('returns not met at 29 peaceful days', () => {
      const state = makeState({ peacefulDays: 29 });
      const result = victoryConditionCheckConsecutivePeacefulDays(state, 30);
      expect(result.met).toBe(false);
    });
  });

  describe('Dragon inhabitant check', () => {
    it('returns met when Dragon is present', () => {
      const state = makeState({
        inhabitants: [makeInhabitant(TEST_DRAGON_ID)],
      });
      const result = victoryConditionCheckInhabitantByName(
        state,
        'Dragon',
        'hoard_dragon',
      );
      expect(result.met).toBe(true);
    });
  });
});

// === Mad Scientist ===

describe('Mad Scientist conditions', () => {
  describe('victoryConditionCheckAllResearchComplete', () => {
    it('returns met when all research nodes are completed', () => {
      const state = makeState({
        completedResearch: [TEST_RESEARCH_A, TEST_RESEARCH_B],
      });
      const result = victoryConditionCheckAllResearchComplete(state);
      expect(result.met).toBe(true);
    });

    it('returns not met when some research is incomplete', () => {
      const state = makeState({
        completedResearch: [TEST_RESEARCH_A],
      });
      const result = victoryConditionCheckAllResearchComplete(state);
      expect(result.met).toBe(false);
    });

    it('returns not met when no research is completed', () => {
      const state = makeState({});
      const result = victoryConditionCheckAllResearchComplete(state);
      expect(result.met).toBe(false);
    });
  });

  describe('victoryConditionCheckHybridCount', () => {
    it('returns met with 5 unique hybrids', () => {
      const hybrids = Array.from({ length: 5 }, (_, i) =>
        makeInhabitant(`hybrid-${i}` as InhabitantId, {
          instanceId: `inst-${i}` as InhabitantInstanceId,
          definitionId: `hybrid-def-${i}` as InhabitantId,
          isHybrid: true,
        }),
      );
      const state = makeState({ inhabitants: hybrids });
      const result = victoryConditionCheckHybridCount(state, 5);
      expect(result.met).toBe(true);
      expect(result.currentValue).toBe(5);
    });

    it('counts unique definitions not instances', () => {
      const hybrids = [
        makeInhabitant('hybrid-a' as InhabitantId, {
          instanceId: 'i1' as InhabitantInstanceId,
          definitionId: 'hybrid-def-a' as InhabitantId,
          isHybrid: true,
        }),
        makeInhabitant('hybrid-a' as InhabitantId, {
          instanceId: 'i2' as InhabitantInstanceId,
          definitionId: 'hybrid-def-a' as InhabitantId,
          isHybrid: true,
        }),
      ];
      const state = makeState({ inhabitants: hybrids });
      const result = victoryConditionCheckHybridCount(state, 2);
      expect(result.met).toBe(false);
      expect(result.currentValue).toBe(1);
    });

    it('ignores non-hybrid inhabitants', () => {
      const inhabitants = [
        makeInhabitant('normal-1' as InhabitantId, { isHybrid: false }),
        makeInhabitant('hybrid-1' as InhabitantId, {
          instanceId: 'i1' as InhabitantInstanceId,
          definitionId: 'hybrid-def-1' as InhabitantId,
          isHybrid: true,
        }),
      ];
      const state = makeState({ inhabitants });
      const result = victoryConditionCheckHybridCount(state, 2);
      expect(result.met).toBe(false);
      expect(result.currentValue).toBe(1);
    });
  });

  describe('victoryConditionCheckRoomCountByName', () => {
    it('returns met with 3 Breeding Pits', () => {
      const state = makeState({
        floors: [{
          id: 'f1', name: 'Floor 1', depth: 1, biome: 'neutral', grid: [],
          rooms: [
            makeRoom(TEST_BREEDING_PITS_ID, { id: 'r1' as PlacedRoomId }),
            makeRoom(TEST_BREEDING_PITS_ID, { id: 'r2' as PlacedRoomId }),
            makeRoom(TEST_BREEDING_PITS_ID, { id: 'r3' as PlacedRoomId }),
          ],
          hallways: [], inhabitants: [], connections: [], traps: [],
        }] as unknown as GameState['world']['floors'],
      });
      const result = victoryConditionCheckRoomCountByName(
        state,
        'Breeding Pits',
        3,
        'scientist_pits',
      );
      expect(result.met).toBe(true);
      expect(result.currentValue).toBe(3);
    });

    it('returns not met with fewer rooms', () => {
      const state = makeState({
        floors: [{
          id: 'f1', name: 'Floor 1', depth: 1, biome: 'neutral', grid: [],
          rooms: [makeRoom(TEST_BREEDING_PITS_ID)],
          hallways: [], inhabitants: [], connections: [], traps: [],
        }] as unknown as GameState['world']['floors'],
      });
      const result = victoryConditionCheckRoomCountByName(
        state,
        'Breeding Pits',
        3,
        'scientist_pits',
      );
      expect(result.met).toBe(false);
      expect(result.currentValue).toBe(1);
    });
  });

  describe('victoryConditionCheckPerfectCreature', () => {
    it('returns met when Perfect Creature exists', () => {
      const state = makeState({
        inhabitants: [makeInhabitant(TEST_PERFECT_CREATURE_ID)],
      });
      const result = victoryConditionCheckPerfectCreature(state);
      expect(result.met).toBe(true);
    });

    it('returns not met when absent', () => {
      const state = makeState({});
      const result = victoryConditionCheckPerfectCreature(state);
      expect(result.met).toBe(false);
    });
  });
});

// === Harmonious Kingdom ===

describe('Harmonious Kingdom conditions', () => {
  describe('victoryConditionCheckConsecutiveZeroCorruptionDays', () => {
    it('returns met at 30 zero-corruption days', () => {
      const state = makeState({ zeroCorruptionDays: 30 });
      const result = victoryConditionCheckConsecutiveZeroCorruptionDays(
        state,
        30,
      );
      expect(result.met).toBe(true);
    });

    it('returns not met at 29 days', () => {
      const state = makeState({ zeroCorruptionDays: 29 });
      const result = victoryConditionCheckConsecutiveZeroCorruptionDays(
        state,
        30,
      );
      expect(result.met).toBe(false);
    });
  });

  describe('victoryConditionCheckInhabitantCount', () => {
    it('returns met with 50 inhabitants', () => {
      const inhabitants = Array.from({ length: 50 }, (_, i) =>
        makeInhabitant('inh-1' as InhabitantId, {
          instanceId: `inst-${i}` as InhabitantInstanceId,
        }),
      );
      const state = makeState({ inhabitants });
      const result = victoryConditionCheckInhabitantCount(
        state,
        50,
        'harmony_population',
      );
      expect(result.met).toBe(true);
    });

    it('returns not met with fewer', () => {
      const state = makeState({ inhabitants: [makeInhabitant('inh-1' as InhabitantId)] });
      const result = victoryConditionCheckInhabitantCount(
        state,
        50,
        'harmony_population',
      );
      expect(result.met).toBe(false);
    });
  });

  describe('victoryConditionCheckFloorCount', () => {
    it('returns met with 7 floors', () => {
      const floors = Array.from({ length: 7 }, (_, i) => ({
        id: `f${i}`, name: `Floor ${i + 1}`, depth: i + 1, biome: 'neutral',
        grid: [], rooms: [], hallways: [], inhabitants: [], connections: [], traps: [],
      })) as unknown as GameState['world']['floors'];
      const state = makeState({ floors });
      const result = victoryConditionCheckFloorCount(state, 7);
      expect(result.met).toBe(true);
      expect(result.currentValue).toBe(7);
    });
  });

  describe('victoryConditionCheckLegendaryHarmony', () => {
    it('returns met at 700 harmony (legendary threshold)', () => {
      const state = makeState({
        reputation: { terror: 0, wealth: 0, knowledge: 0, harmony: 700, chaos: 0 },
      });
      const result = victoryConditionCheckLegendaryHarmony(state);
      expect(result.met).toBe(true);
    });

    it('returns not met at 699 harmony', () => {
      const state = makeState({
        reputation: { terror: 0, wealth: 0, knowledge: 0, harmony: 699, chaos: 0 },
      });
      const result = victoryConditionCheckLegendaryHarmony(state);
      expect(result.met).toBe(false);
    });
  });
});

// === Eternal Empire ===

describe('Eternal Empire conditions', () => {
  describe('victoryConditionCheckDayReached', () => {
    it('returns met at day 365', () => {
      const state = makeState({ day: 365 });
      const result = victoryConditionCheckDayReached(state, 365);
      expect(result.met).toBe(true);
    });

    it('returns not met at day 364', () => {
      const state = makeState({ day: 364 });
      const result = victoryConditionCheckDayReached(state, 365);
      expect(result.met).toBe(false);
    });
  });

  describe('victoryConditionCheckAllResourcesPositive', () => {
    it('returns met when all resources are > 0', () => {
      const state = makeState({
        gold: 1,
        crystals: 1,
        food: 1,
        flux: 1,
        research: 1,
        essence: 1,
      });
      const result = victoryConditionCheckAllResourcesPositive(state);
      expect(result.met).toBe(true);
    });

    it('returns not met when any resource is 0', () => {
      const state = makeState({
        gold: 1,
        crystals: 0,
        food: 1,
        flux: 1,
        research: 1,
        essence: 1,
      });
      const result = victoryConditionCheckAllResourcesPositive(state);
      expect(result.met).toBe(false);
    });
  });

  describe('victoryConditionCheckUniqueInhabitants', () => {
    it('returns met with 3 unique inhabitants', () => {
      const inhabitants = Array.from({ length: 3 }, (_, i) =>
        makeInhabitant(TEST_UNIQUE_INHABITANT_ID, {
          instanceId: `inst-${i}` as InhabitantInstanceId,
        }),
      );
      const state = makeState({ inhabitants });
      const result = victoryConditionCheckUniqueInhabitants(state, 3);
      expect(result.met).toBe(true);
      expect(result.currentValue).toBe(3);
    });

    it('returns not met with fewer', () => {
      const state = makeState({
        inhabitants: [makeInhabitant(TEST_UNIQUE_INHABITANT_ID)],
      });
      const result = victoryConditionCheckUniqueInhabitants(state, 3);
      expect(result.met).toBe(false);
    });
  });

  describe('victoryConditionCheckTotalRoomCount', () => {
    it('counts rooms across all floors', () => {
      const floors = [
        {
          id: 'f1', name: 'Floor 1', depth: 1, biome: 'neutral', grid: [],
          rooms: Array.from({ length: 60 }, (_, i) =>
            makeRoom(TEST_THRONE_ROOM_ID, { id: `r${i}` as PlacedRoomId }),
          ),
          hallways: [], inhabitants: [], connections: [], traps: [],
        },
        {
          id: 'f2', name: 'Floor 2', depth: 2, biome: 'neutral', grid: [],
          rooms: Array.from({ length: 41 }, (_, i) =>
            makeRoom(TEST_THRONE_ROOM_ID, { id: `r${60 + i}` as PlacedRoomId }),
          ),
          hallways: [], inhabitants: [], connections: [], traps: [],
        },
      ] as unknown as GameState['world']['floors'];
      const state = makeState({ floors });
      const result = victoryConditionCheckTotalRoomCount(state, 100);
      expect(result.met).toBe(true);
      expect(result.currentValue).toBe(101);
    });
  });
});

// === Day Tracking ===

describe('victoryConditionProcessDayTracking', () => {
  describe('peaceful day tracking', () => {
    it('increments peaceful days when no invasion on current day', () => {
      const state = makeState({
        day: 5,
        lastPeacefulDay: 4,
        peacefulDays: 3,
      });
      victoryConditionProcessDayTracking(state);
      expect(state.world.victoryProgress.consecutivePeacefulDays).toBe(4);
      expect(state.world.victoryProgress.lastPeacefulCheckDay).toBe(5);
    });

    it('resets peaceful days when invasion occurred on current day', () => {
      const state = makeState({
        day: 5,
        lastPeacefulDay: 4,
        peacefulDays: 10,
        invasionHistory: [{ day: 5, type: 'scheduled' as const }],
      });
      victoryConditionProcessDayTracking(state);
      expect(state.world.victoryProgress.consecutivePeacefulDays).toBe(0);
    });

    it('does not re-process same day', () => {
      const state = makeState({
        day: 5,
        lastPeacefulDay: 5,
        peacefulDays: 3,
      });
      victoryConditionProcessDayTracking(state);
      expect(state.world.victoryProgress.consecutivePeacefulDays).toBe(3);
    });
  });

  describe('zero corruption tracking', () => {
    it('increments when corruption is 0', () => {
      const state = makeState({
        day: 5,
        lastZeroCorruptionDay: 4,
        zeroCorruptionDays: 10,
        corruption: 0,
      });
      victoryConditionProcessDayTracking(state);
      expect(state.world.victoryProgress.consecutiveZeroCorruptionDays).toBe(
        11,
      );
    });

    it('resets when corruption is > 0', () => {
      const state = makeState({
        day: 5,
        lastZeroCorruptionDay: 4,
        zeroCorruptionDays: 10,
        corruption: 1,
      });
      victoryConditionProcessDayTracking(state);
      expect(state.world.victoryProgress.consecutiveZeroCorruptionDays).toBe(
        0,
      );
    });
  });
});

// === Path Evaluation ===

describe('victoryConditionEvaluatePath', () => {
  it('evaluates Terror Lord path as complete when all conditions met', () => {
    const state = makeState({
      corruption: 500,
      defenseWins: 10,
      floors: [
        { id: 'f10', name: 'Floor 10', depth: 10, biome: 'neutral', grid: [], rooms: [], hallways: [], inhabitants: [], connections: [], traps: [] },
      ] as unknown as GameState['world']['floors'],
      inhabitants: [makeInhabitant(TEST_DEMON_LORD_ID)],
    });
    const path: VictoryPathContent = {
      id: 'terror-lord-id' as VictoryPathId,
      name: 'Terror Lord',
      __type: 'victorypath',
      description: '',
      conditions: [
        { id: 'terror_corruption', description: '', checkType: 'resource_threshold', target: 500 },
        { id: 'terror_defenses', description: '', checkType: 'count', target: 10 },
        { id: 'terror_depth', description: '', checkType: 'count', target: 10 },
        { id: 'terror_demon_lord', description: '', checkType: 'flag', target: 1 },
      ],
    };
    const result = victoryConditionEvaluatePath(path, state);
    expect(result.complete).toBe(true);
    expect(result.conditions.every((c) => c.met)).toBe(true);
  });

  it('evaluates path as incomplete when some conditions fail', () => {
    const state = makeState({ corruption: 100, defenseWins: 5 });
    const path: VictoryPathContent = {
      id: 'terror-lord-id' as VictoryPathId,
      name: 'Terror Lord',
      __type: 'victorypath',
      description: '',
      conditions: [
        { id: 'terror_corruption', description: '', checkType: 'resource_threshold', target: 500 },
        { id: 'terror_defenses', description: '', checkType: 'count', target: 10 },
      ],
    };
    const result = victoryConditionEvaluatePath(path, state);
    expect(result.complete).toBe(false);
  });
});
