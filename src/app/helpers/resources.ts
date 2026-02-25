import { computed, type Signal } from '@angular/core';
import { defaultResources } from '@helpers/defaults';
import { featureCalculateStorageBonusMultiplier } from '@helpers/features';
import { roomRoleFindById } from '@helpers/room-roles';
import { roomUpgradeGetAppliedEffects } from '@helpers/room-upgrades';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type {
  Floor,
  GameState,
  ResourceCost,
  ResourceMap,
  ResourceState,
  ResourceType,
} from '@interfaces';

export function resourceGet(type: ResourceType): Signal<ResourceState> {
  return computed(() => gamestate().world.resources[type]);
}

export function resourceAll(): Signal<ResourceMap> {
  return computed(() => gamestate().world.resources);
}

export function resourceAdd(type: ResourceType, amount: number): number {
  if (amount < 0) {
    return 0;
  }

  if (amount === 0) {
    return 0;
  }

  let actualAdded = 0;

  updateGamestate((state) => {
    const resource = state.world.resources[type];
    const available = resource.max - resource.current;
    actualAdded = Math.min(amount, available);

    state.world.resources[type].current = Math.min(
      resource.current + amount,
      resource.max,
    );

    return state;
  });

  return actualAdded;
}

export function resourceSubtract(type: ResourceType, amount: number): number {
  if (amount < 0) {
    return 0;
  }

  if (amount === 0) {
    return 0;
  }

  const resource = gamestate().world.resources[type];
  if (resource.current < amount) {
    return 0;
  }

  const subtractedAmount = Math.min(amount, resource.current);

  updateGamestate((state) => {
    state.world.resources[type].current = Math.max(
      0,
      state.world.resources[type].current - amount,
    );

    return state;
  });

  return subtractedAmount;
}

export function resourceCanAfford(costs: ResourceCost): boolean {
  const resources = gamestate().world.resources;
  return Object.entries(costs).every(
    ([type, amount]) => resources[type as ResourceType].current >= amount,
  );
}

export async function resourcePayCost(costs: ResourceCost): Promise<boolean> {
  if (!resourceCanAfford(costs)) {
    return false;
  }

  await updateGamestate((state) => {
    const updatedResources = { ...state.world.resources };

    for (const [type, amount] of Object.entries(costs)) {
      const resourceType = type as ResourceType;
      updatedResources[resourceType] = {
        ...updatedResources[resourceType],
        current: updatedResources[resourceType].current - amount,
      };
    }

    return {
      ...state,
      world: {
        ...state.world,
        resources: updatedResources,
      },
    };
  });

  return true;
}

export function resourceIsLow(
  type: ResourceType,
  threshold: number,
): Signal<boolean> {
  return computed(() => {
    const resource = gamestate().world.resources[type];
    return resource.current / resource.max < threshold;
  });
}

export function resourceIsFull(type: ResourceType): Signal<boolean> {
  return computed(() => {
    const resource = gamestate().world.resources[type];
    return resource.current === resource.max;
  });
}

export const STORAGE_ROOM_BASE_BONUS = 200;
export const STORAGE_ROOM_SPECIALIZED_BONUS = 500;

/**
 * Calculate the flat storage bonus from all Storage Rooms for a given resource type.
 * Unspecialized rooms add STORAGE_ROOM_BASE_BONUS to every non-corruption resource.
 * Specialized rooms add the effect value only to the matching resource.
 */
export function storageRoomFlatBonus(
  floors: Floor[],
  resourceType: ResourceType,
): number {
  if (resourceType === 'corruption') return 0;

  const storageRoomTypeId = roomRoleFindById('storage');
  if (!storageRoomTypeId) return 0;

  let bonus = 0;

  for (const floor of floors) {
    for (const room of floor.rooms) {
      if (room.roomTypeId !== storageRoomTypeId) continue;

      const effects = roomUpgradeGetAppliedEffects(room);
      const specialization = effects.find(
        (e) => e.type === 'storageSpecialization',
      );

      if (specialization) {
        if (specialization.resource === resourceType) {
          bonus += specialization.value;
        }
      } else {
        bonus += STORAGE_ROOM_BASE_BONUS;
      }
    }
  }

  return bonus;
}

/**
 * Compute the effective max for a resource type, including storage bonuses.
 * Corruption is excluded from storage bonuses (already MAX_SAFE_INTEGER).
 */
export function resourceEffectiveMax(
  baseMax: number,
  resourceType: ResourceType,
  floors: Floor[],
): number {
  if (resourceType === 'corruption') return baseMax;
  const flatBonus = storageRoomFlatBonus(floors, resourceType);
  const multiplier = featureCalculateStorageBonusMultiplier(floors, resourceType);
  return Math.floor((baseMax + flatBonus) * multiplier);
}

/**
 * Recalculate resource maxes based on storage bonuses from features.
 * Uses defaultResources() as the base max and applies storage bonus multipliers.
 * Clamps current values if they exceed the new max (e.g. after removing a feature).
 * Mutates state in-place.
 */
export function resourceStorageProcess(state: GameState): void {
  const defaults = defaultResources();
  for (const type of Object.keys(defaults) as ResourceType[]) {
    const baseMax = defaults[type].max;
    const effectiveMax = resourceEffectiveMax(baseMax, type, state.world.floors);
    state.world.resources[type].max = effectiveMax;
    if (state.world.resources[type].current > effectiveMax) {
      state.world.resources[type].current = effectiveMax;
    }
  }
}

export function resourceMigrate(saved: Partial<ResourceMap>): ResourceMap {
  const defaults = defaultResources();
  const result = { ...defaults };

  for (const key of Object.keys(defaults) as ResourceType[]) {
    if (saved[key]) {
      result[key] = { ...saved[key] };
    }
  }

  return result;
}
