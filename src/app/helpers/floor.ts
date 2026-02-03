import { computed } from '@angular/core';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type { BiomeType, Floor } from '@interfaces';

/**
 * Get the current floor based on currentFloorIndex.
 */
export const currentFloor = computed<Floor | undefined>(() => {
  const state = gamestate();
  const index = state.world.currentFloorIndex;
  return state.world.floors[index];
});

/**
 * Get the biome of the current floor.
 */
export const currentFloorBiome = computed<BiomeType>(() => {
  const floor = currentFloor();
  return floor?.biome ?? 'neutral';
});

/**
 * Get all floors.
 */
export const allFloors = computed<Floor[]>(() => {
  return gamestate().world.floors;
});

/**
 * Get a floor by its ID.
 */
export function getFloor(floorId: string): Floor | undefined {
  return gamestate().world.floors.find((f) => f.id === floorId);
}

/**
 * Get the biome of a specific floor by ID.
 * Returns 'neutral' if floor not found.
 */
export function getFloorBiome(floorId: string): BiomeType {
  const floor = getFloor(floorId);
  return floor?.biome ?? 'neutral';
}

/**
 * Get the current floor index.
 */
export const currentFloorIndex = computed<number>(() => {
  return gamestate().world.currentFloorIndex;
});

/**
 * Set the current floor by index.
 * Returns false if index is out of bounds.
 */
export async function setCurrentFloorByIndex(index: number): Promise<boolean> {
  const floors = gamestate().world.floors;
  if (index < 0 || index >= floors.length) {
    return false;
  }

  await updateGamestate((state) => ({
    ...state,
    world: {
      ...state.world,
      currentFloorIndex: index,
    },
  }));
  return true;
}

/**
 * Set the current floor by floor ID.
 * Returns false if floor not found.
 */
export async function setCurrentFloorById(floorId: string): Promise<boolean> {
  const floors = gamestate().world.floors;
  const index = floors.findIndex((f) => f.id === floorId);
  if (index === -1) {
    return false;
  }

  return setCurrentFloorByIndex(index);
}
