import { contentGetEntriesByType, contentGetEntry } from '@helpers/content';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import { generateInhabitantName } from '@helpers/inhabitant-names';
import { recruitmentMaxInhabitantCount } from '@helpers/recruitment';
import { rngChoice, rngUuid } from '@helpers/rng';
import { roomRoleFindById } from '@helpers/room-roles';
import { roomUpgradeGetAppliedEffects } from '@helpers/room-upgrades';
import type {
  GameState,
  InhabitantInstance,
  InhabitantInstanceId,
  PlacedRoom,
  PlacedRoomId,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type { RoomContent } from '@interfaces/content-room';
import type { SpawningPoolEvent } from '@interfaces/spawning-pool';
import { Subject } from 'rxjs';

// --- Constants ---

export const SPAWNING_POOL_DEFAULT_RATE = GAME_TIME_TICKS_PER_MINUTE * 5; // 5 game-minutes
export const SPAWNING_POOL_DEFAULT_CAPACITY = 10;

const spawningPoolSpawn = new Subject<SpawningPoolEvent>();
export const spawningPoolSpawn$ = spawningPoolSpawn.asObservable();

// --- Pure helpers ---

/**
 * Get the effective spawn rate for a spawning pool room, accounting for upgrades.
 */
export function spawningPoolGetEffectiveRate(
  room: PlacedRoom,
  baseRate: number,
): number {
  const effects = roomUpgradeGetAppliedEffects(room);
  let rate = baseRate;
  for (const effect of effects) {
    if (effect.type === 'spawnRateReduction') {
      rate -= effect.value;
    }
  }
  return Math.max(1, rate);
}

/**
 * Get the effective spawn capacity, accounting for upgrades.
 */
export function spawningPoolGetEffectiveCapacity(
  room: PlacedRoom,
  baseCapacity: number,
): number {
  const effects = roomUpgradeGetAppliedEffects(room);
  let capacity = baseCapacity;
  for (const effect of effects) {
    if (effect.type === 'spawnCapacityBonus') {
      capacity += effect.value;
    }
  }
  return capacity;
}

/**
 * Pick a spawn definition, accounting for Dark Spawning upgrade.
 * Without upgrade: random tier-1 non-undead creature.
 * With Dark Pool upgrade: Skeleton.
 */
export function spawningPoolPickSpawnDefinition(
  room: PlacedRoom,
): InhabitantContent | undefined {
  const effects = roomUpgradeGetAppliedEffects(room);
  for (const effect of effects) {
    if (effect.type === 'spawnTypeChange') {
      return contentGetEntry<InhabitantContent>('Skeleton');
    }
  }

  const allInhabitants =
    contentGetEntriesByType<InhabitantContent>('inhabitant');
  const tier1NonUndead = allInhabitants.filter(
    (i) => i.tier === 1 && i.type !== 'undead',
  );
  if (tier1NonUndead.length === 0) return undefined;
  return rngChoice(tier1NonUndead);
}

/**
 * Count workers assigned to a spawning pool, excluding those still traveling.
 */
export function spawningPoolGetWorkerCount(
  roomId: PlacedRoomId,
  inhabitants: InhabitantInstance[],
): number {
  return inhabitants.filter(
    (i) =>
      i.assignedRoomId === roomId &&
      !(i.travelTicksRemaining !== undefined && i.travelTicksRemaining > 0),
  ).length;
}

/**
 * Count unassigned inhabitants in the roster.
 */
export function spawningPoolCountUnassigned(
  inhabitants: InhabitantInstance[],
): number {
  return inhabitants.filter((i) => i.assignedRoomId === undefined).length;
}

/**
 * Create a new inhabitant instance from a definition.
 */
export function spawningPoolCreateInhabitant(
  def: InhabitantContent,
): InhabitantInstance {
  return {
    instanceId: rngUuid<InhabitantInstanceId>(),
    definitionId: def.id,
    name: generateInhabitantName(def.type),
    state: 'normal',
    assignedRoomId: undefined,
    trained: false,
    trainingProgress: 0,
    trainingBonuses: { defense: 0, attack: 0 },
    hungerTicksWithoutFood: 0,
  };
}

// --- Tick processor ---

/**
 * Process all spawning pools each tick. Called inside updateGamestate.
 * Decrements spawn timers and creates new inhabitants when ready.
 */
export function spawningPoolProcess(state: GameState, numTicks = 1): void {
  const spawningPoolTypeId = roomRoleFindById('spawningPool');
  if (!spawningPoolTypeId) return;

  const roomDef = contentGetEntry<RoomContent>(
    spawningPoolTypeId,
  );
  if (!roomDef) return;

  const baseRate = roomDef.spawnRate ?? SPAWNING_POOL_DEFAULT_RATE;
  const baseCapacity = roomDef.spawnCapacity ?? SPAWNING_POOL_DEFAULT_CAPACITY;

  let inhabitantsChanged = false;

  for (const floor of state.world.floors) {
    for (const room of floor.rooms) {
      if (room.roomTypeId !== spawningPoolTypeId) continue;

      // Count assigned workers (excluding travelers)
      const workerCount = spawningPoolGetWorkerCount(
        room.id,
        floor.inhabitants,
      );

      // No workers assigned → reset timer and skip
      if (workerCount === 0) {
        room.spawnTicksRemaining = undefined;
        continue;
      }

      const baseEffectiveRate = spawningPoolGetEffectiveRate(room, baseRate);
      const effectiveRate = Math.max(
        1,
        Math.round(baseEffectiveRate / workerCount),
      );

      // Initialize timer if not set
      if (room.spawnTicksRemaining === undefined) {
        room.spawnTicksRemaining = effectiveRate;
      }

      // Decrement timer
      room.spawnTicksRemaining -= numTicks;

      if (room.spawnTicksRemaining <= 0) {
        // Reset timer
        room.spawnTicksRemaining = effectiveRate;

        // Check global roster cap
        if (
          state.world.inhabitants.length >= recruitmentMaxInhabitantCount()
        ) {
          continue;
        }

        // Check capacity: unassigned count must be below spawn capacity
        const unassignedCount = spawningPoolCountUnassigned(
          state.world.inhabitants,
        );
        const effectiveCapacity = spawningPoolGetEffectiveCapacity(
          room,
          baseCapacity,
        );

        if (unassignedCount >= effectiveCapacity) {
          // Pool is full — timer resets but no spawn
          continue;
        }

        // Determine spawn type
        const spawnDef = spawningPoolPickSpawnDefinition(room);
        if (!spawnDef) continue;

        // Create and add the new inhabitant
        const newInhabitant = spawningPoolCreateInhabitant(spawnDef);
        state.world.inhabitants = [...state.world.inhabitants, newInhabitant];
        inhabitantsChanged = true;

        // Emit spawn event for notifications
        spawningPoolSpawn.next({
          roomId: room.id,
          inhabitantName: newInhabitant.name,
        });
      }
    }
  }

  // Sync floor inhabitants if any were added
  if (inhabitantsChanged) {
    for (const floor of state.world.floors) {
      floor.inhabitants = state.world.inhabitants;
    }
  }
}
