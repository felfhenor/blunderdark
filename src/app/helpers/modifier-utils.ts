/**
 * Find a modifier in an array by predicate and return its multiplier.
 * Returns 1.0 (no effect) if no matching modifier is found.
 */
export function findModifierMultiplier<T extends { multiplier: number }>(
  items: readonly T[],
  predicate: (item: T) => boolean,
): number {
  return items.find(predicate)?.multiplier ?? 1.0;
}
