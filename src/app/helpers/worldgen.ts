import type { Signal } from '@angular/core';
import { signal } from '@angular/core';
import { altarRoomAutoPlace } from '@helpers/altar-room';
import {
  defaultFloor,
  defaultInvasionSchedule,
  defaultReputationState,
  defaultResearchState,
  defaultResources,
  defaultSeasonState,
} from '@helpers/defaults';
import { gridCreateEmpty } from '@helpers/grid';
import { worldResolveStartingBiome } from '@helpers/world';
import type { GameStateWorld } from '@interfaces';
import { Subject } from 'rxjs';

const _currentWorldGenStatus = signal<string>('');
export const worldgenCurrentStatus: Signal<string> =
  _currentWorldGenStatus.asReadonly();

const cancelWorldGen = new Subject<void>();

export function worldgenCancelGeneration(): void {
  cancelWorldGen.next();
}

export async function worldgenGenerateWorld(): Promise<
  GameStateWorld & { didFinish?: boolean }
> {
  // Resolve the starting biome (handles 'random' selection)
  const startingBiome = worldResolveStartingBiome();

  // Create the starting floor and auto-place initial rooms (e.g., Altar)
  const startingFloor = altarRoomAutoPlace(defaultFloor(1, startingBiome));

  return {
    grid: gridCreateEmpty(),
    resources: defaultResources(),
    inhabitants: [],
    hallways: [],
    season: defaultSeasonState(),
    research: defaultResearchState(),
    reputation: defaultReputationState(),
    floors: [startingFloor],
    currentFloorIndex: 0,
    trapInventory: [],
    trapCraftingQueues: [],
    invasionSchedule: defaultInvasionSchedule(),
    didFinish: true,
  };
}
