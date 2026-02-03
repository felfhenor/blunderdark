import type { Signal } from '@angular/core';
import { signal } from '@angular/core';
import {
  defaultFloor,
  defaultReputationState,
  defaultResearchState,
  defaultResources,
  defaultSeasonState,
} from '@helpers/defaults';
import { createEmptyGrid } from '@helpers/grid';
import { resolveStartingBiome } from '@helpers/world';
import type { GameStateWorld } from '@interfaces';
import { Subject } from 'rxjs';

const _currentWorldGenStatus = signal<string>('');
export const currentWorldGenStatus: Signal<string> =
  _currentWorldGenStatus.asReadonly();

const cancelWorldGen = new Subject<void>();

export function cancelWorldGeneration(): void {
  cancelWorldGen.next();
}

export async function worldgenGenerateWorld(): Promise<
  GameStateWorld & { didFinish?: boolean }
> {
  // Resolve the starting biome (handles 'random' selection)
  const startingBiome = resolveStartingBiome();

  return {
    grid: createEmptyGrid(),
    resources: defaultResources(),
    inhabitants: [],
    hallways: [],
    season: defaultSeasonState(),
    research: defaultResearchState(),
    reputation: defaultReputationState(),
    floors: [defaultFloor(1, startingBiome)],
    currentFloorIndex: 0,
    didFinish: true,
  };
}
