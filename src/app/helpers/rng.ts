import type { Identifiable } from '@interfaces';
import type { HasRarity, Rarity } from '@interfaces/traits';
import { pull } from 'es-toolkit/compat';
import seedrandom, { type PRNG } from 'seedrandom';

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 50,
  uncommon: 30,
  rare: 15,
  epic: 5,
};

export function rngUuid<T extends string = string>(): T {
  return crypto.randomUUID() as T;
}

export function rngRandom(): PRNG {
  return rngSeeded(rngUuid());
}

export function rngSeeded(seed = rngUuid()): PRNG {
  return seedrandom(seed);
}

export function rngChoice<T>(choices: T[], rng = rngSeeded(rngUuid())): T {
  return choices[Math.floor(rng() * choices.length)];
}

export function rngShuffle<T>(choices: T[], rng = rngSeeded(rngUuid())): T[] {
  const baseArray = choices.slice();

  const shuffled = [];

  for (let i = 0; i < choices.length; i++) {
    const chosen = rngChoice(baseArray, rng);
    shuffled.push(chosen);
    pull(baseArray, chosen);
  }

  return shuffled;
}

export function rngChoiceIdentifiable<T extends Identifiable>(
  choices: T[],
  rng = rngSeeded(rngUuid()),
): string | undefined {
  if (choices.length === 0) return undefined;

  return choices[Math.floor(rng() * choices.length)].id;
}

export function rngNumber(max: number, rng = rngSeeded(rngUuid())): number {
  return Math.floor(rng() * max);
}

export function rngNumberRange(
  min: number,
  max: number,
  rng = rngSeeded(rngUuid()),
): number {
  return Math.floor(min + rng() * (max - min));
}

export function rngSucceedsChance(
  max: number,
  rng = rngSeeded(rngUuid()),
): boolean {
  return rng() * 100 <= max;
}

/**
 * Roll a random rarity based on weights.
 */
export function rngRollRarity(rng = rngSeeded(rngUuid())): Rarity {
  const totalWeight = Object.values(RARITY_WEIGHTS).reduce((s, w) => s + w, 0);
  let roll = rng() * totalWeight;

  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    roll -= weight;
    if (roll <= 0) return rarity as Rarity;
  }

  return 'common';
}

/**
 * Choose a random item from a pool weighted by rarity.
 * Rolls a rarity first, then picks uniformly from items of that rarity.
 * Retries up to 3 times if the rolled rarity has no items, then falls back to any item.
 */
export function rngChoiceWeightedByRarity<T extends HasRarity>(
  choices: T[],
  rng = rngSeeded(rngUuid()),
): T | undefined {
  if (choices.length === 0) return undefined;

  for (let attempt = 0; attempt < 3; attempt++) {
    const rarity = rngRollRarity(rng);
    const pool = choices.filter((c) => c.rarity === rarity);
    if (pool.length > 0) {
      return rngChoice(pool, rng);
    }
  }

  // Fallback: pick from all choices
  return rngChoice(choices, rng);
}
