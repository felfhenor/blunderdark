import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { GameId, GameState, InvasionObjectiveId } from '@interfaces';
import type { InvasionObjective } from '@interfaces/invasion-objective';
import {
  invasionObjectiveAssign,
  invasionObjectiveUpdateProgress,
  invasionObjectiveCalculateSlayMonsterProgress,
  invasionObjectiveCalculateStealTreasureProgress,
  invasionObjectiveCalculateSealPortalProgress,
  invasionObjectiveCalculateSurviveNTurnsProgress,
  invasionObjectiveCalculateReachDepthProgress,
  invasionObjectiveSetDynamicTargets,
  invasionObjectiveResolveOutcome,
  invasionObjectiveResetCache,
  INVASION_OBJECTIVE_SURVIVE_N_TURNS_TARGET,
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
const DARK_FORGE_TYPE_ID = 'aa100001-0001-0001-0001-000000000012';
const BREEDING_PITS_TYPE_ID = 'aa100001-0001-0001-0001-000000000013';
const SUMMONING_CIRCLE_TYPE_ID = 'aa100001-0001-0001-0001-000000000014';
const SOUL_WELL_TYPE_ID = 'aa100001-0001-0001-0001-000000000015';
const MUSHROOM_GROVE_TYPE_ID = 'aa100001-0001-0001-0001-000000000016';

const mockContent = new Map<string, unknown>();

const mockRoomDefs = [
  { id: ALTAR_ROOM_TYPE_ID, __type: 'room', role: 'altar', objectiveTypes: ['DestroyAltar'] },
  { id: TREASURE_VAULT_TYPE_ID, __type: 'room', objectiveTypes: ['StealTreasure', 'PlunderVault'] },
  { id: SHADOW_LIBRARY_TYPE_ID, __type: 'room', objectiveTypes: ['DefileLibrary', 'StealBlueprints'] },
  { id: LEY_LINE_NEXUS_TYPE_ID, __type: 'room', objectiveTypes: ['SealPortal'] },
  { id: DARK_FORGE_TYPE_ID, __type: 'room', objectiveTypes: ['SabotageForge'] },
  { id: BREEDING_PITS_TYPE_ID, __type: 'room', objectiveTypes: ['DisruptBreeding'] },
  { id: SUMMONING_CIRCLE_TYPE_ID, __type: 'room', objectiveTypes: ['BanishSummons'] },
  { id: SOUL_WELL_TYPE_ID, __type: 'room', objectiveTypes: ['SealPortal', 'PurifyShrine'] },
  { id: MUSHROOM_GROVE_TYPE_ID, __type: 'room', objectiveTypes: ['PoisonSupply'] },
];

const mockObjectiveDefs = [
  { id: 'obj-primary', name: 'Destroy Altar', description: "Destroy the dungeon altar to cripple the dark lord's power.", isPrimary: true, objectiveType: 'DestroyAltar', eligibility: 'always', targeting: 'room', __type: 'invasionobjective' },
  { id: 'obj-slay', name: 'Slay Monster', description: 'Kill a powerful creature defending the dungeon.', isPrimary: false, objectiveType: 'SlayMonster', eligibility: 'inhabitant_tier', eligibilityMinTier: 2, targeting: 'inhabitant', targetMinTier: 2, __type: 'invasionobjective' },
  { id: 'obj-steal', name: 'Steal Treasure', description: 'Loot gold from the dungeon treasury.', isPrimary: false, objectiveType: 'StealTreasure', eligibility: 'room', targeting: 'room', __type: 'invasionobjective' },
  { id: 'obj-defile', name: 'Defile Library', description: 'Destroy forbidden knowledge stored in the shadow library.', isPrimary: false, objectiveType: 'DefileLibrary', eligibility: 'room', targeting: 'room', __type: 'invasionobjective' },
  { id: 'obj-seal', name: 'Seal Portal', description: 'Seal a dark energy nexus to weaken the dungeon.', isPrimary: false, objectiveType: 'SealPortal', eligibility: 'room', targeting: 'room', __type: 'invasionobjective' },
  { id: 'obj-plunder', name: 'Plunder Vault', description: 'Break into the treasure vault and carry away riches.', isPrimary: false, objectiveType: 'PlunderVault', eligibility: 'room', targeting: 'room', __type: 'invasionobjective' },
  { id: 'obj-rescue', name: 'Rescue Prisoner', description: 'Free a captive creature from the dungeon.', isPrimary: false, objectiveType: 'RescuePrisoner', eligibility: 'inhabitant_tier', eligibilityMinTier: 1, targeting: 'inhabitant', targetMinTier: 1, __type: 'invasionobjective' },
  { id: 'obj-scout', name: 'Scout Dungeon', description: 'Map the dungeon layout for future invasions.', isPrimary: false, objectiveType: 'ScoutDungeon', eligibility: 'always', targeting: 'none', __type: 'invasionobjective' },
  { id: 'obj-sabotage', name: 'Sabotage Forge', description: 'Wreck the dark forge to halt weapon crafting.', isPrimary: false, objectiveType: 'SabotageForge', eligibility: 'room', targeting: 'room', __type: 'invasionobjective' },
  { id: 'obj-disrupt', name: 'Disrupt Breeding', description: 'Shut down the breeding pits to stop monster production.', isPrimary: false, objectiveType: 'DisruptBreeding', eligibility: 'room', targeting: 'room', __type: 'invasionobjective' },
  { id: 'obj-banish', name: 'Banish Summons', description: 'Disrupt the summoning circle to sever planar connections.', isPrimary: false, objectiveType: 'BanishSummons', eligibility: 'room', targeting: 'room', __type: 'invasionobjective' },
  { id: 'obj-purify', name: 'Purify Shrine', description: 'Cleanse the corrupted soul well of dark energy.', isPrimary: false, objectiveType: 'PurifyShrine', eligibility: 'room', targeting: 'room', __type: 'invasionobjective' },
  { id: 'obj-poison', name: 'Poison Supply', description: 'Contaminate food stores to starve the dungeon.', isPrimary: false, objectiveType: 'PoisonSupply', eligibility: 'room', targeting: 'room', __type: 'invasionobjective' },
  { id: 'obj-blueprints', name: 'Steal Blueprints', description: 'Steal research notes and arcane blueprints from the library.', isPrimary: false, objectiveType: 'StealBlueprints', eligibility: 'room', targeting: 'room', __type: 'invasionobjective' },
  { id: 'obj-assassinate', name: 'Assassinate Commander', description: 'Hunt down and kill a high-tier commander defending the dungeon.', isPrimary: false, objectiveType: 'AssassinateCommander', eligibility: 'inhabitant_tier', eligibilityMinTier: 4, targeting: 'inhabitant', targetMinTier: 4, __type: 'invasionobjective' },
  { id: 'obj-survive', name: 'Survive the Gauntlet', description: 'Survive deep within the dungeon long enough to weaken its defenses.', isPrimary: false, objectiveType: 'SurviveNTurns', eligibility: 'room_count', eligibilityMinCount: 10, targeting: 'none', __type: 'invasionobjective' },
  { id: 'obj-depth', name: 'Reach the Depths', description: 'Penetrate deep into the dungeon to expose its inner sanctum.', isPrimary: false, objectiveType: 'ReachDepth', eligibility: 'floor_count', eligibilityMinCount: 5, targeting: 'dynamic_path', targetPathPercent: 0.75, __type: 'invasionobjective' },
  { id: 'obj-beacon', name: 'Plant Beacon', description: 'Plant a tracking beacon deep in the dungeon to guide future invasions.', isPrimary: false, objectiveType: 'PlantBeacon', eligibility: 'floor_count', eligibilityMinCount: 5, targeting: 'dynamic_path', targetPathPercent: 0.6, __type: 'invasionobjective' },
];

vi.mock('@helpers/content', () => ({
  contentGetEntry: vi.fn((id: string) => mockContent.get(id)),
  contentGetEntriesByType: vi.fn((type: string) => {
    if (type === 'room') return mockRoomDefs;
    if (type === 'invasionobjective') return mockObjectiveDefs;
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
    gameId: 'test-game' as GameId,
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
        unlockedContent: { rooms: [], inhabitants: [], abilities: [], roomupgrades: [], passiveBonuses: [] },
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
      forgeInventory: [],
      alchemyConversions: [],
      prisoners: [],
      traitRunes: [],
      interrogationBuffs: [],
      invasionSchedule: {
        nextInvasionDay: undefined,
        nextInvasionVariance: 0,
        gracePeriodEnd: 5,
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
    id: 'obj-1' as InvasionObjectiveId,
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
          id: 'sec-1' as InvasionObjectiveId,
          type: 'StealTreasure',
          isPrimary: false,
          isCompleted: false,
        }),
        makeObjective({
          id: 'sec-2' as InvasionObjectiveId,
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
          id: 'sec-1' as InvasionObjectiveId,
          type: 'StealTreasure',
          isPrimary: false,
          isCompleted: false,
        }),
        makeObjective({
          id: 'sec-2' as InvasionObjectiveId,
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
          id: 'sec-1' as InvasionObjectiveId,
          type: 'StealTreasure',
          isPrimary: false,
          isCompleted: false,
        }),
        makeObjective({
          id: 'sec-2' as InvasionObjectiveId,
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
          id: 'sec-1' as InvasionObjectiveId,
          type: 'StealTreasure',
          isPrimary: false,
          isCompleted: true,
        }),
        makeObjective({
          id: 'sec-2' as InvasionObjectiveId,
          type: 'ScoutDungeon',
          isPrimary: false,
          isCompleted: true,
        }),
      ];
      const result = invasionObjectiveResolveOutcome(objectives);
      // 1.0 + 0*0.25 - 2*0.15 = 0.7
      expect(result.rewardMultiplier).toBe(0.7);
      expect(result.secondariesCompleted).toBe(2);
    });

    it('should handle mixed secondary outcomes', () => {
      const objectives = [
        makeObjective({ isPrimary: true, isCompleted: false }),
        makeObjective({
          id: 'sec-1' as InvasionObjectiveId,
          type: 'StealTreasure',
          isPrimary: false,
          isCompleted: true,
        }),
        makeObjective({
          id: 'sec-2' as InvasionObjectiveId,
          type: 'ScoutDungeon',
          isPrimary: false,
          isCompleted: false,
        }),
      ];
      const result = invasionObjectiveResolveOutcome(objectives);
      // 1.0 + 1*0.25 - 1*0.15 = 1.10
      expect(result.rewardMultiplier).toBe(1.1);
      expect(result.secondariesCompleted).toBe(1);
    });

    it('should not allow negative reward multiplier', () => {
      // Edge case: many secondaries completed somehow
      const objectives = [
        makeObjective({ isPrimary: true, isCompleted: false }),
        ...Array.from({ length: 5 }, (_, i) =>
          makeObjective({
            id: `sec-${i}` as InvasionObjectiveId,
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

  // --- New objective types ---

  describe('new room-targeted objectives', () => {
    it('should include SabotageForge when Dark Forge exists', () => {
      const state = makeGameState({
        rooms: [
          { id: 'altar-1', roomTypeId: ALTAR_ROOM_TYPE_ID },
          { id: 'forge-1', roomTypeId: DARK_FORGE_TYPE_ID },
        ],
      });
      // Run multiple seeds to find SabotageForge
      let found = false;
      for (let i = 0; i < 20; i++) {
        const objectives = invasionObjectiveAssign(state, `forge-${i}`);
        if (objectives.some((o) => o.type === 'SabotageForge')) {
          found = true;
          const obj = objectives.find((o) => o.type === 'SabotageForge')!;
          expect(obj.targetId).toBe('forge-1');
          break;
        }
      }
      expect(found).toBe(true);
    });

    it('should not include SabotageForge when no Dark Forge exists', () => {
      const state = makeGameState({
        rooms: [{ id: 'altar-1', roomTypeId: ALTAR_ROOM_TYPE_ID }],
      });
      for (let i = 0; i < 10; i++) {
        const objectives = invasionObjectiveAssign(state, `no-forge-${i}`);
        expect(objectives.find((o) => o.type === 'SabotageForge')).toBeUndefined();
      }
    });

    it('should include DisruptBreeding when Breeding Pits exists', () => {
      const state = makeGameState({
        rooms: [
          { id: 'altar-1', roomTypeId: ALTAR_ROOM_TYPE_ID },
          { id: 'breed-1', roomTypeId: BREEDING_PITS_TYPE_ID },
        ],
      });
      let found = false;
      for (let i = 0; i < 20; i++) {
        const objectives = invasionObjectiveAssign(state, `breed-${i}`);
        if (objectives.some((o) => o.type === 'DisruptBreeding')) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });

    it('should include BanishSummons when Summoning Circle exists', () => {
      const state = makeGameState({
        rooms: [
          { id: 'altar-1', roomTypeId: ALTAR_ROOM_TYPE_ID },
          { id: 'summon-1', roomTypeId: SUMMONING_CIRCLE_TYPE_ID },
        ],
      });
      let found = false;
      for (let i = 0; i < 20; i++) {
        const objectives = invasionObjectiveAssign(state, `summon-${i}`);
        if (objectives.some((o) => o.type === 'BanishSummons')) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });

    it('should include PurifyShrine when Soul Well exists', () => {
      const state = makeGameState({
        rooms: [
          { id: 'altar-1', roomTypeId: ALTAR_ROOM_TYPE_ID },
          { id: 'well-1', roomTypeId: SOUL_WELL_TYPE_ID },
        ],
      });
      let found = false;
      for (let i = 0; i < 20; i++) {
        const objectives = invasionObjectiveAssign(state, `purify-${i}`);
        if (objectives.some((o) => o.type === 'PurifyShrine')) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });

    it('should include PoisonSupply when Mushroom Grove exists', () => {
      const state = makeGameState({
        rooms: [
          { id: 'altar-1', roomTypeId: ALTAR_ROOM_TYPE_ID },
          { id: 'grove-1', roomTypeId: MUSHROOM_GROVE_TYPE_ID },
        ],
      });
      let found = false;
      for (let i = 0; i < 20; i++) {
        const objectives = invasionObjectiveAssign(state, `poison-${i}`);
        if (objectives.some((o) => o.type === 'PoisonSupply')) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });

    it('should include StealBlueprints when Shadow Library exists', () => {
      const state = makeGameState({
        rooms: [
          { id: 'altar-1', roomTypeId: ALTAR_ROOM_TYPE_ID },
          { id: 'library-1', roomTypeId: SHADOW_LIBRARY_TYPE_ID },
        ],
      });
      let found = false;
      for (let i = 0; i < 20; i++) {
        const objectives = invasionObjectiveAssign(state, `blueprint-${i}`);
        if (objectives.some((o) => o.type === 'StealBlueprints')) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });
  });

  describe('AssassinateCommander', () => {
    it('should be eligible with T4+ inhabitants', () => {
      const state = makeGameState({
        rooms: [{ id: 'altar-1', roomTypeId: ALTAR_ROOM_TYPE_ID }],
        inhabitants: [{ id: 'commander-1', tier: 4 }],
      });
      let found = false;
      for (let i = 0; i < 20; i++) {
        const objectives = invasionObjectiveAssign(state, `cmd-${i}`);
        if (objectives.some((o) => o.type === 'AssassinateCommander')) {
          found = true;
          const obj = objectives.find((o) => o.type === 'AssassinateCommander')!;
          expect(obj.targetId).toBe('commander-1');
          break;
        }
      }
      expect(found).toBe(true);
    });

    it('should not be eligible with only T3 inhabitants', () => {
      const state = makeGameState({
        rooms: [{ id: 'altar-1', roomTypeId: ALTAR_ROOM_TYPE_ID }],
        inhabitants: [{ id: 'weak-1', tier: 3 }],
      });
      for (let i = 0; i < 20; i++) {
        const objectives = invasionObjectiveAssign(state, `no-cmd-${i}`);
        expect(objectives.find((o) => o.type === 'AssassinateCommander')).toBeUndefined();
      }
    });
  });

  describe('SurviveNTurns', () => {
    it('should be eligible when dungeon has 10+ rooms total', () => {
      const rooms = Array.from({ length: 10 }, (_, i) => ({
        id: `room-${i}`,
        roomTypeId: i === 0 ? ALTAR_ROOM_TYPE_ID : TREASURE_VAULT_TYPE_ID,
      }));
      const state = makeGameState({ rooms });
      let found = false;
      for (let i = 0; i < 20; i++) {
        const objectives = invasionObjectiveAssign(state, `survive-${i}`);
        if (objectives.some((o) => o.type === 'SurviveNTurns')) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });

    it('should not be eligible when dungeon has fewer than 10 rooms', () => {
      const state = makeGameState({
        rooms: [{ id: 'altar-1', roomTypeId: ALTAR_ROOM_TYPE_ID }],
      });
      for (let i = 0; i < 20; i++) {
        const objectives = invasionObjectiveAssign(state, `no-survive-${i}`);
        expect(objectives.find((o) => o.type === 'SurviveNTurns')).toBeUndefined();
      }
    });
  });

  describe('ReachDepth and PlantBeacon', () => {
    function makeMultiFloorState(floorCount: number): GameState {
      const state = makeGameState({
        rooms: [{ id: 'altar-1', roomTypeId: ALTAR_ROOM_TYPE_ID }],
      });
      state.world.floors = Array.from({ length: floorCount }, (_, i) => ({
        id: `floor-${i}`,
        name: `Floor ${i + 1}`,
        depth: i + 1,
        biome: 'neutral',
        grid: { tiles: [], width: 0, height: 0 },
        rooms: i === 0
          ? [makeRoom('altar-1', ALTAR_ROOM_TYPE_ID)]
          : [makeRoom(`room-f${i}`, TREASURE_VAULT_TYPE_ID)],
        hallways: [],
        inhabitants: [],
        connections: [],
        traps: [],
      })) as unknown as GameState['world']['floors'];
      return state;
    }

    it('should be eligible with 5+ floors', () => {
      const state = makeMultiFloorState(5);
      let foundReach = false;
      let foundBeacon = false;
      for (let i = 0; i < 30; i++) {
        const objectives = invasionObjectiveAssign(state, `depth-${i}`);
        if (objectives.some((o) => o.type === 'ReachDepth')) foundReach = true;
        if (objectives.some((o) => o.type === 'PlantBeacon')) foundBeacon = true;
        if (foundReach && foundBeacon) break;
      }
      expect(foundReach).toBe(true);
      expect(foundBeacon).toBe(true);
    });

    it('should not be eligible with fewer than 5 floors', () => {
      const state = makeMultiFloorState(4);
      for (let i = 0; i < 20; i++) {
        const objectives = invasionObjectiveAssign(state, `no-depth-${i}`);
        expect(objectives.find((o) => o.type === 'ReachDepth')).toBeUndefined();
        expect(objectives.find((o) => o.type === 'PlantBeacon')).toBeUndefined();
      }
    });
  });

  describe('invasionObjectiveCalculateSurviveNTurnsProgress', () => {
    it('should return 0 at turn 0', () => {
      expect(invasionObjectiveCalculateSurviveNTurnsProgress(0, INVASION_OBJECTIVE_SURVIVE_N_TURNS_TARGET)).toBe(0);
    });

    it('should return 50 at half the target', () => {
      expect(invasionObjectiveCalculateSurviveNTurnsProgress(25, 50)).toBe(50);
    });

    it('should return 100 at the target', () => {
      expect(invasionObjectiveCalculateSurviveNTurnsProgress(50, 50)).toBe(100);
    });

    it('should cap at 100', () => {
      expect(invasionObjectiveCalculateSurviveNTurnsProgress(60, 50)).toBe(100);
    });

    it('should handle zero target gracefully', () => {
      expect(invasionObjectiveCalculateSurviveNTurnsProgress(10, 0)).toBe(0);
    });
  });

  describe('invasionObjectiveCalculateReachDepthProgress', () => {
    it('should return 0 at room 0', () => {
      expect(invasionObjectiveCalculateReachDepthProgress(0, 10)).toBe(0);
    });

    it('should return 50 at half target', () => {
      expect(invasionObjectiveCalculateReachDepthProgress(5, 10)).toBe(50);
    });

    it('should return 100 at target', () => {
      expect(invasionObjectiveCalculateReachDepthProgress(10, 10)).toBe(100);
    });

    it('should cap at 100', () => {
      expect(invasionObjectiveCalculateReachDepthProgress(15, 10)).toBe(100);
    });
  });

  describe('invasionObjectiveSetDynamicTargets', () => {
    it('should set ReachDepth targetId to 75% of path', () => {
      const objectives: InvasionObjective[] = [
        makeObjective({ type: 'ReachDepth', isPrimary: false, targetId: undefined }),
      ];
      const path = ['r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9'];
      const result = invasionObjectiveSetDynamicTargets(objectives, path);
      // floor(10 * 0.75) = 7 -> path[7] = 'r7'
      expect(result[0].targetId).toBe('r7');
    });

    it('should set PlantBeacon targetId to 60% of path', () => {
      const objectives: InvasionObjective[] = [
        makeObjective({ type: 'PlantBeacon', isPrimary: false, targetId: undefined }),
      ];
      const path = ['r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9'];
      const result = invasionObjectiveSetDynamicTargets(objectives, path);
      // floor(10 * 0.6) = 6 -> path[6] = 'r6'
      expect(result[0].targetId).toBe('r6');
    });

    it('should not modify objectives that already have targetId', () => {
      const objectives: InvasionObjective[] = [
        makeObjective({ type: 'ReachDepth', isPrimary: false, targetId: 'existing' }),
      ];
      const result = invasionObjectiveSetDynamicTargets(objectives, ['r0', 'r1']);
      expect(result[0].targetId).toBe('existing');
    });

    it('should not modify non-dynamic objectives', () => {
      const objectives: InvasionObjective[] = [
        makeObjective({ type: 'StealTreasure', isPrimary: false, targetId: 'vault-1' }),
      ];
      const result = invasionObjectiveSetDynamicTargets(objectives, ['r0', 'r1']);
      expect(result[0].targetId).toBe('vault-1');
    });

    it('should handle empty path', () => {
      const objectives: InvasionObjective[] = [
        makeObjective({ type: 'ReachDepth', isPrimary: false, targetId: undefined }),
      ];
      const result = invasionObjectiveSetDynamicTargets(objectives, []);
      expect(result[0].targetId).toBeUndefined();
    });
  });
});
