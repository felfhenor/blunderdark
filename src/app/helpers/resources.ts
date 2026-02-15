import { computed, type Signal } from '@angular/core';
import { defaultResources } from '@helpers/defaults';
import { featureCalculateStorageBonusMultiplier } from '@helpers/features';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type {
  Floor,
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

export async function resourceAdd(
  type: ResourceType,
  amount: number,
): Promise<number> {
  if (amount < 0) {
    return 0;
  }

  if (amount === 0) {
    return 0;
  }

  let actualAdded = 0;

  await updateGamestate((state) => {
    const resource = state.world.resources[type];
    const available = resource.max - resource.current;
    actualAdded = Math.min(amount, available);

    return {
      ...state,
      world: {
        ...state.world,
        resources: {
          ...state.world.resources,
          [type]: {
            ...resource,
            current: resource.current + actualAdded,
          },
        },
      },
    };
  });

  return actualAdded;
}

export async function resourceSubtract(
  type: ResourceType,
  amount: number,
): Promise<boolean> {
  if (amount < 0) {
    return false;
  }

  if (amount === 0) {
    return true;
  }

  const resource = gamestate().world.resources[type];
  if (resource.current < amount) {
    return false;
  }

  await updateGamestate((state) => ({
    ...state,
    world: {
      ...state.world,
      resources: {
        ...state.world.resources,
        [type]: {
          ...state.world.resources[type],
          current: state.world.resources[type].current - amount,
        },
      },
    },
  }));

  return true;
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
  const multiplier = featureCalculateStorageBonusMultiplier(floors);
  return Math.floor(baseMax * multiplier);
}

export function resourceMigrate(
  saved: Partial<ResourceMap>,
): ResourceMap {
  const defaults = defaultResources();
  const result = { ...defaults };

  for (const key of Object.keys(defaults) as ResourceType[]) {
    if (saved[key]) {
      result[key] = { ...saved[key] };
    }
  }

  return result;
}
