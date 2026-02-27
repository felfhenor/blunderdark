import type { Signal } from '@angular/core';
import { signal } from '@angular/core';
import { altarRoomAutoPlace } from '@helpers/altar-room';
import { contentGetEntry } from '@helpers/content';
import {
  defaultCorruptionEffectState,
  defaultFloor,
  defaultInvasionSchedule,
  defaultMerchantState,
  defaultReputationState,
  defaultResearchState,
  defaultResources,
  defaultSeasonState,
  defaultVictoryProgress,
} from '@helpers/defaults';
import { gridCreateEmpty } from '@helpers/grid';
import { reputationAdd } from '@helpers/reputation';
import { rngUuid } from '@helpers/rng';
import { worldResolveStartingBiome } from '@helpers/world';
import type {
  GameStateWorld,
  InhabitantContent,
  InhabitantInstance,
  InhabitantInstanceId,
  ReputationActionContent,
  ReputationType,
  RoomContent,
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
        instanceId: rngUuid<InhabitantInstanceId>(),
        definitionId: slimeDef.id,
        name: slimeDef.name,
        state: 'normal' as const,
        assignedRoomId: undefined,
      }))
    : [];

  startingFloor.inhabitants = startingSlimes;

  // Award reputation for auto-placed rooms that have a reputationAction
  let reputation = defaultReputationState();
  for (const room of startingFloor.rooms) {
    const roomDef = contentGetEntry<RoomContent>(room.roomTypeId);
    if (!roomDef?.reputationAction) continue;

    const action = contentGetEntry<ReputationActionContent>(
      roomDef.reputationAction,
    );
    if (!action?.reputationRewards) continue;

    for (const [type, points] of Object.entries(action.reputationRewards) as [
      ReputationType,
      number,
    ][]) {
      reputation = reputationAdd(reputation, type, points);
    }
  }

  return {
    grid: gridCreateEmpty(),
    resources: defaultResources(),
    inhabitants: startingSlimes,
    hallways: [],
    season: defaultSeasonState(),
    research: defaultResearchState(),
    reputation,
    floors: [startingFloor],
    currentFloorIndex: 0,
    trapInventory: [],
    trapCraftingQueues: [],
    forgeInventory: [],
    forgeCraftingQueues: [],
    alchemyConversions: [],
    prisoners: [],
    farplaneSouls: [],
    invasionSchedule: defaultInvasionSchedule(),
    playerThreat: 0,
    corruptionEffects: defaultCorruptionEffectState(),
    victoryProgress: defaultVictoryProgress(),
    merchant: defaultMerchantState(),
    didFinish: true,
  };
}
