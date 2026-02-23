import { contentGetEntriesByType } from '@helpers/content';
import { rngChoiceWeightedByRarity } from '@helpers/rng';
import type { InhabitantInstance } from '@interfaces/inhabitant';
import type { MutationTraitContent } from '@interfaces/content-mutationtrait';
import type { PRNG } from 'seedrandom';

/**
 * Roll a random mutation trait.
 * @param includeNegative - whether to include negative traits in the pool
 * @param existingTraitIds - trait IDs already on the inhabitant (excluded from pool)
 * @param rng - seeded PRNG
 */
export function mutationTraitRoll(
  includeNegative: boolean,
  existingTraitIds: string[],
  rng: PRNG,
): MutationTraitContent | undefined {
  const allTraits =
    contentGetEntriesByType<MutationTraitContent>('mutationtrait');
  const existingSet = new Set(existingTraitIds);

  const pool = allTraits.filter(
    (t) => !existingSet.has(t.id) && (includeNegative || !t.isNegative),
  );

  return rngChoiceWeightedByRarity(pool, rng);
}

/**
 * Roll a negative mutation trait specifically.
 * @param existingTraitIds - trait IDs already on the inhabitant (excluded from pool)
 * @param rng - seeded PRNG
 */
export function mutationTraitRollNegative(
  existingTraitIds: string[],
  rng: PRNG,
): MutationTraitContent | undefined {
  const allTraits =
    contentGetEntriesByType<MutationTraitContent>('mutationtrait');
  const existingSet = new Set(existingTraitIds);

  const pool = allTraits.filter(
    (t) => t.isNegative && !existingSet.has(t.id),
  );

  return rngChoiceWeightedByRarity(pool, rng);
}

/**
 * Apply a mutation trait to an inhabitant instance.
 * Returns a new instance with the trait ID appended.
 */
export function mutationTraitApply(
  inhabitant: InhabitantInstance,
  trait: MutationTraitContent,
): InhabitantInstance {
  return {
    ...inhabitant,
    mutated: true,
    mutationTraitIds: [...(inhabitant.mutationTraitIds ?? []), trait.id],
  };
}
