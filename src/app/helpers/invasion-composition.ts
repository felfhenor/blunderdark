import { getEntriesByType } from '@helpers/content';
import {
  createInvaderInstance,
  getAllInvaderDefinitions,
} from '@helpers/invaders';
import { rngChoice } from '@helpers/rng';
import type {
  CompositionWeightConfig,
  DungeonProfile,
  GameState,
  InvaderClassWeights,
  IsContentItem,
  RoomDefinition,
} from '@interfaces';
import type {
  InvaderClassType,
  InvaderDefinition,
  InvaderInstance,
} from '@interfaces/invader';
import seedrandom from 'seedrandom';

const INVADER_CLASSES: InvaderClassType[] = [
  'warrior',
  'rogue',
  'mage',
  'cleric',
  'paladin',
  'ranger',
];

const PROFILE_THRESHOLD = 60;

// --- Data-driven profile lookup ---

let invasionProfileCache:
  | Map<string, { dimension: string; weight: number }>
  | undefined = undefined;

function getInvasionProfileMap(): Map<
  string,
  { dimension: string; weight: number }
> {
  if (!invasionProfileCache) {
    const rooms = getEntriesByType<RoomDefinition & IsContentItem>('room');
    invasionProfileCache = new Map();
    for (const room of rooms) {
      if (room.invasionProfile) {
        invasionProfileCache.set(room.id, room.invasionProfile);
      }
    }
  }
  return invasionProfileCache;
}

export function resetInvasionCompositionCache(): void {
  invasionProfileCache = undefined;
}

// --- Dungeon profile ---

/**
 * Calculate a dungeon profile from game state.
 * Returns corruption/wealth/knowledge (0-100), size (room count), and threat level.
 */
export function calculateDungeonProfile(state: GameState): DungeonProfile {
  const floors = state.world.floors;
  const resources = state.world.resources;
  const profileMap = getInvasionProfileMap();

  // Count rooms across all floors and accumulate profile dimension weights
  let totalRooms = 0;
  const dimensionTotals: Record<string, number> = {
    corruption: 0,
    wealth: 0,
    knowledge: 0,
  };

  for (const floor of floors) {
    totalRooms += floor.rooms.length;
    for (const room of floor.rooms) {
      const profile = profileMap.get(room.roomTypeId);
      if (profile && dimensionTotals[profile.dimension] !== undefined) {
        dimensionTotals[profile.dimension] += profile.weight;
      }
    }
  }

  // Corruption: resource level + room bonuses
  const corruptionLevel = resources.corruption?.current ?? 0;
  const corruption = Math.min(
    100,
    corruptionLevel + dimensionTotals['corruption'],
  );

  // Wealth: gold level + room bonuses
  const goldLevel =
    resources.gold?.max > 0
      ? (resources.gold.current / resources.gold.max) * 50
      : 0;
  const wealth = Math.min(
    100,
    Math.round(goldLevel + Math.min(50, dimensionTotals['wealth'])),
  );

  // Knowledge: research progress + room bonuses
  const researchBonus = Math.min(
    50,
    (state.world.research.completedNodes?.length ?? 0) * 10,
  );
  const knowledge = Math.min(
    100,
    Math.round(researchBonus + Math.min(50, dimensionTotals['knowledge'])),
  );

  // Threat level: based on game day
  const threatLevel = Math.min(100, Math.floor((state.clock.day - 1) / 3));

  return { corruption, wealth, knowledge, size: totalRooms, threatLevel };
}

// --- Weight configuration ---

export function getCompositionWeightConfig():
  | CompositionWeightConfig
  | undefined {
  const entries = getEntriesByType<CompositionWeightConfig & IsContentItem>(
    'invasion',
  );
  return entries[0];
}

/**
 * Get blended invader class weights based on dungeon profile.
 * High profiles (>60) use their corresponding weight set.
 * If multiple are high, weights are averaged.
 * If none are high (balanced), uses balanced weights.
 */
export function getCompositionWeights(
  profile: DungeonProfile,
  config: CompositionWeightConfig,
): InvaderClassWeights {
  type WeightKey = 'highCorruption' | 'highWealth' | 'highKnowledge';
  const highProfiles: WeightKey[] = [];

  if (profile.corruption > PROFILE_THRESHOLD)
    highProfiles.push('highCorruption');
  if (profile.wealth > PROFILE_THRESHOLD) highProfiles.push('highWealth');
  if (profile.knowledge > PROFILE_THRESHOLD) highProfiles.push('highKnowledge');

  if (highProfiles.length === 0) return { ...config.balanced };

  const result: InvaderClassWeights = {
    warrior: 0,
    rogue: 0,
    mage: 0,
    cleric: 0,
    paladin: 0,
    ranger: 0,
  };

  for (const profileKey of highProfiles) {
    const weights = config[profileKey];
    for (const cls of INVADER_CLASSES) {
      result[cls] += weights[cls];
    }
  }

  for (const cls of INVADER_CLASSES) {
    result[cls] = Math.round(result[cls] / highProfiles.length);
  }

  return result;
}

// --- Party size ---

/**
 * Determine party size based on dungeon room count.
 * Small (1-10): 3-5, Medium (11-25): 6-10, Large (26+): 11-15.
 */
export function getPartySize(roomCount: number, rng: () => number): number {
  if (roomCount <= 10) return 3 + Math.floor(rng() * 3); // 3-5
  if (roomCount <= 25) return 6 + Math.floor(rng() * 5); // 6-10
  return 11 + Math.floor(rng() * 5); // 11-15
}

// --- Party composition (pure function) ---

/**
 * Select invader definitions for a party based on weights.
 * Guarantees: at least 1 warrior, no class >50%, balanced profiles have 3+ classes.
 */
export function selectPartyComposition(
  profile: DungeonProfile,
  invaderDefs: InvaderDefinition[],
  weights: InvaderClassWeights,
  seed: string,
): InvaderDefinition[] {
  const rng = seedrandom(seed);
  const partySize = getPartySize(profile.size, rng);
  const maxPerClass = Math.floor(partySize * 0.5);

  // Group definitions by class
  const defsByClass = new Map<InvaderClassType, InvaderDefinition[]>();
  for (const cls of INVADER_CLASSES) {
    defsByClass.set(
      cls,
      invaderDefs.filter((d) => d.invaderClass === cls),
    );
  }

  const classCounts: Record<InvaderClassType, number> = {
    warrior: 0,
    rogue: 0,
    mage: 0,
    cleric: 0,
    paladin: 0,
    ranger: 0,
  };
  const party: InvaderDefinition[] = [];

  // Guarantee at least one warrior
  const warriors = defsByClass.get('warrior') ?? [];
  if (warriors.length > 0) {
    party.push(rngChoice(warriors, rng));
    classCounts.warrior++;
  }

  // Fill remaining slots with weighted selection
  while (party.length < partySize) {
    const cls = weightedClassSelect(weights, classCounts, maxPerClass, rng);
    const defs = defsByClass.get(cls) ?? [];
    if (defs.length > 0) {
      party.push(rngChoice(defs, rng));
      classCounts[cls]++;
    }
  }

  // For balanced profiles (all <=60), ensure at least 3 different classes
  const isBalanced =
    profile.corruption <= PROFILE_THRESHOLD &&
    profile.wealth <= PROFILE_THRESHOLD &&
    profile.knowledge <= PROFILE_THRESHOLD;

  if (isBalanced && partySize >= 3) {
    const uniqueClasses = new Set(party.map((d) => d.invaderClass));
    if (uniqueClasses.size < 3) {
      ensureClassDiversity(party, defsByClass, classCounts);
    }
  }

  return party;
}

/**
 * Weighted random class selection, respecting max-per-class cap.
 */
function weightedClassSelect(
  weights: InvaderClassWeights,
  classCounts: Record<InvaderClassType, number>,
  maxPerClass: number,
  rng: () => number,
): InvaderClassType {
  // Build eligible classes with weights
  const eligible: { cls: InvaderClassType; weight: number }[] = [];
  for (const cls of INVADER_CLASSES) {
    if (classCounts[cls] < maxPerClass) {
      eligible.push({ cls, weight: weights[cls] });
    }
  }

  if (eligible.length === 0) {
    // All classes at cap — just pick any
    return INVADER_CLASSES[Math.floor(rng() * INVADER_CLASSES.length)];
  }

  const totalWeight = eligible.reduce((sum, e) => sum + e.weight, 0);
  let roll = rng() * totalWeight;

  for (const entry of eligible) {
    roll -= entry.weight;
    if (roll <= 0) return entry.cls;
  }

  return eligible[eligible.length - 1].cls;
}

/**
 * Replace duplicate-class members to ensure at least 3 unique classes.
 */
function ensureClassDiversity(
  party: InvaderDefinition[],
  defsByClass: Map<InvaderClassType, InvaderDefinition[]>,
  classCounts: Record<InvaderClassType, number>,
): void {
  const uniqueClasses = new Set(party.map((d) => d.invaderClass));

  while (uniqueClasses.size < 3) {
    // Find a class not yet in the party
    const missingClass = INVADER_CLASSES.find(
      (cls) =>
        !uniqueClasses.has(cls) && (defsByClass.get(cls)?.length ?? 0) > 0,
    );
    if (!missingClass) break;

    // Find the most represented class to replace from
    let maxCount = 0;
    let replaceClass: InvaderClassType = 'warrior';
    for (const cls of INVADER_CLASSES) {
      if (classCounts[cls] > maxCount) {
        maxCount = classCounts[cls];
        replaceClass = cls;
      }
    }

    // Replace the last member of the most represented class
    let replaceIdx = -1;
    for (let i = party.length - 1; i >= 0; i--) {
      if (party[i].invaderClass === replaceClass) {
        replaceIdx = i;
        break;
      }
    }
    if (replaceIdx === -1) break;

    const defs = defsByClass.get(missingClass) ?? [];
    if (defs.length === 0) break;

    party[replaceIdx] = rngChoice(
      defs,
      seedrandom(`diversity-${missingClass}`),
    );
    classCounts[replaceClass]--;
    classCounts[missingClass]++;
    uniqueClasses.add(missingClass);
  }
}

// --- Full party generation ---

/**
 * Generate a full invasion party from dungeon profile.
 * Returns InvaderInstance[] ready for combat.
 */
export function generateInvasionParty(
  profile: DungeonProfile,
  seed: string,
): InvaderInstance[] {
  const invaderDefs = getAllInvaderDefinitions();
  const config = getCompositionWeightConfig();
  if (!config || invaderDefs.length === 0) return [];

  const weights = getCompositionWeights(profile, config);
  const selected = selectPartyComposition(profile, invaderDefs, weights, seed);

  return selected.map((def) => createInvaderInstance(def));
}
