import { describe, expect, it, vi, beforeEach } from 'vitest';
import type {
  CompositionWeightConfig,
  DungeonProfile,
  GameState,
  InvasionId,
  InvaderId,
} from '@interfaces';
import type { InvaderClassType, InvaderDefinition } from '@interfaces/invader';
import {
  invasionCompositionCalculateDungeonProfile,
  invasionCompositionGetWeights,
  invasionCompositionGetPartySize,
  invasionCompositionSelectParty,
  invasionCompositionResetCache,
} from '@helpers/invasion-composition';
import seedrandom from 'seedrandom';

vi.mock('@helpers/state-game', () => ({
  gamestate: vi.fn(() => ({})),
  updateGamestate: vi.fn(),
}));

const TREASURE_VAULT_ID = 'aa100001-0001-0001-0001-000000000008';
const SHADOW_LIBRARY_ID = 'aa100001-0001-0001-0001-000000000004';
const CRYSTAL_MINE_ID = 'aa100001-0001-0001-0001-000000000002';

const mockRoomDefs = [
  { id: TREASURE_VAULT_ID, __type: 'room', invasionProfile: { dimension: 'wealth', weight: 15 } },
  { id: SHADOW_LIBRARY_ID, __type: 'room', invasionProfile: { dimension: 'knowledge', weight: 15 } },
  { id: CRYSTAL_MINE_ID, __type: 'room', invasionProfile: { dimension: 'wealth', weight: 10 } },
];

vi.mock('@helpers/content', () => ({
  contentGetEntriesByType: vi.fn((type: string) => {
    if (type === 'room') return mockRoomDefs;
    return [];
  }),
  contentGetEntry: vi.fn(() => undefined),
}));

vi.mock('@helpers/invaders', () => ({
  invaderGetAllDefinitions: vi.fn(() => []),
  invaderCreateInstance: vi.fn((def: InvaderDefinition) => ({
    id: `instance-${def.id}`,
    definitionId: def.id,
    currentHp: def.baseStats.hp,
    maxHp: def.baseStats.hp,
    statusEffects: [],
    abilityStates: [],
  })),
}));

// --- Test data ---

const COMPOSITION_WEIGHTS_ID = 'test-composition-weights';

const defaultWeightConfig: CompositionWeightConfig = {
  id: COMPOSITION_WEIGHTS_ID as InvasionId,
  name: 'Composition Weights',
  balanced: {
    warrior: 20,
    rogue: 17,
    mage: 17,
    cleric: 16,
    paladin: 15,
    ranger: 15,
  },
  highCorruption: {
    warrior: 10,
    rogue: 10,
    mage: 10,
    cleric: 25,
    paladin: 30,
    ranger: 15,
  },
  highWealth: {
    warrior: 20,
    rogue: 30,
    mage: 10,
    cleric: 10,
    paladin: 10,
    ranger: 20,
  },
  highKnowledge: {
    warrior: 10,
    rogue: 15,
    mage: 30,
    cleric: 10,
    paladin: 10,
    ranger: 25,
  },
};

function makeDef(
  id: string,
  cls: InvaderClassType,
): InvaderDefinition {
  return {
    id: id as InvaderId,
    name: `${cls}-${id}`,
    description: '',
    invaderClass: cls,
    baseStats: { hp: 20, attack: 5, defense: 5, speed: 5 },
    combatAbilityIds: [],
    sprite: 'test',
  };
}

const allDefs: InvaderDefinition[] = [
  makeDef('w1', 'warrior'),
  makeDef('r1', 'rogue'),
  makeDef('m1', 'mage'),
  makeDef('c1', 'cleric'),
  makeDef('p1', 'paladin'),
  makeDef('rn1', 'ranger'),
];

function makeProfile(overrides: Partial<DungeonProfile> = {}): DungeonProfile {
  return {
    corruption: 0,
    wealth: 0,
    knowledge: 0,
    size: 10,
    threatLevel: 30,
    ...overrides,
  };
}

function makeGameState(overrides: {
  day?: number;
  rooms?: Array<{ roomTypeId: string }>;
  gold?: number;
  goldMax?: number;
  corruption?: number;
  completedNodes?: string[];
}): GameState {
  const rooms = (overrides.rooms ?? []).map((r, i) => ({
    id: `room-${i}`,
    roomTypeId: r.roomTypeId,
    anchorX: 0,
    anchorY: 0,
    shapeId: 'test-shape',
    upgrades: [],
    assignedInhabitants: [],
  }));

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
        crystals: { current: 0, max: 500 },
        food: { current: 0, max: 500 },
        gold: { current: overrides.gold ?? 0, max: overrides.goldMax ?? 1000 },
        flux: { current: 0, max: 200 },
        research: { current: 0, max: 300 },
        essence: { current: 0, max: 200 },
        corruption: { current: overrides.corruption ?? 0, max: 100 },
      },
      inhabitants: [],
      hallways: [],
      season: {
        currentSeason: 'growth',
        dayInSeason: 1,
        totalSeasonCycles: 0,
      },
      research: {
        completedNodes: overrides.completedNodes ?? [],
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

// --- Tests ---

describe('invasion-composition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invasionCompositionResetCache();
  });

  // --- invasionCompositionCalculateDungeonProfile ---

  describe('invasionCompositionCalculateDungeonProfile', () => {
    it('should return zero profile for empty dungeon', () => {
      const state = makeGameState({});
      const profile = invasionCompositionCalculateDungeonProfile(state);
      expect(profile.corruption).toBe(0);
      expect(profile.wealth).toBe(0);
      expect(profile.knowledge).toBe(0);
      expect(profile.size).toBe(0);
      expect(profile.threatLevel).toBe(0);
    });

    it('should calculate corruption from resources', () => {
      const state = makeGameState({ corruption: 75 });
      const profile = invasionCompositionCalculateDungeonProfile(state);
      expect(profile.corruption).toBe(75);
    });

    it('should cap corruption at 100', () => {
      const state = makeGameState({ corruption: 150 });
      const profile = invasionCompositionCalculateDungeonProfile(state);
      expect(profile.corruption).toBe(100);
    });

    it('should calculate wealth from gold and rooms', () => {
      const state = makeGameState({
        gold: 500,
        goldMax: 1000,
        rooms: [
          { roomTypeId: 'aa100001-0001-0001-0001-000000000008' }, // Treasure Vault
        ],
      });
      const profile = invasionCompositionCalculateDungeonProfile(state);
      // Gold: 500/1000 * 50 = 25
      // Room: 1 vault * 15 = 15
      // Total: 40
      expect(profile.wealth).toBe(40);
    });

    it('should calculate knowledge from research and rooms', () => {
      const state = makeGameState({
        completedNodes: ['n1', 'n2', 'n3'],
        rooms: [
          { roomTypeId: 'aa100001-0001-0001-0001-000000000004' }, // Shadow Library
        ],
      });
      const profile = invasionCompositionCalculateDungeonProfile(state);
      // Research: 3 * 10 = 30
      // Room: 1 library * 15 = 15
      // Total: 45
      expect(profile.knowledge).toBe(45);
    });

    it('should count total rooms as size', () => {
      const state = makeGameState({
        rooms: [
          { roomTypeId: 'room-a' },
          { roomTypeId: 'room-b' },
          { roomTypeId: 'room-c' },
        ],
      });
      const profile = invasionCompositionCalculateDungeonProfile(state);
      expect(profile.size).toBe(3);
    });

    it('should calculate threat level from day', () => {
      const state = makeGameState({ day: 100 });
      const profile = invasionCompositionCalculateDungeonProfile(state);
      // (100-1)/3 = 33
      expect(profile.threatLevel).toBe(33);
    });

    it('should cap threat level at 100', () => {
      const state = makeGameState({ day: 400 });
      const profile = invasionCompositionCalculateDungeonProfile(state);
      expect(profile.threatLevel).toBe(100);
    });

    it('should cap wealth at 100', () => {
      const state = makeGameState({
        gold: 1000,
        goldMax: 1000,
        rooms: [
          { roomTypeId: 'aa100001-0001-0001-0001-000000000008' },
          { roomTypeId: 'aa100001-0001-0001-0001-000000000008' },
          { roomTypeId: 'aa100001-0001-0001-0001-000000000008' },
          { roomTypeId: 'aa100001-0001-0001-0001-000000000002' },
          { roomTypeId: 'aa100001-0001-0001-0001-000000000002' },
        ],
      });
      const profile = invasionCompositionCalculateDungeonProfile(state);
      expect(profile.wealth).toBeLessThanOrEqual(100);
    });
  });

  // --- invasionCompositionGetWeights ---

  describe('invasionCompositionGetWeights', () => {
    it('should return balanced weights when all profiles are low', () => {
      const profile = makeProfile({
        corruption: 20,
        wealth: 30,
        knowledge: 10,
      });
      const weights = invasionCompositionGetWeights(profile, defaultWeightConfig);
      expect(weights).toEqual(defaultWeightConfig.balanced);
    });

    it('should return high corruption weights when corruption > 60', () => {
      const profile = makeProfile({ corruption: 80 });
      const weights = invasionCompositionGetWeights(profile, defaultWeightConfig);
      expect(weights).toEqual(defaultWeightConfig.highCorruption);
    });

    it('should return high wealth weights when wealth > 60', () => {
      const profile = makeProfile({ wealth: 80 });
      const weights = invasionCompositionGetWeights(profile, defaultWeightConfig);
      expect(weights).toEqual(defaultWeightConfig.highWealth);
    });

    it('should return high knowledge weights when knowledge > 60', () => {
      const profile = makeProfile({ knowledge: 80 });
      const weights = invasionCompositionGetWeights(profile, defaultWeightConfig);
      expect(weights).toEqual(defaultWeightConfig.highKnowledge);
    });

    it('should average weights when multiple profiles are high', () => {
      const profile = makeProfile({ corruption: 80, wealth: 80 });
      const weights = invasionCompositionGetWeights(profile, defaultWeightConfig);
      // Average of highCorruption and highWealth
      expect(weights.warrior).toBe(
        Math.round(
          (defaultWeightConfig.highCorruption.warrior +
            defaultWeightConfig.highWealth.warrior) /
            2,
        ),
      );
      expect(weights.rogue).toBe(
        Math.round(
          (defaultWeightConfig.highCorruption.rogue +
            defaultWeightConfig.highWealth.rogue) /
            2,
        ),
      );
    });

    it('should not trigger on exactly 60 (requires > 60)', () => {
      const profile = makeProfile({ corruption: 60 });
      const weights = invasionCompositionGetWeights(profile, defaultWeightConfig);
      expect(weights).toEqual(defaultWeightConfig.balanced);
    });
  });

  // --- invasionCompositionGetPartySize ---

  describe('invasionCompositionGetPartySize', () => {
    it('should return 3-5 for small dungeons (1-10 rooms)', () => {
      for (let i = 0; i < 20; i++) {
        const rng = seedrandom(`small-${i}`);
        const size = invasionCompositionGetPartySize(5, rng);
        expect(size).toBeGreaterThanOrEqual(3);
        expect(size).toBeLessThanOrEqual(5);
      }
    });

    it('should return 6-10 for medium dungeons (11-25 rooms)', () => {
      for (let i = 0; i < 20; i++) {
        const rng = seedrandom(`medium-${i}`);
        const size = invasionCompositionGetPartySize(15, rng);
        expect(size).toBeGreaterThanOrEqual(6);
        expect(size).toBeLessThanOrEqual(10);
      }
    });

    it('should return 11-15 for large dungeons (26+ rooms)', () => {
      for (let i = 0; i < 20; i++) {
        const rng = seedrandom(`large-${i}`);
        const size = invasionCompositionGetPartySize(30, rng);
        expect(size).toBeGreaterThanOrEqual(11);
        expect(size).toBeLessThanOrEqual(15);
      }
    });

    it('should respect min 3 for single-room dungeon', () => {
      const rng = seedrandom('tiny');
      const size = invasionCompositionGetPartySize(1, rng);
      expect(size).toBeGreaterThanOrEqual(3);
    });
  });

  // --- invasionCompositionSelectParty ---

  describe('invasionCompositionSelectParty', () => {
    it('should always include at least one warrior', () => {
      for (let i = 0; i < 10; i++) {
        const profile = makeProfile({ size: 10 });
        const party = invasionCompositionSelectParty(
          profile,
          allDefs,
          defaultWeightConfig.balanced,
          `warrior-test-${i}`,
        );
        const hasWarrior = party.some((d) => d.invaderClass === 'warrior');
        expect(hasWarrior).toBe(true);
      }
    });

    it('should not exceed 50% of party for any single class', () => {
      for (let i = 0; i < 20; i++) {
        const profile = makeProfile({ size: 20 });
        const party = invasionCompositionSelectParty(
          profile,
          allDefs,
          defaultWeightConfig.balanced,
          `cap-test-${i}`,
        );
        const classCounts = new Map<string, number>();
        for (const d of party) {
          classCounts.set(
            d.invaderClass,
            (classCounts.get(d.invaderClass) ?? 0) + 1,
          );
        }
        const maxAllowed = Math.floor(party.length * 0.5);
        for (const [, count] of classCounts) {
          expect(count).toBeLessThanOrEqual(maxAllowed);
        }
      }
    });

    it('should produce deterministic results with same seed', () => {
      const profile = makeProfile({ size: 15 });
      const party1 = invasionCompositionSelectParty(
        profile,
        allDefs,
        defaultWeightConfig.balanced,
        'deterministic-seed',
      );
      const party2 = invasionCompositionSelectParty(
        profile,
        allDefs,
        defaultWeightConfig.balanced,
        'deterministic-seed',
      );
      expect(party1.map((d) => d.id)).toEqual(party2.map((d) => d.id));
    });

    it('should produce different results with different seeds', () => {
      const profile = makeProfile({ size: 20 });
      const party1 = invasionCompositionSelectParty(
        profile,
        allDefs,
        defaultWeightConfig.balanced,
        'seed-a',
      );
      const party2 = invasionCompositionSelectParty(
        profile,
        allDefs,
        defaultWeightConfig.balanced,
        'seed-b',
      );
      // Very unlikely to be identical
      const ids1 = party1.map((d) => d.id).join(',');
      const ids2 = party2.map((d) => d.id).join(',');
      expect(ids1).not.toBe(ids2);
    });

    it('should have at least 3 different classes for balanced profiles', () => {
      for (let i = 0; i < 20; i++) {
        const profile = makeProfile({ size: 15 });
        const party = invasionCompositionSelectParty(
          profile,
          allDefs,
          defaultWeightConfig.balanced,
          `balanced-diversity-${i}`,
        );
        const uniqueClasses = new Set(party.map((d) => d.invaderClass));
        expect(uniqueClasses.size).toBeGreaterThanOrEqual(3);
      }
    });

    it('should respect party size bounds (min 3, max 15)', () => {
      for (let size = 1; size <= 50; size += 5) {
        const profile = makeProfile({ size });
        const party = invasionCompositionSelectParty(
          profile,
          allDefs,
          defaultWeightConfig.balanced,
          `size-${size}`,
        );
        expect(party.length).toBeGreaterThanOrEqual(3);
        expect(party.length).toBeLessThanOrEqual(15);
      }
    });

    it('high corruption should produce >40% Paladin+Cleric', () => {
      let totalPaladinCleric = 0;
      let totalPartySize = 0;
      const runs = 50;

      for (let i = 0; i < runs; i++) {
        const profile = makeProfile({
          corruption: 80,
          size: 20,
        });
        const party = invasionCompositionSelectParty(
          profile,
          allDefs,
          defaultWeightConfig.highCorruption,
          `hc-${i}`,
        );
        totalPartySize += party.length;
        totalPaladinCleric += party.filter(
          (d) =>
            d.invaderClass === 'paladin' || d.invaderClass === 'cleric',
        ).length;
      }

      const ratio = totalPaladinCleric / totalPartySize;
      expect(ratio).toBeGreaterThan(0.4);
    });

    it('high wealth should produce >40% Rogue+Warrior', () => {
      let totalRogueWarrior = 0;
      let totalPartySize = 0;
      const runs = 50;

      for (let i = 0; i < runs; i++) {
        const profile = makeProfile({
          wealth: 80,
          size: 20,
        });
        const party = invasionCompositionSelectParty(
          profile,
          allDefs,
          defaultWeightConfig.highWealth,
          `hw-${i}`,
        );
        totalPartySize += party.length;
        totalRogueWarrior += party.filter(
          (d) =>
            d.invaderClass === 'rogue' || d.invaderClass === 'warrior',
        ).length;
      }

      const ratio = totalRogueWarrior / totalPartySize;
      expect(ratio).toBeGreaterThan(0.4);
    });

    it('high knowledge should produce >40% Mage+Ranger', () => {
      let totalMageRanger = 0;
      let totalPartySize = 0;
      const runs = 50;

      for (let i = 0; i < runs; i++) {
        const profile = makeProfile({
          knowledge: 80,
          size: 20,
        });
        const party = invasionCompositionSelectParty(
          profile,
          allDefs,
          defaultWeightConfig.highKnowledge,
          `hk-${i}`,
        );
        totalPartySize += party.length;
        totalMageRanger += party.filter(
          (d) =>
            d.invaderClass === 'mage' || d.invaderClass === 'ranger',
        ).length;
      }

      const ratio = totalMageRanger / totalPartySize;
      expect(ratio).toBeGreaterThan(0.4);
    });
  });
});
