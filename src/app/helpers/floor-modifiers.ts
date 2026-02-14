import type { FloorDepthResourceModifier, FloorDepthModifierTier } from '@interfaces/floor-modifier';

// --- Configuration ---

export const FLOOR_MODIFIER_TIERS: readonly FloorDepthModifierTier[] = [
  {
    minDepth: 1,
    maxDepth: 1,
    modifiers: [
      { resourceType: 'food', percentage: 0.20, description: 'Shallow depth food bonus' },
      { resourceType: 'corruption', percentage: -0.10, description: 'Shallow depth corruption reduction' },
    ],
  },
  {
    minDepth: 2,
    maxDepth: 3,
    modifiers: [],
  },
  {
    minDepth: 4,
    maxDepth: 6,
    modifiers: [
      { resourceType: 'crystals', percentage: 0.10, description: 'Mid-depth crystal bonus' },
      { resourceType: 'gold', percentage: 0.10, description: 'Mid-depth gold bonus' },
      { resourceType: 'corruption', percentage: 0.05, description: 'Mid-depth corruption increase' },
      { resourceType: 'food', percentage: -0.15, description: 'Mid-depth food penalty' },
    ],
  },
  {
    minDepth: 7,
    maxDepth: 9,
    modifiers: [
      { resourceType: 'crystals', percentage: 0.20, description: 'Deep crystal bonus' },
      { resourceType: 'gold', percentage: 0.20, description: 'Deep gold bonus' },
      { resourceType: 'corruption', percentage: 0.10, description: 'Deep corruption increase' },
      { resourceType: 'food', percentage: -0.30, description: 'Deep food penalty' },
    ],
  },
  {
    minDepth: 10,
    maxDepth: 10,
    modifiers: [
      { resourceType: 'flux', percentage: 0.50, description: 'Abyssal rare resource bonus' },
      { resourceType: 'essence', percentage: 0.50, description: 'Abyssal rare resource bonus' },
      { resourceType: 'corruption', percentage: 0.50, description: 'Abyssal corruption surge' },
      { resourceType: 'food', percentage: -0.50, description: 'Abyssal food penalty' },
    ],
  },
];

// --- Helpers ---

/**
 * Get the depth modifier tier for a given floor depth.
 * Returns undefined if no tier matches (shouldn't happen for valid depths).
 */
function findTier(depth: number): FloorDepthModifierTier | undefined {
  return FLOOR_MODIFIER_TIERS.find(
    (tier) => depth >= tier.minDepth && depth <= tier.maxDepth,
  );
}

/**
 * Get all floor depth modifiers for a given depth.
 * Returns an empty array for baseline depths (2-3) or invalid depths.
 */
export function floorModifierGet(depth: number): FloorDepthResourceModifier[] {
  const tier = findTier(depth);
  if (!tier) return [];
  return tier.modifiers;
}

/**
 * Get the production multiplier for a specific resource type at a given floor depth.
 * Returns 1.0 (no modification) if no modifier applies to that resource.
 */
export function floorModifierGetMultiplier(depth: number, resourceType: string): number {
  const modifiers = floorModifierGet(depth);
  const modifier = modifiers.find((m) => m.resourceType === resourceType);
  if (!modifier) return 1.0;
  return 1.0 + modifier.percentage;
}

/**
 * Get a human-readable label for a modifier percentage.
 * e.g., 0.20 → "+20%", -0.15 → "-15%"
 */
export function floorModifierFormatPercentage(percentage: number): string {
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${Math.round(percentage * 100)}%`;
}
