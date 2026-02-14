import type {
  GameState,
  InhabitantId,
  InhabitantInstance,
  InhabitantInstanceId,
  ResourceMap,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mock state ---

let mockInhabitants: InhabitantInstance[];
let mockResources: ResourceMap;
let mockHasAltar: boolean;

const createResources = (): ResourceMap => ({
  crystals: { current: 100, max: 500 },
  food: { current: 100, max: 500 },
  gold: { current: 200, max: 1000 },
  flux: { current: 50, max: 200 },
  research: { current: 0, max: 300 },
  essence: { current: 50, max: 200 },
  corruption: { current: 0, max: 100 },
});

vi.mock('@helpers/state-game', () => ({
  gamestate: () => ({
    world: {
      inhabitants: mockInhabitants,
      resources: mockResources,
      floors: [],
      season: { currentSeason: 'harvest', dayInSeason: 1, totalSeasonCycles: 0 },
    },
  }),
  updateGamestate: vi.fn(async (fn: (state: GameState) => GameState) => {
    const fakeState = {
      world: {
        inhabitants: mockInhabitants,
        resources: mockResources,
        floors: [],
        season: { currentSeason: 'harvest', dayInSeason: 1, totalSeasonCycles: 0 },
      },
    } as unknown as GameState;
    const result = fn(fakeState);
    mockInhabitants = result.world.inhabitants;
    if (result.world.resources) {
      mockResources = result.world.resources;
    }
  }),
}));

vi.mock('@helpers/altar-room', () => ({
  altarRoomCanRecruit: () => mockHasAltar,
}));

vi.mock('@helpers/content', () => ({
  contentGetEntriesByType: vi.fn(() => mockContentEntries),
  contentGetEntry: vi.fn(),
  contentAllIdsByName: vi.fn(() => new Map()),
}));

let uuidCounter = 0;
vi.mock('@helpers/rng', () => ({
  rngUuid: vi.fn(() => `test-uuid-${uuidCounter++}`),
}));

// --- Mock content entries ---

let mockContentEntries: InhabitantContent[];

const goblinDef: InhabitantContent = {
  id: 'goblin-001' as InhabitantId,
  name: 'Goblin',
  type: 'creature',
  tier: 1,
  description: 'A scrappy worker.',
  cost: { gold: 50, food: 20 },
  stats: { hp: 30, attack: 10, defense: 8, speed: 12, workerEfficiency: 1.0 },
  traits: [
    {
      id: 'trait-goblin-miner',
      name: 'Miner',
      description: 'Crystal bonus',
      effectType: 'production_bonus',
      effectValue: 0.2,
    },
  ],
  restrictionTags: [],
  rulerBonuses: {},
  rulerFearLevel: 0,
  __type: 'inhabitant',
};

const skeletonDef: InhabitantContent = {
  id: 'skeleton-001' as InhabitantId,
  name: 'Skeleton',
  type: 'undead',
  tier: 1,
  description: 'Tireless guardian.',
  cost: { gold: 60, essence: 15 },
  stats: { hp: 40, attack: 12, defense: 15, speed: 6, workerEfficiency: 0.7 },
  traits: [],
  restrictionTags: [],
  rulerBonuses: {},
  rulerFearLevel: 0,
  __type: 'inhabitant',
};

const dragonDef: InhabitantContent = {
  id: 'dragon-001' as InhabitantId,
  name: 'Dragon',
  type: 'dragon',
  tier: 4,
  description: 'A powerful ruler.',
  cost: { gold: 500, essence: 200, crystals: 100 },
  stats: { hp: 500, attack: 80, defense: 60, speed: 20, workerEfficiency: 1.0 },
  traits: [],
  restrictionTags: ['unique'],
  rulerBonuses: { attack: 0.1 },
  rulerFearLevel: 4,
  __type: 'inhabitant',
};

const tier2Def: InhabitantContent = {
  id: 'tier2-001' as InhabitantId,
  name: 'Dark Elf',
  type: 'creature',
  tier: 2,
  description: 'A tier 2 creature.',
  cost: { gold: 100 },
  stats: { hp: 50, attack: 20, defense: 15, speed: 15, workerEfficiency: 1.1 },
  traits: [],
  restrictionTags: [],
  rulerBonuses: {},
  rulerFearLevel: 0,
  __type: 'inhabitant',
};

// --- Import module under test (after mocks) ---

const {
  recruitmentGetRecruitable,
  recruitmentGetShortfall,
  recruitmentRecruit,
  RECRUITMENT_DEFAULT_MAX_INHABITANTS,
} = await import('@helpers/recruitment');

// canAffordRecruit just wraps resourceCanAfford, test it via recruitmentRecruit

describe('recruitment helper', () => {
  beforeEach(() => {
    mockInhabitants = [];
    mockResources = createResources();
    mockHasAltar = true;
    mockContentEntries = [goblinDef, skeletonDef, dragonDef, tier2Def];
    uuidCounter = 0;
  });

  describe('recruitmentGetRecruitable', () => {
    it('should exclude unique/ruler inhabitants', () => {
      const result = recruitmentGetRecruitable();
      expect(result.map((d) => d.name)).not.toContain('Dragon');
    });

    it('should include non-unique inhabitants', () => {
      const result = recruitmentGetRecruitable();
      expect(result.map((d) => d.name)).toContain('Goblin');
      expect(result.map((d) => d.name)).toContain('Skeleton');
    });

    it('should sort by tier then name', () => {
      const result = recruitmentGetRecruitable();
      const names = result.map((d) => d.name);
      expect(names).toEqual(['Goblin', 'Skeleton', 'Dark Elf']);
    });
  });

  describe('recruitmentGetShortfall', () => {
    it('should return empty array when all resources sufficient', () => {
      expect(recruitmentGetShortfall(goblinDef.cost, mockResources)).toEqual([]);
    });

    it('should return shortfall for insufficient resources', () => {
      mockResources.gold.current = 30;
      mockResources.food.current = 5;
      const shortfall = recruitmentGetShortfall(
        goblinDef.cost,
        mockResources,
      );
      expect(shortfall).toEqual([
        { type: 'gold', needed: 20 },
        { type: 'food', needed: 15 },
      ]);
    });

    it('should only list resources that are short', () => {
      mockResources.gold.current = 30;
      // food is 100, which is enough for 20
      const shortfall = recruitmentGetShortfall(
        goblinDef.cost,
        mockResources,
      );
      expect(shortfall).toHaveLength(1);
      expect(shortfall[0].type).toBe('gold');
    });
  });

  describe('recruitmentRecruit', () => {
    it('should create an inhabitant and deduct resources', async () => {
      const result = await recruitmentRecruit(goblinDef);
      expect(result.success).toBe(true);
      expect(mockInhabitants).toHaveLength(1);
      expect(mockInhabitants[0].definitionId).toBe('goblin-001');
      expect(mockInhabitants[0].name).toBe('Goblin');
      expect(mockInhabitants[0].state).toBe('normal');
      expect(mockInhabitants[0].assignedRoomId).toBeUndefined();
    });

    it('should fail when altar is not placed', async () => {
      mockHasAltar = false;
      const result = await recruitmentRecruit(goblinDef);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Altar');
    });

    it('should fail when cannot afford', async () => {
      mockResources.gold.current = 0;
      const result = await recruitmentRecruit(goblinDef);
      expect(result.success).toBe(false);
      expect(result.error).toContain('resources');
    });

    it('should fail when roster is full', async () => {
      mockInhabitants = Array.from(
        { length: RECRUITMENT_DEFAULT_MAX_INHABITANTS },
        (_, i) => ({
          instanceId: `inst-${i}` as InhabitantInstanceId,
          definitionId: 'goblin-001' as InhabitantId,
          name: 'Goblin',
          state: 'normal' as const,
          assignedRoomId: undefined,
        }),
      );
      const result = await recruitmentRecruit(goblinDef);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Roster full');
    });

    it('should fail when tier is too high', async () => {
      const result = await recruitmentRecruit(tier2Def);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Tier 2');
    });

    it('should deduct resources on successful recruit', async () => {
      await recruitmentRecruit(goblinDef);
      expect(mockResources.gold.current).toBe(150); // 200 - 50
      expect(mockResources.food.current).toBe(80); // 100 - 20
    });

    it('should assign unique instanceId to each recruit', async () => {
      await recruitmentRecruit(goblinDef);
      await recruitmentRecruit(goblinDef);
      expect(mockInhabitants[0].instanceId).not.toBe(
        mockInhabitants[1].instanceId,
      );
    });
  });
});
