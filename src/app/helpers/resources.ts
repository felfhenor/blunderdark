import { computed, type Signal } from '@angular/core';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type { ResourceMap, ResourceState, ResourceType } from '@interfaces';

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
