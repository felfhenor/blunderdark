import type {
  FusionRecipeContent,
  FusionRecipeId,
  GameState,
  InhabitantId,
  InhabitantInstance,
  InhabitantInstanceId,
  IsContentItem,
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
  overrides: Partial<FusionRecipeContent & IsContentItem> = {},
): FusionRecipeContent & IsContentItem {
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
});
