import type { Signal } from '@angular/core';
import { signal } from '@angular/core';
import { altarRoomAutoPlace } from '@helpers/altar-room';
import {
  defaultCorruptionEffectState,
  defaultFloor,
  defaultInvasionSchedule,
  defaultReputationState,
  defaultResearchState,
  defaultResources,
  defaultSeasonState,
} from '@helpers/defaults';
import { contentGetEntry } from '@helpers/content';
import { gridCreateEmpty } from '@helpers/grid';
import { rngUuid } from '@helpers/rng';
import { worldResolveStartingBiome } from '@helpers/world';
import type {
  GameStateWorld,
  InhabitantContent,
  InhabitantInstance,
} from '@interfaces';
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

  const slimeDef = contentGetEntry<InhabitantContent>('Slime');
  const startingSlimes: InhabitantInstance[] = slimeDef
    ? Array.from({ length: 3 }, () => ({
        instanceId: rngUuid(),
        definitionId: slimeDef.id,
        name: slimeDef.name,
        state: 'normal' as const,
        assignedRoomId: undefined,
      }))
    : [];

  startingFloor.inhabitants = startingSlimes;

  return {
    grid: gridCreateEmpty(),
    resources: defaultResources(),
    inhabitants: startingSlimes,
    hallways: [],
    season: defaultSeasonState(),
    research: defaultResearchState(),
    reputation: defaultReputationState(),
    floors: [startingFloor],
    currentFloorIndex: 0,
    trapInventory: [],
    trapCraftingQueues: [],
    forgeInventory: [],
    forgeCraftingQueues: [],
    alchemyConversions: [],
    prisoners: [],
    invasionSchedule: defaultInvasionSchedule(),
    corruptionEffects: defaultCorruptionEffectState(),
    stairs: [],
    elevators: [],
    portals: [],
    didFinish: true,
  };
}
