import { computed, type Signal } from '@angular/core';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type { InhabitantInstance } from '@interfaces';

export function allInhabitants(): Signal<InhabitantInstance[]> {
  return computed(() => gamestate().world.inhabitants);
}

export function getInhabitant(
  instanceId: string,
): Signal<InhabitantInstance | undefined> {
  return computed(() =>
    gamestate().world.inhabitants.find((i) => i.instanceId === instanceId),
  );
}

export async function addInhabitant(
  inhabitant: InhabitantInstance,
): Promise<void> {
  await updateGamestate((state) => ({
    ...state,
    world: {
      ...state.world,
      inhabitants: [...state.world.inhabitants, inhabitant],
    },
  }));
}

export async function removeInhabitant(instanceId: string): Promise<void> {
  await updateGamestate((state) => ({
    ...state,
    world: {
      ...state.world,
      inhabitants: state.world.inhabitants.filter(
        (i) => i.instanceId !== instanceId,
      ),
    },
  }));
}

export function serializeInhabitants(
  inhabitants: InhabitantInstance[],
): InhabitantInstance[] {
  return inhabitants.map((i) => ({ ...i }));
}

export function deserializeInhabitants(
  data: InhabitantInstance[],
): InhabitantInstance[] {
  return data.map((i) => ({
    instanceId: i.instanceId,
    definitionId: i.definitionId,
    name: i.name,
    state: i.state ?? 'normal',
    assignedRoomId: i.assignedRoomId ?? null,
  }));
}
