import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { GameState } from '@interfaces';
import type { InvasionObjective } from '@interfaces/invasion-objective';
import {
  invasionObjectiveAssign,
  invasionObjectiveUpdateProgress,
  invasionObjectiveCalculateSlayMonsterProgress,
  invasionObjectiveCalculateStealTreasureProgress,
  invasionObjectiveCalculateSealPortalProgress,
  invasionObjectiveResolveOutcome,
  invasionObjectiveResetCache,
} from '@helpers/invasion-objectives';

vi.mock('@helpers/state-game', () => ({
  gamestate: vi.fn(() => ({})),
  updateGamestate: vi.fn(),
}));

// --- Test helpers ---

const ALTAR_ROOM_TYPE_ID = 'aa100001-0001-0001-0001-000000000009';
const TREASURE_VAULT_TYPE_ID = 'aa100001-0001-0001-0001-000000000008';
const SHADOW_LIBRARY_TYPE_ID = 'aa100001-0001-0001-0001-000000000004';
const LEY_LINE_NEXUS_TYPE_ID = 'aa100001-0001-0001-0001-000000000011';

const mockContent = new Map<string, unknown>();

const mockRoomDefs = [
  { id: ALTAR_ROOM_TYPE_ID, __type: 'room', role: 'altar', objectiveTypes: ['DestroyAltar'] },
  { id: TREASURE_VAULT_TYPE_ID, __type: 'room', objectiveTypes: ['StealTreasure', 'PlunderVault'] },
  { id: SHADOW_LIBRARY_TYPE_ID, __type: 'room', objectiveTypes: ['DefileLibrary'] },
  { id: LEY_LINE_NEXUS_TYPE_ID, __type: 'room', objectiveTypes: ['SealPortal'] },
];

vi.mock('@helpers/content', () => ({
  contentGetEntry: vi.fn((id: string) => mockContent.get(id)),
  contentGetEntriesByType: vi.fn((type: string) => {
    if (type === 'room') return mockRoomDefs;
    return [];
  }),
}));

vi.mock('@helpers/room-roles', () => ({
  roomRoleFindById: vi.fn((role: string) => {
    if (role === 'altar') return ALTAR_ROOM_TYPE_ID;
    return undefined;
  }),
  roomRoleResetCache: vi.fn(),
}));

function makeRoom(
  id: string,
  roomTypeId: string,
): {
  id: string;
  roomTypeId: string;
  anchorX: number;
  anchorY: number;
  shapeId: string;
  upgrades: never[];
  assignedInhabitants: never[];
} {
  return {
    id,
    roomTypeId,
    anchorX: 0,
    anchorY: 0,
    shapeId: 'test',
    upgrades: [],
    assignedInhabitants: [],
  };
}

function registerInhabitantDefs(
  inhabitants: Array<{ id: string; tier?: number }>,
): void {
  for (const i of inhabitants) {
    mockContent.set(`def-${i.id}`, {
      id: `def-${i.id}`,
      name: `definition-${i.id}`,
      __type: 'inhabitant',
      tier: i.tier ?? 1,
    });
  }
}

function makeGameState(overrides: {
  rooms?: Array<{ id: string; roomTypeId: string }>;
  inhabitants?: Array<{ id: string; tier?: number }>;
}): GameState {
  // Register inhabitant definitions in mock content
  if (overrides.inhabitants) {
    registerInhabitantDefs(overrides.inhabitants);
  }
  const rooms = (overrides.rooms ?? []).map((r) =>
    makeRoom(r.id, r.roomTypeId),
  );

  return {
    meta: { version: 1, isSetup: true, isPaused: false, createdAt: 0 },
    gameId: 'test-game' as GameState['gameId'],
    clock: { numTicks: 0, lastSaveTick: 0, day: 50, hour: 0, minute: 0 },
    world: {
      grid: { tiles: [], width: 0, height: 0 },
      resources: {
        crystals: { current: 0, max: 500 },
        food: { current: 0, max: 500 },
        gold: { current: 100, max: 1000 },
        flux: { current: 0, max: 200 },
        research: { current: 0, max: 300 },
        essence: { current: 0, max: 200 },
        corruption: { current: 0, max: 100 },
      },
      inhabitants: (overrides.inhabitants ?? []).map((i) => ({
        instanceId: i.id,
        definitionId: `def-${i.id}`,
        name: `inhabitant-${i.id}`,
        state: 'normal' as const,
        assignedRoomId: undefined,
      })),
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
      reputation: {
        terror: 0,
        wealth: 0,
        knowledge: 0,
        harmony: 0,
        chaos: 0,
      },
      floors: [
        {
          id: 'floor-1',
          name: 'Floor 1',
          depth: 1,
          biome: 'neutral',
          grid: { tiles: [], width: 0, height: 0 },
          rooms,
          hallways: [],
          inhabitants: [],
          connections: [],
          traps: [],
        },
      ],
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
    },
  } as unknown as GameState;
}

function makeObjective(
  overrides: Partial<InvasionObjective> = {},
): InvasionObjective {
  return {
    id: 'obj-1',
    type: 'DestroyAltar',
    name: 'Destroy Altar',
    description: 'Test objective',
    targetId: 'altar-1',
    isPrimary: true,
    isCompleted: false,
    progress: 0,
    ...overrides,
  };
}

// --- Tests ---

describe('invasion-objectives', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContent.clear();
    invasionObjectiveResetCache();
  });

  // --- invasionObjectiveAssign ---

  describe('invasionObjectiveAssign', () => {
    it('should always include a primary Destroy Altar objective', () => {
      const state = makeGameState({
        rooms: [{ id: 'altar-1', roomTypeId: ALTAR_ROOM_TYPE_ID }],
      });
      const objectives = invasionObjectiveAssign(state, 'test-seed');
      const primary = objectives.find((o) => o.isPrimary);
      expect(primary).toBeDefined();
      expect(primary!.type).toBe('DestroyAltar');
      expect(primary!.targetId).toBe('altar-1');
    });

    it('should assign exactly 2 secondary objectives when eligible', () => {
      const state = makeGameState({
        rooms: [
          { id: 'altar-1', roomTypeId: ALTAR_ROOM_TYPE_ID },
          { id: 'vault-1', roomTypeId: TREASURE_VAULT_TYPE_ID },
          { id: 'library-1', roomTypeId: SHADOW_LIBRARY_TYPE_ID },
          { id: 'nexus-1', roomTypeId: LEY_LINE_NEXUS_TYPE_ID },
        ],
        inhabitants: [{ id: 'inhab-1', tier: 3 }],
      });
      const objectives = invasionObjectiveAssign(state, 'test-seed');
      const secondaries = objectives.filter((o) => !o.isPrimary);
      expect(secondaries.length).toBe(2);
    });

    it('should have 3 total objectives (1 primary + 2 secondary)', () => {
      const state = makeGameState({
        rooms: [
          { id: 'altar-1', roomTypeId: ALTAR_ROOM_TYPE_ID },
          { id: 'vault-1', roomTypeId: TREASURE_VAULT_TYPE_ID },
          { id: 'library-1', roomTypeId: SHADOW_LIBRARY_TYPE_ID },
        ],
      });
      const objectives = invasionObjectiveAssign(state, 'test-seed');
      expect(objectives.length).toBe(3);
    });

    it('should not include duplicate objective types', () => {
      const state = makeGameState({
        rooms: [
          { id: 'altar-1', roomTypeId: ALTAR_ROOM_TYPE_ID },
          { id: 'vault-1', roomTypeId: TREASURE_VAULT_TYPE_ID },
          { id: 'library-1', roomTypeId: SHADOW_LIBRARY_TYPE_ID },
          { id: 'nexus-1', roomTypeId: LEY_LINE_NEXUS_TYPE_ID },
        ],
        inhabitants: [{ id: 'inhab-1', tier: 4 }],
      });
      const objectives = invasionObjectiveAssign(state, 'dup-check');
      const types = objectives.map((o) => o.type);
      const uniqueTypes = new Set(types);
      expect(uniqueTypes.size).toBe(types.length);
    });

    it('should exclude ineligible objectives', () => {
      // Only altar room, no vault/library/nexus/inhabitants
      const state = makeGameState({
        rooms: [{ id: 'altar-1', roomTypeId: ALTAR_ROOM_TYPE_ID }],
      });
      const objectives = invasionObjectiveAssign(state, 'ineligible-seed');
      const secondaries = objectives.filter((o) => !o.isPrimary);
      // Only ScoutDungeon should be eligible (always eligible)
      expect(secondaries.length).toBeLessThanOrEqual(2);
      // All secondaries should be ScoutDungeon
      for (const s of secondaries) {
        expect(s.type).toBe('ScoutDungeon');
      }
    });

    it('should select fewer secondaries if pool is too small', () => {
      // Empty dungeon — only ScoutDungeon eligible (1 unique type)
      const state = makeGameState({});
      const objectives = invasionObjectiveAssign(state, 'small-pool');
      const secondaries = objectives.filter((o) => !o.isPrimary);
      expect(secondaries.length).toBe(1);
    });

    it('should produce deterministic results with same seed', () => {
      const state = makeGameState({
        rooms: [
          { id: 'altar-1', roomTypeId: ALTAR_ROOM_TYPE_ID },
          { id: 'vault-1', roomTypeId: TREASURE_VAULT_TYPE_ID },
          { id: 'library-1', roomTypeId: SHADOW_LIBRARY_TYPE_ID },
          { id: 'nexus-1', roomTypeId: LEY_LINE_NEXUS_TYPE_ID },
        ],
        inhabitants: [{ id: 'inhab-1', tier: 2 }],
      });
      const obj1 = invasionObjectiveAssign(state, 'same-seed');
      const obj2 = invasionObjectiveAssign(state, 'same-seed');
      expect(obj1.map((o) => o.type)).toEqual(obj2.map((o) => o.type));
    });

    it('should set targetId for room-based objectives', () => {
      const state = makeGameState({
        rooms: [
          { id: 'altar-1', roomTypeId: ALTAR_ROOM_TYPE_ID },
          { id: 'vault-1', roomTypeId: TREASURE_VAULT_TYPE_ID },
          { id: 'library-1', roomTypeId: SHADOW_LIBRARY_TYPE_ID },
          { id: 'nexus-1', roomTypeId: LEY_LINE_NEXUS_TYPE_ID },
        ],
      });
      const objectives = invasionObjectiveAssign(state, 'target-test');
      const roomObjectives = objectives.filter(
        (o) =>
          o.type === 'StealTreasure' ||
          o.type === 'DefileLibrary' ||
          o.type === 'SealPortal' ||
          o.type === 'PlunderVault',
      );
      for (const obj of roomObjectives) {
        expect(obj.targetId).toBeDefined();
      }
    });

    it('should set targetId for SlayMonster to tier 2+ inhabitant', () => {
      const state = makeGameState({
        rooms: [{ id: 'altar-1', roomTypeId: ALTAR_ROOM_TYPE_ID }],
        inhabitants: [
          { id: 'weak-1', tier: 1 },
          { id: 'strong-1', tier: 3 },
        ],
      });
      const objectives = invasionObjectiveAssign(state, 'slay-target');
      const slayObj = objectives.find((o) => o.type === 'SlayMonster');
      if (slayObj) {
        expect(slayObj.targetId).toBe('strong-1');
      }
    });

    it('should not include SlayMonster if no tier 2+ inhabitants', () => {
      const state = makeGameState({
        rooms: [
          { id: 'altar-1', roomTypeId: ALTAR_ROOM_TYPE_ID },
          { id: 'vault-1', roomTypeId: TREASURE_VAULT_TYPE_ID },
          { id: 'library-1', roomTypeId: SHADOW_LIBRARY_TYPE_ID },
        ],
        inhabitants: [{ id: 'weak-1', tier: 1 }],
      });

      // Run multiple times to confirm SlayMonster never appears
      for (let i = 0; i < 10; i++) {
        const objectives = invasionObjectiveAssign(
          state,
          `no-slay-${i}`,
        );
        const slayObj = objectives.find((o) => o.type === 'SlayMonster');
        expect(slayObj).toBeUndefined();
      }
    });
  });

  // --- invasionObjectiveUpdateProgress ---

  describe('invasionObjectiveUpdateProgress', () => {
    it('should update progress value', () => {
      const obj = makeObjective({ progress: 0 });
      const updated = invasionObjectiveUpdateProgress(obj, 50);
      expect(updated.progress).toBe(50);
      expect(updated.isCompleted).toBe(false);
    });

    it('should mark as completed at 100%', () => {
      const obj = makeObjective({ progress: 0 });
      const updated = invasionObjectiveUpdateProgress(obj, 100);
      expect(updated.progress).toBe(100);
      expect(updated.isCompleted).toBe(true);
    });

    it('should clamp progress to 0-100', () => {
      const obj = makeObjective();
      expect(invasionObjectiveUpdateProgress(obj, -10).progress).toBe(0);
      expect(invasionObjectiveUpdateProgress(obj, 150).progress).toBe(100);
    });

    it('should not mutate the original objective', () => {
      const obj = makeObjective({ progress: 0 });
      invasionObjectiveUpdateProgress(obj, 75);
      expect(obj.progress).toBe(0);
    });
  });

  // --- Progress calculation helpers ---

  describe('invasionObjectiveCalculateSlayMonsterProgress', () => {
    it('should return 0 for full HP', () => {
      expect(invasionObjectiveCalculateSlayMonsterProgress(100, 100)).toBe(0);
    });

    it('should return 50 for half HP lost', () => {
      expect(invasionObjectiveCalculateSlayMonsterProgress(50, 100)).toBe(50);
    });

    it('should return 100 for zero HP', () => {
      expect(invasionObjectiveCalculateSlayMonsterProgress(0, 100)).toBe(100);
    });

    it('should handle zero max HP gracefully', () => {
      expect(invasionObjectiveCalculateSlayMonsterProgress(0, 0)).toBe(0);
    });
  });

  describe('invasionObjectiveCalculateStealTreasureProgress', () => {
    it('should return 0 for no gold looted', () => {
      expect(invasionObjectiveCalculateStealTreasureProgress(0, 100)).toBe(0);
    });

    it('should return 50 for half target', () => {
      expect(invasionObjectiveCalculateStealTreasureProgress(50, 100)).toBe(50);
    });

    it('should cap at 100', () => {
      expect(invasionObjectiveCalculateStealTreasureProgress(200, 100)).toBe(100);
    });
  });

  describe('invasionObjectiveCalculateSealPortalProgress', () => {
    it('should return 0 for no turns spent', () => {
      expect(invasionObjectiveCalculateSealPortalProgress(0, 5)).toBe(0);
    });

    it('should return 60 for 3/5 turns', () => {
      expect(invasionObjectiveCalculateSealPortalProgress(3, 5)).toBe(60);
    });

    it('should cap at 100', () => {
      expect(invasionObjectiveCalculateSealPortalProgress(10, 5)).toBe(100);
    });
  });

  // --- invasionObjectiveResolveOutcome ---

  describe('invasionObjectiveResolveOutcome', () => {
    it('should return defeat if altar is destroyed', () => {
      const objectives = [
        makeObjective({
          isPrimary: true,
          isCompleted: true,
          progress: 100,
        }),
        makeObjective({
          id: 'sec-1',
          type: 'StealTreasure',
          isPrimary: false,
          isCompleted: false,
        }),
        makeObjective({
          id: 'sec-2',
          type: 'ScoutDungeon',
          isPrimary: false,
          isCompleted: false,
        }),
      ];
      const result = invasionObjectiveResolveOutcome(objectives);
      expect(result.outcome).toBe('defeat');
      expect(result.altarDestroyed).toBe(true);
      expect(result.rewardMultiplier).toBe(0);
    });

    it('should return victory if altar is intact', () => {
      const objectives = [
        makeObjective({
          isPrimary: true,
          isCompleted: false,
          progress: 30,
        }),
        makeObjective({
          id: 'sec-1',
          type: 'StealTreasure',
          isPrimary: false,
          isCompleted: false,
        }),
        makeObjective({
          id: 'sec-2',
          type: 'ScoutDungeon',
          isPrimary: false,
          isCompleted: false,
        }),
      ];
      const result = invasionObjectiveResolveOutcome(objectives);
      expect(result.outcome).toBe('victory');
      expect(result.altarDestroyed).toBe(false);
    });

    it('should have higher reward when all secondaries prevented', () => {
      const objectives = [
        makeObjective({ isPrimary: true, isCompleted: false }),
        makeObjective({
          id: 'sec-1',
          type: 'StealTreasure',
          isPrimary: false,
          isCompleted: false,
        }),
        makeObjective({
          id: 'sec-2',
          type: 'ScoutDungeon',
          isPrimary: false,
          isCompleted: false,
        }),
      ];
      const result = invasionObjectiveResolveOutcome(objectives);
      // 1.0 + 2*0.25 - 0*0.25 = 1.5
      expect(result.rewardMultiplier).toBe(1.5);
      expect(result.secondariesCompleted).toBe(0);
      expect(result.secondariesTotal).toBe(2);
    });

    it('should reduce reward when secondaries are completed', () => {
      const objectives = [
        makeObjective({ isPrimary: true, isCompleted: false }),
        makeObjective({
          id: 'sec-1',
          type: 'StealTreasure',
          isPrimary: false,
          isCompleted: true,
        }),
        makeObjective({
          id: 'sec-2',
          type: 'ScoutDungeon',
          isPrimary: false,
          isCompleted: true,
        }),
      ];
      const result = invasionObjectiveResolveOutcome(objectives);
      // 1.0 + 0*0.25 - 2*0.25 = 0.5
      expect(result.rewardMultiplier).toBe(0.5);
      expect(result.secondariesCompleted).toBe(2);
    });

    it('should handle mixed secondary outcomes', () => {
      const objectives = [
        makeObjective({ isPrimary: true, isCompleted: false }),
        makeObjective({
          id: 'sec-1',
          type: 'StealTreasure',
          isPrimary: false,
          isCompleted: true,
        }),
        makeObjective({
          id: 'sec-2',
          type: 'ScoutDungeon',
          isPrimary: false,
          isCompleted: false,
        }),
      ];
      const result = invasionObjectiveResolveOutcome(objectives);
      // 1.0 + 1*0.25 - 1*0.25 = 1.0
      expect(result.rewardMultiplier).toBe(1);
      expect(result.secondariesCompleted).toBe(1);
    });

    it('should not allow negative reward multiplier', () => {
      // Edge case: many secondaries completed somehow
      const objectives = [
        makeObjective({ isPrimary: true, isCompleted: false }),
        ...Array.from({ length: 5 }, (_, i) =>
          makeObjective({
            id: `sec-${i}`,
            type: 'ScoutDungeon',
            isPrimary: false,
            isCompleted: true,
          }),
        ),
      ];
      const result = invasionObjectiveResolveOutcome(objectives);
      expect(result.rewardMultiplier).toBeGreaterThanOrEqual(0);
    });
  });
});
