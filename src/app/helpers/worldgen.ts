import type { Signal } from '@angular/core';
import { signal } from '@angular/core';
import {
  defaultReputationState,
  defaultResearchState,
  defaultResources,
  defaultSeasonState,
} from '@helpers/defaults';
import { createEmptyGrid } from '@helpers/grid';
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
  //
  return {
    grid: createEmptyGrid(),
    resources: defaultResources(),
    inhabitants: [],
    hallways: [],
    season: defaultSeasonState(),
    research: defaultResearchState(),
    reputation: defaultReputationState(),
    didFinish: true,
  };
}
