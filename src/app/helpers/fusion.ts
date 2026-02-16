import { contentGetEntry, contentGetEntriesByType } from '@helpers/content';
import { resourceCanAfford, resourcePayCost } from '@helpers/resources';
import { rngUuid } from '@helpers/rng';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type {
  FusionRecipeContent,
  InhabitantInstance,
  InhabitantInstanceId,
  InhabitantStats,
  InhabitantTrait,
  ResourceType,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';

export type FusionValidation = { valid: boolean; error?: string };

export type FusionResult = {
  success: boolean;
  hybridInstance?: InhabitantInstance;
  error?: string;
};

export type FusionCostEntry = {
  type: string;
  amount: number;
  current: number;
  sufficient: boolean;
};

export type FusionPreview = {
  recipe: FusionRecipeContent;
  hybridDef: InhabitantContent;
  parentADef: InhabitantContent;
  parentBDef: InhabitantContent;
  canAfford: boolean;
  costEntries: FusionCostEntry[];
};

/**
 * Find a fusion recipe matching two creature definition IDs (order-independent).
 * Returns the recipe if found, or undefined if no recipe exists for that pair.
 */
export function fusionFindRecipe(
  creatureADefId: string,
  creatureBDefId: string,
): (FusionRecipeContent) | undefined {
  const recipes = contentGetEntriesByType<
    FusionRecipeContent  >('fusionrecipe');

  return recipes.find(
    (r) =>
      (r.firstInhabitantId === creatureADefId &&
        r.secondInhabitantId === creatureBDefId) ||
      (r.firstInhabitantId === creatureBDefId &&
        r.secondInhabitantId === creatureADefId),
  );
}

/**
 * Get all available fusion recipes.
 */
export function fusionGetAllRecipes(): (FusionRecipeContent)[] {
  return contentGetEntriesByType<FusionRecipeContent>(
    'fusionrecipe',
  );
}

/**
 * Validate whether two inhabitant instances can be fused.
 */
export function fusionValidate(
  parentAInstanceId: InhabitantInstanceId,
  parentBInstanceId: InhabitantInstanceId,
): FusionValidation {
  if (parentAInstanceId === parentBInstanceId) {
    return { valid: false, error: 'Cannot fuse an inhabitant with itself' };
  }

  const inhabitants = gamestate().world.inhabitants;

  const parentA = inhabitants.find(
    (i) => i.instanceId === parentAInstanceId,
  );
  if (!parentA) {
    return { valid: false, error: 'Parent A not found' };
  }

  const parentB = inhabitants.find(
    (i) => i.instanceId === parentBInstanceId,
  );
  if (!parentB) {
    return { valid: false, error: 'Parent B not found' };
  }

  const recipe = fusionFindRecipe(parentA.definitionId, parentB.definitionId);
  if (!recipe) {
    return { valid: false, error: 'No fusion recipe exists for this pair' };
  }

  if (!resourceCanAfford(recipe.cost)) {
    return { valid: false, error: 'Insufficient resources' };
  }

  return { valid: true };
}

/**
 * Get preview data for a fusion between two creature definitions.
 */
export function fusionGetPreview(
  parentADefId: string,
  parentBDefId: string,
): FusionPreview | undefined {
  const recipe = fusionFindRecipe(parentADefId, parentBDefId);
  if (!recipe) return undefined;

  const hybridDef = contentGetEntry<InhabitantContent>(recipe.resultInhabitantId);
  if (!hybridDef) return undefined;

  const parentADef = contentGetEntry<InhabitantContent>(parentADefId);
  if (!parentADef) return undefined;

  const parentBDef = contentGetEntry<InhabitantContent>(parentBDefId);
  if (!parentBDef) return undefined;

  const resources = gamestate().world.resources;

  const costEntries: FusionCostEntry[] = Object.entries(recipe.cost)
    .filter(([, v]) => v && v > 0)
    .map(([type, amount]) => ({
      type,
      amount: amount!,
      current: resources[type as ResourceType].current,
      sufficient: resources[type as ResourceType].current >= amount!,
    }));

  const canAfford = costEntries.every((e) => e.sufficient);

  return { recipe, hybridDef, parentADef, parentBDef, canAfford, costEntries };
}

/**
 * Generate hybrid stats by averaging two parent definitions.
 * HP, attack, defense, speed are floored; workerEfficiency is decimal.
 */
export function fusionGenerateHybridStats(
  parentADef: InhabitantContent,
  parentBDef: InhabitantContent,
): InhabitantStats {
  return {
    hp: Math.floor((parentADef.stats.hp + parentBDef.stats.hp) / 2),
    attack: Math.floor(
      (parentADef.stats.attack + parentBDef.stats.attack) / 2,
    ),
    defense: Math.floor(
      (parentADef.stats.defense + parentBDef.stats.defense) / 2,
    ),
    speed: Math.floor((parentADef.stats.speed + parentBDef.stats.speed) / 2),
    workerEfficiency:
      (parentADef.stats.workerEfficiency +
        parentBDef.stats.workerEfficiency) /
      2,
  };
}

/**
 * Apply stat overrides on top of generated stats.
 * Only specified keys in overrides replace the generated values.
 */
export function fusionApplyStatOverrides(
  generatedStats: InhabitantStats,
  overrides?: Partial<InhabitantStats>,
): InhabitantStats {
  if (!overrides) return { ...generatedStats };
  return {
    hp: overrides.hp ?? generatedStats.hp,
    attack: overrides.attack ?? generatedStats.attack,
    defense: overrides.defense ?? generatedStats.defense,
    speed: overrides.speed ?? generatedStats.speed,
    workerEfficiency:
      overrides.workerEfficiency ?? generatedStats.workerEfficiency,
  };
}

/**
 * Merge traits from two parents plus bonus traits from the hybrid definition.
 * Conflicting traits (same effectType+target) resolved by favoring higher-tier parent.
 * Hybrid definition traits are added as bonus traits on top.
 */
export function fusionMergeTraits(
  parentADef: InhabitantContent,
  parentBDef: InhabitantContent,
  hybridDef: InhabitantContent,
): InhabitantTrait[] {
  const merged: InhabitantTrait[] = [];
  const seenKeys = new Set<string>();

  const higherTierParent =
    parentADef.tier >= parentBDef.tier ? parentADef : parentBDef;
  const lowerTierParent =
    parentADef.tier >= parentBDef.tier ? parentBDef : parentADef;

  for (const trait of higherTierParent.traits) {
    const key = `${trait.effectType}:${trait.targetResourceType ?? ''}:${trait.targetRoomName ?? ''}`;
    seenKeys.add(key);
    merged.push(trait);
  }

  for (const trait of lowerTierParent.traits) {
    const key = `${trait.effectType}:${trait.targetResourceType ?? ''}:${trait.targetRoomName ?? ''}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      merged.push(trait);
    }
  }

  for (const trait of hybridDef.traits) {
    merged.push(trait);
  }

  return merged;
}

/**
 * Create a hybrid inhabitant instance with all required fields.
 */
export function fusionCreateHybridInstance(
  parentAInstanceId: InhabitantInstanceId,
  parentBInstanceId: InhabitantInstanceId,
  hybridDef: InhabitantContent,
): InhabitantInstance {
  return {
    instanceId: rngUuid<InhabitantInstanceId>(),
    definitionId: hybridDef.id,
    name: hybridDef.name,
    state: 'normal',
    assignedRoomId: undefined,
    isHybrid: true,
    hybridParentIds: [parentAInstanceId, parentBInstanceId],
  };
}

/**
 * Execute a fusion between two inhabitant instances.
 */
export async function fusionExecute(
  parentAInstanceId: InhabitantInstanceId,
  parentBInstanceId: InhabitantInstanceId,
): Promise<FusionResult> {
  const validation = fusionValidate(parentAInstanceId, parentBInstanceId);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const inhabitants = gamestate().world.inhabitants;
  const parentA = inhabitants.find(
    (i) => i.instanceId === parentAInstanceId,
  )!;
  const parentB = inhabitants.find(
    (i) => i.instanceId === parentBInstanceId,
  )!;

  const recipe = fusionFindRecipe(
    parentA.definitionId,
    parentB.definitionId,
  )!;

  const paid = await resourcePayCost(recipe.cost);
  if (!paid) {
    return { success: false, error: 'Failed to pay fusion cost' };
  }

  const hybridDef = contentGetEntry<InhabitantContent>(recipe.resultInhabitantId);
  if (!hybridDef) {
    return { success: false, error: 'Hybrid definition not found' };
  }

  const hybridInstance = fusionCreateHybridInstance(
    parentAInstanceId,
    parentBInstanceId,
    hybridDef,
  );

  await updateGamestate((state) => {
    const newInhabitants = state.world.inhabitants
      .filter(
        (i) =>
          i.instanceId !== parentAInstanceId &&
          i.instanceId !== parentBInstanceId,
      )
      .concat(hybridInstance);

    const world = {
      ...state.world,
      inhabitants: newInhabitants,
    };

    return {
      ...state,
      world: {
        ...world,
        floors: world.floors
          ? world.floors.map((floor) => ({
              ...floor,
              inhabitants: newInhabitants,
            }))
          : world.floors,
      },
    };
  });

  return { success: true, hybridInstance };
}

/**
 * Check if there are 2+ eligible inhabitants for fusion (non-temporary, non-traveling).
 */
export function fusionHasAvailableCreatures(): boolean {
  const inhabitants = gamestate().world.inhabitants;
  let count = 0;

  for (const i of inhabitants) {
    if (i.isTemporary) continue;
    if (i.travelTicksRemaining && i.travelTicksRemaining > 0) continue;
    count++;
    if (count >= 2) return true;
  }

  return false;
}
