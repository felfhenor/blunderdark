import { contentGetEntriesByType } from '@helpers/content';
import type { FusionRecipeContent, IsContentItem } from '@interfaces';

/**
 * Find a fusion recipe matching two creature definition IDs (order-independent).
 * Returns the recipe if found, or undefined if no recipe exists for that pair.
 */
export function fusionFindRecipe(
  creatureADefId: string,
  creatureBDefId: string,
): (FusionRecipeContent & IsContentItem) | undefined {
  const recipes = contentGetEntriesByType<
    FusionRecipeContent & IsContentItem
  >('fusionrecipe');

  return recipes.find(
    (r) =>
      (r.creatureAId === creatureADefId &&
        r.creatureBId === creatureBDefId) ||
      (r.creatureAId === creatureBDefId &&
        r.creatureBId === creatureADefId),
  );
}

/**
 * Get all available fusion recipes.
 */
export function fusionGetAllRecipes(): (FusionRecipeContent & IsContentItem)[] {
  return contentGetEntriesByType<FusionRecipeContent & IsContentItem>(
    'fusionrecipe',
  );
}
