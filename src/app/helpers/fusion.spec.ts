import type {
  FusionRecipeContent,
  FusionRecipeId,
  GameState,
  InhabitantId,
  InhabitantInstance,
  InhabitantInstanceId,
  InhabitantStats,
  ResourceMap,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Test Constants ---

const GOBLIN_ID = 'test-goblin-0001' as InhabitantId;
const KOBOLD_ID = 'test-kobold-0002' as InhabitantId;
const SKELETON_ID = 'test-skeleton-0003' as InhabitantId;
const IMP_ID = 'test-imp-0004' as InhabitantId;
const HOBGOBLIN_ID = 'test-hobgoblin-0005' as InhabitantId;
const BONE_GOBLIN_ID = 'test-bone-goblin-0006' as InhabitantId;
const WRAITH_ID = 'test-wraith-0007' as InhabitantId;
const DEATH_KNIGHT_ID = 'test-death-knight-0008' as InhabitantId;
const ORC_ID = 'test-orc-0009' as InhabitantId;
const WAR_CHIEF_ID = 'test-war-chief-0010' as InhabitantId;

const RECIPE_HOBGOBLIN_ID = 'test-recipe-0001' as FusionRecipeId;
const RECIPE_BONE_GOBLIN_ID = 'test-recipe-0002' as FusionRecipeId;

const INSTANCE_A_ID = 'inst-a-0001' as InhabitantInstanceId;
const INSTANCE_B_ID = 'inst-b-0002' as InhabitantInstanceId;

// --- Mock state ---

let mockInhabitants: InhabitantInstance[];
let mockResources: ResourceMap;

const createResources = (): ResourceMap => ({
  crystals: { current: 100, max: 500 },
  food: { current: 100, max: 500 },
  gold: { current: 200, max: 1000 },
  flux: { current: 50, max: 200 },
  research: { current: 0, max: 300 },
  essence: { current: 100, max: 200 },
  corruption: { current: 0, max: 100 },
});

// --- Mock content ---

const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  contentGetEntry: (id: string) => mockContent.get(id) ?? undefined,
  contentGetEntriesByType: vi.fn((type: string) => {
    if (type === 'fusionrecipe') {
      return [...mockContent.values()].filter(
        (v) => (v as { __type?: string }).__type === 'fusionrecipe',
      );
    }
    return [];
  }),
}));

vi.mock('@helpers/state-game', () => ({
  gamestate: () => ({
    world: {
      inhabitants: mockInhabitants,
      resources: mockResources,
      floors: [],
    },
  }),
  updateGamestate: vi.fn(async (fn: (state: GameState) => GameState) => {
    const fakeState = {
      world: {
        inhabitants: mockInhabitants,
        resources: mockResources,
        floors: [],
      },
    } as unknown as GameState;
    const result = fn(fakeState);
    mockInhabitants = result.world.inhabitants;
    if (result.world.resources) {
      mockResources = result.world.resources;
    }
  }),
}));

vi.mock('@helpers/resources', () => ({
  resourceCanAfford: vi.fn((costs: Record<string, number>) => {
    return Object.entries(costs).every(
      ([type, amount]) =>
        mockResources[type as keyof ResourceMap].current >= amount,
    );
  }),
  resourcePayCost: vi.fn(async (costs: Record<string, number>) => {
    const canAfford = Object.entries(costs).every(
      ([type, amount]) =>
        mockResources[type as keyof ResourceMap].current >= amount,
    );
    if (!canAfford) return false;
    for (const [type, amount] of Object.entries(costs)) {
      mockResources[type as keyof ResourceMap] = {
        ...mockResources[type as keyof ResourceMap],
        current: mockResources[type as keyof ResourceMap].current - amount,
      };
    }
    return true;
  }),
}));

let uuidCounter = 0;
vi.mock('@helpers/rng', () => ({
  rngUuid: vi.fn(() => `test-uuid-${uuidCounter++}`),
}));

// --- Test Data Helpers ---

function makeRecipe(
  overrides: Partial<FusionRecipeContent> = {},
): FusionRecipeContent {
  return {
    id: RECIPE_HOBGOBLIN_ID,
    name: 'Hobgoblin Fusion',
    __type: 'fusionrecipe',
    description: 'Fuse a Goblin and Kobold.',
    creatureAId: GOBLIN_ID,
    creatureBId: KOBOLD_ID,
    resultHybridId: HOBGOBLIN_ID,
    cost: { essence: 40, gold: 60 },
    ...overrides,
  };
}

const goblinDef: InhabitantContent = {
  id: GOBLIN_ID,
  name: 'Goblin',
  __type: 'inhabitant',
  type: 'creature',
  tier: 1,
  description: 'A scrappy worker.',
  cost: { gold: 50 },
  stats: { hp: 30, attack: 10, defense: 8, speed: 12, workerEfficiency: 1.0 },
  traits: [],
  restrictionTags: [],
  rulerBonuses: {},
  rulerFearLevel: 0,
};

const koboldDef: InhabitantContent = {
  id: KOBOLD_ID,
  name: 'Kobold',
  __type: 'inhabitant',
  type: 'creature',
  tier: 1,
  description: 'A cunning tinkerer.',
  cost: { gold: 40 },
  stats: { hp: 25, attack: 8, defense: 6, speed: 14, workerEfficiency: 1.2 },
  traits: [
    {
      id: 'trap-affinity',
      name: 'Trap Affinity',
      description: 'Bonus to traps',
      effectType: 'production',
      effectValue: 0.1,
    },
  ],
  restrictionTags: [],
  rulerBonuses: {},
  rulerFearLevel: 0,
};

const hobgoblinDef: InhabitantContent = {
  id: HOBGOBLIN_ID,
  name: 'Hobgoblin',
  __type: 'inhabitant',
  type: 'hybrid',
  tier: 2,
  description: 'A disciplined warrior.',
  cost: {},
  stats: { hp: 50, attack: 18, defense: 15, speed: 10, workerEfficiency: 1.1 },
  traits: [
    {
      id: 'disciplined',
      name: 'Disciplined',
      description: 'Bonus to defense',
      effectType: 'defense',
      effectValue: 0.15,
    },
  ],
  restrictionTags: [],
  rulerBonuses: {},
  rulerFearLevel: 0,
};

function makeInstance(
  instanceId: InhabitantInstanceId,
  definitionId: InhabitantId,
  name: string,
  overrides: Partial<InhabitantInstance> = {},
): InhabitantInstance {
  return {
    instanceId,
    definitionId,
    name,
    state: 'normal',
    assignedRoomId: undefined,
    ...overrides,
  };
}

// --- Tests ---

describe('fusion', () => {
  beforeEach(() => {
    mockContent.clear();
    mockResources = createResources();
    mockInhabitants = [];
    uuidCounter = 0;

    const recipe1 = makeRecipe();
    mockContent.set(recipe1.id, recipe1);

    const recipe2 = makeRecipe({
      id: RECIPE_BONE_GOBLIN_ID,
      name: 'Bone Goblin Fusion',
      description: 'Fuse a Goblin and Skeleton.',
      creatureAId: GOBLIN_ID,
      creatureBId: SKELETON_ID,
      resultHybridId: BONE_GOBLIN_ID,
      cost: { essence: 45, gold: 50 },
    });
    mockContent.set(recipe2.id, recipe2);

    mockContent.set(GOBLIN_ID, goblinDef);
    mockContent.set(KOBOLD_ID, koboldDef);
    mockContent.set(HOBGOBLIN_ID, hobgoblinDef);
  });

  describe('fusionFindRecipe', () => {
    it('should find a recipe for a valid pair (A, B)', async () => {
      const { fusionFindRecipe } = await import('./fusion');
      const recipe = fusionFindRecipe(GOBLIN_ID, KOBOLD_ID);
      expect(recipe).toBeDefined();
      expect(recipe!.name).toBe('Hobgoblin Fusion');
      expect(recipe!.resultHybridId).toBe(HOBGOBLIN_ID);
    });

    it('should find a recipe for a reversed pair (B, A)', async () => {
      const { fusionFindRecipe } = await import('./fusion');
      const recipe = fusionFindRecipe(KOBOLD_ID, GOBLIN_ID);
      expect(recipe).toBeDefined();
      expect(recipe!.name).toBe('Hobgoblin Fusion');
    });

    it('should return undefined for an invalid pair', async () => {
      const { fusionFindRecipe } = await import('./fusion');
      const recipe = fusionFindRecipe(KOBOLD_ID, IMP_ID);
      expect(recipe).toBeUndefined();
    });

    it('should return undefined when same creature is used twice', async () => {
      const { fusionFindRecipe } = await import('./fusion');
      const recipe = fusionFindRecipe(GOBLIN_ID, GOBLIN_ID);
      expect(recipe).toBeUndefined();
    });

    it('should find the correct recipe when multiple exist', async () => {
      const { fusionFindRecipe } = await import('./fusion');
      const recipe = fusionFindRecipe(SKELETON_ID, GOBLIN_ID);
      expect(recipe).toBeDefined();
      expect(recipe!.name).toBe('Bone Goblin Fusion');
      expect(recipe!.resultHybridId).toBe(BONE_GOBLIN_ID);
    });
  });

  describe('fusionGetAllRecipes', () => {
    it('should return all fusion recipes', async () => {
      const { fusionGetAllRecipes } = await import('./fusion');
      const recipes = fusionGetAllRecipes();
      expect(recipes).toHaveLength(2);
    });

    it('should return empty array when no recipes exist', async () => {
      mockContent.clear();
      const { fusionGetAllRecipes } = await import('./fusion');
      const recipes = fusionGetAllRecipes();
      expect(recipes).toHaveLength(0);
    });
  });

  describe('fusionValidate', () => {
    it('should return valid for a correct pair with sufficient resources', async () => {
      mockInhabitants = [
        makeInstance(INSTANCE_A_ID, GOBLIN_ID, 'Goblin A'),
        makeInstance(INSTANCE_B_ID, KOBOLD_ID, 'Kobold B'),
      ];

      const { fusionValidate } = await import('./fusion');
      const result = fusionValidate(INSTANCE_A_ID, INSTANCE_B_ID);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject when same instance ID is used', async () => {
      mockInhabitants = [
        makeInstance(INSTANCE_A_ID, GOBLIN_ID, 'Goblin A'),
      ];

      const { fusionValidate } = await import('./fusion');
      const result = fusionValidate(INSTANCE_A_ID, INSTANCE_A_ID);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Cannot fuse an inhabitant with itself');
    });

    it('should reject when parent A not found', async () => {
      mockInhabitants = [
        makeInstance(INSTANCE_B_ID, KOBOLD_ID, 'Kobold B'),
      ];

      const { fusionValidate } = await import('./fusion');
      const result = fusionValidate(INSTANCE_A_ID, INSTANCE_B_ID);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Parent A not found');
    });

    it('should reject when parent B not found', async () => {
      mockInhabitants = [
        makeInstance(INSTANCE_A_ID, GOBLIN_ID, 'Goblin A'),
      ];

      const { fusionValidate } = await import('./fusion');
      const result = fusionValidate(INSTANCE_A_ID, INSTANCE_B_ID);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Parent B not found');
    });

    it('should reject when no recipe exists', async () => {
      mockInhabitants = [
        makeInstance(INSTANCE_A_ID, KOBOLD_ID, 'Kobold A'),
        makeInstance(INSTANCE_B_ID, IMP_ID, 'Imp B'),
      ];

      const { fusionValidate } = await import('./fusion');
      const result = fusionValidate(INSTANCE_A_ID, INSTANCE_B_ID);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('No fusion recipe exists for this pair');
    });

    it('should reject when resources are insufficient', async () => {
      mockResources = {
        ...createResources(),
        essence: { current: 5, max: 200 },
        gold: { current: 10, max: 1000 },
      };
      mockInhabitants = [
        makeInstance(INSTANCE_A_ID, GOBLIN_ID, 'Goblin A'),
        makeInstance(INSTANCE_B_ID, KOBOLD_ID, 'Kobold B'),
      ];

      const { fusionValidate } = await import('./fusion');
      const result = fusionValidate(INSTANCE_A_ID, INSTANCE_B_ID);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Insufficient resources');
    });
  });

  describe('fusionGetPreview', () => {
    it('should return preview data for a valid pair', async () => {
      const { fusionGetPreview } = await import('./fusion');
      const preview = fusionGetPreview(GOBLIN_ID, KOBOLD_ID);
      expect(preview).toBeDefined();
      expect(preview!.hybridDef.name).toBe('Hobgoblin');
      expect(preview!.parentADef.name).toBe('Goblin');
      expect(preview!.parentBDef.name).toBe('Kobold');
      expect(preview!.recipe.name).toBe('Hobgoblin Fusion');
    });

    it('should return undefined when no recipe exists', async () => {
      const { fusionGetPreview } = await import('./fusion');
      const preview = fusionGetPreview(KOBOLD_ID, IMP_ID);
      expect(preview).toBeUndefined();
    });

    it('should calculate cost entries with sufficiency flags', async () => {
      const { fusionGetPreview } = await import('./fusion');
      const preview = fusionGetPreview(GOBLIN_ID, KOBOLD_ID);
      expect(preview).toBeDefined();
      expect(preview!.costEntries.length).toBeGreaterThan(0);

      const essenceCost = preview!.costEntries.find((e) => e.type === 'essence');
      expect(essenceCost).toBeDefined();
      expect(essenceCost!.amount).toBe(40);
      expect(essenceCost!.current).toBe(100);
      expect(essenceCost!.sufficient).toBe(true);

      const goldCost = preview!.costEntries.find((e) => e.type === 'gold');
      expect(goldCost).toBeDefined();
      expect(goldCost!.amount).toBe(60);
      expect(goldCost!.current).toBe(200);
      expect(goldCost!.sufficient).toBe(true);
    });

    it('should mark canAfford false when resources are insufficient', async () => {
      mockResources = {
        ...createResources(),
        essence: { current: 5, max: 200 },
      };

      const { fusionGetPreview } = await import('./fusion');
      const preview = fusionGetPreview(GOBLIN_ID, KOBOLD_ID);
      expect(preview).toBeDefined();
      expect(preview!.canAfford).toBe(false);

      const essenceCost = preview!.costEntries.find((e) => e.type === 'essence');
      expect(essenceCost!.sufficient).toBe(false);
    });
  });

  describe('fusionExecute', () => {
    it('should create a hybrid and remove parents on success', async () => {
      mockInhabitants = [
        makeInstance(INSTANCE_A_ID, GOBLIN_ID, 'Goblin A'),
        makeInstance(INSTANCE_B_ID, KOBOLD_ID, 'Kobold B'),
      ];

      const { fusionExecute } = await import('./fusion');
      const result = await fusionExecute(INSTANCE_A_ID, INSTANCE_B_ID);

      expect(result.success).toBe(true);
      expect(result.hybridInstance).toBeDefined();
      expect(result.hybridInstance!.definitionId).toBe(HOBGOBLIN_ID);
      expect(result.hybridInstance!.isHybrid).toBe(true);
      expect(result.hybridInstance!.hybridParentIds).toEqual([
        INSTANCE_A_ID,
        INSTANCE_B_ID,
      ]);
      expect(result.hybridInstance!.name).toBe('Hobgoblin');
    });

    it('should remove parents from inhabitants after fusion', async () => {
      mockInhabitants = [
        makeInstance(INSTANCE_A_ID, GOBLIN_ID, 'Goblin A'),
        makeInstance(INSTANCE_B_ID, KOBOLD_ID, 'Kobold B'),
      ];

      const { fusionExecute } = await import('./fusion');
      await fusionExecute(INSTANCE_A_ID, INSTANCE_B_ID);

      const hasParentA = mockInhabitants.some(
        (i) => i.instanceId === INSTANCE_A_ID,
      );
      const hasParentB = mockInhabitants.some(
        (i) => i.instanceId === INSTANCE_B_ID,
      );
      expect(hasParentA).toBe(false);
      expect(hasParentB).toBe(false);
    });

    it('should deduct resources after fusion', async () => {
      mockInhabitants = [
        makeInstance(INSTANCE_A_ID, GOBLIN_ID, 'Goblin A'),
        makeInstance(INSTANCE_B_ID, KOBOLD_ID, 'Kobold B'),
      ];

      const { fusionExecute } = await import('./fusion');
      await fusionExecute(INSTANCE_A_ID, INSTANCE_B_ID);

      expect(mockResources.essence.current).toBe(60); // 100 - 40
      expect(mockResources.gold.current).toBe(140); // 200 - 60
    });

    it('should fail when validation fails', async () => {
      mockInhabitants = [];

      const { fusionExecute } = await import('./fusion');
      const result = await fusionExecute(INSTANCE_A_ID, INSTANCE_B_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should fail when payment fails', async () => {
      mockResources = {
        ...createResources(),
        essence: { current: 0, max: 200 },
        gold: { current: 0, max: 1000 },
      };
      mockInhabitants = [
        makeInstance(INSTANCE_A_ID, GOBLIN_ID, 'Goblin A'),
        makeInstance(INSTANCE_B_ID, KOBOLD_ID, 'Kobold B'),
      ];

      const { fusionExecute } = await import('./fusion');
      const result = await fusionExecute(INSTANCE_A_ID, INSTANCE_B_ID);

      expect(result.success).toBe(false);
    });
  });

  describe('fusionHasAvailableCreatures', () => {
    it('should return true when 2+ eligible inhabitants exist', async () => {
      mockInhabitants = [
        makeInstance(INSTANCE_A_ID, GOBLIN_ID, 'Goblin A'),
        makeInstance(INSTANCE_B_ID, KOBOLD_ID, 'Kobold B'),
      ];

      const { fusionHasAvailableCreatures } = await import('./fusion');
      expect(fusionHasAvailableCreatures()).toBe(true);
    });

    it('should return false when fewer than 2 inhabitants exist', async () => {
      mockInhabitants = [
        makeInstance(INSTANCE_A_ID, GOBLIN_ID, 'Goblin A'),
      ];

      const { fusionHasAvailableCreatures } = await import('./fusion');
      expect(fusionHasAvailableCreatures()).toBe(false);
    });

    it('should return false with empty roster', async () => {
      mockInhabitants = [];

      const { fusionHasAvailableCreatures } = await import('./fusion');
      expect(fusionHasAvailableCreatures()).toBe(false);
    });

    it('should exclude temporary inhabitants', async () => {
      mockInhabitants = [
        makeInstance(INSTANCE_A_ID, GOBLIN_ID, 'Goblin A'),
        makeInstance(INSTANCE_B_ID, KOBOLD_ID, 'Kobold B', {
          isTemporary: true,
          temporaryTicksRemaining: 100,
        }),
      ];

      const { fusionHasAvailableCreatures } = await import('./fusion');
      expect(fusionHasAvailableCreatures()).toBe(false);
    });

    it('should exclude traveling inhabitants', async () => {
      mockInhabitants = [
        makeInstance(INSTANCE_A_ID, GOBLIN_ID, 'Goblin A'),
        makeInstance(INSTANCE_B_ID, KOBOLD_ID, 'Kobold B', {
          travelTicksRemaining: 50,
        }),
      ];

      const { fusionHasAvailableCreatures } = await import('./fusion');
      expect(fusionHasAvailableCreatures()).toBe(false);
    });
  });

  // --- Stat Generation Test Data ---
  // Uses YAML-accurate stats for parent creatures

  const yamlGoblin: InhabitantContent = {
    id: GOBLIN_ID,
    name: 'Goblin',
    __type: 'inhabitant',
    type: 'creature',
    tier: 1,
    description: 'A scrappy worker.',
    cost: { gold: 50 },
    stats: {
      hp: 30,
      attack: 10,
      defense: 8,
      speed: 12,
      workerEfficiency: 1.0,
    },
    traits: [
      {
        id: 'trait-goblin-miner',
        name: 'Miner',
        description: 'Crystal production bonus.',
        effectType: 'production_bonus',
        effectValue: 0.2,
        targetResourceType: 'crystals',
      },
    ],
    restrictionTags: [],
    rulerBonuses: {},
    rulerFearLevel: 0,
  };

  const yamlKobold: InhabitantContent = {
    id: KOBOLD_ID,
    name: 'Kobold',
    __type: 'inhabitant',
    type: 'creature',
    tier: 1,
    description: 'A cunning trapper.',
    cost: { gold: 40 },
    stats: {
      hp: 20,
      attack: 8,
      defense: 5,
      speed: 18,
      workerEfficiency: 0.9,
    },
    traits: [
      {
        id: 'trait-kobold-trapper',
        name: 'Trapper',
        description: 'Trap bonus.',
        effectType: 'trap_bonus',
        effectValue: 0.25,
      },
    ],
    restrictionTags: [],
    rulerBonuses: {},
    rulerFearLevel: 0,
  };

  const yamlSkeleton: InhabitantContent = {
    id: SKELETON_ID,
    name: 'Skeleton',
    __type: 'inhabitant',
    type: 'undead',
    tier: 1,
    description: 'A tireless guardian.',
    cost: { gold: 60, essence: 15 },
    stats: {
      hp: 40,
      attack: 12,
      defense: 15,
      speed: 6,
      workerEfficiency: 0.6,
    },
    traits: [
      {
        id: 'trait-skeleton-guard',
        name: 'Tireless Guard',
        description: 'Defense bonus.',
        effectType: 'defense_bonus',
        effectValue: 0.15,
      },
    ],
    restrictionTags: [],
    rulerBonuses: {},
    rulerFearLevel: 0,
  };

  const yamlWraith: InhabitantContent = {
    id: WRAITH_ID,
    name: 'Wraith',
    __type: 'inhabitant',
    type: 'undead',
    tier: 2,
    description: 'A spectral horror.',
    cost: { gold: 80, essence: 30 },
    stats: {
      hp: 25,
      attack: 18,
      defense: 4,
      speed: 20,
      workerEfficiency: 0.8,
    },
    traits: [
      {
        id: 'trait-wraith-phase',
        name: 'Phase',
        description: 'Physical evasion.',
        effectType: 'physical_evasion',
        effectValue: 0.2,
      },
      {
        id: 'trait-wraith-fear',
        name: 'Terror Aura',
        description: 'Fear bonus.',
        effectType: 'fear_bonus',
        effectValue: 1,
      },
    ],
    restrictionTags: [],
    rulerBonuses: {},
    rulerFearLevel: 1,
  };

  const yamlOrc: InhabitantContent = {
    id: ORC_ID,
    name: 'Orc',
    __type: 'inhabitant',
    type: 'creature',
    tier: 2,
    description: 'A brutal warrior.',
    cost: { gold: 80, food: 40 },
    stats: {
      hp: 60,
      attack: 20,
      defense: 14,
      speed: 10,
      workerEfficiency: 0.8,
    },
    traits: [
      {
        id: 'trait-orc-brawl',
        name: 'Brawler',
        description: 'Attack bonus.',
        effectType: 'attack_bonus',
        effectValue: 0.2,
      },
    ],
    restrictionTags: [],
    rulerBonuses: {},
    rulerFearLevel: 0,
  };

  const yamlHobgoblin: InhabitantContent = {
    id: HOBGOBLIN_ID,
    name: 'Hobgoblin',
    __type: 'inhabitant',
    type: 'creature',
    tier: 2,
    description: 'A disciplined warrior.',
    cost: {},
    stats: {
      hp: 40,
      attack: 14,
      defense: 12,
      speed: 14,
      workerEfficiency: 1.1,
    },
    traits: [
      {
        id: 'trait-hobgoblin-disciplined',
        name: 'Disciplined',
        description: 'Production bonus.',
        effectType: 'production_bonus',
        effectValue: 0.15,
        targetResourceType: 'crystals',
      },
      {
        id: 'trait-hobgoblin-taskmaster',
        name: 'Taskmaster',
        description: 'Training speed bonus.',
        effectType: 'training_bonus',
        effectValue: 0.1,
      },
    ],
    restrictionTags: ['hybrid'],
    rulerBonuses: {},
    rulerFearLevel: 0,
    statOverrides: { hp: 40, attack: 14, defense: 12 },
  };

  const yamlDeathKnight: InhabitantContent = {
    id: DEATH_KNIGHT_ID,
    name: 'Death Knight',
    __type: 'inhabitant',
    type: 'undead',
    tier: 3,
    description: 'A spectral commander.',
    cost: {},
    stats: {
      hp: 55,
      attack: 22,
      defense: 20,
      speed: 10,
      workerEfficiency: 0.7,
    },
    traits: [
      {
        id: 'trait-death-knight-command',
        name: 'Undead Commander',
        description: 'Attack bonus.',
        effectType: 'attack_bonus',
        effectValue: 0.2,
      },
      {
        id: 'trait-death-knight-spectral',
        name: 'Spectral Armor',
        description: 'Damage reduction.',
        effectType: 'damage_reduction',
        effectValue: 0.2,
      },
      {
        id: 'trait-death-knight-fear',
        name: 'Dread Presence',
        description: 'Fear bonus.',
        effectType: 'fear_bonus',
        effectValue: 2,
      },
    ],
    restrictionTags: ['hybrid'],
    rulerBonuses: {},
    rulerFearLevel: 2,
    statOverrides: { hp: 55, attack: 22, defense: 20 },
  };

  const yamlWarChief: InhabitantContent = {
    id: WAR_CHIEF_ID,
    name: 'War Chief',
    __type: 'inhabitant',
    type: 'creature',
    tier: 3,
    description: 'A tactical leader.',
    cost: {},
    stats: {
      hp: 50,
      attack: 20,
      defense: 16,
      speed: 14,
      workerEfficiency: 1.0,
    },
    traits: [
      {
        id: 'trait-war-chief-rally',
        name: 'Rally Cry',
        description: 'Attack bonus.',
        effectType: 'attack_bonus',
        effectValue: 0.15,
      },
      {
        id: 'trait-war-chief-cunning',
        name: 'Tactical Cunning',
        description: 'Defense bonus.',
        effectType: 'defense_bonus',
        effectValue: 0.1,
      },
    ],
    restrictionTags: ['hybrid'],
    rulerBonuses: {},
    rulerFearLevel: 1,
  };

  describe('fusionGenerateHybridStats', () => {
    it('should average Goblin (30 HP) + Kobold (20 HP) = 25 HP', async () => {
      const { fusionGenerateHybridStats } = await import('./fusion');
      const stats = fusionGenerateHybridStats(yamlGoblin, yamlKobold);
      expect(stats.hp).toBe(25);
    });

    it('should average Skeleton (40 HP) + Wraith (25 HP) = 32 HP', async () => {
      const { fusionGenerateHybridStats } = await import('./fusion');
      const stats = fusionGenerateHybridStats(yamlSkeleton, yamlWraith);
      expect(stats.hp).toBe(32);
    });

    it('should floor attack averaging for Goblin + Kobold', async () => {
      const { fusionGenerateHybridStats } = await import('./fusion');
      const stats = fusionGenerateHybridStats(yamlGoblin, yamlKobold);
      // (10 + 8) / 2 = 9
      expect(stats.attack).toBe(9);
    });

    it('should floor attack averaging for Skeleton + Wraith', async () => {
      const { fusionGenerateHybridStats } = await import('./fusion');
      const stats = fusionGenerateHybridStats(yamlSkeleton, yamlWraith);
      // (12 + 18) / 2 = 15
      expect(stats.attack).toBe(15);
    });

    it('should floor attack averaging for Orc + Goblin', async () => {
      const { fusionGenerateHybridStats } = await import('./fusion');
      const stats = fusionGenerateHybridStats(yamlOrc, yamlGoblin);
      // (20 + 10) / 2 = 15
      expect(stats.attack).toBe(15);
    });

    it('should floor defense averaging for Goblin + Kobold', async () => {
      const { fusionGenerateHybridStats } = await import('./fusion');
      const stats = fusionGenerateHybridStats(yamlGoblin, yamlKobold);
      // (8 + 5) / 2 = 6.5 → 6
      expect(stats.defense).toBe(6);
    });

    it('should floor defense averaging for Skeleton + Wraith', async () => {
      const { fusionGenerateHybridStats } = await import('./fusion');
      const stats = fusionGenerateHybridStats(yamlSkeleton, yamlWraith);
      // (15 + 4) / 2 = 9.5 → 9
      expect(stats.defense).toBe(9);
    });

    it('should floor defense averaging for Orc + Goblin', async () => {
      const { fusionGenerateHybridStats } = await import('./fusion');
      const stats = fusionGenerateHybridStats(yamlOrc, yamlGoblin);
      // (14 + 8) / 2 = 11
      expect(stats.defense).toBe(11);
    });

    it('should floor speed averaging for Goblin + Kobold', async () => {
      const { fusionGenerateHybridStats } = await import('./fusion');
      const stats = fusionGenerateHybridStats(yamlGoblin, yamlKobold);
      // (12 + 18) / 2 = 15
      expect(stats.speed).toBe(15);
    });

    it('should floor speed averaging for Skeleton + Wraith', async () => {
      const { fusionGenerateHybridStats } = await import('./fusion');
      const stats = fusionGenerateHybridStats(yamlSkeleton, yamlWraith);
      // (6 + 20) / 2 = 13
      expect(stats.speed).toBe(13);
    });

    it('should floor speed averaging for Orc + Goblin', async () => {
      const { fusionGenerateHybridStats } = await import('./fusion');
      const stats = fusionGenerateHybridStats(yamlOrc, yamlGoblin);
      // (10 + 12) / 2 = 11
      expect(stats.speed).toBe(11);
    });

    it('should produce decimal workerEfficiency for Goblin + Kobold', async () => {
      const { fusionGenerateHybridStats } = await import('./fusion');
      const stats = fusionGenerateHybridStats(yamlGoblin, yamlKobold);
      // (1.0 + 0.9) / 2 = 0.95
      expect(stats.workerEfficiency).toBeCloseTo(0.95);
    });

    it('should produce decimal workerEfficiency for Skeleton + Wraith', async () => {
      const { fusionGenerateHybridStats } = await import('./fusion');
      const stats = fusionGenerateHybridStats(yamlSkeleton, yamlWraith);
      // (0.6 + 0.8) / 2 = 0.7
      expect(stats.workerEfficiency).toBeCloseTo(0.7);
    });

    it('should produce decimal workerEfficiency for Orc + Goblin', async () => {
      const { fusionGenerateHybridStats } = await import('./fusion');
      const stats = fusionGenerateHybridStats(yamlOrc, yamlGoblin);
      // (0.8 + 1.0) / 2 = 0.9
      expect(stats.workerEfficiency).toBeCloseTo(0.9);
    });

    it('should return complete stat block', async () => {
      const { fusionGenerateHybridStats } = await import('./fusion');
      const stats = fusionGenerateHybridStats(yamlGoblin, yamlKobold);
      expect(stats).toEqual({
        hp: 25,
        attack: 9,
        defense: 6,
        speed: 15,
        workerEfficiency: 0.95,
      });
    });

    it('should handle zero stats', async () => {
      const { fusionGenerateHybridStats } = await import('./fusion');
      const zeroParent: InhabitantContent = {
        ...yamlGoblin,
        stats: {
          hp: 0,
          attack: 0,
          defense: 0,
          speed: 0,
          workerEfficiency: 0,
        },
      };
      const stats = fusionGenerateHybridStats(zeroParent, yamlKobold);
      expect(stats.hp).toBe(10);
      expect(stats.attack).toBe(4);
      expect(stats.defense).toBe(2);
      expect(stats.speed).toBe(9);
      expect(stats.workerEfficiency).toBeCloseTo(0.45);
    });

    it('should be deterministic (same inputs = same outputs)', async () => {
      const { fusionGenerateHybridStats } = await import('./fusion');
      const stats1 = fusionGenerateHybridStats(yamlGoblin, yamlKobold);
      const stats2 = fusionGenerateHybridStats(yamlGoblin, yamlKobold);
      expect(stats1).toEqual(stats2);
    });

    it('should be pure (does not modify inputs)', async () => {
      const { fusionGenerateHybridStats } = await import('./fusion');
      const parentACopy = { ...yamlGoblin, stats: { ...yamlGoblin.stats } };
      const parentBCopy = { ...yamlKobold, stats: { ...yamlKobold.stats } };
      fusionGenerateHybridStats(parentACopy, parentBCopy);
      expect(parentACopy.stats).toEqual(yamlGoblin.stats);
      expect(parentBCopy.stats).toEqual(yamlKobold.stats);
    });
  });

  describe('fusionApplyStatOverrides', () => {
    it('should return copy of stats when no overrides', async () => {
      const { fusionApplyStatOverrides } = await import('./fusion');
      const base: InhabitantStats = {
        hp: 25,
        attack: 9,
        defense: 6,
        speed: 15,
        workerEfficiency: 0.95,
      };
      const result = fusionApplyStatOverrides(base, undefined);
      expect(result).toEqual(base);
      expect(result).not.toBe(base);
    });

    it('should override only specified stats', async () => {
      const { fusionApplyStatOverrides } = await import('./fusion');
      const base: InhabitantStats = {
        hp: 25,
        attack: 9,
        defense: 6,
        speed: 15,
        workerEfficiency: 0.95,
      };
      const result = fusionApplyStatOverrides(base, { hp: 40, attack: 14 });
      expect(result.hp).toBe(40);
      expect(result.attack).toBe(14);
      expect(result.defense).toBe(6);
      expect(result.speed).toBe(15);
      expect(result.workerEfficiency).toBeCloseTo(0.95);
    });

    it('should override all stats when all specified', async () => {
      const { fusionApplyStatOverrides } = await import('./fusion');
      const base: InhabitantStats = {
        hp: 25,
        attack: 9,
        defense: 6,
        speed: 15,
        workerEfficiency: 0.95,
      };
      const overrides: InhabitantStats = {
        hp: 50,
        attack: 20,
        defense: 16,
        speed: 14,
        workerEfficiency: 1.1,
      };
      const result = fusionApplyStatOverrides(base, overrides);
      expect(result).toEqual(overrides);
    });

    it('should apply Hobgoblin stat overrides correctly', async () => {
      const { fusionGenerateHybridStats, fusionApplyStatOverrides } =
        await import('./fusion');
      const generated = fusionGenerateHybridStats(yamlGoblin, yamlKobold);
      expect(generated.hp).toBe(25);
      expect(generated.attack).toBe(9);
      expect(generated.defense).toBe(6);

      const final = fusionApplyStatOverrides(
        generated,
        yamlHobgoblin.statOverrides,
      );
      expect(final.hp).toBe(40);
      expect(final.attack).toBe(14);
      expect(final.defense).toBe(12);
      // Speed and workerEfficiency use generated values
      expect(final.speed).toBe(15);
      expect(final.workerEfficiency).toBeCloseTo(0.95);
    });
  });

  describe('fusionMergeTraits', () => {
    it('should include all parent traits with no duplicates', async () => {
      const { fusionMergeTraits } = await import('./fusion');
      const merged = fusionMergeTraits(
        yamlGoblin,
        yamlKobold,
        yamlHobgoblin,
      );

      // Goblin: production_bonus (crystals), Kobold: trap_bonus
      // Hobgoblin bonus: production_bonus (crystals), training_bonus
      const effectTypes = merged.map((t) => t.effectType);
      expect(effectTypes).toContain('production_bonus');
      expect(effectTypes).toContain('trap_bonus');
      expect(effectTypes).toContain('training_bonus');
    });

    it('should resolve conflicting traits by favoring higher-tier parent', async () => {
      const { fusionMergeTraits } = await import('./fusion');

      // Wraith (tier 2) has fear_bonus, create a tier 1 with fear_bonus
      const tier1WithFear: InhabitantContent = {
        ...yamlSkeleton,
        traits: [
          {
            id: 'trait-skel-fear',
            name: 'Weak Fear',
            description: 'Fear bonus.',
            effectType: 'fear_bonus',
            effectValue: 0.5,
          },
        ],
      };

      const hybridDef: InhabitantContent = {
        ...yamlDeathKnight,
        traits: [],
      };

      const merged = fusionMergeTraits(tier1WithFear, yamlWraith, hybridDef);

      // Wraith is tier 2 (higher), so its fear_bonus should be used
      const fearTraits = merged.filter((t) => t.effectType === 'fear_bonus');
      expect(fearTraits).toHaveLength(1);
      expect(fearTraits[0].effectValue).toBe(1);
      expect(fearTraits[0].name).toBe('Terror Aura');
    });

    it('should keep non-conflicting traits from both parents', async () => {
      const { fusionMergeTraits } = await import('./fusion');
      // Skeleton: defense_bonus, Wraith: physical_evasion + fear_bonus
      const hybridDef: InhabitantContent = {
        ...yamlDeathKnight,
        traits: [],
      };
      const merged = fusionMergeTraits(
        yamlSkeleton,
        yamlWraith,
        hybridDef,
      );

      const effectTypes = merged.map((t) => t.effectType);
      expect(effectTypes).toContain('defense_bonus');
      expect(effectTypes).toContain('physical_evasion');
      expect(effectTypes).toContain('fear_bonus');
    });

    it('should add bonus traits from hybrid definition', async () => {
      const { fusionMergeTraits } = await import('./fusion');
      const merged = fusionMergeTraits(
        yamlSkeleton,
        yamlWraith,
        yamlDeathKnight,
      );

      // Death Knight bonus traits: attack_bonus, damage_reduction, fear_bonus
      const bonusTraitNames = merged.map((t) => t.name);
      expect(bonusTraitNames).toContain('Undead Commander');
      expect(bonusTraitNames).toContain('Spectral Armor');
      expect(bonusTraitNames).toContain('Dread Presence');
    });

    it('should handle parents with empty traits', async () => {
      const { fusionMergeTraits } = await import('./fusion');
      const emptyTraitParent: InhabitantContent = {
        ...yamlGoblin,
        traits: [],
      };
      const merged = fusionMergeTraits(
        emptyTraitParent,
        yamlKobold,
        yamlHobgoblin,
      );
      expect(merged.length).toBeGreaterThan(0);
      // Kobold trait + hobgoblin bonus traits
      expect(merged.some((t) => t.effectType === 'trap_bonus')).toBe(true);
    });

    it('should include at least 5 unique bonus traits across hybrids', async () => {
      const { fusionMergeTraits } = await import('./fusion');

      // Hobgoblin: Disciplined (production_bonus) + Taskmaster (training_bonus)
      const hob = fusionMergeTraits(yamlGoblin, yamlKobold, yamlHobgoblin);
      const hobBonus = hob.filter(
        (t) =>
          t.id === 'trait-hobgoblin-disciplined' ||
          t.id === 'trait-hobgoblin-taskmaster',
      );

      // Death Knight: Undead Commander + Spectral Armor + Dread Presence
      const dk = fusionMergeTraits(
        yamlSkeleton,
        yamlWraith,
        yamlDeathKnight,
      );
      const dkBonus = dk.filter(
        (t) =>
          t.id === 'trait-death-knight-command' ||
          t.id === 'trait-death-knight-spectral' ||
          t.id === 'trait-death-knight-fear',
      );

      // War Chief: Rally Cry + Tactical Cunning
      const wc = fusionMergeTraits(yamlOrc, yamlGoblin, yamlWarChief);
      const wcBonus = wc.filter(
        (t) =>
          t.id === 'trait-war-chief-rally' ||
          t.id === 'trait-war-chief-cunning',
      );

      const uniqueBonusTraits = [
        ...hobBonus,
        ...dkBonus,
        ...wcBonus,
      ];
      expect(uniqueBonusTraits.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('fusionCreateHybridInstance', () => {
    it('should create instance with hybrid flag and parent refs', async () => {
      const { fusionCreateHybridInstance } = await import('./fusion');
      const instance = fusionCreateHybridInstance(
        INSTANCE_A_ID,
        INSTANCE_B_ID,
        yamlHobgoblin,
      );

      expect(instance.isHybrid).toBe(true);
      expect(instance.hybridParentIds).toEqual([
        INSTANCE_A_ID,
        INSTANCE_B_ID,
      ]);
    });

    it('should create instance with correct definition reference', async () => {
      const { fusionCreateHybridInstance } = await import('./fusion');
      const instance = fusionCreateHybridInstance(
        INSTANCE_A_ID,
        INSTANCE_B_ID,
        yamlHobgoblin,
      );

      expect(instance.definitionId).toBe(HOBGOBLIN_ID);
      expect(instance.name).toBe('Hobgoblin');
    });

    it('should create instance with unique ID', async () => {
      const { fusionCreateHybridInstance } = await import('./fusion');
      const inst1 = fusionCreateHybridInstance(
        INSTANCE_A_ID,
        INSTANCE_B_ID,
        yamlHobgoblin,
      );
      const inst2 = fusionCreateHybridInstance(
        INSTANCE_A_ID,
        INSTANCE_B_ID,
        yamlHobgoblin,
      );

      expect(inst1.instanceId).not.toBe(inst2.instanceId);
    });

    it('should create instance in normal state with no assignment', async () => {
      const { fusionCreateHybridInstance } = await import('./fusion');
      const instance = fusionCreateHybridInstance(
        INSTANCE_A_ID,
        INSTANCE_B_ID,
        yamlHobgoblin,
      );

      expect(instance.state).toBe('normal');
      expect(instance.assignedRoomId).toBeUndefined();
    });

    it('should be compatible with InhabitantInstance type', async () => {
      const { fusionCreateHybridInstance } = await import('./fusion');
      const instance: InhabitantInstance = fusionCreateHybridInstance(
        INSTANCE_A_ID,
        INSTANCE_B_ID,
        yamlDeathKnight,
      );

      expect(instance.instanceId).toBeDefined();
      expect(instance.definitionId).toBe(DEATH_KNIGHT_ID);
      expect(instance.name).toBe('Death Knight');
      expect(instance.state).toBe('normal');
      expect(instance.isHybrid).toBe(true);
    });

    it('should use hybrid tier from definition, not calculated', async () => {
      const { fusionCreateHybridInstance } = await import('./fusion');
      const instance = fusionCreateHybridInstance(
        INSTANCE_A_ID,
        INSTANCE_B_ID,
        yamlDeathKnight,
      );

      // The instance references the definition which has tier 3
      // not calculated from parents (Skeleton tier 1 + Wraith tier 2)
      expect(instance.definitionId).toBe(DEATH_KNIGHT_ID);
      // Tier comes from the definition, accessed via definitionId
    });
  });
});
