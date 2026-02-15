import type {
  FusionRecipeContent,
  FusionRecipeId,
  InhabitantId,
  IsContentItem,
} from '@interfaces';
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

// --- Test Data ---

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

// --- Tests ---

describe('fusion', () => {
  beforeEach(() => {
    mockContent.clear();

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
});
