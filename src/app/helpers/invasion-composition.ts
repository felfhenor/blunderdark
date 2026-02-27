import { contentGetEntriesByType } from '@helpers/content';
import {
  invaderCreateInstance,
  invaderGetAllDefinitions,
  invaderGetDefinitionById,
} from '@helpers/invaders';
import { rngChoice } from '@helpers/rng';
import { invasionThreatBlend } from '@helpers/invasion-threat';
import type {
  CompositionWeightConfig,
  DungeonProfile,
  GameState,
  InvaderClassWeights,
  InvasionThemeType,
  IsContentItem,
} from '@interfaces';
import type { InvaderContent } from '@interfaces/content-invader';
import type { ObjectiveType } from '@interfaces/invasion-objective';
import type { RoomContent } from '@interfaces/content-room';
import type {
  InvaderClassType,
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

export const LEADER_MIN_PARTY_SIZE = 6;

export const LEADER_CLASS_PRIORITY: InvaderClassType[] = [
  'paladin',
  'warrior',
  'cleric',
  'ranger',
  'mage',
  'rogue',
];

const PROFILE_THRESHOLD = 60;

// --- Data-driven profile lookup ---

let invasionProfileCache:
  | Map<string, { dimension: string; weight: number }>
  | undefined = undefined;

function invasionCompositionGetProfileMap(): Map<
  string,
  { dimension: string; weight: number }
> {
  if (!invasionProfileCache) {
    const rooms = contentGetEntriesByType<RoomContent>('room');
    invasionProfileCache = new Map();
    for (const room of rooms) {
      if (room.invasionProfile) {
        invasionProfileCache.set(room.id, room.invasionProfile);
      }
    }
  }
  return invasionProfileCache;
}

export function invasionCompositionResetCache(): void {
  invasionProfileCache = undefined;
}

// --- Dungeon profile ---

/**
 * Calculate a dungeon profile from game state.
 * Returns corruption/wealth/knowledge (0-100), size (room count), and threat level.
 */
export function invasionCompositionCalculateDungeonProfile(state: GameState): DungeonProfile {
  const floors = state.world.floors;
  const resources = state.world.resources;
  const profileMap = invasionCompositionGetProfileMap();

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

  // Threat level: blend day-based threat with player threat
  const dayThreat = Math.min(100, Math.floor((state.clock.day - 1) / 3));
  const threatLevel = invasionThreatBlend(dayThreat, state.world.playerThreat);

  return { corruption, wealth, knowledge, size: totalRooms, threatLevel };
}

// --- Weight configuration ---

export function invasionCompositionGetWeightConfig():
  | CompositionWeightConfig
  | undefined {
  const entries = contentGetEntriesByType<CompositionWeightConfig & IsContentItem>(
    'invasion',
  );
  return entries[0];
}

/**
 * Get blended invader class weights based on dungeon profile.
 * High profiles (>60) use their corresponding weight set.
 * If multiple are high, weights are averaged.
 * If none are high (balanced), uses balanced weights.
 * Optional rng applies +/-20% variance to each class weight.
 */
export function invasionCompositionGetWeights(
  profile: DungeonProfile,
  config: CompositionWeightConfig,
  rng?: () => number,
): InvaderClassWeights {
  type WeightKey = 'highCorruption' | 'highWealth' | 'highKnowledge';
  const highProfiles: WeightKey[] = [];

  if (profile.corruption > PROFILE_THRESHOLD)
    highProfiles.push('highCorruption');
  if (profile.wealth > PROFILE_THRESHOLD) highProfiles.push('highWealth');
  if (profile.knowledge > PROFILE_THRESHOLD) highProfiles.push('highKnowledge');

  let base: InvaderClassWeights;

  if (highProfiles.length === 0) {
    base = { ...config.balanced };
  } else {
    base = {
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
        base[cls] += weights[cls];
      }
    }

    for (const cls of INVADER_CLASSES) {
      base[cls] = Math.round(base[cls] / highProfiles.length);
    }
  }

  // Apply +/-20% variance when rng is provided
  if (rng) {
    for (const cls of INVADER_CLASSES) {
      const variance = 0.8 + rng() * 0.4; // 0.8 to 1.2
      base[cls] = Math.max(1, Math.round(base[cls] * variance));
    }
  }

  return base;
}

// --- Party size ---

/**
 * Determine party size based on dungeon room count.
 * Small (1-10): 1-7, Medium (11-25): 4-12, Large (26+): 9-17.
 * Clamps to minimum 2 (after bonus). bonusSize adds extra invaders (from escalation mechanics).
 */
export function invasionCompositionGetPartySize(
  roomCount: number,
  rng: () => number,
  bonusSize: number = 0,
): number {
  let baseSize: number;
  if (roomCount <= 10) baseSize = 1 + Math.floor(rng() * 7); // 1-7
  else if (roomCount <= 25) baseSize = 4 + Math.floor(rng() * 9); // 4-12
  else baseSize = 9 + Math.floor(rng() * 9); // 9-17
  return Math.max(2, baseSize + bonusSize);
}

// --- Party composition (pure function) ---

/**
 * Select invader definitions for a party based on weights.
 * Guarantees: at least 1 warrior (unless skipWarriorGuarantee), no class >50%, balanced profiles have 3+ classes.
 */
export function invasionCompositionSelectParty(
  profile: DungeonProfile,
  invaderDefs: InvaderContent[],
  weights: InvaderClassWeights,
  seed: string,
  bonusSize: number = 0,
  skipWarriorGuarantee: boolean = false,
): InvaderContent[] {
  const rng = seedrandom(seed);
  const partySize = invasionCompositionGetPartySize(profile.size, rng, bonusSize);
  const maxPerClass = Math.floor(partySize * 0.5);

  // Group definitions by class
  const defsByClass = new Map<InvaderClassType, InvaderContent[]>();
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
  const party: InvaderContent[] = [];

  // Guarantee at least one warrior (unless themed invasion skips this)
  if (!skipWarriorGuarantee) {
    const warriors = defsByClass.get('warrior') ?? [];
    if (warriors.length > 0) {
      party.push(rngChoice(warriors, rng));
      classCounts.warrior++;
    }
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
  party: InvaderContent[],
  defsByClass: Map<InvaderClassType, InvaderContent[]>,
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

// --- Themed invasions ---

export const INVASION_THEME_CHANCE = 0.125; // 12.5% chance

type InvasionThemeConfig = {
  type: InvasionThemeType;
  dominantClass: InvaderClassType;
  weightOverrides: Partial<InvaderClassWeights>;
  pairedObjectives: ObjectiveType[];
  skipWarriorGuarantee: boolean;
};

const INVASION_THEMES: InvasionThemeConfig[] = [
  {
    type: 'stealth_raid',
    dominantClass: 'rogue',
    weightOverrides: { rogue: 60, ranger: 20, warrior: 5, mage: 5, cleric: 5, paladin: 5 },
    pairedObjectives: ['StealTreasure', 'ScoutDungeon'],
    skipWarriorGuarantee: true,
  },
  {
    type: 'crusade',
    dominantClass: 'paladin',
    weightOverrides: { paladin: 50, cleric: 25, warrior: 15, mage: 5, rogue: 0, ranger: 5 },
    pairedObjectives: ['SealPortal', 'DefileLibrary'],
    skipWarriorGuarantee: false,
  },
  {
    type: 'arcane_assault',
    dominantClass: 'mage',
    weightOverrides: { mage: 55, cleric: 15, ranger: 10, warrior: 10, rogue: 5, paladin: 5 },
    pairedObjectives: ['DefileLibrary', 'PlunderVault'],
    skipWarriorGuarantee: true,
  },
  {
    type: 'berserker_horde',
    dominantClass: 'warrior',
    weightOverrides: { warrior: 60, ranger: 15, paladin: 10, rogue: 10, mage: 0, cleric: 5 },
    pairedObjectives: ['SlayMonster', 'RescuePrisoner'],
    skipWarriorGuarantee: false,
  },
];

/**
 * Roll for a themed invasion. 12.5% chance to get one.
 * Returns the theme config or undefined if no theme.
 */
export function invasionCompositionRollTheme(
  rng: () => number,
): InvasionThemeConfig | undefined {
  if (rng() >= INVASION_THEME_CHANCE) return undefined;
  return INVASION_THEMES[Math.floor(rng() * INVASION_THEMES.length)];
}

// --- Full party generation ---

export type InvasionPartyResult = {
  invaders: InvaderInstance[];
  themedInvasionType?: InvasionThemeType;
  pairedObjectives?: ObjectiveType[];
};

/**
 * Generate a full invasion party from dungeon profile.
 * Returns InvaderInstance[] and optional theme info.
 * Rolls for themed invasion (12.5% chance) which overrides class weights.
 */
export function invasionCompositionGenerateParty(
  profile: DungeonProfile,
  seed: string,
  bonusSize: number = 0,
): InvasionPartyResult {
  const invaderDefs = invaderGetAllDefinitions();
  const config = invasionCompositionGetWeightConfig();
  if (!config || invaderDefs.length === 0) return { invaders: [] };

  const themeRng = seedrandom(`${seed}-theme`);
  const theme = invasionCompositionRollTheme(themeRng);

  // Get weights — themed invasions override weights entirely
  let weights: InvaderClassWeights;
  if (theme) {
    weights = {
      warrior: 0, rogue: 0, mage: 0, cleric: 0, paladin: 0, ranger: 0,
      ...theme.weightOverrides,
    };
  } else {
    const weightRng = seedrandom(`${seed}-weights`);
    weights = invasionCompositionGetWeights(profile, config, weightRng);
  }

  const selected = invasionCompositionSelectParty(
    profile, invaderDefs, weights, seed, bonusSize,
    theme?.skipWarriorGuarantee,
  );

  const party = selected.map((def) => invaderCreateInstance(def));

  // Assign a leader if party is large enough
  if (party.length >= LEADER_MIN_PARTY_SIZE) {
    // Find the best leader candidate by class priority
    let leaderIdx = -1;
    let bestPriority = LEADER_CLASS_PRIORITY.length;

    for (let i = 0; i < party.length; i++) {
      const def = invaderGetDefinitionById(party[i].definitionId);
      if (!def) continue;
      const priority = LEADER_CLASS_PRIORITY.indexOf(def.invaderClass);
      if (priority !== -1 && priority < bestPriority) {
        bestPriority = priority;
        leaderIdx = i;
      }
    }

    if (leaderIdx >= 0) {
      party[leaderIdx] = { ...party[leaderIdx], isLeader: true };
    }
  }

  return {
    invaders: party,
    themedInvasionType: theme?.type,
    pairedObjectives: theme?.pairedObjectives,
  };
}
