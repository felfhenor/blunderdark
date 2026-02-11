import type { Signal } from '@angular/core';
import { signal } from '@angular/core';
import { autoPlaceRooms } from '@helpers/altar-room';
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

  // Create the starting floor and auto-place initial rooms (e.g., Altar)
  const startingFloor = autoPlaceRooms(defaultFloor(1, startingBiome));

  return {
    grid: createEmptyGrid(),
    resources: defaultResources(),
    inhabitants: [],
    hallways: [],
    season: defaultSeasonState(),
    research: defaultResearchState(),
    reputation: defaultReputationState(),
    floors: [startingFloor],
    currentFloorIndex: 0,
    didFinish: true,
  };
}
