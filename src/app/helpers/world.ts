import { signal } from '@angular/core';
import { rngChoice, rngUuid } from '@helpers/rng';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type { BiomeType, GameId, GameStateWorld } from '@interfaces';

// Non-neutral biomes for random selection
const RANDOM_BIOMES: BiomeType[] = [
  'volcanic',
  'flooded',
  'crystal',
  'corrupted',
  'fungal',
];

// Starting biome selection - 'random' means pick one randomly at worldgen time
const _startingBiome = signal<BiomeType | 'random'>('neutral');

/**
 * Set the starting biome for the next world generation.
 * Use 'random' to pick from the 5 non-neutral biomes with equal probability.
 */
export function worldSetStartingBiome(biome: BiomeType | 'random'): void {
  _startingBiome.set(biome);
}

/**
 * Get the starting biome selection.
 */
export function worldGetStartingBiome(): BiomeType | 'random' {
  return _startingBiome();
}

/**
 * Resolve the starting biome - if 'random', pick one from the random pool.
 */
export function worldResolveStartingBiome(): BiomeType {
  const selection = _startingBiome();
  if (selection === 'random') {
    return rngChoice(RANDOM_BIOMES);
  }
  return selection;
}

export function worldSet(world: GameStateWorld): void {
  updateGamestate((gs) => {
    gs.world = world;
    return gs;
  });
}

export function worldSetSeed(seed: string | undefined): void {
  if (!seed) seed = rngUuid();

  updateGamestate((gs) => {
    gs.gameId = seed as GameId;
    return gs;
  });
}

export function worldGameId(): GameId {
  return gamestate().gameId;
}
