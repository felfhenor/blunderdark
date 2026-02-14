import { contentGetEntry } from '@helpers/content';
import { rngUuid } from '@helpers/rng';
import type {
  CapturedPrisoner,
  DefensePenalties,
  DefenseRewards,
  DetailedInvasionResult,
  PrisonerAction,
  PrisonerId,
  PrisonerHandlingResult,
} from '@interfaces/invasion';
import type {
  InvaderClassType,
  InvaderDefinition,
  InvaderInstance,
} from '@interfaces/invader';
import type { IsContentItem } from '@interfaces/identifiable';
import type { ResourceType } from '@interfaces/resource';

// --- Constants ---

export const INVASION_REWARD_BASE_REPUTATION_GAIN = 5;
export const INVASION_REWARD_REPUTATION_PER_KILL = 1;
export const INVASION_REWARD_ALL_SECONDARIES_PREVENTED_BONUS = 3;
export const INVASION_REWARD_DEFEAT_REPUTATION_LOSS = 3;
export const INVASION_REWARD_DEFEAT_GOLD_LOSS_PERCENT = 0.2;
export const INVASION_REWARD_PRISONER_CAPTURE_CHANCE = 0.3;
export const INVASION_REWARD_BASE_EXPERIENCE_PER_INVADER = 10;

export const INVASION_REWARD_ALTAR_REBUILD_COST: Partial<Record<ResourceType, number>> = {
  crystals: 100,
  gold: 50,
  flux: 20,
};

// --- Class-based loot tables (resource rewards) ---

type ClassLoot = {
  goldMin: number;
  goldMax: number;
  bonusResource: ResourceType;
  bonusMin: number;
  bonusMax: number;
};

const CLASS_LOOT: Record<InvaderClassType, ClassLoot> = {
  warrior: { goldMin: 5, goldMax: 15, bonusResource: 'crystals', bonusMin: 2, bonusMax: 8 },
  rogue: { goldMin: 10, goldMax: 25, bonusResource: 'essence', bonusMin: 1, bonusMax: 5 },
  mage: { goldMin: 3, goldMax: 10, bonusResource: 'flux', bonusMin: 3, bonusMax: 10 },
  cleric: { goldMin: 5, goldMax: 12, bonusResource: 'essence', bonusMin: 2, bonusMax: 6 },
  paladin: { goldMin: 8, goldMax: 20, bonusResource: 'flux', bonusMin: 2, bonusMax: 8 },
  ranger: { goldMin: 4, goldMax: 12, bonusResource: 'food', bonusMin: 3, bonusMax: 10 },
};

// --- Prisoner handling constants ---

const CONVERT_SUCCESS_RATES: Record<InvaderClassType, number> = {
  warrior: 0.30,
  rogue: 0.50,
  mage: 0.20,
  cleric: 0.10,
  paladin: 0.05,
  ranger: 0.35,
};

const RANSOM_GOLD: Record<InvaderClassType, number> = {
  warrior: 30,
  rogue: 25,
  mage: 40,
  cleric: 35,
  paladin: 50,
  ranger: 20,
};

// --- Reward calculation ---

/**
 * Calculate defense rewards for a successful invasion defense.
 * Reputation: +5 base, +1 per kill, +3 if all secondaries prevented.
 * Gold/resources: class-based loot from killed invaders.
 * Experience: 10 per invader, scaled by reward multiplier.
 */
export function invasionRewardCalculateDefenseRewards(
  result: DetailedInvasionResult,
  killedInvaderClasses: InvaderClassType[],
  rng: () => number = Math.random,
): DefenseRewards {
  // Reputation
  let reputationGain = INVASION_REWARD_BASE_REPUTATION_GAIN;
  reputationGain += result.invadersKilled * INVASION_REWARD_REPUTATION_PER_KILL;
  if (result.objectivesCompleted === 0 && result.objectivesTotal > 0) {
    reputationGain += INVASION_REWARD_ALL_SECONDARIES_PREVENTED_BONUS;
  }

  // Experience
  const experienceGain = Math.round(
    result.invaderCount * INVASION_REWARD_BASE_EXPERIENCE_PER_INVADER * result.rewardMultiplier,
  );

  // Loot from killed invaders
  let goldGain = 0;
  const resourceGains: Partial<Record<ResourceType, number>> = {};

  for (const invaderClass of killedInvaderClasses) {
    const loot = CLASS_LOOT[invaderClass];
    goldGain += rollRange(loot.goldMin, loot.goldMax, rng);
    const bonus = rollRange(loot.bonusMin, loot.bonusMax, rng);
    resourceGains[loot.bonusResource] =
      (resourceGains[loot.bonusResource] ?? 0) + bonus;
  }

  // Apply reward multiplier to gold
  goldGain = Math.round(goldGain * result.rewardMultiplier);

  return {
    reputationGain,
    experienceGain,
    goldGain,
    resourceGains,
    capturedPrisoners: [],
  };
}

/**
 * Calculate penalties for a failed defense.
 * 20% gold looted, -3 reputation, resource losses from completed secondaries.
 */
export function invasionRewardCalculateDefensePenalties(
  result: DetailedInvasionResult,
  currentGold: number,
): DefensePenalties {
  const goldLost = Math.round(currentGold * INVASION_REWARD_DEFEAT_GOLD_LOSS_PERCENT);
  const reputationLoss = INVASION_REWARD_DEFEAT_REPUTATION_LOSS;

  // Resource losses scale with secondaries completed
  const resourceLosses: Partial<Record<ResourceType, number>> = {};
  if (result.objectivesCompleted > 0) {
    resourceLosses.crystals = result.objectivesCompleted * 10;
    resourceLosses.essence = result.objectivesCompleted * 5;
  }

  return {
    reputationLoss,
    goldLost,
    resourceLosses,
    killedInhabitantIds: [],
  };
}

// --- Loot per invader class ---

/**
 * Get the loot table entry for an invader class.
 */
export function invasionRewardGetClassLoot(invaderClass: InvaderClassType): ClassLoot {
  return CLASS_LOOT[invaderClass];
}

/**
 * Roll loot for a single killed invader based on their class.
 */
export function invasionRewardRollLoot(
  invaderClass: InvaderClassType,
  rng: () => number = Math.random,
): { gold: number; bonusResource: ResourceType; bonusAmount: number } {
  const loot = CLASS_LOOT[invaderClass];
  return {
    gold: rollRange(loot.goldMin, loot.goldMax, rng),
    bonusResource: loot.bonusResource,
    bonusAmount: rollRange(loot.bonusMin, loot.bonusMax, rng),
  };
}

// --- Prisoner capture ---

/**
 * Determine which retreating invaders are captured as prisoners.
 * Each has a 30% capture chance.
 */
export function invasionRewardRollPrisonerCaptures(
  retreatingInvaders: InvaderInstance[],
  day: number,
  rng: () => number = Math.random,
): CapturedPrisoner[] {
  const prisoners: CapturedPrisoner[] = [];

  for (const invader of retreatingInvaders) {
    if (rng() < INVASION_REWARD_PRISONER_CAPTURE_CHANCE) {
      const def = contentGetEntry<InvaderDefinition & IsContentItem>(
        invader.definitionId,
      );
      if (!def) continue;

      prisoners.push({
        id: rngUuid() as PrisonerId,
        invaderClass: def.invaderClass,
        name: `Captured ${def.name}`,
        stats: { ...def.baseStats },
        captureDay: day,
      });
    }
  }

  return prisoners;
}

// --- Prisoner handling ---

/**
 * Execute a prisoner: +2 fear, +1 reputation, -5 future invader morale.
 */
export function invasionRewardHandleExecute(): PrisonerHandlingResult {
  return {
    action: 'execute',
    success: true,
    resourceChanges: {},
    reputationChange: 1,
    corruptionChange: 0,
    fearChange: 2,
  };
}

/**
 * Ransom a prisoner: gold scales with class tier, -1 reputation.
 */
export function invasionRewardHandleRansom(
  prisoner: CapturedPrisoner,
): PrisonerHandlingResult {
  const gold = RANSOM_GOLD[prisoner.invaderClass];
  return {
    action: 'ransom',
    success: true,
    resourceChanges: { gold },
    reputationChange: -1,
    corruptionChange: 0,
    fearChange: 0,
  };
}

/**
 * Convert a prisoner: success rate by class, costs corruption.
 * Success = new tier 1 inhabitant; failure = escape.
 */
export function invasionRewardHandleConvert(
  prisoner: CapturedPrisoner,
  rng: () => number = Math.random,
): PrisonerHandlingResult {
  const successRate = CONVERT_SUCCESS_RATES[prisoner.invaderClass];
  const success = rng() < successRate;

  return {
    action: 'convert',
    success,
    resourceChanges: { corruption: 5 },
    reputationChange: 0,
    corruptionChange: 5,
    fearChange: 0,
  };
}

/**
 * Sacrifice a prisoner at the Altar: grants random boon, +5 corruption, +2 reputation.
 */
export function invasionRewardHandleSacrifice(
  rng: () => number = Math.random,
): PrisonerHandlingResult {
  // Random boon: flux, essence, or research
  const boonTypes: ResourceType[] = ['flux', 'essence', 'research'];
  const boonIndex = Math.floor(rng() * boonTypes.length);
  const boonResource = boonTypes[boonIndex];
  const boonAmount = rollRange(10, 25, rng);

  return {
    action: 'sacrifice',
    success: true,
    resourceChanges: { [boonResource]: boonAmount, corruption: 5 },
    reputationChange: 2,
    corruptionChange: 5,
    fearChange: 0,
  };
}

/**
 * Experiment on a prisoner: grants research points, +3 corruption.
 */
export function invasionRewardHandleExperiment(
  prisoner: CapturedPrisoner,
): PrisonerHandlingResult {
  // Research scales with invader stats
  const totalStats =
    prisoner.stats.hp + prisoner.stats.attack + prisoner.stats.defense + prisoner.stats.speed;
  const researchGain = Math.round(totalStats / 4);

  return {
    action: 'experiment',
    success: true,
    resourceChanges: { research: researchGain, corruption: 3 },
    reputationChange: 0,
    corruptionChange: 3,
    fearChange: 0,
  };
}

/**
 * Handle a prisoner action. Dispatches to the appropriate handler.
 */
export function invasionRewardHandlePrisoner(
  action: PrisonerAction,
  prisoner: CapturedPrisoner,
  rng: () => number = Math.random,
): PrisonerHandlingResult {
  switch (action) {
    case 'execute':
      return invasionRewardHandleExecute();
    case 'ransom':
      return invasionRewardHandleRansom(prisoner);
    case 'convert':
      return invasionRewardHandleConvert(prisoner, rng);
    case 'sacrifice':
      return invasionRewardHandleSacrifice(rng);
    case 'experiment':
      return invasionRewardHandleExperiment(prisoner);
  }
}

/**
 * Get the convert success rate for a given invader class.
 */
export function invasionRewardGetConvertSuccessRate(invaderClass: InvaderClassType): number {
  return CONVERT_SUCCESS_RATES[invaderClass];
}

/**
 * Get the ransom gold value for a given invader class.
 */
export function invasionRewardGetRansomGoldValue(invaderClass: InvaderClassType): number {
  return RANSOM_GOLD[invaderClass];
}

/**
 * Get the altar rebuild cost.
 */
export function invasionRewardGetAltarRebuildCost(): Partial<Record<ResourceType, number>> {
  return { ...INVASION_REWARD_ALTAR_REBUILD_COST };
}

// --- Internal helpers ---

function rollRange(min: number, max: number, rng: () => number): number {
  return Math.round(min + rng() * (max - min));
}
