import { computed, type Signal } from '@angular/core';
import { gamestate } from '@helpers/state-game';
import type { ResourceMap, ResourceState, ResourceType } from '@interfaces';

export function getResource(type: ResourceType): Signal<ResourceState> {
  return computed(() => gamestate().world.resources[type]);
}

export function allResources(): Signal<ResourceMap> {
  return computed(() => gamestate().world.resources);
}
