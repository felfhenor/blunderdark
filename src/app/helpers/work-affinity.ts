import type { InhabitantCreatureType } from '@interfaces/content-inhabitant';
import type { WorkCategory } from '@interfaces/content-room';

export const WORK_AFFINITY_BONUS = 0.15;
export const WORK_AFFINITY_PENALTY = -0.25;

type AffinityMap = {
  preferred: WorkCategory[];
  disliked: WorkCategory[];
};

const CREATURE_AFFINITIES: Record<InhabitantCreatureType, AffinityMap> = {
  creature: {
    preferred: ['mining', 'combat'],
    disliked: ['arcane'],
  },
  undead: {
    preferred: ['arcane', 'combat'],
    disliked: ['nature'],
  },
  demon: {
    preferred: ['arcane', 'crafting'],
    disliked: ['nature', 'mining'],
  },
  dragon: {
    preferred: ['arcane', 'sanctum'],
    disliked: ['mining'],
  },
  aberration: {
    preferred: ['arcane', 'sanctum'],
    disliked: ['mining', 'nature'],
  },
  fungal: {
    preferred: ['nature', 'mining'],
    disliked: ['combat', 'arcane'],
  },
  ooze: {
    preferred: ['nature', 'mining'],
    disliked: ['arcane', 'combat'],
  },
};

/**
 * Get the affinity bonus/penalty for a creature type in a room category.
 * Returns WORK_AFFINITY_BONUS for preferred, WORK_AFFINITY_PENALTY for disliked, 0 for neutral.
 */
export function workAffinityGet(
  creatureType: InhabitantCreatureType,
  workCategory: WorkCategory | undefined,
): number {
  if (!workCategory) return 0;
  const affinity = CREATURE_AFFINITIES[creatureType];
  if (!affinity) return 0;
  if (affinity.preferred.includes(workCategory)) return WORK_AFFINITY_BONUS;
  if (affinity.disliked.includes(workCategory)) return WORK_AFFINITY_PENALTY;
  return 0;
}

/**
 * Get the affinity label for a creature type in a room category.
 */
export function workAffinityGetLabel(
  creatureType: InhabitantCreatureType,
  workCategory: WorkCategory | undefined,
): 'preferred' | 'disliked' | 'neutral' {
  if (!workCategory) return 'neutral';
  const affinity = CREATURE_AFFINITIES[creatureType];
  if (!affinity) return 'neutral';
  if (affinity.preferred.includes(workCategory)) return 'preferred';
  if (affinity.disliked.includes(workCategory)) return 'disliked';
  return 'neutral';
}

/**
 * Get the full affinity data for a creature type.
 */
export function workAffinityGetForType(
  creatureType: InhabitantCreatureType,
): AffinityMap {
  return CREATURE_AFFINITIES[creatureType];
}

/**
 * Display label for a work category.
 */
export const WORK_CATEGORY_LABELS: Record<WorkCategory, string> = {
  mining: 'Mining',
  nature: 'Nature',
  arcane: 'Arcane',
  combat: 'Combat',
  crafting: 'Crafting',
  sanctum: 'Sanctum',
  storage: 'Storage',
  transport: 'Transport',
};
