import { computed, type Signal } from '@angular/core';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type {
  ResourceCost,
  ResourceMap,
  ResourceState,
  ResourceType,
} from '@interfaces';

export function getResource(type: ResourceType): Signal<ResourceState> {
  return computed(() => gamestate().world.resources[type]);
}

export function allResources(): Signal<ResourceMap> {
  return computed(() => gamestate().world.resources);
}

export async function addResource(
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

export async function subtractResource(
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

export function canAfford(costs: ResourceCost): boolean {
  const resources = gamestate().world.resources;
  return Object.entries(costs).every(
    ([type, amount]) => resources[type as ResourceType].current >= amount,
  );
}

export async function payCost(costs: ResourceCost): Promise<boolean> {
  if (!canAfford(costs)) {
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
